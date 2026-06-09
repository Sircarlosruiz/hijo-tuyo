import {
  collection,
  collectionGroup,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  deleteDoc,
  arrayRemove,
  type DocumentReference,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getFirestoreInstance } from './firebase-client';
import { syncUserToFirestore } from './firestore-user-sync';
import type {
  GroupDoc,
  MembershipDoc,
  InviteDoc,
  GroupWithMembership,
  InviteDefaults,
} from '../types/groups';
import { generateInviteCode, DEFAULT_INVITE_SETTINGS } from '../types/groups';

export async function createGroup(
  uid: string,
  name: string,
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Group name cannot be empty');
  }

  const db = getFirestoreInstance();
  const groupRef = doc(collection(db, 'groups'));
  const membershipRef = doc(groupRef, 'members', uid);

  const groupData: GroupDoc = {
    name: trimmed,
    ownerUid: uid,
    createdAt: serverTimestamp() as Timestamp,
  };

  const membershipData: MembershipDoc = {
    role: 'owner',
    joinedAt: serverTimestamp() as Timestamp,
    uid,
  };

  // Sequential writes avoid batch rule-evaluation edge cases between group + membership.
  await setDoc(groupRef, groupData);
  await setDoc(membershipRef, membershipData);
  await syncUserGroupMembership(uid, groupRef.id);

  return groupRef.id;
}

export async function setActiveGroup(
  uid: string,
  groupId: string,
): Promise<void> {
  const db = getFirestoreInstance();
  const userRef = doc(db, 'usuarios', uid);
  await updateDoc(userRef, { activeGroupId: groupId });

  try {
    localStorage.setItem('activeGroupId', groupId);
  } catch {
    // localStorage may be unavailable — non-critical
  }
}

export async function fetchMyGroups(
  uid: string,
): Promise<GroupWithMembership[]> {
  const db = getFirestoreInstance();

  const userRef = doc(db, 'usuarios', uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const groupIdsFromUser: string[] = userData.groupIds ?? [];
  const activeGroupId =
    typeof userData.activeGroupId === 'string' ? userData.activeGroupId : null;

  let groupIds = [
    ...new Set([
      ...groupIdsFromUser,
      ...(activeGroupId ? [activeGroupId] : []),
    ]),
  ];

  try {
    const ownedGroupsSnap = await getDocs(
      query(collection(db, 'groups'), where('ownerUid', '==', uid)),
    );
    groupIds = [
      ...new Set([...groupIds, ...ownedGroupsSnap.docs.map((groupDoc) => groupDoc.id)]),
    ];
  } catch (error) {
    console.error('Failed to load owned groups (non-fatal)', {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const membershipSnap = await getDocs(
      query(collectionGroup(db, 'members'), where('uid', '==', uid)),
    );
    groupIds = [
      ...new Set([
        ...groupIds,
        ...membershipSnap.docs.map((memberDoc) => memberDoc.ref.path.split('/')[1]),
      ]),
    ];
  } catch (error) {
    console.error('Failed to load memberships (non-fatal)', {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (groupIds.length === 0) {
    return [];
  }

  const results: GroupWithMembership[] = [];

  for (const groupId of groupIds) {
    try {
      const membershipSnap = await getDoc(
        doc(db, 'groups', groupId, 'members', uid),
      );
      if (!membershipSnap.exists()) continue;

      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      if (!groupSnap.exists()) continue;

      const groupData = groupSnap.data() as GroupDoc;
      const membership = membershipSnap.data() as MembershipDoc;
      results.push({
        id: groupSnap.id,
        name: groupData.name,
        ownerUid: groupData.ownerUid,
        createdAt: groupData.createdAt,
        myRole: membership.role,
      });
    } catch (error) {
      console.error('Skipping group while resolving memberships (non-fatal)', {
        uid,
        groupId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const resolvedGroupIds = results.map((group) => group.id);
  const sameGroupIds =
    resolvedGroupIds.length === groupIdsFromUser.length
    && resolvedGroupIds.every((id) => groupIdsFromUser.includes(id));

  if (resolvedGroupIds.length > 0 && !sameGroupIds) {
    try {
      await setDoc(userRef, { groupIds: resolvedGroupIds }, { merge: true });
    } catch (error) {
      console.error('Failed to backfill groupIds on user doc (non-fatal)', {
        uid,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

export async function fetchGroupById(
  groupId: string,
): Promise<GroupDoc | null> {
  const db = getFirestoreInstance();
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return null;
  return groupSnap.data() as GroupDoc;
}

export async function fetchMembership(
  groupId: string,
  uid: string,
): Promise<MembershipDoc | null> {
  const db = getFirestoreInstance();
  const membershipRef = doc(db, 'groups', groupId, 'members', uid);
  const snap = await getDoc(membershipRef);
  if (!snap.exists()) return null;
  return snap.data() as MembershipDoc;
}

export async function createInvite(
  groupId: string,
  ownerUid: string,
  options?: Partial<InviteDefaults>,
): Promise<InviteDoc & { inviteId: string }> {
  const db = getFirestoreInstance();

  // Verify ownership
  const membership = await fetchMembership(groupId, ownerUid);
  if (!membership || membership.role !== 'owner') {
    throw new Error('Only the group owner can create invites');
  }

  const defaults = { ...DEFAULT_INVITE_SETTINGS, ...options };
  const code = generateInviteCode();

  const now = new Date();
  const expiresAt = defaults.expiryDays > 0
    ? Timestamp.fromDate(new Date(now.getTime() + defaults.expiryDays * 24 * 60 * 60 * 1000))
    : null;

  const inviteData: InviteDoc = {
    code,
    createdByUid: ownerUid,
    createdAt: serverTimestamp() as Timestamp,
    expiresAt,
    maxUses: defaults.singleUse ? 1 : null,
    uses: 0,
    revoked: false,
  };

  const inviteRef = doc(collection(db, 'groups', groupId, 'invites'));
  await setDoc(inviteRef, inviteData);

  return { ...inviteData, inviteId: inviteRef.id };
}

export async function revokeInvite(
  groupId: string,
  inviteId: string,
  uid: string,
): Promise<void> {
  const db = getFirestoreInstance();

  const membership = await fetchMembership(groupId, uid);
  if (!membership || membership.role !== 'owner') {
    throw new Error('Only the group owner can revoke invites');
  }

  const inviteRef = doc(db, 'groups', groupId, 'invites', inviteId);
  await updateDoc(inviteRef, { revoked: true });
}

export async function fetchGroupInvites(
  groupId: string,
): Promise<Array<InviteDoc & { inviteId: string }>> {
  const db = getFirestoreInstance();
  const invitesRef = collection(db, 'groups', groupId, 'invites');
  const snapshot = await getDocs(invitesRef);

  return snapshot.docs.map((d) => ({
    ...d.data(),
    inviteId: d.id,
  })) as Array<InviteDoc & { inviteId: string }>;
}

export async function redeemInvite(
  inviteCode: string,
  uid: string,
  firebaseUser?: User | null,
): Promise<{ groupId: string; alreadyMember: boolean }> {
  const db = getFirestoreInstance();
  const normalizedCode = inviteCode.trim().toUpperCase();

  const invitesSnapshot = await getDocs(
    query(collectionGroup(db, 'invites'), where('code', '==', normalizedCode)),
  );

  if (invitesSnapshot.empty) {
    throw new Error('Invalid invite code');
  }

  const inviteDoc = invitesSnapshot.docs[0];
  const parts = inviteDoc.ref.path.split('/');
  const groupId = parts[1];

  const result = await runTransaction(db, async (transaction) => {
    const freshInviteSnap = await transaction.get(inviteDoc.ref);
    if (!freshInviteSnap.exists()) {
      throw new Error('Invalid invite code');
    }

    const inviteData = freshInviteSnap.data() as InviteDoc;

    const membershipRef = doc(db, 'groups', groupId, 'members', uid);
    const membershipSnap = await transaction.get(membershipRef);

    if (membershipSnap.exists()) {
      return { groupId, alreadyMember: true };
    }

    if (inviteData.revoked) {
      throw new Error('This invite has been revoked');
    }

    if (inviteData.maxUses !== null && inviteData.uses >= inviteData.maxUses) {
      throw new Error('This invite has reached its maximum uses');
    }

    if (inviteData.expiresAt !== null) {
      const now = new Date();
      if (now >= inviteData.expiresAt.toDate()) {
        throw new Error('This invite has expired');
      }
    }

    const membershipData: MembershipDoc = {
      role: 'member',
      joinedAt: serverTimestamp() as Timestamp,
      uid,
    };

    transaction.set(membershipRef, membershipData);
    transaction.update(inviteDoc.ref, {
      uses: inviteData.uses + 1,
    });

    return { groupId, alreadyMember: false };
  });

  await syncUserGroupMembership(uid, result.groupId, firebaseUser);

  return result;
}

async function syncUserGroupMembership(
  uid: string,
  groupId: string,
  firebaseUser?: User | null,
): Promise<void> {
  const db = getFirestoreInstance();
  const userRef = doc(db, 'usuarios', uid);
  let userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    if (firebaseUser?.uid === uid) {
      await syncUserToFirestore(firebaseUser);
    } else {
      throw new Error('User profile is not ready yet. Please try again.');
    }
    userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error('Could not sync user profile. Please try again.');
    }
  }

  const existingGroupIds: string[] = userSnap.data().groupIds ?? [];
  const groupIds = existingGroupIds.includes(groupId)
    ? existingGroupIds
    : [...existingGroupIds, groupId];

  await updateDoc(userRef, { groupIds, activeGroupId: groupId });

  try {
    localStorage.setItem('activeGroupId', groupId);
  } catch {
    // localStorage may be unavailable — non-critical
  }
}

async function addUserToGroupIds(
  uid: string,
  groupId: string,
): Promise<void> {
  const db = getFirestoreInstance();
  const userRef = doc(db, 'usuarios', uid);
  const userSnap = await getDoc(userRef);
  const existingGroupIds: string[] = userSnap.exists()
    ? (userSnap.data().groupIds ?? [])
    : [];

  if (existingGroupIds.includes(groupId)) {
    return;
  }

  await setDoc(userRef, { groupIds: [...existingGroupIds, groupId] }, { merge: true });
}

export async function regenerateInvite(
  groupId: string,
  oldInviteId: string,
  uid: string,
  options?: Partial<InviteDefaults>,
): Promise<InviteDoc & { inviteId: string }> {
  const db = getFirestoreInstance();

  const membership = await fetchMembership(groupId, uid);
  if (!membership || membership.role !== 'owner') {
    throw new Error('Only the group owner can regenerate invites');
  }

  // Revoke old invite
  const oldInviteRef = doc(db, 'groups', groupId, 'invites', oldInviteId);
  await updateDoc(oldInviteRef, { revoked: true });

  // Create new invite
  return createInvite(groupId, uid, options);
}

// ─── Member Management ───────────────────────────────────────────────

export async function removeMember(
  groupId: string,
  targetUid: string,
  callerUid: string,
): Promise<void> {
  const db = getFirestoreInstance();

  const callerMembership = await fetchMembership(groupId, callerUid);
  if (!callerMembership || callerMembership.role !== 'owner') {
    throw new Error('Only the group owner can remove members');
  }

  if (targetUid === callerUid) {
    throw new Error('Owner cannot remove themselves. Delete the group instead.');
  }

  const targetMembership = await fetchMembership(groupId, targetUid);
  if (!targetMembership) {
    throw new Error('User is not a member of this group');
  }

  if (targetMembership.role === 'owner') {
    throw new Error('Cannot remove the group owner');
  }

  const batch = writeBatch(db);
  const membershipRef = doc(db, 'groups', groupId, 'members', targetUid);
  batch.delete(membershipRef);

  await batch.commit();
}

export async function leaveGroup(
  groupId: string,
  uid: string,
): Promise<void> {
  const db = getFirestoreInstance();

  const membership = await fetchMembership(groupId, uid);
  if (!membership) {
    throw new Error('You are not a member of this group');
  }

  if (membership.role === 'owner') {
    throw new Error('Owner cannot leave the group. Delete the group instead.');
  }

  const batch = writeBatch(db);
  const membershipRef = doc(db, 'groups', groupId, 'members', uid);
  batch.delete(membershipRef);

  const userRef = doc(db, 'usuarios', uid);
  batch.update(userRef, { groupIds: arrayRemove(groupId) });

  // If this was their active group, clear it
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().activeGroupId === groupId) {
    batch.update(userRef, { activeGroupId: null });
  }

  await batch.commit();
}

export async function fetchGroupMembers(
  groupId: string,
): Promise<Array<{ uid: string; role: string; joinedAt: Timestamp }>> {
  const db = getFirestoreInstance();
  const membersRef = collection(db, 'groups', groupId, 'members');
  const snapshot = await getDocs(membersRef);

  return snapshot.docs.map((d) => ({
    uid: d.id,
    ...d.data(),
  })) as Array<{ uid: string; role: string; joinedAt: Timestamp }>;
}

// ─── Group Settings ──────────────────────────────────────────────────

export async function renameGroup(
  groupId: string,
  newName: string,
  uid: string,
): Promise<void> {
  const db = getFirestoreInstance();

  const membership = await fetchMembership(groupId, uid);
  if (!membership || membership.role !== 'owner') {
    throw new Error('Only the group owner can rename the group');
  }

  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('Group name cannot be empty');
  }

  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, { name: trimmed });
}

export async function deleteGroup(
  groupId: string,
  uid: string,
): Promise<{
  membersRemoved: number;
  invitesRemoved: number;
  partidosRemoved: number;
  torneosRemoved: number;
}> {
  const db = getFirestoreInstance();

  const membership = await fetchMembership(groupId, uid);
  if (!membership || membership.role !== 'owner') {
    throw new Error('Only the group owner can delete the group');
  }

  // Fetch scoped docs (members fetched separately for clearer errors)
  let membersSnap;
  let invitesSnap;
  let partidosSnap;
  let torneosSnap;

  try {
    [membersSnap, invitesSnap, partidosSnap, torneosSnap] = await Promise.all([
      getDocs(collection(db, 'groups', groupId, 'members')),
      getDocs(collection(db, 'groups', groupId, 'invites')),
      getDocs(query(collection(db, 'partidos'), where('groupId', '==', groupId))),
      getDocs(query(collection(db, 'torneos'), where('groupId', '==', groupId))),
    ]);
  } catch (error) {
    throw new Error(
      `Failed to load group data for deletion: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Batch delete in chunks of 500 (Firestore limit)
  async function batchDelete(label: string, refs: DocumentReference[]): Promise<void> {
    if (refs.length === 0) return;

    const chunks: DocumentReference[][] = [];
    for (let i = 0; i < refs.length; i += 500) {
      chunks.push(refs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const ref of chunk) {
        batch.delete(ref);
      }
      try {
        await batch.commit();
      } catch (error) {
        throw new Error(
          `Failed to delete ${label}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  await batchDelete('matches', partidosSnap.docs.map((d) => d.ref));
  await batchDelete('tournaments', torneosSnap.docs.map((d) => d.ref));
  await batchDelete('invites', invitesSnap.docs.map((d) => d.ref));

  // Delete group doc while owner membership still exists (isGroupOwner still valid)
  try {
    await deleteDoc(doc(db, 'groups', groupId));
  } catch (error) {
    throw new Error(
      `Failed to delete group document: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  await batchDelete('members', membersSnap.docs.map((d) => d.ref));

  // Only the caller can update their own user doc per security rules
  const callerRef = doc(db, 'usuarios', uid);
  const callerSnap = await getDoc(callerRef);
  if (callerSnap.exists()) {
    try {
      const updates: Record<string, unknown> = {
        groupIds: arrayRemove(groupId),
      };
      if (callerSnap.data().activeGroupId === groupId) {
        updates.activeGroupId = null;
      }
      await updateDoc(callerRef, updates);
    } catch (error) {
      console.error('Failed to sync user doc after group delete (non-fatal)', {
        uid,
        groupId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    localStorage.removeItem('activeGroupId');
  } catch {
    // Non-critical
  }

  return {
    membersRemoved: membersSnap.size,
    invitesRemoved: invitesSnap.size,
    partidosRemoved: partidosSnap.size,
    torneosRemoved: torneosSnap.size,
  };
}

// ─── Scoping Helpers ─────────────────────────────────────────────────

export function withGroupId<T extends Record<string, unknown>>(
  data: T,
  groupId: string,
): T & { groupId: string } {
  return { ...data, groupId };
}

export function scopedPartidosQuery(
  groupId: string,
): ReturnType<typeof query> {
  const db = getFirestoreInstance();
  return query(collection(db, 'partidos'), where('groupId', '==', groupId));
}

export function scopedTorneosQuery(
  groupId: string,
): ReturnType<typeof query> {
  const db = getFirestoreInstance();
  return query(collection(db, 'torneos'), where('groupId', '==', groupId));
}

export function scopedPartidosOrderedQuery(
  groupId: string,
): ReturnType<typeof query> {
  const db = getFirestoreInstance();
  return query(
    collection(db, 'partidos'),
    where('groupId', '==', groupId),
  );
}

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
} from 'firebase/firestore';
import { getFirestoreInstance } from './firebase-client';
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
  const batch = writeBatch(db);

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
  };

  batch.set(groupRef, groupData);
  batch.set(membershipRef, membershipData);

  await batch.commit();

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

  // Fetch memberships for this user via collectionGroup query
  const membersQuery = query(
    collectionGroup(db, 'members'),
    where('__name__', '==', uid),
  );

  const membershipsSnapshot = await getDocs(membersQuery);
  const groupIds: string[] = [];
  const memberships = new Map<string, MembershipDoc>();

  for (const memberDoc of membershipsSnapshot.docs) {
    // memberDoc.ref.path is like "groups/{groupId}/members/{uid}"
    const parts = memberDoc.ref.path.split('/');
    const groupId = parts[1];
    groupIds.push(groupId);
    memberships.set(groupId, memberDoc.data() as MembershipDoc);
  }

  if (groupIds.length === 0) {
    return [];
  }

  // Fetch all groups in one query
  const groupsQuery = query(
    collection(db, 'groups'),
    where('__name__', 'in', groupIds.slice(0, 10)),
  );

  const groupsSnapshot = await getDocs(groupsQuery);
  const results: GroupWithMembership[] = [];

  for (const groupDoc of groupsSnapshot.docs) {
    const groupData = groupDoc.data() as GroupDoc;
    const membership = memberships.get(groupDoc.id);
    if (membership) {
      results.push({
        id: groupDoc.id,
        name: groupData.name,
        ownerUid: groupData.ownerUid,
        createdAt: groupData.createdAt,
        myRole: membership.role,
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
): Promise<{ groupId: string; alreadyMember: boolean }> {
  const db = getFirestoreInstance();

  const result = await runTransaction(db, async (transaction) => {
    // Find the invite by code — we need to search all groups
    // For efficiency, we store invites as a subcollection per group
    // We'll use a collectionGroup query to find by code
    const invitesQuery = query(
      collectionGroup(db, 'invites'),
      where('code', '==', inviteCode),
    );

    const invitesSnapshot = await getDocs(invitesQuery);

    if (invitesSnapshot.empty) {
      throw new Error('Invalid invite code');
    }

    const inviteDoc = invitesSnapshot.docs[0];
    const inviteData = inviteDoc.data() as InviteDoc;

    // Extract groupId from path: groups/{groupId}/invites/{inviteId}
    const parts = inviteDoc.ref.path.split('/');
    const groupId = parts[1];

    // Check if already a member
    const membershipRef = doc(db, 'groups', groupId, 'members', uid);
    const membershipSnap = await transaction.get(membershipRef);

    if (membershipSnap.exists()) {
      return { groupId, alreadyMember: true };
    }

    // Validate invite
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

    // Create membership and increment invite uses atomically
    const membershipData: MembershipDoc = {
      role: 'member',
      joinedAt: serverTimestamp() as Timestamp,
    };

    transaction.set(membershipRef, membershipData);
    transaction.update(inviteDoc.ref, {
      uses: inviteData.uses + 1,
    });

    return { groupId, alreadyMember: false };
  });

  // If not already a member, set as active group and update groupIds
  if (!result.alreadyMember) {
    await setActiveGroup(uid, result.groupId);
    await addUserToGroupIds(uid, result.groupId);
  }

  return result;
}

async function addUserToGroupIds(
  uid: string,
  groupId: string,
): Promise<void> {
  const db = getFirestoreInstance();
  const userRef = doc(db, 'usuarios', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    const existingGroupIds: string[] = userData.groupIds || [];
    if (!existingGroupIds.includes(groupId)) {
      await updateDoc(userRef, {
        groupIds: [...existingGroupIds, groupId],
      });
    }
  }
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

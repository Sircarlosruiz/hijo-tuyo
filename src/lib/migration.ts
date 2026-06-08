import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreInstance } from './firebase-client';

const DEFAULT_GROUP_MARKER = 'isDefaultGroup';

export interface MigrationReport {
  dryRun: boolean;
  defaultGroupId: string | null;
  usersMigrated: number;
  partidosMigrated: number;
  torneosMigrated: number;
  usersSkipped: number;
  partidosSkipped: number;
  torneosSkipped: number;
  errors: string[];
}

export async function runMigration(
  ownerUid: string,
  options: { dryRun: boolean } = { dryRun: false },
): Promise<MigrationReport> {
  const db = getFirestoreInstance();
  const report: MigrationReport = {
    dryRun: options.dryRun,
    defaultGroupId: null,
    usersMigrated: 0,
    partidosMigrated: 0,
    torneosMigrated: 0,
    usersSkipped: 0,
    partidosSkipped: 0,
    torneosSkipped: 0,
    errors: [],
  };

  try {
    // Step 1: Find or create default group
    const defaultGroup = await findOrCreateDefaultGroup(db, ownerUid, options.dryRun);
    if (!defaultGroup) {
      report.errors.push('Failed to find or create default group');
      return report;
    }
    report.defaultGroupId = defaultGroup.id;

    // Step 2: Migrate usuarios (add as members of default group)
    await migrateUsuarios(db, defaultGroup.id, ownerUid, report, options.dryRun);

    // Step 3: Migrate partidos (add groupId)
    await migratePartidos(db, defaultGroup.id, report, options.dryRun);

    // Step 4: Migrate torneos (add groupId)
    await migrateTorneos(db, defaultGroup.id, report, options.dryRun);
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : 'Unknown migration error');
  }

  return report;
}

async function findOrCreateDefaultGroup(
  db: ReturnType<typeof getFirestoreInstance>,
  ownerUid: string,
  dryRun: boolean,
): Promise<{ id: string } | null> {
  // Look for existing default group by marker
  const existingQuery = query(
    collection(db, 'groups'),
    where(DEFAULT_GROUP_MARKER, '==', true),
  );
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    return { id: existingSnap.docs[0].id };
  }

  if (dryRun) {
    return { id: '(would-create)' };
  }

  // Create default group
  const groupRef = doc(collection(db, 'groups'));
  const batch = writeBatch(db);

  batch.set(groupRef, {
    name: 'Default Group',
    ownerUid,
    createdAt: serverTimestamp(),
    [DEFAULT_GROUP_MARKER]: true,
  });

  batch.set(doc(groupRef, 'members', ownerUid), {
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  await batch.commit();

  return { id: groupRef.id };
}

async function migrateUsuarios(
  db: ReturnType<typeof getFirestoreInstance>,
  defaultGroupId: string,
  ownerUid: string,
  report: MigrationReport,
  dryRun: boolean,
): Promise<void> {
  const usersSnap = await getDocs(collection(db, 'usuarios'));

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();

    // Check if already migrated (has groupIds containing default group)
    const existingGroupIds: string[] = userData.groupIds || [];
    if (existingGroupIds.includes(defaultGroupId)) {
      report.usersSkipped++;
      continue;
    }

    if (dryRun) {
      report.usersMigrated++;
      continue;
    }

    // Add membership
    const membershipRef = doc(db, 'groups', defaultGroupId, 'members', uid);
    const role = uid === ownerUid ? 'owner' : 'member';

    await setDoc(membershipRef, {
      role,
      joinedAt: serverTimestamp(),
    });

    // Update user doc with groupIds and activeGroupId if not set
    const updates: Record<string, unknown> = {
      groupIds: [...existingGroupIds, defaultGroupId],
    };

    if (!userData.activeGroupId) {
      updates.activeGroupId = defaultGroupId;
    }

    await updateDoc(doc(db, 'usuarios', uid), updates);

    report.usersMigrated++;
  }
}

async function migratePartidos(
  db: ReturnType<typeof getFirestoreInstance>,
  defaultGroupId: string,
  report: MigrationReport,
  dryRun: boolean,
): Promise<void> {
  const partidosSnap = await getDocs(collection(db, 'partidos'));

  // Process in batches for efficiency
  const docsToMigrate: Array<{ id: string; ref: ReturnType<typeof doc> }> = [];

  for (const partidoDoc of partidosSnap.docs) {
    const data = partidoDoc.data();

    if (data.groupId === defaultGroupId) {
      report.partidosSkipped++;
      continue;
    }

    docsToMigrate.push({ id: partidoDoc.id, ref: partidoDoc.ref });
  }

  if (dryRun) {
    report.partidosMigrated += docsToMigrate.length;
    return;
  }

  // Batch writes (500 limit)
  const chunks: Array<Array<{ id: string; ref: ReturnType<typeof doc> }>> = [];
  for (let i = 0; i < docsToMigrate.length; i += 500) {
    chunks.push(docsToMigrate.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.update(d.ref, { groupId: defaultGroupId });
    }
    await batch.commit();
    report.partidosMigrated += chunk.length;
  }
}

async function migrateTorneos(
  db: ReturnType<typeof getFirestoreInstance>,
  defaultGroupId: string,
  report: MigrationReport,
  dryRun: boolean,
): Promise<void> {
  const torneosSnap = await getDocs(collection(db, 'torneos'));

  const docsToMigrate: Array<{ id: string; ref: ReturnType<typeof doc> }> = [];

  for (const torneoDoc of torneosSnap.docs) {
    const data = torneoDoc.data();

    if (data.groupId === defaultGroupId) {
      report.torneosSkipped++;
      continue;
    }

    docsToMigrate.push({ id: torneoDoc.id, ref: torneoDoc.ref });
  }

  if (dryRun) {
    report.torneosMigrated += docsToMigrate.length;
    return;
  }

  const chunks: Array<Array<{ id: string; ref: ReturnType<typeof doc> }>> = [];
  for (let i = 0; i < docsToMigrate.length; i += 500) {
    chunks.push(docsToMigrate.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.update(d.ref, { groupId: defaultGroupId });
    }
    await batch.commit();
    report.torneosMigrated += chunk.length;
  }
}

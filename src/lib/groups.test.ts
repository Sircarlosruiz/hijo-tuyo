import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn(),
  })),
  runTransaction: vi.fn((_db, fn) => fn({ get: vi.fn(), set: vi.fn(), update: vi.fn() })),
  serverTimestamp: vi.fn(() => ({ __type: 'serverTimestamp' })),
  Timestamp: {
    now: vi.fn(() => new Date()),
    fromDate: vi.fn((d: Date) => d),
  },
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock('../lib/firestore-user-sync', () => ({
  syncUserToFirestore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/firebase-client', () => ({
  getFirestoreInstance: vi.fn(() => ({})),
}));

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
  updateDoc,
} from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase-client';
import {
  createGroup,
  setActiveGroup,
  fetchGroupById,
  fetchMembership,
  createInvite,
  revokeInvite,
  redeemInvite,
} from './groups';

const mockDb = {};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getFirestoreInstance).mockReturnValue(mockDb as never);
});

describe('createGroup', () => {
  it('should throw if name is empty', async () => {
    await expect(createGroup('uid-1', '')).rejects.toThrow('Group name cannot be empty');
    await expect(createGroup('uid-1', '   ')).rejects.toThrow('Group name cannot be empty');
  });

  it('should create group and owner membership', async () => {
    const mockGroupRef = { id: 'group-1' };
    const mockMembershipRef = { path: 'groups/group-1/members/uid-1' };

    vi.mocked(doc)
      .mockReturnValueOnce(mockGroupRef as never)
      .mockReturnValueOnce(mockMembershipRef as never);

    vi.mocked(setDoc).mockResolvedValue(undefined as never);
    vi.mocked(updateDoc).mockResolvedValue(undefined as never);
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ groupIds: [] }),
    } as never);

    const groupId = await createGroup('uid-1', 'Test Group');

    expect(setDoc).toHaveBeenCalledTimes(3);
    expect(groupId).toBe('group-1');
  });
});

describe('setActiveGroup', () => {
  it('should update Firestore and localStorage', async () => {
    const mockUpdate = vi.fn();
    vi.mocked(updateDoc).mockImplementation(mockUpdate as never);

    await setActiveGroup('uid-1', 'group-1');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('fetchGroupById', () => {
  it('should return group data when found', async () => {
    const mockData = {
      name: 'Test Group',
      ownerUid: 'uid-1',
      createdAt: new Date(),
    };
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockData,
    } as never);

    const result = await fetchGroupById('group-1');

    expect(result).toEqual(mockData);
  });

  it('should return null when group not found', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
    } as never);

    const result = await fetchGroupById('nonexistent');

    expect(result).toBeNull();
  });
});

describe('fetchMembership', () => {
  it('should return membership data when found', async () => {
    const mockData = {
      role: 'owner',
      joinedAt: new Date(),
    };
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockData,
    } as never);

    const result = await fetchMembership('group-1', 'uid-1');

    expect(result).toEqual(mockData);
  });

  it('should return null when membership not found', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
    } as never);

    const result = await fetchMembership('group-1', 'uid-1');

    expect(result).toBeNull();
  });
});

describe('createInvite', () => {
  it('should throw if user is not owner', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'member', joinedAt: new Date() }),
    } as never);

    await expect(createInvite('group-1', 'uid-1')).rejects.toThrow(
      'Only the group owner can create invites',
    );
  });

  it('should create invite with valid code', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'owner', joinedAt: new Date() }),
    } as never);

    vi.mocked(setDoc).mockResolvedValue(undefined as never);
    vi.mocked(doc).mockReturnValue({ id: 'invite-new' } as never);

    const result = await createInvite('group-1', 'uid-1');

    expect(result.code.length).toBe(16);
    expect(result.revoked).toBe(false);
    expect(result.uses).toBe(0);
    expect(result.inviteId).toBe('invite-new');
  });
});

describe('revokeInvite', () => {
  it('should throw if user is not owner', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'member', joinedAt: new Date() }),
    } as never);

    await expect(revokeInvite('group-1', 'invite-1', 'uid-1')).rejects.toThrow(
      'Only the group owner can revoke invites',
    );
  });
});

describe('redeemInvite', () => {
  it('should throw for invalid invite code', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as never);

    await expect(redeemInvite('INVALID', 'uid-1')).rejects.toThrow('Invalid invite code');
  });

  it('should return alreadyMember if user is already in group', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ groupId: 'group-1', inviteId: 'invite-1' }),
    } as never);

    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => ({
              code: 'VALIDCODE',
              revoked: false,
              maxUses: null,
              uses: 0,
              expiresAt: null,
            }),
          } as never)
          .mockResolvedValueOnce({
            exists: () => true,
          } as never),
        set: vi.fn(),
        update: vi.fn(),
      };
      return fn(mockTransaction);
    });

    vi.mocked(setDoc).mockResolvedValue(undefined as never);

    const result = await redeemInvite('VALIDCODE', 'uid-1');

    expect(result.alreadyMember).toBe(true);
    expect(result.groupId).toBe('group-1');
  });
});

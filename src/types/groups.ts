import type { Timestamp } from 'firebase/firestore';

export interface GroupDoc {
  name: string;
  ownerUid: string;
  createdAt: Timestamp;
}

export interface MembershipDoc {
  role: 'owner' | 'member';
  joinedAt: Timestamp;
}

export interface InviteDoc {
  code: string;
  createdByUid: string;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  maxUses: number | null;
  uses: number;
  revoked: boolean;
}

export interface GroupWithMembership {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: Timestamp;
  myRole: 'owner' | 'member';
}

export interface ActiveGroupContextValue {
  activeGroupId: string | null;
  groups: GroupWithMembership[];
  setActiveGroup: (groupId: string) => Promise<void>;
  loading: boolean;
  hasGroups: boolean;
  isOwner: (groupId: string) => boolean;
}

export interface InviteDefaults {
  expiryDays: number;
  singleUse: boolean;
}

export const DEFAULT_INVITE_SETTINGS: InviteDefaults = {
  expiryDays: 7,
  singleUse: false,
};

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 16;
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export function isInviteValid(invite: InviteDoc): boolean {
  if (invite.revoked) return false;
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return false;
  if (invite.expiresAt !== null) {
    const now = new Date();
    const expires = invite.expiresAt.toDate();
    if (now >= expires) return false;
  }
  return true;
}

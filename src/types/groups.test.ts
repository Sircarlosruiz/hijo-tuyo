import { describe, it, expect } from 'vitest';
import { generateInviteCode, isInviteValid, type InviteDoc } from './groups';
import { Timestamp } from 'firebase/firestore';

describe('generateInviteCode', () => {
  it('should return a 16-character string', () => {
    const code = generateInviteCode();
    expect(code.length).toBe(16);
  });

  it('should only contain valid base32 characters', () => {
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    for (let i = 0; i < 10; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(validChars);
    }
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBe(100);
  });
});

describe('isInviteValid', () => {
  const createInvite = (overrides: Partial<InviteDoc> = {}): InviteDoc => ({
    code: 'TESTCODE123',
    createdByUid: 'uid-1',
    createdAt: Timestamp.now(),
    expiresAt: null,
    maxUses: null,
    uses: 0,
    revoked: false,
    ...overrides,
  });

  it('should return true for a fresh invite with no constraints', () => {
    const invite = createInvite();
    expect(isInviteValid(invite)).toBe(true);
  });

  it('should return false for a revoked invite', () => {
    const invite = createInvite({ revoked: true });
    expect(isInviteValid(invite)).toBe(false);
  });

  it('should return false when maxUses is reached', () => {
    const invite = createInvite({ maxUses: 1, uses: 1 });
    expect(isInviteValid(invite)).toBe(false);
  });

  it('should return true when uses are below maxUses', () => {
    const invite = createInvite({ maxUses: 5, uses: 3 });
    expect(isInviteValid(invite)).toBe(true);
  });

  it('should return false for an expired invite', () => {
    const pastDate = Timestamp.fromDate(new Date(Date.now() - 86400000));
    const invite = createInvite({ expiresAt: pastDate });
    expect(isInviteValid(invite)).toBe(false);
  });

  it('should return true for an invite that expires in the future', () => {
    const futureDate = Timestamp.fromDate(new Date(Date.now() + 86400000));
    const invite = createInvite({ expiresAt: futureDate });
    expect(isInviteValid(invite)).toBe(true);
  });

  it('should return false when both expired and maxUses reached', () => {
    const pastDate = Timestamp.fromDate(new Date(Date.now() - 86400000));
    const invite = createInvite({ expiresAt: pastDate, maxUses: 1, uses: 1 });
    expect(isInviteValid(invite)).toBe(false);
  });
});

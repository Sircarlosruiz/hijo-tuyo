import { describe, it, expect } from 'vitest';
import { resolvePlayerName, resolvePlayerNameFromMap } from './resolve-player-name';

describe('resolvePlayerName', () => {
  it('should return nickname when both nickname and name are present', () => {
    expect(resolvePlayerName({ nickname: 'El Crack', name: 'Carlos' })).toBe('El Crack');
  });

  it('should fall back to name when nickname is null', () => {
    expect(resolvePlayerName({ nickname: null, name: 'Carlos' })).toBe('Carlos');
  });

  it('should fall back to name when nickname is undefined', () => {
    expect(resolvePlayerName({ name: 'Carlos' })).toBe('Carlos');
  });

  it('should fall back to name when nickname is empty string', () => {
    expect(resolvePlayerName({ nickname: '', name: 'Carlos' })).toBe('Carlos');
  });

  it('should return "Unknown" when both nickname and name are null', () => {
    expect(resolvePlayerName({ nickname: null, name: null })).toBe('Unknown');
  });

  it('should return "Unknown" when both nickname and name are undefined', () => {
    expect(resolvePlayerName({})).toBe('Unknown');
  });

  it('should return "Unknown" when object is empty', () => {
    expect(resolvePlayerName({})).toBe('Unknown');
  });

  it('should return nickname when name is null', () => {
    expect(resolvePlayerName({ nickname: 'El Crack', name: null })).toBe('El Crack');
  });
});

describe('resolvePlayerNameFromMap', () => {
  const usuarios = {
    uid1: { nickname: 'El Crack', name: 'Carlos' },
    uid2: { nickname: null, name: 'Maria' },
    uid3: { name: 'Pedro' },
  };

  it('should resolve name for a uid that exists in the map', () => {
    expect(resolvePlayerNameFromMap('uid1', usuarios)).toBe('El Crack');
  });

  it('should fall back to name when nickname is null', () => {
    expect(resolvePlayerNameFromMap('uid2', usuarios)).toBe('Maria');
  });

  it('should use name when nickname field is absent', () => {
    expect(resolvePlayerNameFromMap('uid3', usuarios)).toBe('Pedro');
  });

  it('should return "Unknown" for a uid that does not exist in the map', () => {
    expect(resolvePlayerNameFromMap('uid999', usuarios)).toBe('Unknown');
  });
});

import { describe, it, expect } from 'vitest';
import { INITIAL_FORM_STATE } from './match';

describe('MatchFormState', (): void => {
  it('should have empty initial state', (): void => {
    expect(INITIAL_FORM_STATE.gameId).toBe('');
    expect(INITIAL_FORM_STATE.player1Uid).toBe('');
    expect(INITIAL_FORM_STATE.player2Uid).toBe('');
    expect(INITIAL_FORM_STATE.score1).toBe('');
    expect(INITIAL_FORM_STATE.score2).toBe('');
  });
});

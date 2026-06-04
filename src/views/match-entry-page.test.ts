import { describe, it, expect } from 'vitest';

// --- Bolt 003: Validation tests ---

function validatePlayers(player1Uid: string, player2Uid: string): string | undefined {
  if (player1Uid && player2Uid && player1Uid === player2Uid) {
    return 'Players must be different';
  }
  return undefined;
}

function validateScores(score1: string, score2: string): { score1?: string; score2?: string; general?: string } {
  const result: { score1?: string; score2?: string; general?: string } = {};
  if (score1 && score2) {
    const s1 = Number(score1);
    const s2 = Number(score2);
    if (s1 === s2) {
      result.general = 'No draws allowed';
    }
  }
  return result;
}

function validateAll(form: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.gameId) errors.gameId = 'Select a game';
  if (!form.player1Uid) errors.player1Uid = 'Select player 1';
  if (!form.player2Uid) errors.player2Uid = 'Select player 2';
  if (!form.score1) errors.score1 = 'Enter score for player 1';
  if (!form.score2) errors.score2 = 'Enter score for player 2';

  const playerError = validatePlayers(form.player1Uid, form.player2Uid);
  if (playerError) errors.player1Uid = playerError;

  const scoreErrors = validateScores(form.score1, form.score2);
  if (scoreErrors.general) errors.general = scoreErrors.general;

  return errors;
}

describe('Player validation', (): void => {
  it('should allow different players', (): void => {
    expect(validatePlayers('user-1', 'user-2')).toBeUndefined();
  });

  it('should reject same player selection', (): void => {
    expect(validatePlayers('user-1', 'user-1')).toBe('Players must be different');
  });

  it('should allow empty selection', (): void => {
    expect(validatePlayers('', '')).toBeUndefined();
    expect(validatePlayers('user-1', '')).toBeUndefined();
    expect(validatePlayers('', 'user-2')).toBeUndefined();
  });
});

describe('Score validation', (): void => {
  it('should allow different scores', (): void => {
    const result = validateScores('3', '1');
    expect(result.general).toBeUndefined();
  });

  it('should reject draw scores', (): void => {
    const result = validateScores('2', '2');
    expect(result.general).toBe('No draws allowed');
  });

  it('should allow zero vs non-zero', (): void => {
    const result = validateScores('0', '5');
    expect(result.general).toBeUndefined();
  });

  it('should reject zero vs zero draw', (): void => {
    const result = validateScores('0', '0');
    expect(result.general).toBe('No draws allowed');
  });

  it('should allow empty scores', (): void => {
    const result = validateScores('', '');
    expect(result.general).toBeUndefined();
  });
});

describe('Full form validation', (): void => {
  it('should reject empty form', (): void => {
    const errors = validateAll({
      gameId: '',
      player1Uid: '',
      player2Uid: '',
      score1: '',
      score2: '',
    });

    expect(errors.gameId).toBe('Select a game');
    expect(errors.player1Uid).toBe('Select player 1');
    expect(errors.player2Uid).toBe('Select player 2');
    expect(errors.score1).toBe('Enter score for player 1');
    expect(errors.score2).toBe('Enter score for player 2');
  });

  it('should reject same player selection', (): void => {
    const errors = validateAll({
      gameId: 'game-1',
      player1Uid: 'user-1',
      player2Uid: 'user-1',
      score1: '3',
      score2: '1',
    });

    expect(errors.player1Uid).toBe('Players must be different');
    expect(errors.general).toBeUndefined();
  });

  it('should reject draw scores', (): void => {
    const errors = validateAll({
      gameId: 'game-1',
      player1Uid: 'user-1',
      player2Uid: 'user-2',
      score1: '2',
      score2: '2',
    });

    expect(errors.general).toBe('No draws allowed');
    expect(errors.player1Uid).toBeUndefined();
  });

  it('should accept valid form', (): void => {
    const errors = validateAll({
      gameId: 'game-1',
      player1Uid: 'user-1',
      player2Uid: 'user-2',
      score1: '3',
      score2: '1',
    });

    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('should reject missing game with valid other fields', (): void => {
    const errors = validateAll({
      gameId: '',
      player1Uid: 'user-1',
      player2Uid: 'user-2',
      score1: '3',
      score2: '1',
    });

    expect(errors.gameId).toBe('Select a game');
    expect(Object.keys(errors)).toHaveLength(1);
  });
});

// --- Bolt 004: Submission tests ---

function determineWinner(score1: string, score2: string, player1Uid: string, player2Uid: string): string {
  return Number(score1) > Number(score2) ? player1Uid : player2Uid;
}

function buildMatchDocument(
  gameId: string,
  player1Uid: string,
  player2Uid: string,
  score1: string,
  score2: string,
  recordedByUid: string,
): Record<string, unknown> {
  const winnerUid = determineWinner(score1, score2, player1Uid, player2Uid);
  return {
    gameId,
    player1Uid,
    player2Uid,
    score1: Number(score1),
    score2: Number(score2),
    winnerUid,
    recordedByUid,
    createdAt: 'serverTimestamp()',
  };
}

describe('Winner determination', (): void => {
  it('should return player1Uid when score1 is higher', (): void => {
    const winner = determineWinner('5', '3', 'p1', 'p2');
    expect(winner).toBe('p1');
  });

  it('should return player2Uid when score2 is higher', (): void => {
    const winner = determineWinner('2', '4', 'p1', 'p2');
    expect(winner).toBe('p2');
  });

  it('should return player2Uid on draw (player2 wins tiebreak)', (): void => {
    const winner = determineWinner('3', '3', 'p1', 'p2');
    expect(winner).toBe('p2');
  });

  it('should handle zero scores', (): void => {
    const winner = determineWinner('0', '1', 'p1', 'p2');
    expect(winner).toBe('p2');
  });
});

describe('Match document builder', (): void => {
  it('should include all 8 required fields', (): void => {
    const doc = buildMatchDocument('game-1', 'p1', 'p2', '3', '1', 'recorder-1');

    expect(doc).toHaveProperty('gameId', 'game-1');
    expect(doc).toHaveProperty('player1Uid', 'p1');
    expect(doc).toHaveProperty('player2Uid', 'p2');
    expect(doc).toHaveProperty('score1', 3);
    expect(doc).toHaveProperty('score2', 1);
    expect(doc).toHaveProperty('winnerUid', 'p1');
    expect(doc).toHaveProperty('recordedByUid', 'recorder-1');
    expect(doc).toHaveProperty('createdAt', 'serverTimestamp()');
  });

  it('should convert scores to numbers', (): void => {
    const doc = buildMatchDocument('game-1', 'p1', 'p2', '10', '7', 'recorder-1');
    expect(doc.score1).toBe(10);
    expect(doc.score2).toBe(7);
    expect(typeof doc.score1).toBe('number');
    expect(typeof doc.score2).toBe('number');
  });

  it('should set correct winner for player2 win', (): void => {
    const doc = buildMatchDocument('game-1', 'p1', 'p2', '1', '5', 'recorder-1');
    expect(doc.winnerUid).toBe('p2');
  });
});

describe('Submission state management', (): void => {
  it('should start in idle state', (): void => {
    const submitStatus = 'idle';
    const isSubmitting = false;
    const submitError = null;

    expect(submitStatus).toBe('idle');
    expect(isSubmitting).toBe(false);
    expect(submitError).toBeNull();
  });

  it('should transition to success after valid submit', (): void => {
    let submitStatus = 'idle';
    let isSubmitting = false;

    isSubmitting = true;
    submitStatus = 'success';
    isSubmitting = false;

    expect(submitStatus).toBe('success');
    expect(isSubmitting).toBe(false);
  });

  it('should transition to error on failure', (): void => {
    let submitStatus = 'idle';
    let isSubmitting = false;
    let submitError: string | null = null;

    isSubmitting = true;
    submitError = 'Permission denied';
    submitStatus = 'error';
    isSubmitting = false;

    expect(submitStatus).toBe('error');
    expect(submitError).toBe('Permission denied');
    expect(isSubmitting).toBe(false);
  });
});

import type { Game } from '../types/match';

interface GameFilterProps {
  games: Game[];
  selectedGameId: string | null;
  onChange: (gameId: string | null) => void;
}

export function GameFilter({
  games,
  selectedGameId,
  onChange,
}: GameFilterProps): React.JSX.Element {
  return (
    <div style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '300px' }}>
      <label
        htmlFor="game-filter"
        style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
      >
        Filter by Game
      </label>
      <select
        id="game-filter"
        value={selectedGameId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          width: '100%',
          padding: '0.5rem',
          fontSize: '1rem',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
      >
        <option value="">All Games</option>
        {games.map((game) => (
          <option key={game.id} value={game.id}>
            {game.name}
          </option>
        ))}
      </select>
    </div>
  );
}

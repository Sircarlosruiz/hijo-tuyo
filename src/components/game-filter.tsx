import type { Game } from '../types/match';

interface GameFilterProps {
  games: Game[];
  selectedGameId: string | null;
  onChange: (gameId: string | null) => void;
}

export function GameFilter({ games, selectedGameId, onChange }: GameFilterProps): React.JSX.Element {
  return (
    <div className="ht-chiprow" style={{ marginBottom: 22 }}>
      <button
        type="button"
        className={`ht-chip${!selectedGameId ? ' active' : ''}`}
        onClick={() => onChange(null)}
      >
        All games
      </button>
      {games.map((game) => (
        <button
          key={game.id}
          type="button"
          className={`ht-chip${selectedGameId === game.id ? ' active' : ''}`}
          onClick={() => onChange(game.id)}
        >
          {game.name}
        </button>
      ))}
    </div>
  );
}

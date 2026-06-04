import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PlayerStats } from '../types/dashboard';

interface LeaderboardChartProps {
  data: PlayerStats[];
}

export function LeaderboardChart({ data }: LeaderboardChartProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          color: '#666',
        }}
      >
        <p>No matches recorded yet.</p>
        <p>Play some matches to see the leaderboard!</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="displayName"
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value: number): string => `${value} wins`}
            labelFormatter={(label: string): string => `Player: ${label}`}
          />
          <Bar dataKey="wins" fill="#8884d8" name="Wins" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

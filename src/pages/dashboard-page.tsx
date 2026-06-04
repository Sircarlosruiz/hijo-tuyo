import { RequireAuth } from "../components/require-auth";
import { withAuthProvider } from "../components/auth-provider-wrapper";

function DashboardPageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <h1>Dashboard</h1>
        <p>View your leaderboard and stats here.</p>
      </div>
    </RequireAuth>
  );
}

export const DashboardPage = withAuthProvider(DashboardPageContent);

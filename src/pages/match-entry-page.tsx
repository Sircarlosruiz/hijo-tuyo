import { RequireAuth } from "../components/require-auth";
import { withAuthProvider } from "../components/auth-provider-wrapper";

function MatchEntryPageContent(): React.JSX.Element {
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
        <h1>Match Entry</h1>
        <p>Enter your match results here.</p>
      </div>
    </RequireAuth>
  );
}

export const MatchEntryPage = withAuthProvider(MatchEntryPageContent);

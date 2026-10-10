import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

function accountLabel(user: { email?: string; user_metadata?: Record<string, unknown> } | null): string {
  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user?.email ?? "there";
}

export function LandingPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const signedIn = Boolean(auth.user) || auth.demoMode;

  async function signOut() {
    await auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link className="brand-mark" to="/">
            <i aria-hidden="true"><span></span><span></span></i>
            Pellia
          </Link>
        {auth.loading ? null : signedIn ? (
          <div>
            <button className="ghost sign-out-button" type="button" onClick={() => void signOut()}>
              Sign out
            </button>
            <Link className="primary link-button" to="/app">
              Open Pellia
            </Link>
          </div>
        ) : (
          <div>
            <Link className="ghost link-button" to="/auth">
              Sign in
            </Link>
            <Link className="primary link-button" to="/auth">
              Create account
            </Link>
          </div>
        )}
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          {auth.loading ? (
            <>
              <p className="kicker">Pellia</p>
              <h1>Opening your account…</h1>
            </>
          ) : signedIn ? (
            <>
              <p className="kicker">Welcome back</p>
              <h1>Hello, {accountLabel(auth.user)}.</h1>
              <p>
                Your shared day is ready. Open Pellia to continue, or sign out
                to use a different account.
              </p>
              <div className="landing-actions">
                <Link className="primary link-button" to="/app">
                  Open Pellia
                </Link>
                <button className="ghost" type="button" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
          <p className="kicker">A shared day for two</p>
          <h1>Plan your lives together without losing your own space.</h1>
          <p>
            Keep personal routines, coordinate shared tasks, and see both
            schedules in one calm daily and weekly view.
          </p>
          <div className="landing-actions">
            <Link className="primary link-button" to="/auth">
              Start together
            </Link>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                auth.startDemo();
                navigate("/app");
              }}
            >
              Explore demo
            </button>
          </div>
          {!auth.configured && (
            <p className="setup-note">
              Demo mode is available. Connect Supabase to enable real accounts
              and invitations.
            </p>
          )}
            </>
          )}
        </div>

        <div className="duo-preview" aria-label="Preview of a shared day">
          <header>
            <span>Monday</span>
            <strong>Our day</strong>
          </header>
          <div className="preview-shared">
            <span>9:00</span>
            <strong>Plan the week</strong>
            <small>Both</small>
          </div>
          <div className="preview-columns">
            <div>
              <p>You</p>
              <span>7:00 Morning run</span>
              <span>18:00 Call parents</span>
            </div>
            <div>
              <p>Partner</p>
              <span>8:30 Focus block</span>
              <span>19:00 Make dinner</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <article>
          <strong>Mine, yours, together</strong>
          <p>Shared commitments appear once while personal plans keep a clear owner.</p>
        </article>
        <article>
          <strong>Built for two timezones</strong>
          <p>See partner-local times without changing the recurrence that was planned.</p>
        </article>
        <article>
          <strong>Privacy by design</strong>
          <p>Choose what is shared. Partnership admin rights never unlock private items.</p>
        </article>
      </section>
    </main>
  );
}

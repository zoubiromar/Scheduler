import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function AuthPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (auth.user || auth.demoMode) return <Navigate to="/app" replace />;

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await auth.signInWithEmail(email.trim());
      setMessage("Check your inbox for a secure sign-in link.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not send sign-in link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand-link" to="/">
        Pellia
      </Link>
      <section className="auth-card">
        <p className="kicker">Welcome</p>
        <h1>Make room for both of you.</h1>
        <p>Sign in to sync your schedule and invite one partner.</p>

        <button
          className="oauth-button"
          type="button"
          disabled={!auth.configured || submitting}
          onClick={async () => {
            setError("");
            try {
              await auth.signInWithGoogle();
            } catch (nextError) {
              setError(
                nextError instanceof Error ? nextError.message : "Google sign-in failed.",
              );
            }
          }}
        >
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={submitEmail}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button
            className="primary auth-submit"
            type="submit"
            disabled={!auth.configured || submitting || !email.trim()}
          >
            {submitting ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>

        {!auth.configured && (
          <p className="form-error">
            Supabase environment values are missing. Use the demo or configure
            them from <code>.env.example</code>.
          </p>
        )}
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}

        <button
          className="ghost demo-auth-button"
          type="button"
          onClick={auth.startDemo}
        >
          Continue in demo mode
        </button>
      </section>
    </main>
  );
}

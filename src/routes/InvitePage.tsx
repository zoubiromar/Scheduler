import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function InvitePage() {
  const { token } = useParams();
  const auth = useAuth();

  useEffect(() => {
    if (token) sessionStorage.setItem("dayline.pendingInvite", token);
  }, [token]);

  if (!token) {
    return (
      <main className="invite-page">
        <h1>This invitation link is incomplete.</h1>
        <Link to="/">Return to Pellia</Link>
      </main>
    );
  }

  return (
    <main className="invite-page">
      <section className="auth-card">
        <p className="kicker">Partner invitation</p>
        <h1>You have been invited to share a Pellia.</h1>
        <p>
          Sign in first. We will keep this invitation ready and ask you to
          confirm before joining.
        </p>
        <Link className="primary link-button" to={auth.user ? "/app/settings" : "/auth"}>
          {auth.user ? "Review invitation" : "Sign in to continue"}
        </Link>
      </section>
    </main>
  );
}

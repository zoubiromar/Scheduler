import { useState } from "react";
import { usePartnership } from "./partnership/PartnershipProvider";

export function IncomingInviteBanner() {
  const {
    partnership,
    incomingInvites,
    acceptInvite,
    declineInvite,
  } = usePartnership();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [errorId, setErrorId] = useState<string | null>(null);

  if (incomingInvites.length === 0) return null;

  return (
    <section className="incoming-invites" aria-label="Partnership invitations">
      {incomingInvites.map((invite) => {
        const movingFromSoloSpace =
          partnership &&
          partnership.id !== invite.partnershipId &&
          partnership.members.length === 1;
        return (
          <article className="incoming-invite-banner" key={invite.id}>
            <div className="invite-mark" aria-hidden="true">
              P
            </div>
            <div>
              <p className="kicker">Partner invitation</p>
              <strong>
                {invite.inviterName} invited you to {invite.partnershipName}
              </strong>
              <span>
                Plan together while keeping private items private.
                {movingFromSoloSpace &&
                  " Your existing solo schedule will move with you."}
              </span>
              {error && errorId === invite.id && (
                <span className="form-error">{error}</span>
              )}
            </div>
            <div className="incoming-invite-actions">
              <button
                className="ghost"
                type="button"
                disabled={busyId === invite.id}
                onClick={async () => {
                  setBusyId(invite.id);
                  setError("");
                  setErrorId(null);
                  try {
                    await declineInvite(invite.id);
                  } catch (nextError) {
                    setErrorId(invite.id);
                    setError(
                      nextError instanceof Error
                        ? nextError.message
                        : "Could not decline the invitation.",
                    );
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Not now
              </button>
              <button
                className="primary"
                type="button"
                disabled={busyId === invite.id}
                onClick={async () => {
                  setBusyId(invite.id);
                  setError("");
                  setErrorId(null);
                  try {
                    await acceptInvite(invite.id);
                  } catch (nextError) {
                    setErrorId(invite.id);
                    setError(
                      nextError instanceof Error
                        ? nextError.message
                        : "Could not accept the invitation.",
                    );
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                {busyId === invite.id ? "Joining…" : "Join partnership"}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

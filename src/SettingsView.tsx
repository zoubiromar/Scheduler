import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import {
  acceptPartnerInvite,
  createPartnerInvite,
  createPartnership,
  dissolvePartnership,
  leavePartnership,
  loadPendingInvites,
  loadUserPreferences,
  removePartnershipMember,
  revokePartnerInvite,
  transferPartnershipAdmin,
  updatePartnershipName,
  updateProfile,
  updateUserPreferences,
  type PartnerInvite,
  type UserPreferences,
} from "./data/partnershipRepository";
import { usePartnership } from "./partnership/PartnershipProvider";
import type { ItemScope } from "./types";

interface SettingsViewProps {
  importAvailable: boolean;
  onImport: (scope: ItemScope) => Promise<void>;
  onResetDemo: () => void;
}

const defaultPreferences: UserPreferences = {
  weekStartsOn: 1,
  defaultScope: "shared",
  defaultVisibility: "partner_visible",
  defaultCompletionRule: "assigned",
  dayStartHour: 7,
};

export function SettingsView({
  importAvailable,
  onImport,
  onResetDemo,
}: SettingsViewProps) {
  const auth = useAuth();
  const partnershipState = usePartnership();
  const partnership = partnershipState.partnership;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [partnershipName, setPartnershipName] = useState(
    partnership?.name ?? "Our Dayline",
  );
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [pendingInvites, setPendingInvites] = useState<PartnerInvite[]>([]);
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);
  const pendingInviteToken = sessionStorage.getItem("dayline.pendingInvite");

  const currentMember = useMemo(
    () =>
      partnership?.members.find(
        (member) =>
          member.profile.id === auth.user?.id ||
          (!auth.user && member.role === partnership.currentRole),
      ),
    [auth.user, partnership],
  );
  const partner = partnership?.members.find(
    (member) => member.profile.id !== currentMember?.profile.id,
  );
  const isAdmin = partnership?.currentRole === "admin";

  useEffect(() => {
    setPartnershipName(partnership?.name ?? "Our Dayline");
    setDisplayName(currentMember?.profile.displayName ?? "");
    setTimezone(
      currentMember?.profile.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  }, [currentMember, partnership]);

  useEffect(() => {
    if (!auth.user || auth.demoMode) return;
    void loadUserPreferences(auth.user.id)
      .then(setPreferences)
      .catch(() => setPreferences(defaultPreferences));
  }, [auth.demoMode, auth.user]);

  useEffect(() => {
    if (!partnership || !isAdmin || auth.demoMode) return;
    void loadPendingInvites(partnership.id)
      .then(setPendingInvites)
      .catch((nextError) =>
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not load invitations.",
        ),
      );
  }, [auth.demoMode, isAdmin, partnership]);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      await partnershipState.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!partnership && pendingInviteToken && auth.user && !auth.demoMode) {
    return (
      <section className="settings-view onboarding-settings">
        <p className="kicker">Partner invitation</p>
        <h2>Join your partner’s Dayline</h2>
        <p>
          Accepting creates one shared space while keeping private items visible
          only to you.
        </p>
        <button
          className="primary"
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await acceptPartnerInvite(pendingInviteToken);
              sessionStorage.removeItem("dayline.pendingInvite");
            }, "You joined the partnership.")
          }
        >
          Accept invitation
        </button>
        {error && <p className="form-error">{error}</p>}
      </section>
    );
  }

  if (!partnership) {
    return (
      <section className="settings-view onboarding-settings">
        <p className="kicker">Your partnership</p>
        <h2>Create a space for two</h2>
        <p>
          Name your shared space first. You will become the admin and can invite
          one partner next.
        </p>
        <form
          className="settings-card"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => createPartnership(partnershipName),
              "Your partnership is ready.",
            );
          }}
        >
          <label className="field">
            <span>Partnership name</span>
            <input
              value={partnershipName}
              onChange={(event) => setPartnershipName(event.target.value)}
              placeholder="Alex & Sam"
            />
          </label>
          <button className="primary" type="submit" disabled={busy}>
            Create partnership
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="settings-view">
      <div className="section-heading">
        <div>
          <p className="kicker">Settings</p>
          <h2>{partnership.name}</h2>
        </div>
      </div>

      {(message || error) && (
        <p className={error ? "form-error" : "form-success"}>{error || message}</p>
      )}

      {pendingInviteToken && auth.user && !auth.demoMode && (
        <article className="settings-card invite-review-card">
          <div>
            <strong>Partner invitation ready</strong>
            <p>Confirm before joining the partnership from your invitation.</p>
          </div>
          <button
            className="primary"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await acceptPartnerInvite(pendingInviteToken);
                sessionStorage.removeItem("dayline.pendingInvite");
              }, "You joined the partnership.")
            }
          >
            Accept invitation
          </button>
        </article>
      )}

      <div className="settings-grid">
        <article className="settings-card">
          <h3>Account</h3>
          <label className="field">
            <span>Name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Timezone</span>
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="America/New_York"
            />
          </label>
          <button
            className="ghost"
            type="button"
            disabled={busy || !auth.user}
            onClick={() =>
              auth.user &&
              void run(
                () =>
                  updateProfile(auth.user!.id, {
                    displayName: displayName.trim(),
                    timezone: timezone.trim(),
                  }),
                "Profile saved.",
              )
            }
          >
            Save profile
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => void auth.signOut()}
          >
            Sign out
          </button>
        </article>

        <article className="settings-card">
          <h3>Partner</h3>
          {partner ? (
            <div className="member-card">
              <span
                className="member-avatar"
                style={{ "--member-color": partner.color } as React.CSSProperties}
              >
                {partner.profile.displayName.slice(0, 1)}
              </span>
              <div>
                <strong>{partner.profile.displayName}</strong>
                <span>{partner.profile.timezone}</span>
              </div>
            </div>
          ) : (
            <>
              <p>Invite one person to share this Dayline.</p>
              <label className="field">
                <span>Partner email (optional)</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="partner@example.com"
                />
              </label>
              <button
                className="primary"
                type="button"
                disabled={busy || auth.demoMode}
                onClick={() =>
                  void run(async () => {
                    const invite = await createPartnerInvite(inviteEmail);
                    setInviteUrl(invite.url);
                    setPendingInvites([
                      {
                        id: invite.id,
                        partnershipId: partnership.id,
                        email: invite.email,
                        status: "pending",
                        expiresAt: invite.expiresAt,
                      },
                    ]);
                  }, "Invitation created.")
                }
              >
                Create invite
              </button>
              {inviteUrl && (
                <div className="invite-link">
                  <input readOnly value={inviteUrl} aria-label="Invitation link" />
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(inviteUrl)}
                  >
                    Copy
                  </button>
                </div>
              )}
              {pendingInvites.map((invite) => (
                <div className="pending-invite" key={invite.id}>
                  <span>
                    Pending{invite.email ? ` for ${invite.email}` : ""} · expires{" "}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </span>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() =>
                      void run(async () => {
                        await revokePartnerInvite(invite.id);
                        setPendingInvites((current) =>
                          current.filter((entry) => entry.id !== invite.id),
                        );
                      }, "Invitation revoked.")
                    }
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </>
          )}
        </article>

        <article className="settings-card">
          <h3>Schedule defaults</h3>
          <label className="field">
            <span>New items</span>
            <select
              value={preferences.defaultScope}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  defaultScope: event.target.value as "personal" | "shared",
                })
              }
            >
              <option value="shared">Shared by default</option>
              <option value="personal">Personal by default</option>
            </select>
          </label>
          <label className="field">
            <span>Shared completion</span>
            <select
              value={preferences.defaultCompletionRule}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  defaultCompletionRule: event.target
                    .value as UserPreferences["defaultCompletionRule"],
                })
              }
            >
              <option value="assigned">Assigned partner</option>
              <option value="either">Either partner</option>
              <option value="both">Both partners</option>
            </select>
          </label>
          <label className="field">
            <span>Week timeline starts</span>
            <select
              value={preferences.dayStartHour}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  dayStartHour: Number(event.target.value),
                })
              }
            >
              <option value={6}>6 AM</option>
              <option value={7}>7 AM</option>
              <option value={8}>8 AM</option>
            </select>
          </label>
          <button
            className="ghost"
            type="button"
            disabled={busy || !auth.user}
            onClick={() =>
              auth.user &&
              void run(
                () => updateUserPreferences(auth.user!.id, preferences),
                "Defaults saved.",
              )
            }
          >
            Save defaults
          </button>
        </article>

        <article className="settings-card">
          <h3>Privacy</h3>
          <p>
            Shared items are visible and editable by both of you. Personal
            visible items can be seen by your partner but only edited by you.
            Private items never appear in their Dayline—even to the admin.
          </p>
        </article>

        {isAdmin && (
          <article className="settings-card admin-card">
            <h3>Admin</h3>
            <label className="field">
              <span>Partnership name</span>
              <input
                value={partnershipName}
                onChange={(event) => setPartnershipName(event.target.value)}
              />
            </label>
            <button
              className="ghost"
              type="button"
              disabled={busy || auth.demoMode}
              onClick={() =>
                void run(
                  () => updatePartnershipName(partnership.id, partnershipName),
                  "Partnership name saved.",
                )
              }
            >
              Save partnership
            </button>
            {partner && (
              <>
                <button
                  className="ghost"
                  type="button"
                  disabled={busy || auth.demoMode}
                  onClick={() =>
                    void run(
                      () => transferPartnershipAdmin(partner.profile.id),
                      `${partner.profile.displayName} is now admin.`,
                    )
                  }
                >
                  Transfer admin to {partner.profile.displayName}
                </button>
                <button
                  className="danger"
                  type="button"
                  disabled={busy || auth.demoMode}
                  onClick={() => {
                    if (window.confirm("Remove your partner from this Dayline?")) {
                      void run(
                        () => removePartnershipMember(partner.profile.id),
                        "Partner removed.",
                      );
                    }
                  }}
                >
                  Remove partner
                </button>
              </>
            )}
            <button
              className="danger"
              type="button"
              disabled={busy || auth.demoMode}
              onClick={() => {
                if (
                  window.confirm(
                    "Dissolve this partnership and delete its shared schedule?",
                  )
                ) {
                  void run(dissolvePartnership, "Partnership dissolved.");
                }
              }}
            >
              Dissolve partnership
            </button>
          </article>
        )}

        {!isAdmin && (
          <article className="settings-card admin-card">
            <h3>Partnership</h3>
            <button
              className="danger"
              type="button"
              disabled={busy || auth.demoMode}
              onClick={() => {
                if (window.confirm("Leave this partnership?")) {
                  void run(leavePartnership, "You left the partnership.");
                }
              }}
            >
              Leave partnership
            </button>
          </article>
        )}

        <article className="settings-card">
          <h3>Data</h3>
          {importAvailable && (
            <div className="settings-actions">
              <button className="ghost" type="button" onClick={() => void onImport("personal")}>
                Import local items privately
              </button>
              <button className="ghost" type="button" onClick={() => void onImport("shared")}>
                Import local items as shared
              </button>
            </div>
          )}
          {auth.demoMode && (
            <button className="danger" type="button" onClick={onResetDemo}>
              Reset demo data
            </button>
          )}
        </article>
      </div>
    </section>
  );
}

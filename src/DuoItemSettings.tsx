import { useAuth } from "./auth/AuthProvider";
import { usePartnership } from "./partnership/PartnershipProvider";
import type {
  CompletionRule,
  ItemScope,
  ItemVisibility,
} from "./types";

interface DuoItemSettingsProps {
  scope: ItemScope;
  visibility: ItemVisibility;
  completionRule: CompletionRule;
  assigneeIds: string[];
  onScopeChange: (scope: ItemScope) => void;
  onVisibilityChange: (visibility: ItemVisibility) => void;
  onCompletionRuleChange: (rule: CompletionRule) => void;
  onAssigneeIdsChange: (ids: string[]) => void;
}

export function DuoItemSettings({
  scope,
  visibility,
  completionRule,
  assigneeIds,
  onScopeChange,
  onVisibilityChange,
  onCompletionRuleChange,
  onAssigneeIdsChange,
}: DuoItemSettingsProps) {
  const auth = useAuth();
  const { partnership } = usePartnership();
  if (!partnership) return null;

  const currentUserId =
    auth.user?.id ??
    partnership.members.find((member) => member.role === partnership.currentRole)
      ?.profile.id ??
    partnership.members[0]?.profile.id;

  return (
    <fieldset className="duo-item-settings">
      <legend>Who is this for?</legend>
      <div className="segmented">
        <button
          className={scope === "shared" ? "active" : ""}
          type="button"
          onClick={() => {
            onScopeChange("shared");
            onVisibilityChange("partner_visible");
            if (assigneeIds.length === 0) {
              onAssigneeIdsChange(partnership.members.map((member) => member.profile.id));
            }
          }}
        >
          Together
        </button>
        <button
          className={scope === "personal" ? "active" : ""}
          type="button"
          onClick={() => {
            onScopeChange("personal");
            onCompletionRuleChange("assigned");
            onAssigneeIdsChange(currentUserId ? [currentUserId] : []);
          }}
        >
          Personal
        </button>
      </div>

      {scope === "personal" ? (
        <label className="field compact-field">
          <span>Partner visibility</span>
          <select
            value={visibility}
            onChange={(event) =>
              onVisibilityChange(event.target.value as ItemVisibility)
            }
          >
            <option value="partner_visible">Visible to partner</option>
            <option value="private">Private</option>
          </select>
        </label>
      ) : (
        <>
          <label className="field compact-field">
            <span>Completion</span>
            <select
              value={completionRule}
              onChange={(event) => {
                const rule = event.target.value as CompletionRule;
                onCompletionRuleChange(rule);
                if (rule === "both") {
                  onAssigneeIdsChange(
                    partnership.members.map((member) => member.profile.id),
                  );
                }
              }}
            >
              <option value="assigned">Assigned partner completes it</option>
              <option value="either">Either partner completes it</option>
              <option value="both">Both partners complete it</option>
            </select>
          </label>

          {completionRule === "assigned" && (
            <div className="assignee-row" aria-label="Assign to">
              {partnership.members.map((member) => {
                const selected = assigneeIds.includes(member.profile.id);
                return (
                  <button
                    className={selected ? "selected" : ""}
                    type="button"
                    key={member.profile.id}
                    style={{ "--member-color": member.color } as React.CSSProperties}
                    onClick={() => onAssigneeIdsChange([member.profile.id])}
                  >
                    {member.profile.id === currentUserId
                      ? "You"
                      : member.profile.displayName}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}

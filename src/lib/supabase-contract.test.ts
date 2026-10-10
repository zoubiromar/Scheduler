import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/202610090001_dayline_duo.sql", import.meta.url),
  "utf8",
);
const emailInviteMigration = readFileSync(
  new URL(
    "../../supabase/migrations/202610100001_email_invites.sql",
    import.meta.url,
  ),
  "utf8",
);
const inviteEmailFunction = readFileSync(
  new URL(
    "../../supabase/functions/send-partner-invite/index.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("Supabase duo security contract", () => {
  it("creates the two-person partnership and invitation primitives", () => {
    expect(migration).toContain("create table public.partnerships");
    expect(migration).toContain("create table public.partnership_members");
    expect(migration).toContain("create table public.partnership_invites");
    expect(migration).toContain("create or replace function public.accept_partner_invite");
    expect(migration).toContain("This partnership is already full");
  });

  it("enables RLS for private and shared schedule tables", () => {
    expect(migration).toContain(
      "alter table public.schedule_items enable row level security",
    );
    expect(migration).toContain(
      "create policy \"members read visible items\"",
    );
    expect(migration).toContain("or created_by = auth.uid()");
    expect(migration).toContain("or visibility = 'partner_visible'");
  });

  it("limits completion mutations to the signed-in user", () => {
    expect(migration).toContain(
      "create policy \"members add own completion\"",
    );
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain(
      "create policy \"members remove own completion\"",
    );
  });

  it("restricts role, partnership, and profile updates to safe columns", () => {
    expect(migration).toContain(
      "revoke update on public.partnership_members from authenticated",
    );
    expect(migration).toContain(
      "grant update (color) on public.partnership_members to authenticated",
    );
    expect(migration).toContain(
      "grant update (display_name, avatar_url, timezone) on public.profiles",
    );
  });

  it("discovers email invites and safely merges a solo partnership", () => {
    expect(emailInviteMigration).toContain(
      "create or replace function public.get_my_pending_invites()",
    );
    expect(emailInviteMigration).toContain(
      "lower(coalesce(auth.jwt() ->> 'email', ''))",
    );
    expect(emailInviteMigration).toContain(
      "update public.schedule_items",
    );
    expect(emailInviteMigration).toContain(
      "create or replace function public.accept_partner_invite_by_id",
    );
  });

  it("sends a branded invite email with a durable account fallback", () => {
    expect(inviteEmailFunction).toContain("invited you to Pellia");
    expect(inviteEmailFunction).toContain("Accept invitation");
    expect(inviteEmailFunction).toContain(
      "Pellia will still show this invitation when you sign in",
    );
    expect(inviteEmailFunction).toContain("RESEND_API_KEY");
  });
});

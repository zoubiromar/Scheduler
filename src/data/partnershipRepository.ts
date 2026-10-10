import { supabase } from "../lib/supabase";

export type PartnershipRole = "admin" | "partner";

export interface DuoProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  timezone: string;
}

export interface DuoMember {
  profile: DuoProfile;
  role: PartnershipRole;
  color: string;
}

export interface PartnershipContext {
  id: string;
  name: string;
  createdBy: string;
  currentRole: PartnershipRole;
  members: DuoMember[];
}

export interface PartnerInvite {
  id: string;
  partnershipId: string;
  email?: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
}

export interface IncomingPartnerInvite {
  id: string;
  partnershipId: string;
  partnershipName: string;
  inviterName: string;
  email: string;
  expiresAt: string;
  createdAt: string;
}

export interface SentPartnerInvite extends PartnerInvite {
  url: string;
  emailSent: boolean;
  emailError?: string;
}

export interface UserPreferences {
  weekStartsOn: number;
  defaultScope: "personal" | "shared";
  defaultVisibility: "private" | "partner_visible";
  defaultCompletionRule: "assigned" | "either" | "both";
  dayStartHour: number;
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function loadPartnershipContext(
  userId: string,
): Promise<PartnershipContext | null> {
  const client = requireSupabase();
  const { data: membership, error } = await client
    .from("partnership_members")
    .select("partnership_id, role, partnerships(id, name, created_by)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!membership) return null;

  const partnership = membership.partnerships as unknown as {
    id: string;
    name: string;
    created_by: string;
  };
  const { data: memberRows, error: memberError } = await client
    .from("partnership_members")
    .select("role, color, profiles(id, display_name, avatar_url, timezone)")
    .eq("partnership_id", membership.partnership_id)
    .order("joined_at");
  if (memberError) throw memberError;

  return {
    id: partnership.id,
    name: partnership.name,
    createdBy: partnership.created_by,
    currentRole: membership.role as PartnershipRole,
    members: (memberRows ?? []).map((row) => {
      const profile = row.profiles as unknown as {
        id: string;
        display_name: string;
        avatar_url: string | null;
        timezone: string;
      };
      return {
        role: row.role as PartnershipRole,
        color: row.color,
        profile: {
          id: profile.id,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url ?? undefined,
          timezone: profile.timezone,
        },
      };
    }),
  };
}

export async function createPartnership(name: string): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_partnership", {
    partnership_name: name,
  });
  if (error) throw error;
  return data as string;
}

export async function createPartnerInvite(
  email?: string,
): Promise<PartnerInvite & { url: string }> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_partner_invite", {
    invited_email: email?.trim() || null,
  });
  if (error) throw error;
  const row = (data as Array<{
    invite_id: string;
    invite_token: string;
    expires_at: string;
  }>)[0];
  if (!row) throw new Error("The invitation could not be created.");

  return {
    id: row.invite_id,
    partnershipId: "",
    email: email?.trim() || undefined,
    status: "pending",
    expiresAt: row.expires_at,
    url: `${window.location.origin}${import.meta.env.BASE_URL}#/invite/${row.invite_token}`,
  };
}

export async function sendPartnerInvite(
  email: string,
): Promise<SentPartnerInvite> {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await client.functions.invoke("send-partner-invite", {
    body: { email: normalizedEmail },
  });

  if (error || data?.error) {
    const fallback = await createPartnerInvite(normalizedEmail);
    return {
      ...fallback,
      emailSent: false,
      emailError:
        data?.error ??
        error?.message ??
        "Email delivery is unavailable. Share the link instead.",
    };
  }

  return {
    id: data.inviteId,
    partnershipId: "",
    email: normalizedEmail,
    status: "pending",
    expiresAt: data.expiresAt,
    url: data.inviteUrl,
    emailSent: Boolean(data.emailSent),
    emailError: data.emailError,
  };
}

export async function loadMyPendingInvites(): Promise<IncomingPartnerInvite[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_my_pending_invites");
  if (error) throw error;
  return (data ?? []).map(
    (row: {
      invite_id: string;
      partnership_id: string;
      partnership_name: string;
      inviter_name: string;
      invited_email: string;
      expires_at: string;
      created_at: string;
    }) => ({
      id: row.invite_id,
      partnershipId: row.partnership_id,
      partnershipName: row.partnership_name,
      inviterName: row.inviter_name,
      email: row.invited_email,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }),
  );
}

export async function loadPendingInvites(
  partnershipId: string,
): Promise<PartnerInvite[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("partnership_invites")
    .select("id, partnership_id, invited_email, status, expires_at")
    .eq("partnership_id", partnershipId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    partnershipId: row.partnership_id,
    email: row.invited_email ?? undefined,
    status: row.status as PartnerInvite["status"],
    expiresAt: row.expires_at,
  }));
}

export async function acceptPartnerInvite(token: string): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("accept_partner_invite", {
    invite_token: token,
  });
  if (error) throw error;
  return data as string;
}

export async function acceptPartnerInviteById(
  inviteId: string,
): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("accept_partner_invite_by_id", {
    invite_id: inviteId,
  });
  if (error) throw error;
  return data as string;
}

export async function declinePartnerInvite(inviteId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("decline_partner_invite", {
    invite_id: inviteId,
  });
  if (error) throw error;
}

export async function revokePartnerInvite(inviteId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("revoke_partner_invite", {
    invite_id: inviteId,
  });
  if (error) throw error;
}

export async function transferPartnershipAdmin(userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("transfer_partnership_admin", {
    next_admin: userId,
  });
  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  patch: { displayName?: string; timezone?: string; avatarUrl?: string },
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("profiles")
    .update({
      ...(patch.displayName !== undefined && { display_name: patch.displayName }),
      ...(patch.timezone !== undefined && { timezone: patch.timezone }),
      ...(patch.avatarUrl !== undefined && { avatar_url: patch.avatarUrl }),
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function updatePartnershipName(
  partnershipId: string,
  name: string,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("partnerships")
    .update({ name: name.trim() })
    .eq("id", partnershipId);
  if (error) throw error;
}

export async function loadUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return {
    weekStartsOn: data.week_starts_on,
    defaultScope: data.default_scope,
    defaultVisibility: data.default_visibility,
    defaultCompletionRule: data.default_completion_rule,
    dayStartHour: data.day_start_hour,
  };
}

export async function updateUserPreferences(
  userId: string,
  preferences: UserPreferences,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("user_preferences")
    .update({
      week_starts_on: preferences.weekStartsOn,
      default_scope: preferences.defaultScope,
      default_visibility: preferences.defaultVisibility,
      default_completion_rule: preferences.defaultCompletionRule,
      day_start_hour: preferences.dayStartHour,
    })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removePartnershipMember(userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("remove_partnership_member", {
    member_id: userId,
  });
  if (error) throw error;
}

export async function leavePartnership(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("leave_partnership");
  if (error) throw error;
}

export async function dissolvePartnership(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("dissolve_partnership");
  if (error) throw error;
}

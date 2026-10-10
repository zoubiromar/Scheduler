import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inviteHtml({
  inviter,
  partnership,
  inviteUrl,
}: {
  inviter: string;
  partnership: string;
  inviteUrl: string;
}): string {
  const safeInviter = escapeHtml(inviter);
  const safePartnership = escapeHtml(partnership);
  const safeUrl = escapeHtml(inviteUrl);
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4efe6;color:#1c1916;font-family:Georgia,'Times New Roman',serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f4efe6">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #e6ddd0;border-radius:20px;background:#fffaf3;overflow:hidden">
            <tr>
              <td style="padding:28px 32px 8px;font-size:18px;font-weight:700">Pellia</td>
            </tr>
            <tr>
              <td style="padding:12px 32px 30px">
                <p style="margin:0 0 8px;color:#3f6b58;font:700 12px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase">A shared day for two</p>
                <h1 style="margin:0 0 16px;font-size:32px;line-height:1.15;font-weight:500">${safeInviter} invited you to Pellia.</h1>
                <p style="margin:0 0 22px;color:#6b6258;font-size:16px;line-height:1.55">
                  Join <strong>${safePartnership}</strong> to share daily plans, recurring tasks, and progress while keeping private items private.
                </p>
                <a href="${safeUrl}" style="display:inline-block;border-radius:999px;background:#3f6b58;color:#fff;padding:12px 20px;font:700 14px Arial,sans-serif;text-decoration:none">Accept invitation</a>
                <p style="margin:24px 0 0;color:#6b6258;font:12px/1.5 Arial,sans-serif">
                  This invitation expires in 7 days. If you create your account separately, Pellia will still show this invitation when you sign in with this email address.
                </p>
              </td>
            </tr>
          </table>
          <p style="max-width:520px;margin:14px auto 0;color:#8b8176;font:11px/1.5 Arial,sans-serif">
            You received this because ${safeInviter} entered your email while inviting a partner to Pellia.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Authentication required.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) throw new Error("Authentication required.");

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid partner email.");
    }

    const [{ data: profile }, { data: membership, error: membershipError }] =
      await Promise.all([
        client.from("profiles").select("display_name").eq("id", user.id).single(),
        client
          .from("partnership_members")
          .select("partnership_id, role, partnerships(name)")
          .eq("user_id", user.id)
          .single(),
      ]);
    if (membershipError || membership?.role !== "admin") {
      throw new Error("Only the partnership admin can send an invitation.");
    }

    const { data: inviteData, error: inviteError } = await client.rpc(
      "create_partner_invite",
      { invited_email: email },
    );
    if (inviteError) throw inviteError;
    const invite = inviteData?.[0];
    if (!invite) throw new Error("The invitation could not be created.");

    const configuredAppUrl =
      Deno.env.get("APP_URL") ?? "https://zoubiromar.github.io/Scheduler/";
    const appUrl = configuredAppUrl.endsWith("/")
      ? configuredAppUrl
      : `${configuredAppUrl}/`;
    const inviteUrl = `${appUrl}#/invite/${invite.invite_token}`;
    const partnership = membership.partnerships as unknown as { name: string };
    const inviter =
      profile?.display_name || user.user_metadata?.full_name || "Your partner";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return Response.json(
        {
          inviteId: invite.invite_id,
          inviteUrl,
          expiresAt: invite.expires_at,
          emailSent: false,
          emailError: "Email delivery is not configured yet.",
        },
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") ?? "Pellia <invites@mycompanion.cc>",
        to: [email],
        subject: `${inviter} invited you to Pellia`,
        html: inviteHtml({
          inviter,
          partnership: partnership.name,
          inviteUrl,
        }),
        text: `${inviter} invited you to ${partnership.name} on Pellia.\n\nAccept the invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
      }),
    });
    const resendBody = await resendResponse.json();
    if (!resendResponse.ok) {
      return Response.json(
        {
          inviteId: invite.invite_id,
          inviteUrl,
          expiresAt: invite.expires_at,
          emailSent: false,
          emailError: resendBody.message ?? "The email could not be sent.",
        },
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return Response.json(
      {
        inviteId: invite.invite_id,
        inviteUrl,
        expiresAt: invite.expires_at,
        emailSent: true,
        emailId: resendBody.id,
      },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invitation failed." },
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

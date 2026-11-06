// Morley Moms: emails a suggestion or bug report to Miranda.
// Secrets (Supabase -> Edge Functions -> Secrets):
//   RESEND_API_KEY  required (free account at resend.com)
//   FEEDBACK_TO     required: the email address that should get the notes
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, publicKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: isMember } = await sb.rpc("is_member");
  if (isMember !== true) return json({ error: "Members only" }, 403);
  const { data: u } = await sb.auth.getUser();
  const email = u?.user?.email ?? "";

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const message = String(body.message ?? "").slice(0, 5000);
  if (!message.trim()) return json({ error: "Empty" }, 400);
  const kind = ({ idea: "Feature idea", bug: "Bug", other: "Note" } as Record<string, string>)[body.kind] ?? "Note";
  const name = String(body.member_name ?? "").slice(0, 100) || email;

  const key = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("FEEDBACK_TO");
  if (!key || !to) return json({ error: "Email isn't set up yet" }, 500);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Morley Moms <onboarding@resend.dev>",
      to: [to],
      reply_to: email || undefined,
      subject: `Morley Moms ${kind}: from ${name}`,
      html: `<p><strong>${esc(kind)}</strong> from ${esc(name)} (${esc(email)})</p>
             <p style="white-space:pre-wrap">${esc(message)}</p>
             <p style="color:#888;font-size:12px">App version ${esc(String(body.app_version ?? ""))}<br>${esc(String(body.user_agent ?? ""))}</p>`,
    }),
  });
  if (!res.ok) return json({ error: "Email failed" }, 502);
  return json({ ok: true });
});

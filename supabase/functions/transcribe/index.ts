// Morley Moms — voice to text for phones that can't do it themselves (iPhone
// home-screen apps). The phone records a short clip, sends it here, and this
// function passes it to a Whisper speech-to-text service and returns the text.
//
// Only signed-in members of the group can use it. The speech service key
// lives in Supabase secrets, never in the app's public code.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   TRANSCRIBE_API_KEY   required. A Groq API key (free) or an OpenAI key.
//   TRANSCRIBE_URL       optional. Defaults to Groq. For OpenAI use
//                        https://api.openai.com/v1/audio/transcriptions
//   TRANSCRIBE_MODEL     optional. Defaults to whisper-large-v3-turbo
//                        (for OpenAI use gpt-4o-mini-transcribe)
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_BYTES = 8 * 1024 * 1024; // about 2+ minutes of phone audio

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  // 1) Is this a signed-in Morley Mom?
  const auth = req.headers.get("Authorization") ?? "";
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, publicKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: isMember, error: memberErr } = await sb.rpc("is_member");
  if (memberErr || isMember !== true) return json({ error: "Members only" }, 403);

  // 2) Get the clip
  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "No audio received" }, 400); }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return json({ error: "No audio received" }, 400);
  if (audio.size > MAX_BYTES) return json({ error: "That recording is too long" }, 413);

  const key = Deno.env.get("TRANSCRIBE_API_KEY");
  if (!key) return json({ error: "Voice isn't set up yet (missing TRANSCRIBE_API_KEY)" }, 500);

  // 3) Send it to the speech-to-text service
  const out = new FormData();
  out.append("file", audio, audio.name || "speech.m4a");
  out.append("model", Deno.env.get("TRANSCRIBE_MODEL") ?? "whisper-large-v3-turbo");
  out.append("language", "en");
  out.append("response_format", "json");
  // A hint helps with school words and spelling lists.
  out.append("prompt", "Morley Moms. Spelling test, spelling words, challenge words. PTO meeting, field trip, drop off, pick up. Specials: library, music, art, gym.");

  const res = await fetch(Deno.env.get("TRANSCRIBE_URL") ?? "https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: out,
  });
  if (!res.ok) {
    console.error("transcribe failed", res.status, await res.text());
    return json({ error: "Couldn't turn that into text. Try again." }, 502);
  }
  const data = await res.json();
  return json({ text: String(data.text ?? "").trim() });
});

// Morley Moms — reads a photo of a school paper (spelling list, flyer, ticket)
// with a vision AI model and returns what's printed on it. The phone then
// fills in the form for a mom to check.
//
// Only signed-in members can use it. The key lives in Supabase secrets,
// never in the app's public code.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   required. From console.anthropic.com (a few dollars of credit lasts a long time).
//   VISION_MODEL        optional. Defaults to claude-haiku-5-5 (the cheap, fast one).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_BYTES = 5 * 1024 * 1024;

const PROMPT = (today: string) => `This is a photo of a paper a parent got from their child's elementary school. Today is ${today}.
The photo may be sideways or upside down, and the paper may have handwriting, check marks, X's or scribbles from a child on top of it. Ignore all of that.

Reply with ONLY a JSON object, no other text:
{
  "kind": "spelling" | "other",
  "title": string or null,      // e.g. "Unit 3 Lesson 10" for a spelling list, otherwise the event or flyer title
  "test_date": "YYYY-MM-DD" or null,   // spelling lists only: the printed or written test date
  "words": [string],            // spelling lists only: every PRINTED spelling word, once each, in reading order, lower case
  "challenge_words": [string],  // spelling lists only: only the words listed under "Challenge Words"
  "text": string                // all the clearly printed text on the paper, in reading order
}

Rules:
- Only include what is actually on the paper. Never guess or add words, dates or details.
- Do not include the printed instructions or explanations (like "Students will change...") as words.
- If a date is missing or unreadable, use null.
- If it is not a spelling list, use "other", leave words and challenge_words empty, and put everything in "text".`;

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

  // 2) Get the photo
  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "No photo received" }, 400); }
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return json({ error: "No photo received" }, 400);
  if (photo.size > MAX_BYTES) return json({ error: "That photo is too big" }, 413);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "Photo reading isn't set up yet (missing ANTHROPIC_API_KEY)" }, 500);

  // 3) Ask the model
  const bytes = new Uint8Array(await photo.arrayBuffer());
  let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const mediaType = /png|webp|gif/.test(photo.type) ? photo.type : "image/jpeg";
  const today = new Date().toISOString().slice(0, 10);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("VISION_MODEL") ?? "claude-haiku-5-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: btoa(bin) } },
          { type: "text", text: PROMPT(today) },
        ],
      }],
    }),
  });
  if (!res.ok) {
    console.error("read-photo failed", res.status, await res.text());
    return json({ error: "Couldn't read that photo. Try again." }, 502);
  }
  const data = await res.json();
  const raw = String(data?.content?.[0]?.text ?? "");
  let out: any;
  try { out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); }
  catch { return json({ error: "Couldn't read that photo. Try again." }, 502); }

  const list = (a: unknown) => (Array.isArray(a) ? a.map((w) => String(w).trim().toLowerCase()).filter(Boolean) : []);
  const date = typeof out.test_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(out.test_date) ? out.test_date : null;
  return json({
    kind: out.kind === "spelling" ? "spelling" : "other",
    title: out.title ? String(out.title).trim() : null,
    test_date: date,
    words: list(out.words),
    challenge_words: list(out.challenge_words),
    text: String(out.text ?? "").trim(),
  });
});

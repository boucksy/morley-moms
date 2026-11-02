// Morley Moms — reads a photo of a school paper (spelling list, flyer, ticket),
// or a typed/spoken note, with an AI model and returns the pieces (what it is,
// the date, the time, where). The phone then fills in the form for a mom to check.
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

const RULES = (today: string) => `Today is ${today}.

Reply with ONLY a JSON object, no other text:
{
  "kind": "spelling" | "event",
  "title": string or null,
  "teacher": string or null,
  "test_date": "YYYY-MM-DD" or null,
  "words": [string],
  "challenge_words": [string],
  "event": {
    "title": string or null,
    "category": "pto" | "school" | "homework" | "noschool" | "volunteer" | "social" | "kids" | "rides" | null,
    "date": "YYYY-MM-DD" or null,
    "end_date": "YYYY-MM-DD" or null,
    "time": "HH:MM" or null,
    "end_time": "HH:MM" or null,
    "location": string or null,
    "details": string or null,
    "link": string or null,
    "link_label": string or null
  },
  "text": string
}

Rules:
- Only include what is actually stated. Never guess or add dates, times, places or details.
- Spelling list: use kind "spelling" and fill title (like "Unit 3 Lesson 10"), test_date, words (every spelling word once, in order, lower case) and challenge_words (only those under "Challenge Words"). Leave event fields null.
- Anything else: use kind "event" and fill the event fields; leave words empty.
- event.title: REQUIRED for events, never null. A short name (2 to 6 words), like "Turkey disguise due" or "PTO meeting". If the paper does not give the event a name, write a plain one from its main point using words from the text. Not a full sentence.
- event.category: pto = PTO meetings and events; school = school activities and announcements; homework = homework or a project the child must complete and turn in (anything with a due date for the child); noschool = days with no school; volunteer = asks for volunteers, donations or supplies; social = moms' outings; kids = kids' clubs or playdates; rides = pickups and drop-offs; null if unsure.
- Dates: turn weekdays and "next Tuesday" into the real date relative to today. A due date is the event's date. Use null if no date is stated.
- event.details: only useful extra facts that don't fit the other fields (what to bring, sign-up links, instructions), in at most two short sentences. null if there is nothing extra. Do not repeat the title, date, time or place.
- event.link: a web address printed on the paper (like a donation or sign-up page), exactly as printed. null if none. Do not guess one. event.link_label: 1 to 3 words for a button that goes there, like "Donate" or "Sign up"; null if no link.
- teacher: the teacher's last name only if it is printed or said (like "Wilkinson"); otherwise null.
- text: the clearly printed or spoken text, in reading order.`;

const PHOTO_INTRO = `This is a photo of a paper a parent got from their child's elementary school. It may be sideways or upside down, and may have handwriting, check marks, X's or scribbles from a child on top of it. Ignore all of that. Ignore greetings like "Dear Families".`;
const TEXT_INTRO = `This is a note a parent typed or spoke aloud about something at their child's elementary school. The speech-to-text may have small mistakes.`;

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

  // 2) Get the photo or the text
  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "Nothing received" }, 400); }
  const photo = form.get("photo");
  const note = form.get("text");
  const hasPhoto = photo instanceof File && photo.size > 0;
  const hasText = typeof note === "string" && note.trim().length > 0;
  if (!hasPhoto && !hasText) return json({ error: "Nothing received" }, 400);
  if (hasPhoto && (photo as File).size > MAX_BYTES) return json({ error: "That photo is too big" }, 413);
  if (hasText && (note as string).length > 6000) return json({ error: "That's too long" }, 413);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "AI reading isn't set up yet (missing ANTHROPIC_API_KEY)" }, 500);

  // 3) Ask the model
  const today = new Date().toISOString().slice(0, 10);
  const content: unknown[] = [];
  if (hasPhoto) {
    const f = photo as File;
    const bytes = new Uint8Array(await f.arrayBuffer());
    let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const mediaType = /png|webp|gif/.test(f.type) ? f.type : "image/jpeg";
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: btoa(bin) } });
    content.push({ type: "text", text: PHOTO_INTRO + "\n\n" + RULES(today) });
  } else {
    content.push({ type: "text", text: TEXT_INTRO + "\n\nThe note:\n\"\"\"\n" + (note as string).trim() + "\n\"\"\"\n\n" + RULES(today) });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("VISION_MODEL") ?? "claude-haiku-5-5",
      max_tokens: 1500,
      messages: [{ role: "user", content }],
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
  const isoDay = (d: unknown) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const hm = (t: unknown) => (typeof t === "string" && /^\d{2}:\d{2}$/.test(t) ? t : null);
  const str = (v: unknown) => (v ? String(v).trim() || null : null);
  const CATS = ["pto", "school", "homework", "noschool", "volunteer", "social", "kids", "rides"];
  const webLink = (v: unknown) => {
    let u = str(v); if (!u) return null;
    if (!/^https?:\/\//i.test(u)) { if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) u = "https://" + u; else return null; }
    try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; }
  };
  const ev = out.event ?? {};
  return json({
    kind: out.kind === "spelling" ? "spelling" : "event",
    title: str(out.title),
    teacher: str(out.teacher),
    test_date: isoDay(out.test_date),
    words: list(out.words),
    challenge_words: list(out.challenge_words),
    event: {
      title: str(ev.title),
      category: CATS.includes(ev.category) ? ev.category : null,
      date: isoDay(ev.date),
      end_date: isoDay(ev.end_date),
      time: hm(ev.time),
      end_time: hm(ev.end_time),
      location: str(ev.location),
      details: str(ev.details),
      link: webLink(ev.link),
      link_label: str(ev.link_label),
    },
    text: String(out.text ?? "").trim(),
  });
});

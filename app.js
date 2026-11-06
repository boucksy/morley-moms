/* Morley Moms — private group app
 * Plain JavaScript, no build step, so GitHub Pages can serve it as-is.
 * Runs in DEMO MODE until config.js has your Supabase details.
 */
(() => {
  'use strict';

  const cfg = window.MM_CONFIG || {};
  const APP_VERSION = 89;
  const LIVE = !!(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && window.supabase);
  const PHOTO_BUCKET = 'spelling-photos';

  /* ---------------- helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Small markup helpers (design-system components). Classes live in styles-components.css.
  // Ghost "Cancel" button that closes the open sheet.
  const cancelBtn = (cls = '') => `<button class="btn btn-ghost${cls ? ' ' + cls : ''}" type="button" data-action="close-sheet">Cancel</button>`;
  // Muted lead-in paragraph under a sheet heading; mod is '', 'sub-lead-6' or 'sub-lead-16'.
  const subLead = (html, mod = '') => `<p class="sub sub-lead${mod ? ' ' + mod : ''}">${html}</p>`;
  const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const mondayOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const fmtDay = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  // "Nov 2 – 6" (or "Oct 30 – Nov 3" across months) for a Monday-start school week
  const weekRange = (iso) => {
    const a = parseDate(iso); const b = new Date(a); b.setDate(b.getDate() + 4);
    const mon = (d) => d.toLocaleDateString(undefined, { month: 'short' });
    return a.getMonth() === b.getMonth() ? `${mon(a)} ${a.getDate()} – ${b.getDate()}` : `${mon(a)} ${a.getDate()} – ${mon(b)} ${b.getDate()}`;
  };
  const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const addDaysTo = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

  function toast(msg) {
    const t = $('#toast');
    clearTimeout(toast._t); clearTimeout(toast._s);
    t.textContent = '';                                   // empty first so a repeated message is announced again
    toast._s = setTimeout(() => { t.textContent = msg; }, 30);
    t.classList.add('show');
    toast._t = setTimeout(() => t.classList.remove('show'), Math.max(2600, String(msg).length * 70));
  }

  const ICON = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.5 14.6c2.2.4 3.6 2 4 4.6"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r=".5"/><circle cx="16.5" cy="13" r=".5"/></svg>',
  };

  // Icons are decorative: the button or text next to them carries the name.
  Object.keys(ICON).forEach((k) => { ICON[k] = ICON[k].replace('<svg ', '<svg aria-hidden="true" focusable="false" '); });

  /* ---------------- data: DEMO ---------------- */
  function demoApi() {
    const now = new Date();
    const at = (days, h, m = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
    const day = (days) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(0, 0, 0, 0); return d.toISOString(); };
    const monday = mondayOf(now);
    const lastMonday = new Date(monday); lastMonday.setDate(lastMonday.getDate() - 7);
    let session = null;
    const db = {
      // Demo mode only shows real facts: the school calendar. Spelling lists,
      // classes and members start empty so you can try adding them.
      members: [],
      // The real 2026–27 Morley calendar (demo-calendar.js).
      events: [
        ...[...(window.MM_DEMO_CALENDAR || []), ...(window.MM_DEMO_RIDES || [])].map((e) => {
          const allDay = !e.start;
          const starts = allDay ? parseDate(e.date) : new Date(`${e.date}T${e.start}`);
          const ends = allDay ? (e.last_day ? parseDate(e.last_day) : null) : (e.end ? new Date(`${e.date}T${e.end}`) : null);
          return { id: e.id, title: e.title, category: e.category, starts_at: starts.toISOString(), ends_at: ends ? ends.toISOString() : null,
            all_day: allDay, location: e.location, pickup_dropoff: null, details: e.details, repeat_days: e.repeat_days, repeat_until: e.repeat_until,
            created_by: 'u-miranda', created_by_name: 'Miranda' };
        }),
      ],
      anchors: [],
      going: [], plans: [], planResponses: [],
      classrooms: (window.MM_DEMO_CLASSES || []).map((name, i) => ({ id: `class${i}`, name, schedule: {}, notes: null, created_by: 'u-miranda', created_by_name: 'Miranda' })),
      spelling: (window.MM_DEMO_SPELLING || []).map((sp, i) => ({ id: `spell${i}`, title: null, notes: null, photo_path: null, ...sp, created_by: 'u-miranda', created_by_name: 'Miranda' })),
    };
    const delay = (v) => new Promise((r) => setTimeout(() => r(v), 150));
    return {
      live: false,
      async session() { return session; },
      onAuth() {},
      async sendCode(email) { return delay(email); },
      async verifyCode(email, code) {
        if (code !== '123456') throw new Error('In demo mode the code is 123456.');
        const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        session = { user: { id: 'u-me', email } };
        if (!db.members.find((m) => m.email === email)) db.members.unshift({ email, display_name: name, is_admin: true });
        return delay();
      },
      async signOut() { session = null; },
      async me() {
        if (!session) return null;
        const m = db.members.find((x) => x.email === session.user.email);
        return m ? { ...m, id: 'u-me' } : null;
      },
      async listEvents() { return delay([...db.events].sort((a, b) => a.starts_at.localeCompare(b.starts_at))); },
      async addEvent(row) { db.events.push({ ...row, id: uid(), created_by: 'u-me', created_by_name: state.me.display_name }); return delay(); },
      async updateEvent(id, row) { Object.assign(db.events.find((e) => e.id === id), row); return delay(); },
      async deleteEvent(id) { db.events = db.events.filter((e) => e.id !== id); return delay(); },
      async listGoing() { return delay(db.going.filter((g) => g.going || g.member_id === state.me.id).map((g) => ({ ...g }))); },
      async setGoing(eventId, going, me) {
        db.going = db.going.filter((g) => !(g.event_id === eventId && g.member_id === me.id));
        if (going !== null) db.going.push({ event_id: eventId, member_id: me.id, member_name: me.name, going });
        return delay();
      },
      async listPlans() { return delay(db.plans.map((p) => ({ ...p }))); },
      async addPlan(row) { db.plans.push({ ...row, id: uid(), created_by: 'u-me', created_by_name: state.me.display_name, created_at: new Date().toISOString() }); return delay(); },
      async updatePlan(id, row) { Object.assign(db.plans.find((p) => p.id === id), row); return delay(); },
      async deletePlan(id) { db.plans = db.plans.filter((p) => p.id !== id); db.planResponses = db.planResponses.filter((r) => r.plan_id !== id); return delay(); },
      async listPlanResponses() { return delay(db.planResponses.map((r) => ({ ...r }))); },
      async setPlanStatus(planId, status, me) {
        db.planResponses = db.planResponses.filter((r) => !(r.plan_id === planId && r.member_id === me.id));
        if (status) db.planResponses.push({ plan_id: planId, member_id: me.id, member_name: me.name, status });
        return delay();
      },
      async listSpelling() { return delay([...db.spelling].sort((a, b) => (b.test_date || b.week_of).localeCompare(a.test_date || a.week_of))); },
      async addSpelling(row, file) {
        const photo_path = file ? URL.createObjectURL(file) : null;
        db.spelling.push({ ...row, id: uid(), photo_path, created_by: 'u-me', created_by_name: state.me.display_name });
        return delay();
      },
      async updateSpelling(id, row, file) {
        if (file) row.photo_path = URL.createObjectURL(file);
        Object.assign(db.spelling.find((x) => x.id === id), row); return delay();
      },
      async deleteSpelling(row) { db.spelling = db.spelling.filter((s) => s.id !== row.id); return delay(); },
      async photoUrl(path) { return path; },
      async transcribe() { throw new Error('Voice on iPhone works once the app is connected (see setup step 8). Type it for now.'); },
      async readPhoto() { throw new Error('demo'); },
      async readNote() { throw new Error('demo'); },
      async sendFeedback() { return delay(); },
      async cleanupOld() { return 0; },
      async listClassrooms() { return delay([...db.classrooms].sort((a, b) => a.name.localeCompare(b.name))); },
      async saveClassroom(row, id) {
        const clash = db.classrooms.find((c) => c.name.toLowerCase() === row.name.toLowerCase() && c.id !== id);
        if (clash) throw new Error('That class is already in the list.');
        if (id) Object.assign(db.classrooms.find((c) => c.id === id), row);
        else db.classrooms.push({ ...row, id: uid(), created_by: 'u-me', created_by_name: state.me.display_name });
        return delay();
      },
      async deleteClassroom(id) { db.classrooms = db.classrooms.filter((c) => c.id !== id); return delay(); },
      async listAnchors() { return delay([...db.anchors]); },
      async setAnchor(classroom_id, anchor_date, day_number) {
        db.anchors = db.anchors.filter((a) => !(a.anchor_date === anchor_date && a.classroom_id === classroom_id))
          .concat({ classroom_id, anchor_date, day_number, created_by_name: state.me.display_name });
        return delay();
      },
      async touchSeen() {},
      async listSeen() { return delay({ 'a@b.com': new Date(Date.now() - 3600e3).toISOString(), 'jess@example.com': new Date(Date.now() - 86400e3 * 1.2).toISOString() }); },
      async listMembers() { return delay([...db.members].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''))); },
      async addMember(m) {
        if (db.members.find((x) => x.email === m.email)) throw new Error('That email is already on the list.');
        db.members.push(m); return delay();
      },
      async removeMember(email) { db.members = db.members.filter((m) => m.email !== email); return delay(); },
    };
  }

  /* ---------------- data: LIVE (Supabase) ---------------- */
  function liveApi() {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    const ok = ({ data, error }) => { if (error) throw error; return data; };
    return {
      live: true,
      async session() { const { data } = await sb.auth.getSession(); return data.session; },
      onAuth(cb) { sb.auth.onAuthStateChange((_evt, s) => cb(s)); },
      async sendCode(email) { ok(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })); },
      async verifyCode(email, token) { ok(await sb.auth.verifyOtp({ email, token, type: 'email' })); },
      async signOut() { await sb.auth.signOut(); },
      async me() {
        const s = await this.session();
        if (!s) return null;
        const rows = ok(await sb.from('members').select('*').eq('email', s.user.email.toLowerCase()));
        return rows[0] ? { ...rows[0], id: s.user.id } : null;
      },
      async listEvents() { return ok(await sb.from('events').select('*').order('starts_at')); },
      async addEvent(row) { ok(await sb.from('events').insert(row)); },
      async updateEvent(id, row) { ok(await sb.from('events').update(row).eq('id', id)); },
      async deleteEvent(id) { ok(await sb.from('events').delete().eq('id', id)); },
      async listGoing() { return ok(await sb.from('event_going').select('*')); },
      async setGoing(eventId, going, me) {
        if (going === null) ok(await sb.from('event_going').delete().eq('event_id', eventId).eq('member_id', me.id));
        else ok(await sb.from('event_going').upsert({ event_id: eventId, member_id: me.id, member_name: me.name, going }, { onConflict: 'event_id,member_id' }));
      },
      async listPlans() { return ok(await sb.from('plans').select('*').order('created_at', { ascending: false })); },
      async addPlan(row) { ok(await sb.from('plans').insert(row)); },
      async updatePlan(id, row) { ok(await sb.from('plans').update(row).eq('id', id)); },
      async deletePlan(id) { ok(await sb.from('plans').delete().eq('id', id)); },
      async listPlanResponses() { return ok(await sb.from('plan_responses').select('*')); },
      async setPlanStatus(planId, status, me) {
        if (!status) ok(await sb.from('plan_responses').delete().eq('plan_id', planId).eq('member_id', me.id));
        else ok(await sb.from('plan_responses').upsert({ plan_id: planId, member_id: me.id, member_name: me.name, status }, { onConflict: 'plan_id,member_id' }));
      },
      async listSpelling() { return ok(await sb.from('spelling_lists').select('*').order('test_date', { ascending: false, nullsFirst: false }).order('week_of', { ascending: false }).limit(30)); },
      async addSpelling(row, file) {
        if (file) {
          const path = `${uid()}.jpg`;
          ok(await sb.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false }));
          row.photo_path = path;
        }
        ok(await sb.from('spelling_lists').insert(row));
      },
      async updateSpelling(id, row, file) {
        if (file) {
          const path = `${uid()}.jpg`;
          ok(await sb.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false }));
          row.photo_path = path;
        }
        ok(await sb.from('spelling_lists').update(row).eq('id', id));
      },
      // Removes events and spelling lists (and their photos) older than the cutoff.
      // "No school" days are kept, because the Day 1–4 count depends on them.
      async cleanupOld(cutoff) {
        const day = (v) => (v ? String(v).slice(0, 10) : '');
        const cut = isoDate(cutoff);
        const evs = ok(await sb.from('events').select('id,category,starts_at,ends_at,repeat_days,repeat_until'));
        const oldEvents = evs.filter((e) => e.category !== 'noschool' && (
          (e.repeat_days && e.repeat_days.length) ? (e.repeat_until && e.repeat_until < cut)
            : day(isoDate(new Date(e.ends_at || e.starts_at))) < cut)).map((e) => e.id);
        if (oldEvents.length) ok(await sb.from('events').delete().in('id', oldEvents));
        const sp = ok(await sb.from('spelling_lists').select('id,test_date,week_of,photo_path'));
        const oldLists = sp.filter((l) => (l.test_date || l.week_of || '9999') < cut);
        for (const l of oldLists) {
          if (l.photo_path) await sb.storage.from(PHOTO_BUCKET).remove([l.photo_path]);
          ok(await sb.from('spelling_lists').delete().eq('id', l.id));
        }
        return oldEvents.length + oldLists.length;
      },
      async deleteSpelling(row) {
        if (row.photo_path) await sb.storage.from(PHOTO_BUCKET).remove([row.photo_path]);
        ok(await sb.from('spelling_lists').delete().eq('id', row.id));
      },
      async photoUrl(path) {
        const { data } = await sb.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
        return data && data.signedUrl;
      },
      async transcribe(blob) {
        const ext = /mp4|m4a|aac/.test(blob.type) ? 'm4a' : /webm/.test(blob.type) ? 'webm' : /ogg/.test(blob.type) ? 'ogg' : 'm4a';
        const fd = new FormData();
        fd.append('audio', blob, `speech.${ext}`);
        const { data, error } = await sb.functions.invoke('transcribe', { body: fd });
        if (error) throw new Error('Couldn\u2019t catch that. Tap the mic and try again.');
        return (data && data.text) || '';
      },
      async sendFeedback(kind, message) {
        const row = { kind, message, member_name: state.me.display_name || '', app_version: APP_VERSION, user_agent: (navigator.userAgent || '').slice(0, 300) };
        const { error } = await sb.from('feedback').insert(row);
        if (error) throw new Error('save');
        // Email is best effort: the note is already saved either way.
        try { await sb.functions.invoke('send-feedback', { body: row }); } catch { /* saved anyway */ }
      },
      async readNote(text) {
        const fd = new FormData();
        fd.append('text', text);
        const { data, error } = await sb.functions.invoke('read-photo', { body: fd });
        if (error || !data || data.error) throw new Error('ai');
        return data;
      },
      async readPhoto(file) {
        const fd = new FormData();
        fd.append('photo', file, 'paper.jpg');
        const { data, error } = await sb.functions.invoke('read-photo', { body: fd });
        if (error || !data || data.error) throw new Error('vision');
        return data;
      },
      async listClassrooms() { return ok(await sb.from('classrooms').select('*').order('name')); },
      async saveClassroom(row, id) {
        const { error } = id ? await sb.from('classrooms').update(row).eq('id', id) : await sb.from('classrooms').insert(row);
        if (error) throw new Error(error.code === '23505' ? 'That class is already in the list.' : error.message);
      },
      async deleteClassroom(id) { ok(await sb.from('classrooms').delete().eq('id', id)); },
      async listAnchors() { return ok(await sb.from('rotation_anchors').select('*').order('anchor_date')); },
      async setAnchor(classroom_id, anchor_date, day_number) {
        ok(await sb.from('rotation_anchors').upsert({ classroom_id, anchor_date, day_number }, { onConflict: 'classroom_id,anchor_date' }));
      },
      async touchSeen() { try { await sb.rpc('touch_seen'); } catch { /* not important */ } },
      async listSeen() {
        const rows = ok(await sb.from('member_seen').select('*'));
        const out = {}; (rows || []).forEach((r) => { out[r.email] = r.last_seen_at; }); return out;
      },
      async listMembers() {
        // Admins see the full list. Everyone else only gets names (no emails).
        if (state.me && state.me.is_admin) return ok(await sb.from('members').select('*').order('display_name'));
        const rows = ok(await sb.from('member_names').select('*').order('display_name'));
        return (rows || []).map((r) => ({ ...r, email: '' }));
      },
      async addMember(m) {
        const { error } = await sb.from('members').insert(m);
        if (error) throw new Error(error.code === '23505' ? 'That email is already on the list.' : error.message);
      },
      async removeMember(email) { ok(await sb.from('members').delete().eq('email', email)); },
    };
  }

  /* ---------------- state ---------------- */
  const api = LIVE ? liveApi() : demoApi();
  const state = {
    me: null,
    seen: {},
    tab: 'events',
    filter: 'all',
    showPast: false,
    weeksShown: 4,
    events: [],
    spelling: [],
    members: [],
    classrooms: [],
    anchors: [],
    going: [],
    plans: [],
    planResponses: [],
    signin: { step: 'email', email: '' },
  };
  const CATS = [
    { id: 'pto', label: 'PTO' },
    { id: 'school', label: 'School' },
    { id: 'homework', label: 'Homework' },
    { id: 'noschool', label: 'No school' },
    { id: 'volunteer', label: 'Volunteer' },
    { id: 'social', label: 'Moms out' },
    { id: 'kids', label: 'Kids' },
    { id: 'rides', label: 'Rides' },
  ];
  const catLabel = (id) => (CATS.find((c) => c.id === id) || { label: 'Other' }).label;
  const canEdit = (row) => state.me && (state.me.is_admin || row.created_by === state.me.id);

  /* ---------------- sign in ---------------- */
  function renderSignIn(err) {
    const s = state.signin;
    const app = $('#app');
    const demo = !LIVE ? `<div class="demo-note"><strong>Demo mode.</strong> Use any email, then the code <strong>123456</strong>.</div>` : '';
    const card = s.step === 'email'
      ? `
        <h2>Sign in</h2>
        <p class="sub">We’ll email you a 6-digit code.</p>
        ${demo}
        <form id="emailForm" novalidate>
          <label class="field"><span>Email</span>
            <input class="input" type="email" name="email" inputmode="email" autocomplete="email" autocapitalize="off" required value="${esc(s.email)}" placeholder="you@example.com">
          </label>
          ${err ? `<p class="hint hint-danger" role="alert">${esc(err)}</p>` : ''}
          <button class="btn btn-primary" type="submit">Send my code</button>
        </form>`
      : `
        <h2>Check your email</h2>
        <p class="sub">We sent a 6-digit code to <strong>${esc(s.email)}</strong>.</p>
        ${demo}
        <form id="codeForm" novalidate>
          <label class="field"><span class="sr-only">6-digit code</span>
            <input class="input code-input" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" required placeholder="••••••">
          </label>
          ${err ? `<p class="hint hint-danger" role="alert">${esc(err)}</p>` : ''}
          <button class="btn btn-primary" type="submit">Sign in</button>
          <button class="link-btn" type="button" data-action="restart">Use a different email</button>
        </form>`;
    app.innerHTML = `
      <main class="signin">
        <div class="signin-hero">
          <span class="logo-mark big" aria-hidden="true">M</span>
          <h1>Morley Moms</h1>
        </div>
        <div class="signin-card">${card}</div>
        
      </main>`;
    const f = $('#emailForm') || $('#codeForm');
    const input = f.querySelector('input');
    setTimeout(() => input.focus(), 50);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      const label = btn.textContent; btn.textContent = s.step === 'email' ? 'Sending…' : 'Checking…';
      try {
        if (s.step === 'email') {
          const email = input.value.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That email doesn\u2019t look quite right.');
          await Promise.race([api.sendCode(email), new Promise((_, rej) => setTimeout(() => rej(new Error('That\u2019s taking too long. Wait a minute, check your spam folder, then try again.')), 30000))]);
          s.email = email; s.step = 'code';
          renderSignIn();
        } else {
          const code = input.value.replace(/\D/g, '');
          if (code.length !== 6) throw new Error('The code is 6 digits.');
          await api.verifyCode(s.email, code);
          await afterSignIn();
        }
      } catch (ex) {
        btn.disabled = false; btn.textContent = label;
        renderSignIn(friendlyAuthError(ex));
      }
    });
    if (input.name === 'code') {
      input.addEventListener('input', () => { if (input.value.replace(/\D/g, '').length === 6) f.requestSubmit(); });
    }
  }

  function friendlyAuthError(ex) {
    const msg = (ex && ex.message) || 'Something went wrong. Try again.';
    if (/not on the morley moms list|signups not allowed|hook/i.test(msg)) return `That email isn\u2019t on the list yet. Ask ${cfg.ADMIN_CONTACT || 'the group admin'} to add you.`;
    if (/expired|invalid/i.test(msg)) return 'That code didn\u2019t work or has expired. Try again or send a new one.';
    if (/rate|too many|security purposes/i.test(msg)) return 'Too many tries. Wait a minute, then try again.';
    return msg;
  }

  function renderNotMember() {
    $('#app').innerHTML = `
      <main class="signin">
        <div class="signin-hero"><span class="logo-mark big" aria-hidden="true">M</span><h1>Almost there</h1></div>
        <div class="signin-card">
          <h2>You're not on the list yet</h2>
          <p class="sub">This app is just for Morley Moms. Ask ${esc(cfg.ADMIN_CONTACT || 'the group admin')} to add your email, then sign in again.</p>
          <button class="btn btn-primary" data-action="signout">OK</button>
        </div>
      </main>`;
  }

  // Text shared into the app from Messages etc. (Android "Share" menu).
  const sharedText = (() => {
    try {
      const q = new URLSearchParams(location.search);
      const t = [q.get('title'), q.get('text'), q.get('url')].filter(Boolean).join(' ').trim();
      if (t) history.replaceState(null, '', location.pathname);
      return t;
    } catch { return ''; }
  })();

  async function afterSignIn() {
    // Ask the phone to keep our saved sign-in even when storage gets tight.
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch {}
    state.me = await api.me();
    if (!state.me) { renderNotMember(); return; }
    renderShell();
    await refresh({ announce: true });
    touchSeen();
    maybeCleanup();
    maybeInstallSheet();
    if (sharedText) {
      quickAddSheet();
      const box = $('#qaText'); if (box) box.value = sharedText;
      quickGo();
    }
  }

  // Once a day, when an admin opens the app, remove things that ended over 30 days ago.
  async function maybeCleanup() {
    if (!LIVE || !state.me || !state.me.is_admin) return;
    const todayIso = isoDate(startOfToday());
    try { if (localStorage.getItem('mm-cleanup') === todayIso) return; } catch {}
    try {
      const cutoff = startOfToday(); cutoff.setDate(cutoff.getDate() - 30);
      const n = await api.cleanupOld(cutoff);
      try { localStorage.setItem('mm-cleanup', todayIso); } catch {}
      if (n) await refresh();
    } catch { /* try again next time */ }
  }

  // One-time "put it on your home screen" nudge. Shows once per phone, or any
  // time the link has ?install=1 (the welcome email uses that link).
  let installShown = false;
  function maybeInstallSheet() {
    if (isStandalone() || sharedText || installShown || document.querySelector('.sheet-backdrop')) return;
    installShown = true;
    const forced = /[?&]install=1/.test(location.search);
    let seen = false;
    try { seen = localStorage.getItem('mm-install-seen') === '1'; } catch {}
    if (seen && !forced) return;
    try { localStorage.setItem('mm-install-seen', '1'); } catch {}
    const steps = isIOS()
      ? `<ol class="install-steps"><li>Open this page in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button (square with an arrow).</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li></ol>`
      : deferredInstall
        ? `<button class="btn btn-yellow btn-install-top" data-action="install">Add to my home screen</button>`
        : `<ol class="install-steps"><li>In Chrome, tap the <strong>⋮</strong> menu.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li></ol>`;
    openSheet(`
      <h2>Put Morley Moms on your home screen</h2>
      ${subLead(`Then it opens like any other app.`)}
      ${steps}
      <div class="sheet-actions"><button class="btn btn-ghost" data-action="close-sheet">Not now</button></div>`);
  }

  /* ---------------- app shell ---------------- */
  function renderShell() {
    $('#app').innerHTML = `
      <div class="shell">
        <a class="skip-link sr-only-focusable" href="#view" data-action="skip">Skip to content</a>
        <div class="ptr-zone" aria-hidden="true"><span class="ptr-spin"></span><span class="ptr-party">\uD83C\uDF89</span></div>
        <header class="topbar">
          <span class="logo-mark" aria-hidden="true">M</span>
          <h1>Morley Moms</h1>
          <span id="classSlot"></span>
          <button class="avatar" data-action="account" aria-label="Your account">${esc(initials(state.me.display_name || state.me.email))}</button>
        </header>
        ${LIVE ? '' : '<div class="demo-banner">Demo mode — nothing you add is saved</div>'}
        <main class="content" id="view" tabindex="-1"></main>
        <button class="fab" data-action="add" aria-label="Add">${ICON.plus}</button>
        <nav class="tabbar" id="tabbar" aria-label="Main"></nav>
      </div>`;
    renderTabs();
  }

  function renderTabs() {
    const tabs = [
      { id: 'events', label: 'Events', icon: ICON.calendar },
      { id: 'spelling', label: 'Spelling', icon: ICON.book },
      { id: 'plans', label: 'Plans', icon: ICON.bulb },
      { id: 'specials', label: 'Specials', icon: ICON.star },
      { id: 'links', label: 'Links', icon: ICON.link },
    ];
    const hadFocus = document.activeElement && document.activeElement.closest && document.activeElement.closest('#tabbar') ? document.activeElement.dataset.tab : null;
    $('#tabbar').innerHTML = tabs.map((t) => {
      const on = state.tab === t.id || (t.id === 'links' && state.tab === 'members');
      return `
      <button class="tab ${on ? 'on' : ''}" data-action="tab" data-tab="${t.id}" ${on ? 'aria-current="page"' : ''}>
        <span class="pill">${t.icon}</span>${t.label}
      </button>`;
    }).join('');
    if (hadFocus) { const b = $(`#tabbar [data-tab="${hadFocus}"]`); if (b) b.focus({ preventScroll: true }); }
    const fab = $('.fab');
    if (fab) fab.style.display = state.tab === 'links' || (state.tab === 'members' && !state.me.is_admin) ? 'none' : '';
  }

  // ---- "What's new" sheet: shows what other moms changed since this phone last said OK ----
  const SEEN_KEY = 'mm.seen';
  const sigHash = (o) => { const t = JSON.stringify(o === undefined ? null : o); let x = 5381; for (let i = 0; i < t.length; i++) x = ((x << 5) + x + t.charCodeAt(i)) | 0; return String(x); };
  const readSeen = () => { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY)); return v && v.v === 1 ? v : null; } catch { return null; } };
  const writeSeen = (v) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(v)); } catch {} };
  const evRec = (e) => [e.title, e.starts_at, e.canceled ? 1 : 0, e.location || '', sigHash(e.details || ''), sigHash([e.ends_at, e.all_day, e.category, e.repeat_days, e.repeat_until, e.classroom_id, e.link])];
  const spRec = (x) => [x.test_date || '', x.title || '', sigHash([x.words, x.challenge_words, x.classroom_id])];
  const plRec = (p) => [p.title, sigHash([p.details, p.link, p.plan_date])];
  const clRec = (c) => [c.name, sigHash([c.schedule, c.notes])];
  const RECS = { ev: evRec, sp: spRec, pl: plRec, cl: clRec };
  const LISTS = { ev: () => state.events, sp: () => state.spelling, pl: () => state.plans, cl: () => state.classrooms };
  function buildSnapshot() {
    const o = { v: 1, ev: {}, sp: {}, pl: {}, cl: {}, go: {}, pr: {} };
    Object.keys(RECS).forEach((k) => LISTS[k]().forEach((x) => { o[k][x.id] = RECS[k](x); }));
    state.going.forEach((g) => { if (g.going) o.go[g.event_id + '|' + g.member_id] = 1; });
    state.planResponses.forEach((r) => { o.pr[r.plan_id + '|' + r.member_id] = r.status; });
    return o;
  }
  // Things I changed myself shouldn't be announced back to me.
  const mineTouched = { ev: new Set(), sp: new Set(), pl: new Set(), cl: new Set() };
  [['updateEvent', 'ev', 0], ['deleteEvent', 'ev', 0], ['updateSpelling', 'sp', 0], ['deleteSpelling', 'sp', 'row'], ['updatePlan', 'pl', 0], ['deletePlan', 'pl', 0], ['saveClassroom', 'cl', 1], ['deleteClassroom', 'cl', 0]].forEach(([fn, kind, at]) => {
    const orig = api[fn]; if (!orig) return;
    api[fn] = async function (...a) { const r = await orig.apply(this, a); const id = at === 'row' ? (a[0] && a[0].id) : a[at]; if (id) mineTouched[kind].add(String(id)); return r; };
  });
  function syncMine() {
    const snap = readSeen(); let any = false;
    Object.keys(mineTouched).forEach((k) => {
      mineTouched[k].forEach((id) => {
        any = true;
        const item = LISTS[k]().find((x) => String(x.id) === id);
        if (snap) { if (item) snap[k][id] = RECS[k](item); else delete snap[k][id]; }
      });
      mineTouched[k].clear();
    });
    if (snap && any) writeSeen(snap);
  }
  function whatChanged(snap) {
    const lines = [], me = state.me, today = startOfToday(), mail = myId();
    const mine = (x) => x.created_by && me && x.created_by === me.id;
    const upcoming = (e) => (isRepeating(e) ? (!e.repeat_until || parseDate(e.repeat_until) >= today) : lastDayOf(e) >= today);
    const names = (arr) => { const n = [...new Set(arr.map((r) => firstName(r.member_name)))].sort(); return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n[0]; };
    state.events.forEach((e) => {
      if (!upcoming(e) || !forMe(e) || isHidden(e)) return;
      const old = snap.ev[e.id];
      if (!old) { if (!mine(e)) lines.push({ i: '➕', t: `${firstName(e.created_by_name)} added ${e.title}`, d: isRepeating(e) ? '' : fmtDay(localDay(e.starts_at)) }); return; }
      const n = evRec(e); if (n.join('|') === old.join('|')) return;
      const parts = [];
      if (n[2] && !old[2]) parts.push('canceled');
      if (n[1] !== old[1]) parts.push(fmtDay(localDay(n[1])) !== fmtDay(localDay(old[1])) ? `moved to ${fmtDay(localDay(n[1]))}` : 'time changed');
      if (n[3] !== old[3]) parts.push('new location');
      if (n[4] !== old[4]) parts.push('details updated');
      if (n[0] !== old[0]) parts.push(`was “${old[0]}”`);
      lines.push({ i: '✏️', t: `${e.title}${parts.length ? ': ' + parts.join(', ') : ' was updated'}` });
    });
    Object.keys(snap.ev).forEach((id) => {
      if (state.events.some((e) => String(e.id) === id)) return;
      const r = snap.ev[id]; if (r[1] && new Date(r[1]) >= today) lines.push({ i: '🗑️', t: `${r[0]} was removed` });
    });
    state.spelling.forEach((x) => {
      if (!forMe(x)) return;
      const old = snap.sp[x.id];
      if (!old) { if (!mine(x) && (!x.test_date || parseDate(x.test_date) >= today)) lines.push({ i: '➕', t: 'New spelling list', d: x.test_date ? 'test ' + fmtDay(parseDate(x.test_date)) : '' }); return; }
      if (spRec(x).join('|') !== old.join('|') && (!x.test_date || parseDate(x.test_date) >= today)) lines.push({ i: '✏️', t: 'A spelling list was updated', d: x.test_date ? 'test ' + fmtDay(parseDate(x.test_date)) : '' });
    });
    state.plans.forEach((p) => {
      const old = snap.pl[p.id];
      if (!old) { if (!mine(p)) lines.push({ i: '💡', t: `${firstName(p.created_by_name)} added a plan: ${p.title}` }); return; }
      if (plRec(p).join('|') !== old.join('|')) lines.push({ i: '✏️', t: `Plan updated: ${p.title}` });
    });
    state.classrooms.forEach((c) => {
      const old = snap.cl[c.id]; if (!old || clRec(c).join('|') === old.join('|')) return;
      lines.push({ i: '⭐', t: `Specials updated for ${c.name}` });
    });
    const goBy = {};
    state.going.forEach((g) => { if (g.going && g.member_id !== mail && !snap.go[g.event_id + '|' + g.member_id]) (goBy[g.event_id] = goBy[g.event_id] || []).push(g); });
    Object.keys(goBy).forEach((id) => {
      const e = state.events.find((x) => String(x.id) === id); if (!e || !upcoming(e)) return;
      const arr = goBy[id]; lines.push({ i: '✅', t: `${names(arr)} ${arr.length === 1 ? 'is' : 'are'} going to ${e.title}` });
    });
    const prBy = {};
    state.planResponses.forEach((r) => { if (r.member_id !== mail && snap.pr[r.plan_id + '|' + r.member_id] !== r.status) (prBy[r.plan_id + '|' + r.status] = prBy[r.plan_id + '|' + r.status] || []).push(r); });
    Object.keys(prBy).forEach((k) => {
      const [pid, st] = k.split('|'); const p = state.plans.find((x) => String(x.id) === pid); if (!p) return;
      const arr = prBy[k];
      lines.push({ i: st === 'signed_up' ? '🎉' : '👋', t: st === 'signed_up' ? `${names(arr)} signed up for ${p.title}` : `${names(arr)} ${arr.length === 1 ? 'is' : 'are'} interested in ${p.title}` });
    });
    return lines;
  }
  // Record that this mom opened the app (at most every 5 minutes). Only admins can read these.
  let lastTouch = 0;
  function touchSeen() {
    if (!state.me || Date.now() - lastTouch < 5 * 60 * 1000) return;
    lastTouch = Date.now(); api.touchSeen();
  }
  function seenText(iso) {
    if (!iso) return 'Not yet';
    const d = new Date(iso), now = new Date();
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const diff = Math.round((day(now) - day(d)) / 86400000);
    const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diff <= 0) return `Today at ${t}`;
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function maybeAnnounce() {
    if (!state.me || document.querySelector('.sheet-backdrop')) return;
    const snap = readSeen();
    if (!snap) { writeSeen(buildSnapshot()); return; }       // first time on this phone: start from today
    // At most once a day. Anything that changes in between (or while someone is away for days)
    // piles up against the saved baseline and arrives together in the next sheet.
    const day = isoDate(new Date());
    let last = ''; try { last = localStorage.getItem('mm.lastNews') || ''; } catch {}
    if (last === day) return;
    const lines = whatChanged(snap);
    if (!lines.length) { writeSeen(buildSnapshot()); return; }
    try { localStorage.setItem('mm.lastNews', day); } catch {}
    const shown = lines.slice(0, 14), more = lines.length - shown.length;
    openSheet(`
      <h2>What’s new</h2>
      ${subLead(`Since you last checked`)}
      <ul class="changes" id="changesList">${shown.map((l) => `<li><span class="ci" aria-hidden="true">${l.i}</span><span>${esc(l.t)}${l.d ? ` <small>· ${esc(l.d)}</small>` : ''}</span></li>`).join('')}</ul>
      ${more > 0 ? `<p class="sub text-2">…and ${more} more</p>` : ''}
      <div class="sheet-actions"><button class="btn btn-primary" data-action="ack-changes">OK, got it</button></div>`);
  }

  async function refresh(opts = {}) {
    let loaded = false;
    try {
      const soft = (p) => p.catch(() => null);   // new tables may not exist until add-plans.sql has been run
      const [events, spelling, members, classrooms, anchors, going, plans, planResponses] = await Promise.all([api.listEvents(), api.listSpelling(), api.listMembers(), api.listClassrooms(), api.listAnchors(), soft(api.listGoing()), soft(api.listPlans()), soft(api.listPlanResponses())]);
      Object.assign(state, { events, spelling, members, classrooms, anchors });
      if (going) state.going = going;
      if (state.me && state.me.is_admin) { const seen = await soft(api.listSeen()); if (seen) state.seen = seen; }
      if (plans) state.plans = plans;
      if (planResponses) state.planResponses = planResponses;
      syncMine(); loaded = true;
    } catch (ex) {
      toast('Couldn\u2019t load the latest. Check your connection.');
    }
    renderView();
    if (opts.announce && loaded) maybeAnnounce();
  }

  const TAB_TITLES = { events: 'Events', spelling: 'Spelling', plans: 'Plans', specials: 'Specials', links: 'Links', members: 'Members' };
  // Re-rendering replaces the buttons, so remember which one had focus and put focus back on its twin.
  const focusKey = (el) => {
    if (!el || !el.dataset || !el.dataset.action) return null;
    const d = el.dataset; return ['action', 'id', 'val', 'filter', 'tab', 'occ'].map((k) => (d[k] !== undefined ? `[data-${k}="${CSS.escape(d[k])}"]` : '')).join('');
  };
  function renderView() {
    const view = $('#view');
    if (!view) return;
    const ae = document.activeElement;
    const key = ae && view.contains(ae) ? focusKey(ae) : null;
    const hadFocusInView = !!(ae && ae !== view && view.contains(ae));
    document.title = (TAB_TITLES[state.tab] ? TAB_TITLES[state.tab] + ' · ' : '') + 'Morley Moms';
    if (state.tab === 'events') view.innerHTML = eventsView();
    if (state.tab === 'spelling') { view.innerHTML = spellingView(); loadPhotos(); }
    if (state.tab === 'plans') view.innerHTML = plansView();
    if (state.tab === 'specials') view.innerHTML = specialsView();
    if (state.tab === 'links') view.innerHTML = linksView();
    if (state.tab === 'members') view.innerHTML = membersView();
    fitDetails();
    updateClassSlot();
    window.scrollTo(0, 0);
    if (hadFocusInView) {
      const twin = key && view.querySelector(key);
      if (twin) twin.focus({ preventScroll: true });
      else { const h = view.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
    }
  }
  // Only keep the little caret where the one-line description is actually cut off.
  function fitDetails() {
    document.querySelectorAll('.details-row').forEach((row) => {
      const p = row.querySelector('.details');
      if (p.classList.contains('clamp') && p.scrollWidth <= p.clientWidth + 1) { row.classList.add('fits'); p.removeAttribute('data-action'); }
    });
  }

  /* ---------------- events ---------------- */
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DOW_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  const isRepeating = (ev) => Array.isArray(ev.repeat_days) && ev.repeat_days.length > 0;
  const localDay = (iso) => { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d; };
  const lastDayOf = (ev) => (ev.ends_at ? localDay(ev.ends_at) : localDay(ev.starts_at));

  // Every date covered by a "No school" item (breaks, holidays), so weekly
  // things like rides skip those days automatically.
  function noSchoolDates() {
    const set = new Set();
    for (const ev of state.events) {
      if (ev.category !== 'noschool' || isRepeating(ev)) continue;
      const d = localDay(ev.starts_at); const end = lastDayOf(ev);
      for (let i = 0; d <= end && i < 60; i++) { set.add(isoDate(d)); d.setDate(d.getDate() + 1); }
    }
    return set;
  }

  function nextOccurrence(ev, from = startOfToday()) {
    const off = noSchoolDates();
    const first = localDay(ev.starts_at);
    const d = new Date(Math.max(first, from));
    const until = ev.repeat_until ? parseDate(ev.repeat_until) : null;
    for (let i = 0; i < 400; i++) {
      if (until && d > until) return null;
      if (ev.repeat_days.includes(DOW[d.getDay()]) && !off.has(isoDate(d))) return new Date(d);
      d.setDate(d.getDate() + 1);
    }
    return null;
  }

  function timeRange(ev) {
    const s = new Date(ev.starts_at);
    if (ev.all_day) return '';
    const e = ev.ends_at ? new Date(ev.ends_at) : null;
    if (!e) return fmtTime(s);
    const a = fmtTime(s); const b = fmtTime(e);
    const ampm = (x) => (x.match(/\s?[AP]M$/i) || [''])[0];
    // "6:30–7:30 PM" instead of "6:30 PM–7:30 PM" when both are PM
    return ampm(a) && ampm(a) === ampm(b) ? `${a.replace(ampm(a), '')}–${b}` : `${a}–${b}`;
  }

  // Ride cards read "Name takes Emora home" so they fit on one line.
  function rideTitle(t) {
    t = String(t || '').trim();
    let m = /^(.+?)\s+takes\s+(.+?)\s+home(?:\s+from school)?\.?$/i.exec(t);
    if (!m) m = /^(.+?)\s+(?:picks up|is picking up|will pick up|drives|is taking|takes)\s+(.+?)(?:\s+(?:home|from school|up from school))?\.?$/i.exec(t);
    return m ? `${m[1]} takes ${m[2]} home` : t;
  }
  function whenText(ev) {
    const s = new Date(ev.starts_at);
    if (isRepeating(ev)) {
      const days = ev.repeat_days.map((k) => DOW_SHORT[k]).join(' & ');
      const t = timeRange(ev);
      return `Every ${days}${t ? ' · ' + t : ''}${ev.repeat_until ? ' · until ' + fmtDay(parseDate(ev.repeat_until)) : ''}`;
    }
    if (ev.category === 'homework' && !isRepeating(ev) && (ev.all_day || !timeRange(ev))) return `Due ${fmtDay(s)}`;
    if (lastDayOf(ev) > localDay(ev.starts_at)) return `${fmtDay(s)} \u2013 ${fmtDay(lastDayOf(ev))}`;
    if (ev.all_day) {
      const end = lastDayOf(ev);
      if (end > localDay(ev.starts_at)) return `${fmtDay(s)} – ${fmtDay(end)}`;
      // Days off and school days are truly all day; anything else just has no time yet.
      return ['noschool', 'school'].includes(ev.category) ? '' : 'Time TBD';
    }
    return timeRange(ev);
  }

  // ---- which class an item is for ----
  const classById = (id) => state.classrooms.find((c) => c.id === id);
  const classTag = (id) => { const c = id && classById(id); return c ? `${c.name}\u2019s class` : ''; };
  const classMeta = (id) => {
    if (!state.classrooms.length) return '';
    return `<p class="meta">${ICON.users}<span>${esc(classTag(id) || 'Everyone')}</span></p>`;
  };
  // Items for one class are hidden from moms who picked a different class. Items for everyone always show.
  const forMe = (item) => !item.classroom_id || !getMyClass() || item.classroom_id === getMyClass();
  const classPicker = (selected, mine = true) => state.classrooms.length ? `
        <label class="field"><span>For which class? <small>(optional)</small></span>
          <select class="input" name="classroom_id"><option value="">Everyone</option>${state.classrooms.map((c) => `<option value="${esc(c.id)}" ${c.id === (selected === undefined ? '' : selected) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        </label>` : '';
  // The little "Showing for" bar, only once something has been marked for a class.
  const shortClass = (c) => c.name.replace(/^(ms|mrs|mr|miss|dr)\.?\s+/i, '').trim();
  // Compact "which class" picker that lives in the header (shows just the teacher's last name).
  function classBar() { return ''; }
  function updateClassSlot() {
    const slot = document.getElementById('classSlot');
    if (!slot) return;
    const used = state.events.some((e) => e.classroom_id) || state.spelling.some((s) => s.classroom_id);
    if (!state.classrooms.length || !(state.tab === 'specials' || (used && ['events', 'spelling'].includes(state.tab)))) { slot.innerHTML = ''; return; }
    const mine = getMyClass();
    slot.innerHTML = `<select class="input class-pick" id="myClass" aria-label="Showing for which class"><option value="">All</option>${state.classrooms.map((c) => `<option value="${esc(c.id)}" ${c.id === mine ? 'selected' : ''}>${esc(shortClass(c))}</option>`).join('')}</select>`;
  }

  // Date block: none for multi-day things (the text shows the range); just the weekday for this week;
  // weekday + number + month for later weeks and for homework due dates.
  function dateBadge(d, ev) {
    if (!ev._spell && !isRepeating(ev) && lastDayOf(ev) > localDay(ev.starts_at)) return '';
    const dow = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const nextMon = mondayOf(startOfToday()); nextMon.setDate(nextMon.getDate() + 7);
    if (ev.category !== 'homework' && localDay(d.toISOString()) < nextMon) {
      return `<div class="datebadge short" aria-hidden="true"><span class="dow">${dow}</span></div>`;
    }
    const now = startOfToday();
    const sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return `<div class="datebadge${sameMonth ? ' nomon' : ''}" aria-hidden="true">
          <span class="dow">${dow}</span>
          <span class="day">${d.getDate()}</span>
          ${sameMonth ? '' : `<span class="mon">${d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>`}
        </div>`;
  }

  function spellTestCard(ev) {
    const d = new Date(ev.starts_at);
    const today = startOfToday();
    const soonCutoff = new Date(today); soonCutoff.setDate(soonCutoff.getDate() + 3);
    const soon = d >= today && d <= soonCutoff;
    const label = testLabel(isoDate(d));
    return `
      <article class="card event cat-spelling ">
        ${dateBadge(d, ev)}
        <div class="body">
          <h3>Spelling test${ev.subtitle ? ' · ' + esc(ev.subtitle) : ''}</h3>
          <p class="meta">${ICON.clock}<span><strong>${esc(label || 'Test day')}</strong></span></p>
          <button class="words-btn" data-action="see-spelling" data-id="${esc(ev.spell_id)}" aria-label="See the spelling words">Words <span aria-hidden="true">›</span></button>
        </div>
      </article>`;
  }

  // Only ever web links. Adds https:// when someone types just "site.org/donate".
  function cleanLink(v) {
    let u = String(v || '').trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) { if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) u = 'https://' + u; else return null; }
    try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; }
  }
  const linkHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

  function eventCard(ev) {
    if (ev._spell) return spellTestCard(ev);
    const repeating = isRepeating(ev);
    const next = repeating ? nextOccurrence(ev) : null;
    const d = repeating ? (next || new Date(ev.starts_at)) : new Date(ev.starts_at);
    const today = startOfToday();
    const soonCutoff = new Date(today); soonCutoff.setDate(soonCutoff.getDate() + 3);
    const happeningNow = !repeating && localDay(ev.starts_at) <= today && lastDayOf(ev) >= today;
    const soon = happeningNow || (d >= today && d <= soonCutoff);
    // Colour is never the only cue: say the kind of card (and "coming up soon") in words for screen readers.
    const catLabel = (CATS.find((c) => c.id === ev.category) || {}).label;
    const cue = ev.category === 'rides' ? '' : `<span class="sr-only">. ${soon ? 'Coming up soon. ' : ''}${catLabel ? esc(catLabel) + '.' : ''}</span>`;
    const evTitle = ev.category === 'rides' ? rideTitle(ev.title) : ev.title;
    return `
      <article ${isRange(ev) ? `data-swipe="${esc(ev.id)}"` : ''} class="card event cat-${esc(ev.category)} ${ev.category === 'pto' && !/meeting/i.test(ev.title || '') ? 'pto-event' : ''} ${isDone(ev) ? 'turned-in' : ''}  ${ev.category === 'noschool' ? 'off' : ''} ${ev.canceled ? 'canceled' : ''}">
        ${dateBadge(d, ev)}
        <div class="body">
          ${happeningNow && lastDayOf(ev) > localDay(ev.starts_at) ? '<span class="chip chip-now">Happening now</span>' : ''}
          ${ev.canceled ? '<span class="chip chip-canceled">Canceled</span>' : ev.replaces ? '<span class="chip chip-now">Changed</span>' : ''}
          <h3>${esc(evTitle)}${cue}</h3>
          ${ev.category === 'rides' || !whenText(ev) ? '' : `<p class="meta">${ICON.clock}<span>${esc(whenText(ev))}</span></p>`}
          ${ev.location ? `<p class="meta">${ICON.pin}<span>${esc(ev.location)}</span></p>` : ''}
          ${ev.category === 'homework' ? classMeta(ev.classroom_id) : ''}
          ${ev.pickup_dropoff ? `<p class="meta">${ICON.car}<span><strong>Drop-off / pickup:</strong> ${esc(ev.pickup_dropoff)}</span></p>` : ''}
          ${ev.details ? `<div class="details-row"><p class="details clamp" data-details data-action="toggle-details">${linkify(ev.details)}</p><button class="caret-btn" data-action="toggle-details" aria-label="Show more" aria-expanded="false"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button></div>` : ''}
          ${ev.ask_going && !ev._occ && !ev._spell ? goingBlock(ev) : ''}
          ${ev.category === 'homework' && !ev._spell ? `<button class="turnin ${isDone(ev) ? 'on' : ''}" data-action="hw-done" data-id="${esc(ev.id)}" aria-pressed="${isDone(ev)}"><span class="box" aria-hidden="true">${isDone(ev) ? '✓' : ''}</span>${isDone(ev) ? 'Turned in' : 'Mark turned in'}</button>` : ''}
          <div class="card-tools">
            ${cleanLink(ev.link) ? `<a class="icon-btn icon-link" href="${esc(cleanLink(ev.link))}" target="_blank" rel="noopener noreferrer" aria-label="${esc((ev.link_label || 'Open link') + ' (' + linkHost(cleanLink(ev.link)) + ')')}" title="${esc((ev.link_label || 'Open link') + ' · ' + linkHost(cleanLink(ev.link)))}">${ICON.link}</a>` : ''}
            <button class="icon-btn" data-action="edit-event" data-id="${esc(ev.id)}" ${ev._occ ? `data-occ="${isoDate(localDay(ev.starts_at))}"` : ''} aria-label="${esc('Edit ' + evTitle)}" title="Edit">${ICON.edit}</button>
            ${isRange(ev) ? `<button class="hide-btn sr-only-focusable" data-action="hide-card" data-id="${esc(ev.id)}" aria-label="${esc('Hide ' + evTitle + ' on this phone')}">Hide</button>` : ''}
          </div>
        </div>
      </article>`;
  }

  // One card per day for weekly things (rides etc.), skipping no-school days.
  function occurrencesOf(ev, from, off) {
    const out = [];
    const changed = new Set(state.events.filter((x) => x.replaces === ev.id).map((x) => isoDate(localDay(x.starts_at))));
    const first = localDay(ev.starts_at);
    const until = ev.repeat_until ? parseDate(ev.repeat_until) : null;
    const s0 = new Date(ev.starts_at);
    const e0 = ev.ends_at ? new Date(ev.ends_at) : null;
    const d = new Date(Math.max(first, from));
    for (let i = 0; i < 400; i++) {
      if (until && d > until) break;
      if (ev.repeat_days.includes(DOW[d.getDay()]) && !off.has(isoDate(d)) && !changed.has(isoDate(d))) {
        const st = new Date(d); st.setHours(s0.getHours(), s0.getMinutes(), 0, 0);
        let en = null;
        if (e0) { en = new Date(d); en.setHours(e0.getHours(), e0.getMinutes(), 0, 0); }
        out.push({ ...ev, starts_at: st.toISOString(), ends_at: en ? en.toISOString() : null, repeat_days: null, repeat_until: null, _occ: true });
      }
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  function weekHeading(monday) {
    const thisMon = mondayOf(new Date());
    const diff = Math.round((monday - thisMon) / (7 * 86400000));
    const fri = new Date(monday); fri.setDate(fri.getDate() + 4);
    const mon = (x) => x.toLocaleDateString(undefined, { month: 'short' });
    const range = monday.getMonth() === fri.getMonth() ? `${mon(monday)} ${monday.getDate()}–${fri.getDate()}` : `${mon(monday)} ${monday.getDate()} – ${mon(fri)} ${fri.getDate()}`;
    if (diff === 0) return `This week · ${range}`;
    if (diff === 1) return `Next week · ${range}`;
    return `Week of ${range}`;
  }

  // ---- who's going (events) and plans ----
  const myId = () => (state.me && state.me.id) || '';
  const myName = () => (state.me && state.me.display_name) || 'A mom';
  const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'Someone';
  const goingFor = (eventId) => state.going.filter((g) => g.event_id === eventId && g.going);
  const myGoing = (eventId) => { const g = state.going.find((x) => x.event_id === eventId && x.member_id === myId()); return g ? g.going : null; };
  function goingBlock(ev) {
    const yes = goingFor(ev.id), mine = myGoing(ev.id);
    const names = yes.map((g) => firstName(g.member_name)).sort((a, b) => a.localeCompare(b));
    return `<div class="rsvp">
      <div class="rsvp-btns" role="group" aria-label="Are you going?">
        <button class="rsvp-btn ${mine === true ? 'yes' : ''}" data-action="going" data-id="${esc(ev.id)}" data-val="yes" aria-pressed="${mine === true}"><span class="box" aria-hidden="true">${mine === true ? '✓' : ''}</span>I’m going</button>
        <button class="rsvp-btn ${mine === false ? 'no' : ''}" data-action="going" data-id="${esc(ev.id)}" data-val="no" aria-pressed="${mine === false}">Can’t make it</button>
      </div>
      <p class="who-line">${names.length ? `<strong>Going (${names.length}):</strong> ${esc(names.join(', '))}` : 'No one has said yes yet'}</p>
    </div>`;
  }
  async function setGoingFor(eventId, val) {
    const cur = myGoing(eventId);
    const next = val === 'yes' ? (cur === true ? null : true) : (cur === false ? null : false);
    state.going = state.going.filter((g) => !(g.event_id === eventId && g.member_id === myId()));
    if (next !== null) state.going.push({ event_id: eventId, member_id: myId(), member_name: myName(), going: next });
    keepScroll(renderView);
    try { await api.setGoing(eventId, next, { id: myId(), name: myName() }); }
    catch { toast('Couldn’t save that. Run add-plans.sql in Supabase first.'); }
  }
  function keepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }

  const respFor = (planId, status) => state.planResponses.filter((r) => r.plan_id === planId && r.status === status);
  const myResp = (planId) => { const r = state.planResponses.find((x) => x.plan_id === planId && x.member_id === myId()); return r ? r.status : null; };
  async function setPlanStatusFor(planId, status) {
    const cur = myResp(planId);
    const next = cur === status ? null : status;
    state.planResponses = state.planResponses.filter((r) => !(r.plan_id === planId && r.member_id === myId()));
    if (next) state.planResponses.push({ plan_id: planId, member_id: myId(), member_name: myName(), status: next });
    keepScroll(renderView);
    try { await api.setPlanStatus(planId, next, { id: myId(), name: myName() }); }
    catch { toast('Couldn’t save that. Run add-plans.sql in Supabase first.'); }
  }
  function planCard(p) {
    const mine = myResp(p.id);
    const interested = respFor(p.id, 'interested').map((r) => firstName(r.member_name)).sort();
    const signed = respFor(p.id, 'signed_up').map((r) => firstName(r.member_name)).sort();
    const link = cleanLink(p.link);
    const when = p.plan_date ? fmtDay(parseDate(p.plan_date)) : '';
    return `<article class="card plan">
      <div class="plan-head">
        <h3>${esc(p.title)}</h3>
        <div class="plan-tools">
          ${link ? `<a class="icon-btn icon-link" href="${esc(link)}" target="_blank" rel="noopener noreferrer" aria-label="Open link (${esc(linkHost(link))})" title="${esc(linkHost(link))}">${ICON.link}</a>` : ''}
          <button class="icon-btn" data-action="edit-plan" data-id="${esc(p.id)}" aria-label="${esc('Edit ' + p.title)}" title="Edit">${ICON.edit}</button>
        </div>
      </div>
      ${when ? `<p class="meta">${ICON.calendar.replace('<svg', '<svg width="16" height="16"')}<span>${esc(when)}</span></p>` : ''}
      ${p.details ? `<div class="details-row"><p class="details clamp" data-details data-action="toggle-details">${linkify(p.details)}</p><button class="caret-btn" data-action="toggle-details" aria-label="Show more" aria-expanded="false"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button></div>` : ''}
      <div class="rsvp-btns mt-10" role="group" aria-label="${esc('Your response to ' + p.title)}">
        <button class="rsvp-btn ${mine === 'interested' ? 'yes' : ''}" data-action="plan-status" data-id="${esc(p.id)}" data-val="interested" aria-pressed="${mine === 'interested'}"><span class="box" aria-hidden="true">${mine === 'interested' ? '✓' : ''}</span>Interested</button>
        <button class="rsvp-btn ${mine === 'signed_up' ? 'yes' : ''}" data-action="plan-status" data-id="${esc(p.id)}" data-val="signed_up" aria-pressed="${mine === 'signed_up'}"><span class="box" aria-hidden="true">${mine === 'signed_up' ? '✓' : ''}</span>We signed up</button>
      </div>
      ${signed.length ? `<p class="who-line"><strong>Signed up (${signed.length}):</strong> ${esc(signed.join(', '))}</p>` : ''}
      ${interested.length ? `<p class="who-line"><strong>Interested (${interested.length}):</strong> ${esc(interested.join(', '))}</p>` : ''}
    </article>`;
  }
  function plansView() {
    const list = [...state.plans].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return `
      <div class="page-head"><div><h2>Plans</h2></div></div>
      ${subLead(`Things we’re thinking about doing together. Tap Interested, and We signed up once you’ve registered.`, 'sub-lead-6')}
      ${list.length ? list.map(planCard).join('') : `<div class="card empty"><p class="big">No plans yet</p><p>Tap + to add something we might do together.</p></div>`}`;
  }
  function planSheet(editId) {
    const p = editId ? state.plans.find((x) => String(x.id) === String(editId)) : null;
    openSheet(`
      <h2>${p ? 'Edit plan' : 'New plan'}</h2>
      <form id="sheetForm">
        <label class="field"><span>What is it?</span><input class="input" name="title" required maxlength="120" value="${esc(p ? p.title : '')}" placeholder="e.g. YMCA Winter Academy"></label>
        <label class="field"><span>Sign-up link <small>(optional)</small></span><input class="input" name="link" type="url" inputmode="url" autocapitalize="off" maxlength="500" value="${esc(p && p.link ? p.link : '')}" placeholder="https://…"></label>
        <label class="field"><span>Date <small>(optional)</small></span><input class="input" type="date" name="plan_date" value="${esc(p && p.plan_date ? p.plan_date : '')}"></label>
        <label class="field"><span>Details <small>(optional)</small></span><textarea class="input" name="details" maxlength="2000" placeholder="Cost, dates, what the girls would do…">${esc(p && p.details ? p.details : '')}</textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">${p ? 'Save changes' : 'Add plan'}</button>
          ${cancelBtn()}
          ${p ? `<button class="btn btn-danger" type="button" data-action="del-plan" data-id="${esc(p.id)}">Delete</button>` : ''}
        </div>
      </form>`, async (fd) => {
      const row = { title: fd.get('title').trim(), link: cleanLink(fd.get('link')) || null, plan_date: fd.get('plan_date') || null, details: fd.get('details').trim() || null };
      if (p) await api.updatePlan(p.id, row); else await api.addPlan(row);
      state.tab = 'plans'; toast(p ? 'Plan updated' : 'Plan added');
    });
  }

  // ---- filter pills: pin up to 3, everything else lives in the ⋯ menu, in the order each mom picks ----
  const FILTER_ORDER_KEY = 'mm.filterOrder', FILTER_PINS_KEY = 'mm.filterPins';
  const ALL_FILTERS = () => [...CATS, { id: 'spelling', label: 'Spelling' }];
  const readJson = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : d; } catch { return d; } };
  const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  function filterOrder() {
    const ids = ALL_FILTERS().map((c) => c.id);
    const saved = readJson(FILTER_ORDER_KEY, []).filter((id) => ids.includes(id));
    return [...saved, ...ids.filter((id) => !saved.includes(id))];
  }
  const filterPins = () => readJson(FILTER_PINS_KEY, ['homework', 'spelling']).filter((id) => ALL_FILTERS().some((c) => c.id === id)).slice(0, 3);
  const filterLabel = (id) => (id === 'all' ? 'All' : (ALL_FILTERS().find((c) => c.id === id) || {}).label || id);
  function filterBar() {
    const pins = filterOrder().filter((id) => filterPins().includes(id));
    const pill = (id) => `<button class="filter ${state.filter === id ? 'on' : ''}" data-action="filter" data-filter="${id}" aria-pressed="${state.filter === id}">${filterLabel(id)}</button>`;
    const hidden = state.filter !== 'all' && !pins.includes(state.filter);
    return pill('all') + pins.map(pill).join('') +
      `<button class="filter more ${hidden ? 'on' : ''}" data-action="filter-menu" aria-haspopup="dialog" aria-label="${hidden ? esc(filterLabel(state.filter)) + ' filter on, all filters' : 'All filters'}">${hidden ? esc(filterLabel(state.filter)) + ' ' : ''}\u22EF</button>`;
  }
  function filterSheet() {
    const order = filterOrder(), pins = filterPins();
    const rows = order.map((id, i) => `
      <div class="frow">
        <button class="frow-name ${state.filter === id ? 'on' : ''}" data-action="filter-pick" data-filter="${id}" aria-pressed="${state.filter === id}">${esc(filterLabel(id))}</button>
        <button class="icon-btn" data-action="filter-up" data-filter="${id}" aria-label="${esc('Move ' + filterLabel(id) + ' up')}" ${i === 0 ? 'disabled' : ''}><span aria-hidden="true">\u25B2</span></button>
        <button class="icon-btn" data-action="filter-down" data-filter="${id}" aria-label="${esc('Move ' + filterLabel(id) + ' down')}" ${i === order.length - 1 ? 'disabled' : ''}><span aria-hidden="true">\u25BC</span></button>
        <button class="pin-btn ${pins.includes(id) ? 'on' : ''}" data-action="filter-pin" data-filter="${id}" aria-label="${esc('Pin ' + filterLabel(id) + ' to the main bar')}" aria-pressed="${pins.includes(id)}">${pins.includes(id) ? 'Pinned' : 'Pin'}</button>
      </div>`).join('');
    const html = `<h2>Filters</h2>
      ${subLead(`Tap a name to use it. Pin up to 3 to keep them on the main bar (${pins.length}/3). Use the arrows to reorder.`)}
      <button class="frow-name frow-name-all ${state.filter === 'all' ? 'on' : ''}" data-action="filter-pick" data-filter="all" aria-pressed="${state.filter === 'all'}">All</button>
      ${rows}
      <div class="sheet-actions"><button class="btn btn-ghost" data-action="close-sheet">Done</button></div>`;
    const sheet = document.querySelector('.sheet');
    if (sheet && sheet.dataset.kind === 'filters') {
      const key = focusKey(document.activeElement);
      sheet.querySelectorAll(':scope > :not(.grab)').forEach((n) => n.remove());
      sheet.insertAdjacentHTML('beforeend', html);
      labelSheet(sheet);
      const twin = key && sheet.querySelector(key);
      // A moved row's arrow may now be disabled (top/bottom); fall back to its twin arrow, then the dialog itself.
      const other = key && sheet.querySelector(key.includes('filter-up') ? key.replace('filter-up', 'filter-down') : key.replace('filter-down', 'filter-up'));
      [twin, other, sheet].find((n) => n && !n.disabled).focus();
    } else { openSheet(html); document.querySelector('.sheet').dataset.kind = 'filters'; }
  }
  function moveFilter(id, dir) {
    const o = filterOrder(); const i = o.indexOf(id); const j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]]; writeJson(FILTER_ORDER_KEY, o);
  }
  function togglePin(id) {
    const p = filterPins();
    if (p.includes(id)) writeJson(FILTER_PINS_KEY, p.filter((x) => x !== id));
    else if (p.length >= 3) { toast('You can pin up to 3. Unpin one first.'); return; }
    else writeJson(FILTER_PINS_KEY, [...p, id]);
  }

  function eventsView() {
    const today = startOfToday();
    const off = noSchoolDates();
    const match = (e) => state.filter === 'all' || e.category === state.filter;
    // Spelling tests show on the calendar too, linked to their word list.
    const spellEvents = (state.spelling || []).filter((s) => s.test_date).map((s) => ({
      id: 'spell-' + s.id, _spell: true, spell_id: s.id, category: 'spelling', classroom_id: s.classroom_id || null,
      title: 'Spelling test', subtitle: s.title || '', words: s.words || [],
      starts_at: parseDate(s.test_date).toISOString(), ends_at: null, all_day: true, repeat_days: [],
    }));
    // Hidden cards drop off the hidden list once their dates have passed (or the card is gone).
    const keepHidden = [...hiddenIds()].filter((id) => { const ev = state.events.find((x) => String(x.id) === id); return ev && lastDayOf(ev) >= today; });
    if (keepHidden.length !== hiddenIds().size) writeJson(HIDE_KEY, keepHidden);
    const oneTime = [...state.events, ...spellEvents].filter((e) => !isRepeating(e) && match(e) && forMe(e));
    const items = [
      ...oneTime.filter((e) => lastDayOf(e) >= today && !(isRange(e) && isHidden(e))),
      ...state.events.filter((e) => isRepeating(e) && match(e) && forMe(e)).flatMap((e) => occurrencesOf(e, today, off)),
    ];
    // Something already under way (like a break) is listed under this week.
    const showDay = (e) => (e.category === 'homework' ? today : new Date(Math.max(localDay(e.starts_at), today)));
    items.sort((a, b) => showDay(a) - showDay(b) || new Date(a.starts_at) - new Date(b.starts_at) || (a.all_day ? -1 : 1));
    const weeks = [];
    for (const e of items) {
      const key = isoDate(mondayOf(showDay(e)));
      if (!weeks.length || weeks[weeks.length - 1].key !== key) weeks.push({ key, items: [] });
      weeks[weeks.length - 1].items.push(e);
    }
    const shown = weeks.slice(0, state.weeksShown || 4);
    const past = oneTime.filter((e) => lastDayOf(e) < today).reverse().slice(0, 10);
    const filters = filterBar();
    return `
      <div class="page-head"><div><h2>${esc(weekHeading(mondayOf(today)))}</h2></div></div>
      <div class="filters" role="group" aria-label="Filter events">${filters}</div>
      ${shown.length ? shown.map((w) => `${w.key === isoDate(mondayOf(today)) ? '' : `<p class="section-label week-label">${esc(weekHeading(parseDate(w.key)))}</p>`}${w.items.map(eventCard).join('')}`).join('') : `
        <div class="card empty"><p class="big">Nothing on the calendar</p></div>`}
      ${weeks.length > shown.length ? `<button class="btn btn-ghost btn-block mt-4" data-action="more-weeks">Show more weeks</button>` : ''}
      ${state.events.some((e) => isRange(e) && isHidden(e)) ? `<button class="btn btn-ghost btn-small mt-12" data-action="hidden-cards">Hidden cards (${state.events.filter((e) => isRange(e) && isHidden(e)).length})</button>` : ''}
      ${past.length ? `
        <button class="btn btn-ghost btn-small mt-12" data-action="toggle-past">${state.showPast ? 'Hide past events' : 'Show past events'}</button>
        ${state.showPast ? `<p class="section-label">Past</p>${past.map(eventCard).join('')}` : ''}` : ''}`;
  }

  function lastSchoolDay() {
    const hit = state.events.filter((e) => /last day of school/i.test(e.title)).map((e) => isoDate(localDay(e.starts_at))).sort().pop();
    return hit || '';
  }

  // Turn a saved event back into form values (in local time).
  function eventToForm(ev) {
    const s = new Date(ev.starts_at);
    const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return {
      title: ev.title, category: ev.category, location: ev.location, pickup_dropoff: ev.pickup_dropoff, details: ev.details, link: ev.link || '', link_label: ev.link_label || '', ask_going: !!ev.ask_going, classroom_id: ev.classroom_id || '',
      date: isoDate(s),
      time: ev.all_day ? '' : hhmm(s),
      end_time: !ev.all_day && ev.ends_at ? hhmm(new Date(ev.ends_at)) : '',
      end_date: ev.all_day && ev.ends_at && lastDayOf(ev) > localDay(ev.starts_at) ? isoDate(lastDayOf(ev)) : '',
      repeat_days: ev.repeat_days || [], repeat_until: ev.repeat_until || '',
      replaces: ev.replaces || null, canceled: !!ev.canceled,
    };
  }

  function addEventSheet(p = {}, editId = null) {
    const editing = editId ? state.events.find((e) => String(e.id) === String(editId)) : null;
    if (editing) p = eventToForm(editing);
    const cat = p.category || 'pto';
    const series = p.replaces ? state.events.find((e) => e.id === p.replaces) : null;
    const reps = p.repeat_days || [];
    openSheet(`
      <h2>${editing ? 'Edit event' : series ? 'Change just this day' : 'New event'}</h2>
      ${filledNote(p)}
      ${series ? `<p class="replace-note">Instead of: <strong>${esc(series.title)}</strong></p>` : ''}
      <form id="sheetForm">
        <label class="field ${p._filled && !p.title ? 'needs' : ''}"><span>What is it?</span><input class="input" name="title" required maxlength="120" value="${esc(p.title || '')}" placeholder="${p._filled && !p.title ? 'Add a short title' : 'e.g. Book fair volunteers'}"></label>
        <div class="field" role="group" aria-labelledby="typeLabel"><span id="typeLabel">Type</span>
          <div class="seg">${CATS.map((c) => `<label><input type="radio" name="category" value="${c.id}" ${c.id === cat ? 'checked' : ''}><span>${c.label}</span></label>`).join('')}</div>
        </div>
        ${classPicker(p.classroom_id !== undefined ? p.classroom_id : '')}
        <div class="row2">
          <label class="field ${p._filled && !p.date ? 'needs' : ''}"><span id="dateLabel">${reps.length ? 'Starts' : (cat === 'homework' ? 'Due date' : 'Date')}</span><input class="input" type="date" name="date" required value="${esc(p.date || (p._filled ? '' : isoDate(new Date())))}"></label>
          <label class="field"><span>Last day <small>(optional)</small></span><input class="input" type="date" name="end_date" value="${esc(p.end_date || '')}"></label>
        </div>
        <div class="row2">
          <label class="field"><span>From <small>(optional)</small></span><input class="input" type="time" name="time" value="${esc(p.time || '')}"></label>
          <label class="field"><span>To <small>(optional)</small></span><input class="input" type="time" name="end_time" value="${esc(p.end_time || '')}"></label>
        </div>
        <button type="button" class="link-btn link-btn-clear" data-action="clear-times">Clear time</button>
        <div class="field" role="group" aria-labelledby="repLabel" ${series ? 'hidden' : ''}><span id="repLabel">Repeats every week? <small>(optional)</small></span>
          <div class="seg">${['mon', 'tue', 'wed', 'thu', 'fri'].map((k) => `<label><input type="checkbox" name="repeat_days" value="${k}" ${reps.includes(k) ? 'checked' : ''}><span>${DOW_SHORT[k]}</span></label>`).join('')}</div>
          <label class="field until-field mt-10 mb-0"><span>Until </span><input class="input" type="date" name="repeat_until" value="${esc(p.repeat_until || lastSchoolDay())}"></label>
        </div>
        <label class="field"><span>Where <small>(optional)</small></span><input class="input" name="location" maxlength="200" value="${esc(p.location || '')}" placeholder="e.g. Morley Library"></label>
        <label class="field"><span>Drop-off / pickup <small>(optional)</small></span><textarea class="input input-compact" name="pickup_dropoff" maxlength="300" rows="2" placeholder="e.g. East doors at 8:45, pickup at 2:30">${esc(p.pickup_dropoff || '')}</textarea></label>
        <div class="row2">
        <label class="check-row"><input type="checkbox" name="ask_going" ${p.ask_going ? 'checked' : ''}><span><strong>Ask who’s going</strong> <small class="text-2">(moms tap I’m going; only yeses are shown)</small></span></label>
          <label class="field"><span>Link <small>(optional)</small></span><input class="input" name="link" type="url" inputmode="url" autocapitalize="off" maxlength="500" value="${esc(p.link || '')}" placeholder="https://…"></label>
          <label class="field"><span>Button says <small>(optional)</small></span><input class="input" name="link_label" maxlength="30" value="${esc(p.link_label || '')}" placeholder="e.g. Donate"></label>
        </div>
        <label class="field"><span>Details <small>(optional)</small></span><textarea class="input" name="details" maxlength="2000" placeholder="What to bring, sign-up links, anything else">${esc(p.details || '')}</textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">${editing ? 'Save changes' : 'Post event'}</button>
          ${cancelBtn()}
          ${editing && canEdit(editing) ? `<button class="btn btn-danger" type="button" data-action="del-event" data-id="${esc(editing.id)}">Delete this event</button>` : ''}
        </div>
      </form>`, async (fd) => {
      const date = fd.get('date');
      const time = fd.get('time');
      const endTime = fd.get('end_time');
      const endDate = fd.get('end_date');
      const repeatDays = series ? [] : fd.getAll('repeat_days');
      const starts = time ? new Date(`${date}T${time}`) : parseDate(date);
      let ends = null;
      if (time && endTime) ends = new Date(`${date}T${endTime}`);
      else if (!time && endDate && endDate > date) ends = parseDate(endDate);
      if (ends && ends < starts) throw new Error('The end is before the start. Check the times.');
      if (repeatDays.length && !fd.get('repeat_until')) throw new Error('Pick the last date it repeats until.');
      const row = {
        title: fd.get('title').trim(),
        category: fd.get('category'),
        starts_at: starts.toISOString(),
        ends_at: ends ? ends.toISOString() : null,
        all_day: !time,
        repeat_days: repeatDays.length ? repeatDays : null,
        repeat_until: repeatDays.length ? fd.get('repeat_until') : null,
        location: fd.get('location').trim() || null,
        ask_going: fd.get('ask_going') === 'on',
        pickup_dropoff: fd.get('pickup_dropoff').trim() || null,
        details: fd.get('details').trim() || null,
        classroom_id: fd.get('classroom_id') || null,
        link: cleanLink(fd.get('link')),
        link_label: cleanLink(fd.get('link')) ? (fd.get('link_label').trim() || null) : null,
      };
      if (fd.get('link').trim() && !row.link) throw new Error('That link doesn\u2019t look right. It should start with https://');
      if (series) { row.replaces = series.id; row.canceled = !!p.canceled; }
      if (editing) await api.updateEvent(editing.id, row); else await api.addEvent(row);
      state.tab = 'events'; state.filter = 'all';
      toast(editing ? 'Event updated' : 'Event posted');
    });
  }

  function occurrenceSheet(id, dateIso) {
    const ev = state.events.find((e) => String(e.id) === String(id));
    if (!ev) return;
    openSheet(`
      <h2>${esc(fmtDay(parseDate(dateIso)))}</h2>
      <p class="qa-sub">${esc(ev.title)}</p>
      <div class="sheet-actions">
        <button class="btn btn-primary" type="button" data-action="occ-change" data-id="${esc(ev.id)}" data-occ="${dateIso}">Change just this day</button>
        <button class="btn btn-ghost" type="button" data-action="occ-cancel" data-id="${esc(ev.id)}" data-occ="${dateIso}">Cancel just this day</button>
        <button class="btn btn-ghost" type="button" data-action="occ-series" data-id="${esc(ev.id)}">Edit every week</button>
      </div>`);
  }

  function oneDayFrom(ev, dateIso) {
    const f = eventToForm(ev);
    return { ...f, date: dateIso, end_date: '', repeat_days: [], repeat_until: '', replaces: ev.id, details: '' };
  }

  async function cancelOneDay(ev, dateIso) {
    const f = oneDayFrom(ev, dateIso);
    const starts = f.time ? new Date(`${dateIso}T${f.time}`) : parseDate(dateIso);
    const ends = f.time && f.end_time ? new Date(`${dateIso}T${f.end_time}`) : null;
    await api.addEvent({ title: ev.title, category: ev.category, starts_at: starts.toISOString(), ends_at: ends ? ends.toISOString() : null,
      all_day: !f.time, location: ev.location || null, pickup_dropoff: null, details: null, repeat_days: null, repeat_until: null,
      replaces: ev.id, canceled: true });
  }

  function downloadIcs(ev) {
    const d = new Date(ev.starts_at);
    const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
    const utc = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ymd = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}`;
    let start; let end;
    if (ev.all_day) {
      const next = new Date(lastDayOf(ev)); next.setDate(next.getDate() + 1);
      start = `DTSTART;VALUE=DATE:${ymd(d)}`; end = `DTEND;VALUE=DATE:${ymd(next)}`;
    } else {
      start = `DTSTART:${utc(d)}`;
      end = `DTEND:${utc(ev.ends_at ? new Date(ev.ends_at) : new Date(d.getTime() + 60 * 60 * 1000))}`;
    }
    let rrule = '';
    if (isRepeating(ev)) {
      const by = ev.repeat_days.map((k) => k.slice(0, 2).toUpperCase()).join(',');
      rrule = `RRULE:FREQ=WEEKLY;BYDAY=${by}${ev.repeat_until ? `;UNTIL=${ev.repeat_until.replace(/-/g, '')}T235959Z` : ''}`;
    }
    const desc = [ev.pickup_dropoff ? `Drop-off / pickup: ${ev.pickup_dropoff}` : '', ev.details || ''].filter(Boolean).join('\n\n');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Morley Moms//EN', 'BEGIN:VEVENT',
      `UID:${ev.id}@morleymoms`, `DTSTAMP:${utc(new Date())}`, start, end, rrule,
      `SUMMARY:${icsEsc(ev.title)}`,
      ev.location ? `LOCATION:${icsEsc(ev.location)}` : '',
      desc ? `DESCRIPTION:${icsEsc(desc)}` : '',
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${ev.title.replace(/[^\w]+/g, '-').toLowerCase()}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* ---------------- spelling ---------------- */
  function testLabel(iso) {
    const d = parseDate(iso);
    const days = Math.round((d - startOfToday()) / 86400000);
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow';
    if (days > 1 && days < 14) return `In ${days} days`;
    return '';
  }

  function spellingView() {
    if (!state.spelling.length) {
      return `<div class="page-head"><div><h2>Spelling words</h2></div></div>
        <div class="card empty"><p class="big">No lists yet</p></div>`;
    }
    const todayIso = isoDate(startOfToday());
    const lists = state.spelling.filter(forMe);
    const upcoming = lists.filter((s) => s.test_date && s.test_date >= todayIso).sort((a, b) => a.test_date.localeCompare(b.test_date));
    const nextId = upcoming.length ? upcoming[0].id : null;
    // Upcoming tests first (soonest on top), then past lists (most recent first).
    const past = lists.filter((s) => !(s.test_date && s.test_date >= todayIso))
      .sort((a, b) => (b.test_date || b.week_of).localeCompare(a.test_date || a.week_of));
    const ordered = [...upcoming, ...past];
    return `
      <div class="page-head"><div><h2>Spelling words</h2></div></div>
      ${classBar()}
      ${ordered.map((s, i) => {
        const next = s.id === nextId;
        const countdown = s.test_date ? testLabel(s.test_date) : '';
        const headline = s.test_date ? `Test ${fmtDay(parseDate(s.test_date))}` : `Week of ${weekRange(s.week_of)}`;
        const pastLabel = i === upcoming.length && upcoming.length ? '<p class="section-label">Past lists</p>' : '';
        return `${pastLabel}
        <article class="card spell ${next ? 'current' : ''}">
          <div class="spell-head">
            <div>
              ${next ? `<span class="chip chip-volunteer">Up next${countdown ? ' · ' + esc(countdown) : ''}</span>` : ''}
              <p class="spell-date ${next ? 'mt-8' : 'mt-0'}">${esc(headline)}</p>
              ${s.title ? `<h3>${esc(s.title)}</h3>` : ''}
            </div>
            <button class="btn btn-ghost btn-small" data-action="edit-spell" data-id="${esc(s.id)}" aria-label="${esc('Edit ' + headline)}">${ICON.edit} Edit</button>
          </div>
          ${(s.words && s.words.length) || (s.challenge_words && s.challenge_words.length) ? `<div class="words">${(s.words || []).map((w) => `<span class="word">${esc(w)}</span>`).join('')}${(s.challenge_words || []).map((w) => `<span class="word challenge-word">${esc(w)}</span>`).join('')}</div>` : ''}
          ${s.notes ? `<p class="details">${linkify(s.notes)}</p>` : ''}
          ${s.photo_path ? `<div class="photo-loading" data-photo="${esc(s.photo_path)}">Loading photo…</div>` : ''}
        </article>`;
      }).join('')}`;
  }

  async function loadPhotos() {
    document.querySelectorAll('[data-photo]').forEach(async (el) => {
      try {
        const url = await api.photoUrl(el.dataset.photo);
        if (!url) throw new Error('no url');
        el.outerHTML = `<a class="photo-btn" href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="Photo of the spelling list"></a>`;
      } catch { el.textContent = 'Photo unavailable'; }
    });
  }

  async function shrinkImage(file, max = 1600) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
      return blob ? new File([blob], 'list.jpg', { type: 'image/jpeg' }) : file;
    } catch { return file; }
  }

  const filledNote = (p) => (p && p._filled ? `<div class="filled-note">Check it over, then post.</div>` : '');

  function addSpellingSheet(p = {}, photoFile = null, editId = null) {
    const editing = editId ? state.spelling.find((x) => String(x.id) === String(editId)) : null;
    if (editing) p = { ...editing };
    let attached = photoFile;
    const words = (p.words || []).join(', ');
    const challenge = (p.challenge_words || []).join(', ');
    openSheet(`
      <h2>${editing ? 'Edit spelling list' : 'Spelling list'}</h2>
      ${filledNote(p)}
      <form id="sheetForm">
        <label class="field ${p._filled && !p.test_date ? 'needs' : ''}"><span>Test day</span><input class="input" type="date" name="test_date" required value="${esc(p.test_date || '')}">
          ${p._filled && !p.test_date ? '' : ''}</label>
        ${classPicker(p.classroom_id !== undefined ? p.classroom_id : '')}
        <label class="field"><span>Unit / pattern <small>(optional)</small></span><input class="input" name="title" maxlength="120" value="${esc(p.title || '')}" placeholder="e.g. Unit 5 — long e"></label>
        <label class="field"><span>Words</span><textarea class="input" name="words" maxlength="2000" placeholder="Separated by commas or one per line">${esc(words)}</textarea></label>
        <label class="field"><span>Challenge words <small>(optional)</small></span><input class="input" name="challenge_words" maxlength="500" value="${esc(challenge)}" placeholder="e.g. neighbor, celebrate"></label>
        <div class="field"><span>Photo of the sheet <small>(optional)</small></span>
          ${editing && editing.photo_path ? '<p class="hint hint-photo">A new photo replaces the current one.</p>' : ''}
          <div id="photoSlot">${attached ? `<div class="attached"><span aria-hidden="true">📷</span> Photo attached <button type="button" class="link-btn inline" data-action="drop-photo">Remove</button></div>` : '<input class="input" type="file" name="photo" accept="image/*" aria-label="Photo of the sheet">'}</div>
        </div>
        <label class="field"><span>Notes <small>(optional)</small></span><textarea class="input" name="notes" maxlength="1000" placeholder="Anything else from the sheet">${esc(p.notes || '')}</textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">${editing ? 'Save changes' : 'Post list'}</button>
          ${cancelBtn()}
          ${editing && canEdit(editing) ? `<button class="btn btn-danger" type="button" data-action="del-spell" data-id="${esc(editing.id)}">Delete this list</button>` : ''}
        </div>
      </form>`, async (fd) => {
      const list = (v) => [...new Set(String(v || '').split(/[\n,]+/).map((w) => w.trim()).filter(Boolean))];
      const w = list(fd.get('words')).slice(0, 60);
      const raw = fd.get('photo');
      const file = attached || (raw && raw.size > 0 ? raw : null);
      if (!w.length && !file && !(editing && editing.photo_path)) throw new Error('Add some words or a photo.');
      const photo = file ? await shrinkImage(file) : null;
      const testDate = fd.get('test_date');
      const row = {
        test_date: testDate,
        week_of: isoDate(mondayOf(parseDate(testDate))),
        title: fd.get('title').trim() || null,
        classroom_id: fd.get('classroom_id') || null,
        words: w,
        challenge_words: list(fd.get('challenge_words')).slice(0, 20),
        notes: fd.get('notes').trim() || null,
      };
      if (editing) await api.updateSpelling(editing.id, row, photo); else await api.addSpelling(row, photo);
      state.tab = 'spelling';
      toast(editing ? 'Spelling list updated' : 'Spelling list posted');
    });
    const slot = $('#photoSlot');
    if (slot) slot.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="drop-photo"]')) {
        e.stopPropagation(); attached = null;
        slot.innerHTML = '<input class="input" type="file" name="photo" accept="image/*" aria-label="Photo of the sheet">';
      }
    });
  }

  /* ---------------- specials (Day 1–4 rotation) ---------------- */
  // The school runs a 4-day rotation. Each school day gets the next number
  // (1, 2, 3, 4, 1…). Weekends and "No school" days (breaks, snow days) don't
  // use up a number. Someone sets "Today is Day __" once; the app counts from
  // there, and any later "Today is Day __" corrects it from that date on.
  const WEEK = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday']];
  const ROT = ['1', '2', '3', '4'];
  const COMMON_SPECIALS = ['Library', 'Music', 'Art', 'Gym'];
  const DONE_KEY = 'mm.hwDone';
  const doneSet = () => { try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]')); } catch { return new Set(); } };
  const isDone = (ev) => ev.category === 'homework' && doneSet().has(String(ev.id));
  function toggleDone(id) {
    const d = doneSet(); const k = String(id);
    if (d.has(k)) d.delete(k); else d.add(k);
    try { localStorage.setItem(DONE_KEY, JSON.stringify([...d])); } catch {}
  }
  // Swipe-left to hide a multi-day card (this phone only). They can be brought back from "Hidden cards".
  const HIDE_KEY = 'mm.hiddenCards';
  const hiddenIds = () => new Set(readJson(HIDE_KEY, []).map(String));
  const isHidden = (ev) => hiddenIds().has(String(ev.id));
  const isRange = (ev) => !ev._spell && !isRepeating(ev) && lastDayOf(ev) > localDay(ev.starts_at);
  function hideCard(id) { const h = [...hiddenIds(), String(id)]; writeJson(HIDE_KEY, [...new Set(h)]); }
  function unhideCard(id) { writeJson(HIDE_KEY, [...hiddenIds()].filter((x) => x !== String(id))); }
  function hiddenSheet() {
    const ids = hiddenIds();
    const list = state.events.filter((e) => ids.has(String(e.id)));
    openSheet(`<h2>Hidden cards</h2>
      ${subLead(`Only hidden on this phone. Tap Show to bring one back.`)}
      ${list.length ? list.map((e) => `<div class="frow"><div class="frow-name frow-name-static">${esc(e.title)}<br><small class="frow-when">${esc(whenText(e))}</small></div><button class="pin-btn" data-action="unhide" data-id="${esc(e.id)}" aria-label="${esc('Show ' + e.title + ' again')}">Show</button></div>`).join('') : '<p>Nothing hidden.</p>'}
      <div class="sheet-actions"><button class="btn btn-ghost" data-action="close-sheet">Done</button></div>`);
  }
  const PINCH_KEY = 'mm.pinchZoom';
  const pinchOn = () => { try { return localStorage.getItem(PINCH_KEY) === '1'; } catch { return false; } };
  setTimeout(() => applyZoom(), 0);
  function applyZoom() {
    const m = document.querySelector('meta[name=viewport]');
    if (m) m.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover' + (pinchOn() ? '' : ', maximum-scale=1, user-scalable=no'));
  }
  const MY_CLASS_KEY = 'mm.myClassroom';
  const getMyClass = () => { try { return localStorage.getItem(MY_CLASS_KEY) || ''; } catch { return ''; } };
  // Private extras (like an enrichment pull-out) live only on this phone,
  // so the group never sees which kids attend.
  const EXTRAS_KEY = 'mm.myExtras';
  const getExtras = () => { try { return JSON.parse(localStorage.getItem(EXTRAS_KEY) || 'null') || { label: 'Enrichment', days: [] }; } catch { return { label: 'Enrichment', days: [] }; } };
  const setExtras = (x) => { try { localStorage.setItem(EXTRAS_KEY, JSON.stringify(x)); } catch {} };
  const setMyClass = (id) => { try { if (id) localStorage.setItem(MY_CLASS_KEY, id); else localStorage.removeItem(MY_CLASS_KEY); } catch {} };

  const isSchoolDay = (d, off) => { const w = d.getDay(); return w >= 1 && w <= 5 && !off.has(isoDate(d)); };

  // The next `count` school days, starting today.
  function upcomingSchoolDays(count = 2, off = noSchoolDates()) {
    const out = []; const d = startOfToday();
    for (let i = 0; out.length < count && i < 60; i++) {
      if (isSchoolDay(d, off)) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  // A class's rotation day number (1–4) for a date, or null if nobody has
  // set that class's day yet (or there's no school that day).
  function rotationDay(date, classId, off = noSchoolDates()) {
    const anchors = (state.anchors || []).filter((a) => a.classroom_id === classId)
      .sort((a, b) => a.anchor_date.localeCompare(b.anchor_date));
    if (!anchors.length) return null;
    const target = new Date(date); target.setHours(0, 0, 0, 0);
    if (!isSchoolDay(target, off)) return null;
    const t = isoDate(target);
    let anchor = anchors.filter((a) => a.anchor_date <= t).pop();
    let n = 0;
    if (anchor) {
      const d = parseDate(anchor.anchor_date);
      while (isoDate(d) < t) { d.setDate(d.getDate() + 1); if (isSchoolDay(d, off)) n++; }
    } else {
      // Only a later date has been set: count back to the target.
      anchor = anchors[0];
      const d = parseDate(anchor.anchor_date);
      while (isoDate(d) > t) { d.setDate(d.getDate() - 1); if (isSchoolDay(d, off)) n--; }
    }
    return ((((anchor.day_number - 1 + n) % 4) + 4) % 4) + 1;
  }

  const dayLabel = (d) => {
    const diff = Math.round((d - startOfToday()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  };

  function specialChips(list) {
    return list && list.length ? list.map((x) => `<span class="sp-chip">${esc(x)}</span>`).join('') : '<span class="sp-none" role="img" aria-label="none">—</span>';
  }

  function specialsView() {
    const rooms = state.classrooms;
    const myId = getMyClass();
    const mine = rooms.find((c) => c.id === myId);
    const off = noSchoolDates();
    const days = upcomingSchoolDays(2, off);
    const first = days[0];
    const isToday = first && isoDate(first) === isoDate(startOfToday());
    const whenWord = !first ? '' : isToday ? 'today' : fmtDay(first);

    const dayButtons = (classId, extra = '') => `<div class="sp-ask-btns ${extra}">${ROT.map((n) =>
      `<button type="button" class="sp-num" data-action="set-day" data-class="${esc(classId)}" data-date="${first ? isoDate(first) : ''}" data-day="${n}">Day ${n}</button>`).join('')}</div>`;

    let hero = '';
    if (rooms.length) {
      const picker = mine ? '' : `<p class="sp-ask-q">Pick your kid’s teacher at the top right to see their day.</p>`;
      let body = '';
      if (!mine) {
        body = '';
      } else if (first && rotationDay(first, mine.id, off) === null) {
        body = `
          <div class="sp-ask">
            <p class="sp-ask-q">What day is ${esc(mine.name)}’s class on ${esc(whenWord)}?</p>
            ${dayButtons(mine.id)}
          </div>`;
      } else {
        const ex = getExtras();
        const hasSchedule = Object.keys(mine.schedule || {}).length > 0;
        body = `<div class="sp-days">${days.map((d) => {
          const num = rotationDay(d, mine.id, off);
          const wk = WEEK[d.getDay() - 1][0];
          const list = [...((mine.schedule || {})[String(num)] || []), ...(ex.days.includes(wk) ? [ex.label] : [])];
          return `
            <div class="sp-day">
              <p class="sp-when">${['Today', 'Tomorrow'].includes(dayLabel(d)) ? `${esc(dayLabel(d))} <small>${esc(d.toLocaleDateString(undefined, { weekday: 'short' }))} · Day ${num}</small>` : `${esc(fmtDay(d))} <small>Day ${num}</small>`}</p>
              <p class="sp-what">${list.length ? esc(list.join(' + ')) : (hasSchedule ? 'No special' : 'Not set yet')}</p>
            </div>`;
        }).join('')}</div>
        <button type="button" class="sp-extras" data-action="edit-extras">${ex.days.length
          ? `${esc(ex.label)}: ${esc(ex.days.map((k) => WEEK.find((w) => w[0] === k)[1].slice(0, 3)).join(', '))} <small>· private · edit</small>`
          : `+ ${esc(ex.label)} days <small>· private</small>`}</button>
        <button type="button" class="sp-fix" data-action="fix-day" data-class="${esc(mine.id)}">Change day number</button>`;
      }
      hero = (picker || body) ? `<div class="card sp-hero">${picker}${body}</div>` : '';
    }

    const roomCard = (c) => {
      const num = first ? rotationDay(first, c.id, off) : null;
      const status = !first ? '' : num
        ? `<p class="sp-status">${isToday ? 'Today' : esc(fmtDay(first))}: <strong>Day ${num}</strong> <button type="button" class="link-btn inline" data-action="fix-day" data-class="${esc(c.id)}">change</button></p>`
        : `<div class="sp-set"><p class="sp-status">Day ${esc(whenWord)}?</p>${dayButtons(c.id, 'light small')}</div>`;
      return `
        <article class="card sp-room ${c.id === myId ? 'mine' : ''}">
          <div class="spell-head">
            <h3 class="sp-name">${esc(c.name)}${c.id === myId ? ' <span class="chip chip-volunteer">My class</span>' : ''}</h3>
            <div class="actions actions-flush">
              <button class="btn btn-ghost btn-small" data-action="edit-class" data-id="${esc(c.id)}" aria-label="${esc('Edit ' + c.name)}">${ICON.edit} Edit</button>
            </div>
          </div>
          ${status}
          <div class="sp-week">
            ${ROT.map((n) => `<div class="sp-row ${num && String(num) === n ? 'today' : ''}"><span class="sp-d">Day ${n}</span><span class="sp-list">${specialChips((c.schedule || {})[n])}</span>${num && String(num) === n ? `<span class="sp-today">${isToday ? 'Today' : 'Next'}</span>` : ''}</div>`).join('')}
          </div>
          ${c.notes ? `<p class="details">${linkify(c.notes)}</p>` : ''}
        </article>`;
    };

    return `
      <div class="page-head"><div><h2>Specials</h2></div></div>
      ${hero}
      ${rooms.length ? (mine ? [mine] : rooms).map(roomCard).join('') : `
        <div class="card empty"><p class="big">No classes yet</p></div>`}`;
  }

  async function setRotationDay(classId, dateIso, n) {
    const c = state.classrooms.find((x) => x.id === classId);
    await api.setAnchor(classId, dateIso, Number(n));
    toast(`${c ? c.name + ': ' : ''}Day ${n}`);
    await refresh();
  }

  function fixDaySheet(classId) {
    const c = state.classrooms.find((x) => x.id === classId);
    const d = upcomingSchoolDays(1)[0];
    if (!c || !d) return;
    const cur = rotationDay(d, c.id);
    openSheet(`
      <h2>${esc(c.name)}’s day number</h2>
      <p class="qa-sub">${esc(dayLabel(d))}${cur ? `: Day ${cur}` : ''}</p>
      <div class="sp-ask-btns light">${ROT.map((n) => `<button type="button" class="sp-num ${String(cur) === n ? 'on' : ''}" data-action="set-day" data-class="${esc(c.id)}" data-date="${isoDate(d)}" data-day="${n}">Day ${n}</button>`).join('')}</div>
      <div class="sheet-actions mt-16">${cancelBtn()}</div>`);
  }

  function extrasSheet() {
    const ex = getExtras();
    openSheet(`
      <h2>Just for my kid</h2>
      <p class="qa-sub">Saved only on your phone.</p>
      <form id="sheetForm">
        <label class="field"><span>What it’s called</span><input class="input" name="label" required maxlength="30" value="${esc(ex.label)}"></label>
        <div class="field" role="group" aria-labelledby="daysLabel"><span id="daysLabel">Which days?</span>
          <div class="seg">${WEEK.map(([k, label]) => `<label><input type="checkbox" name="days" value="${k}" ${ex.days.includes(k) ? 'checked' : ''}><span>${label.slice(0, 3)}</span></label>`).join('')}</div>
        </div>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Save on this phone</button>
          ${cancelBtn()}
        </div>
      </form>`, async (fd) => {
      setExtras({ label: fd.get('label').trim() || 'Enrichment', days: fd.getAll('days') });
      state.tab = 'specials';
      toast('Saved on this phone');
    });
  }

  // "Ms. Carey", "Miss Carey" and "Mrs. Carey" are the same class.
  const lastName = (n) => String(n || '').trim().toLowerCase().split(/\s+/).pop().replace(/'s$/, '');
  const findClass = (n) => state.classrooms.find((c) => lastName(c.name) === lastName(n));

  function specialsSheet(p = {}, editId = null) {
    // Match a spoken class to one we already have, so it updates instead of duplicating.
    const existing = editId ? state.classrooms.find((c) => c.id === editId)
      : (p.name ? findClass(p.name) : null);
    const base = existing ? { ...(existing.schedule || {}) } : {};
    const sched = { ...base, ...(p.schedule || {}) };
    const name = (existing && existing.name) || p.name || '';
    const id = existing ? existing.id : null;
    const dayRow = (n) => {
      const picked = (sched[n] || [])[0] || '';
      return `
        <div class="sp-edit-day" role="group" aria-labelledby="dayLbl${n}">
          <p class="sp-edit-label" id="dayLbl${n}">Day ${n}</p>
          <div class="seg">${COMMON_SPECIALS.map((sp) => `<label><input type="radio" name="d_${n}" value="${sp}" ${picked === sp ? 'checked' : ''}><span>${sp}</span></label>`).join('')}
            <label><input type="radio" name="d_${n}" value="" ${picked ? '' : 'checked'}><span>Not sure</span></label></div>
        </div>`;
    };
    openSheet(`
      <h2>${id ? 'Update specials' : 'Class specials'}</h2>
      ${filledNote(p)}
      ${p._filled && existing ? `` : ''}
      <form id="sheetForm">
        <label class="field ${p._filled && !name ? 'needs' : ''}"><span>Class</span>
          <input class="input" name="name" required maxlength="60" value="${esc(name)}" placeholder="e.g. Ms. Carey" list="classList">
          <datalist id="classList">${state.classrooms.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
        </label>
        ${ROT.map(dayRow).join('')}
        <label class="field"><span>Notes <small>(optional)</small></span><textarea class="input" name="notes" maxlength="500">${esc((p.notes ?? (existing && existing.notes)) || '')}</textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Save specials</button>
          ${cancelBtn()}
          ${existing && canEdit(existing) ? `<button class="btn btn-danger" type="button" data-action="del-class" data-id="${esc(existing.id)}">Delete this class</button>` : ''}
        </div>
      </form>`, async (fd) => {
      const schedule = {};
      for (const n of ROT) { const v = fd.get(`d_${n}`); if (v) schedule[n] = [v]; }
      const nm = fd.get('name').trim();
      const target = id || (findClass(nm) || {}).id || null;
      await api.saveClassroom({ name: nm, schedule, notes: fd.get('notes').trim() || null }, target);
      state.tab = 'specials';
      toast('Specials saved');
    });
  }

  /* ---------------- quick add: talk, type or snap ---------------- */
  // One mic button for every phone:
  //  - Android/Chrome: the phone's own live speech-to-text (free, instant).
  //  - iPhone (and anything without live speech): record a short clip and
  //    turn it into text through our Supabase "transcribe" function.
  // If one way fails, the button quietly switches to the other.
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let preferRecorder = null; // decided on first tap
  let recognizer = null;
  let recorder = null;
  let recTimer = null;

  function quickAddSheet() {
    const canTalk = !!SpeechRec || canRecord;
    openSheet(`
      <h2>What are we adding?</h2>
      ${canTalk ? `
        <div class="qa-mic">
          <button type="button" class="mic" data-action="mic" aria-label="Voice input" aria-pressed="false" aria-describedby="micStatus">${ICON.mic}</button>
          <p id="micStatus" role="status" aria-live="polite">Tap to talk</p>
        </div>` : ''}
      <textarea id="qaText" class="input qa-text" aria-label="What to add" placeholder="${canTalk ? 'Or type it here…' : 'Type it here, or use the 🎤 on your keyboard…'}"></textarea>
      ${navigator.clipboard && navigator.clipboard.readText ? '<button type="button" class="btn btn-ghost btn-small qa-paste" data-action="qa-paste">Paste a text</button>' : ''}
      <button type="button" class="btn btn-primary mt-12" data-action="qa-go">Fill it in</button>
      <div class="qa-or"><span>or</span></div>
      <label class="btn btn-yellow qa-photo">${ICON.camera} Snap the paper
        <input type="file" id="qaPhoto" class="sr-only" accept="image/*">
      </label>
      <div id="qaBusy" class="qa-busy" role="status" hidden><div class="bar"><span></span></div><p>Reading the paper…</p></div>
      <div class="qa-or"><span>or type it in yourself</span></div>
      <div class="qa-manual-row">
        <button type="button" class="btn btn-ghost" data-action="manual-event">Event</button>
        <button type="button" class="btn btn-ghost" data-action="manual-spelling">Spelling</button>
        <button type="button" class="btn btn-ghost" data-action="manual-specials">Specials</button>
      </div>
      <div class="qa-examples">
        <p class="words-label">Try saying</p>
        <p>“Spelling test Thursday the 12th. Words are rain, play, gate, train. Challenge words neighbor and celebrate.”</p>
        <p>“PTO meeting Friday at 6:30 in the library.”</p>
        <p>“Ms. Carey: day 1 art, day 2 gym, day 3 music, day 4 library.”</p>
        <p>“Today is day 3.”</p>
      </div>
`);
    const photo = $('#qaPhoto');
    photo.addEventListener('change', () => { if (photo.files && photo.files[0]) readPhoto(photo.files[0]); });
  }

  // Keep the screen from dimming and locking while the mic is on or the
  // recording is being turned into text.
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on) {
        if (!wakeLock && navigator.wakeLock) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => { wakeLock = null; });
        }
      } else if (wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
    } catch { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (recognizer || recorder)) keepAwake(true);
  });

  function micUi(mode, text) {
    keepAwake(mode === 'listening' || mode === 'working');
    const btn = $('.mic'); const status = $('#micStatus');
    if (btn) { btn.classList.toggle('on', mode === 'listening'); btn.classList.toggle('busy', mode === 'working'); btn.disabled = mode === 'working'; btn.setAttribute('aria-pressed', String(mode === 'listening')); }
    if (status) {
      // The recording timer ticks every second; keep it visible but don't read every tick aloud.
      const tick = mode === 'listening' && status.dataset.mode === 'listening';
      if (tick) status.setAttribute('aria-live', 'off');
      status.dataset.mode = mode; status.textContent = text;
      if (tick) setTimeout(() => status.setAttribute('aria-live', 'polite'), 100);
    }
  }

  function micDone() {
    const box = $('#qaText');
    micUi('idle', box && box.value.trim() ? 'Got it.' : 'Tap to talk');
  }

  function toggleMic() {
    if (recognizer) { recognizer.stop(); return; }
    if (recorder) { recorder.stop(); return; }
    if (preferRecorder === null) preferRecorder = isIOS() || !SpeechRec;
    if (preferRecorder && canRecord) startRecorder();
    else if (SpeechRec) startLiveSpeech();
    else micUi('idle', 'Voice isn’t available on this phone. Type it instead.');
  }

  function startLiveSpeech() {
    const box = $('#qaText');
    const before = box.value ? box.value.trim() + ' ' : '';
    let heard = false;
    try {
      recognizer = new SpeechRec();
      recognizer.lang = 'en-US';
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.onresult = (e) => {
        heard = true;
        let txt = '';
        for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        box.value = before + txt.trim();
      };
      recognizer.onerror = (e) => {
        // Live speech blocked or unavailable: switch to recording, right away.
        if (!heard && canRecord && ['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'language-not-supported'].includes(e.error)) {
          preferRecorder = true;
          recognizer = null;
          startRecorder();
        }
      };
      recognizer.onend = () => { if (recognizer) { recognizer = null; micDone(); } };
      recognizer.start();
      micUi('listening', 'Listening… tap to stop');
    } catch {
      recognizer = null;
      if (canRecord) { preferRecorder = true; startRecorder(); }
      else micUi('idle', 'Voice isn’t available on this phone. Type it instead.');
    }
  }

  async function startRecorder() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      micUi('idle', 'Allow the microphone for this app, then tap the mic again.');
      return;
    }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    const chunks = [];
    try { recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined); } catch { recorder = new MediaRecorder(stream); }
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      clearInterval(recTimer);
      stream.getTracks().forEach((t) => t.stop());
      const mime = recorder.mimeType || type || 'audio/mp4';
      recorder = null;
      const blob = new Blob(chunks, { type: mime });
      if (blob.size < 1500) { micDone(); return; }
      micUi('working', 'Writing it down…');
      try {
        const text = await api.transcribe(blob);
        const box = $('#qaText');
        if (box && text) box.value = (box.value ? box.value.trim() + ' ' : '') + text;
        micDone();
      } catch (ex) {
        micUi('idle', ex.message || 'Couldn’t catch that. Tap the mic and try again.');
      }
    };
    recorder.start();
    const started = Date.now();
    const tick = () => {
      const sec = Math.floor((Date.now() - started) / 1000);
      micUi('listening', `Listening… 0:${String(sec).padStart(2, '0')}`);
      if (sec >= 59 && recorder) recorder.stop();
    };
    tick();
    recTimer = setInterval(tick, 500);
  }

  function stopMic() {
    keepAwake(false);
    if (recognizer) { const r = recognizer; recognizer = null; try { r.abort(); } catch {} }
    if (recorder) { const r = recorder; r.onstop = null; recorder = null; clearInterval(recTimer); try { r.stop(); r.stream.getTracks().forEach((t) => t.stop()); } catch {} }
  }

  function openFilled(r, photoFile) {
    stopMic();
    if (r.type === 'spelling') addSpellingSheet({ ...r, _filled: true }, photoFile || null);
    else if (r.type === 'specials') specialsSheet({ ...r, _filled: true });
    else if (r.type === 'rotation') {
      const d = parseDate(r.date);
      if (!isSchoolDay(d, noSchoolDates())) { toast('There’s no school that day.'); return; }
      const cls = (r.name && findClass(r.name)) || (!r.name && state.classrooms.find((c) => c.id === getMyClass()));
      if (!cls) { toast(r.name ? `Couldn’t find ${r.name}’s class.` : 'Which class? Try “Ms. Carey is on day 3 today.”'); return; }
      closeSheet(); setRotationDay(cls.id, r.date, r.day);
    }
    else {
      const p = { ...r, _filled: true };
      if (r.category === 'rides' && r.date && !(r.repeat_days && r.repeat_days.length) && r.kid) {
        const d = parseDate(r.date); const off = noSchoolDates();
        const firstName = r.kid.split(/\s+/)[0].toLowerCase();
        const usual = state.events.find((e) => isRepeating(e) && e.category === 'rides' && e.title.toLowerCase().includes(firstName)
          && occurrencesOf(e, d, off).some((o) => isoDate(localDay(o.starts_at)) === r.date));
        if (usual) {
          const base = eventToForm(usual);
          Object.assign(p, { replaces: usual.id, time: p.time || base.time, end_time: p.end_time || base.end_time });
        }
      }
      addEventSheet(p);
    }
  }

  // Turn the AI reader's answer into a filled-in form.
  function aiToForm(v) {
    const teacher = (v.teacher || '').trim();
    const cls = teacher ? findClass(teacher) : null;
    const out = aiToFormBase(v);
    if (out && cls) out.classroom_id = cls.id;
    return out;
  }
  function aiToFormBase(v) {
    if (v.kind === 'spelling' && v.words && v.words.length) {
      return { type: 'spelling', title: v.title || undefined, test_date: v.test_date || null, words: v.words, challenge_words: v.challenge_words || [] };
    }
    const e = v.event || {};
    if (!e.title && !e.date) return null;
    const out = { type: 'event', title: e.title || '', date: e.date || null, end_date: e.end_date || '', time: e.time || '', end_time: e.end_time || '', location: e.location || '', pickup_dropoff: '', details: e.details || '' };
    if (e.category) out.category = e.category;
    out.link = e.link || ''; out.link_label = e.link_label || '';
    return out;
  }

  async function quickGo() {
    const text = ($('#qaText').value || '').trim();
    if (!text) { toast('Say or type what you want to add first.'); return; }
    const local = window.MMQuick.parse(text);
    // Events and spelling lists read better with the AI reader (when connected).
    // Rotation days, specials and pickups keep the exact on-phone rules.
    if (api.live && (local.type === 'spelling' || (local.type === 'event' && local.category !== 'rides'))) {
      micUi('working', 'Filling it in…');
      try {
        const form = aiToForm(await api.readNote(text));
        if (form) { if (form.type === 'event' && !form.title) form.title = local.title || ''; openFilled(form); return; }
      } catch { toast('The AI reader isn’t answering, so I used the basic one. Check the title.'); }
      micUi('idle', 'Tap to talk');
    }
    openFilled(local);
  }

  // Free text reading that runs on the phone (Tesseract). Downloaded only
  // the first time someone snaps a photo.
  let tesseractLoading = null;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (!tesseractLoading) {
      tesseractLoading = new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        sc.onload = res; sc.onerror = () => { tesseractLoading = null; rej(new Error('load')); };
        document.head.appendChild(sc);
      });
    }
    return tesseractLoading;
  }

  // Turn a photo by 0/90/180/270 degrees and return it as a canvas.
  async function rotatedCanvas(file, deg, max) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const c = document.createElement('canvas');
    const turned = deg === 90 || deg === 270;
    c.width = turned ? h : w; c.height = turned ? w : h;
    const x = c.getContext('2d');
    x.translate(c.width / 2, c.height / 2);
    x.rotate((deg * Math.PI) / 180);
    x.drawImage(bmp, -w / 2, -h / 2, w, h);
    return c;
  }
  const canvasToFile = async (c) => {
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return new File([blob], 'list.jpg', { type: 'image/jpeg' });
  };

  // Looks for a QR code in the photo and returns the web address inside it.
  let qrLoading = null;
  function loadQr() {
    if (window.jsQR) return Promise.resolve();
    if (!qrLoading) {
      qrLoading = new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        sc.onload = res; sc.onerror = () => { qrLoading = null; rej(new Error('load')); };
        document.head.appendChild(sc);
      });
    }
    return qrLoading;
  }
  async function findQrLink(file) {
    try {
      await loadQr();
      const bmp = await createImageBitmap(file);
      for (const max of [1600, 1000, 2400]) {
        const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(bmp, 0, 0, c.width, c.height);
        const img = x.getImageData(0, 0, c.width, c.height);
        const hit = window.jsQR(img.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
        if (hit && hit.data) { const u = cleanLink(hit.data); if (u) return u; }
      }
    } catch {}
    return null;
  }

  async function readPhoto(file) {
    stopMic();
    const busy = $('#qaBusy'); const bar = busy && busy.querySelector('.bar span'); const label = busy && busy.querySelector('p');
    if (busy) busy.hidden = false;
    const setPct = (p, msg) => { if (bar) bar.style.width = Math.round(p * 100) + '%'; if (label && msg) label.textContent = msg; };
    setPct(0.05, 'Getting the reader ready…');
    let small = await shrinkImage(file, 2000);
    let worker = null;
    // 1) Best reader first: the AI reader through Supabase (works when connected).
    try {
      setPct(0.2, 'Reading the paper…');
      const v = await api.readPhoto(small);
      const form = aiToForm(v);
      if (form) {
        if (form.type === 'event') {
          setPct(0.9, 'Looking for a link…');
          const qr = await findQrLink(file);
          if (qr) form.link = qr; else form.link = cleanLink(form.link) || '';
        }
        if (form.type === 'event' && !form.title && v.text) form.title = window.MMQuick.parse(v.text, { fromPhoto: true, force: 'event' }).title || '';
        openFilled(form, form.type === 'spelling' ? small : null); return;
      }
      if (v.text && v.text.replace(/\W/g, '').length >= 6) {
        const r = window.MMQuick.parse(v.text, { fromPhoto: true });
        openFilled(r, r.type === 'spelling' ? small : null);
        return;
      }
    } catch { toast('The AI reader isn’t answering, so I’m using the basic one.'); }
    try {
      await loadTesseract();
      worker = await window.Tesseract.createWorker('eng');
      await worker.setParameters({ tessedit_pageseg_mode: '11' }); // sparse text: works on tables and forms

      // Papers are often photographed sideways. Try all four turns on a small
      // copy and keep the one that reads as the most real words.
      setPct(0.12, 'Straightening the photo…');
      let best = 0, bestScore = -1;
      for (const deg of [0, 90, 270, 180]) {
        const c = await rotatedCanvas(small, deg, 900);
        const { data } = await worker.recognize(c);
        const score = (data.words || []).filter((w) => w.confidence > 70 && /^[A-Za-z]{3,}$/.test(w.text)).length;
        if (score > bestScore) { bestScore = score; best = deg; }
        setPct(0.12 + 0.18 * ([0, 90, 270, 180].indexOf(deg) + 1) / 4);
        if (deg === 0 && score >= 25) break; // already upright
      }
      if (best) small = await canvasToFile(await rotatedCanvas(small, best, 2000));

      setPct(0.35, 'Reading the paper…');
      const { data } = await worker.recognize(small);
      const text = (data && data.text) || '';
      if (text.replace(/\W/g, '').length < 6) throw new Error('empty');
      const r = window.MMQuick.parse(text, { fromPhoto: true });
      openFilled(r, r.type === 'spelling' ? small : null);
    } catch {
      toast('Couldn’t read that one. The photo is attached; add the words if you can.');
      openFilled({ type: 'spelling' }, small);
    } finally {
      if (worker) { try { await worker.terminate(); } catch {} }
    }
  }

  /* ---------------- members ---------------- */
  // Quick links to the school sites everyone keeps needing.
  const QUICK_LINKS = [
    { group: 'Lunch', items: [
      { icon: '\uD83C\uDF4E', title: 'Lunch menu', note: 'MealViewer', url: 'https://schools.mealviewer.com/school/MorleyElementary' },
      { icon: '\uD83D\uDCB3', title: 'MySchoolBucks', note: 'Lunch money login', url: 'https://www.myschoolbucks.com/' },
    ] },
    { group: 'School calendars', items: [
      { icon: '\uD83D\uDCC5', title: '26\u201327 LPS student calendar', note: 'Google Drive', url: 'https://drive.google.com/file/d/1VUhuFFjwMG-W8uQ1YlsR4JpVqQv37NR8/view' },
      { icon: '\uD83D\uDCC5', title: '27\u201328 LPS student calendar', note: 'Google Drive', url: 'https://drive.google.com/file/d/1r5UjTY5ROljnnShdZr6DHRdwM3-Rq1TV/view' },
    ] },
    { group: 'Grades & attendance', items: [
      { icon: '\uD83C\uDF93', title: 'ParentVUE', note: 'LPS parent login', url: 'https://synergyvue.lps.org/PXP2_Login_Parent.aspx?regenerateSessionId=true' },
    ] },
  ];
  function linksView() {
    return `
      <div class="page-head"><div><h2>Links</h2></div></div>
      ${QUICK_LINKS.map((g) => `
        <p class="section-label">${esc(g.group)}</p>
        ${g.items.map((l) => `
          <a class="card linkrow slim" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
            <span class="linkrow-icon" aria-hidden="true">${l.icon}</span>
            <span class="linkrow-text"><strong>${esc(l.title)}</strong><span class="sr-only">(opens in a new tab)</span></span>
            <span class="linkrow-go" aria-hidden="true">${ICON.link}</span>
          </a>`).join('')}`).join('')}
      <p class="section-label">The group</p>
      <button class="card linkrow linkrow-btn slim" data-action="tab" data-tab="members">
        <span class="linkrow-icon" aria-hidden="true">\uD83D\uDC6D</span>
        <span class="linkrow-text"><strong>Group members</strong></span>
        <span class="linkrow-go" aria-hidden="true">\u203A</span>
      </button>
      <p class="section-label">Help make this better</p>
      <button class="card linkrow linkrow-btn" data-action="feedback">
        <span class="linkrow-icon" aria-hidden="true">\uD83D\uDCA1</span>
        <span class="linkrow-text"><strong>Ideas &amp; bug reports</strong><small>Goes straight to Miranda</small></span>
        <span class="linkrow-go" aria-hidden="true">\u203A</span>
      </button>`;
  }

  function membersView() {
    const admin = state.me.is_admin;
    return `
      <button class="link-btn link-btn-back" data-action="tab" data-tab="links">\u2039 Links</button>
      <div class="page-head"><div><h2>Members</h2><p>${state.members.length} members</p></div></div>
      ${admin ? `` : ''}
      <div class="card card-list">
        ${state.members.map((m) => `
          <div class="member">
            <span class="ava" aria-hidden="true">${esc(initials(m.display_name || m.email))}</span>
            <div class="who"><strong>${esc(m.display_name || m.email)}${m.is_admin ? ' <span class="chip chip-volunteer">Admin</span>' : ''}</strong>
              ${admin ? `<span>${esc(m.email)}</span><span class="seen">Last seen: ${esc(seenText(state.seen[m.email]))}</span>` : ''}</div>
            ${admin && m.email !== state.me.email ? `<button class="btn btn-danger btn-small" data-action="del-member" data-email="${esc(m.email)}">Remove</button>` : ''}
          </div>`).join('')}
      </div>`;
  }

  function addMemberSheet() {
    openSheet(`
      <h2>Add a mom</h2>
      <form id="sheetForm">
        <label class="field"><span>Name</span><input class="input" name="display_name" required maxlength="60" placeholder="e.g. Jess"></label>
        <label class="field"><span>Email</span><input class="input" type="email" name="email" required autocapitalize="off" inputmode="email" placeholder="the email she'll sign in with"></label>
        <label class="check"><input type="checkbox" name="is_admin"> Make her an admin too</label>
        
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Add to the group</button>
          ${cancelBtn()}
        </div>
      </form>`, async (fd) => {
      const email = fd.get('email').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That email doesn\u2019t look right.');
      await api.addMember({ email, display_name: fd.get('display_name').trim(), is_admin: fd.get('is_admin') === 'on' });
      state.tab = 'members';
      toast('Added to the group');
    });
  }

  /* ---------------- account ---------------- */
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let feedbackKind = 'idea';
  function feedbackSheet() {
    const canTalk = !!SpeechRec || canRecord;
    feedbackKind = 'idea';
    openSheet(`
      <h2>Tell Miranda</h2>
      <div class="chips chips-wrap" id="fbKinds" role="group" aria-label="What kind of note is this?">
        <button type="button" class="fb-chip on" data-action="fb-kind" data-kind="idea" aria-pressed="true"><span aria-hidden="true">💡</span> Idea</button>
        <button type="button" class="fb-chip" data-action="fb-kind" data-kind="bug" aria-pressed="false"><span aria-hidden="true">🐞</span> Bug</button>
        <button type="button" class="fb-chip" data-action="fb-kind" data-kind="other" aria-pressed="false"><span aria-hidden="true">💬</span> Other</button>
      </div>
      ${canTalk ? `
        <div class="qa-mic">
          <button type="button" class="mic" data-action="mic" aria-label="Voice input" aria-pressed="false" aria-describedby="micStatus">${ICON.mic}</button>
          <p id="micStatus" role="status" aria-live="polite">Tap to talk</p>
        </div>` : ''}
      <textarea id="qaText" class="input qa-text" aria-label="Your idea or bug report" placeholder="What would make this app better? Or what went wrong?"></textarea>
      <button type="button" class="btn btn-primary mt-12" data-action="fb-send">Send</button>
      ${cancelBtn('mt-8')}
    `);
  }

  function accountSheet() {
    let install = '';
    if (!isStandalone()) {
      install = isIOS()
        ? `<div class="card card-flat-yellow"><strong>Put Morley Moms on your home screen</strong>
            <ol class="install-steps"><li>Open this page in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button (square with an arrow).</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li></ol></div>`
        : deferredInstall
          ? `<button class="btn btn-yellow mb-12" data-action="install">Install Morley Moms on this phone</button>`
          : `<div class="card card-flat-yellow"><strong>Put Morley Moms on your home screen</strong>
            <ol class="install-steps"><li>In Chrome, tap the <strong>⋮</strong> menu.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li></ol></div>`;
    }
    openSheet(`
      <h2>${esc(state.me.display_name || 'Your account')}</h2>
      ${subLead(`${esc(state.me.email)}${state.me.is_admin ? ' · Admin' : ''}`, 'sub-lead-16')}
      ${install}
      <label class="check-row"><input type="checkbox" id="pinchZoom" ${pinchOn() ? 'checked' : ''}><span>Allow pinch to zoom</span></label>
      <p class="sub sub-meta">Privacy: your email is used only to sign you in. Other moms see your name, not your email. Only the group admin can see emails and when you last opened the app.</p>
      <p class="sub sub-meta">App version ${APP_VERSION}</p>
      <div class="sheet-actions">
        <button class="btn btn-ghost" data-action="signout">Sign out</button>
        <button class="btn btn-ghost" data-action="close-sheet">Close</button>
      </div>`);
  }

  /* ---------------- sheets ---------------- */
  // Remember what had focus so it can go back there when the sheet closes (even through sheet-to-sheet swaps).
  let sheetOpener = null;
  function labelSheet(sheet) {
    if (!sheet) return;
    const h = sheet.querySelector('h2');
    if (h) { if (!h.id) h.id = 'sheetTitle'; sheet.setAttribute('aria-labelledby', h.id); }
    const list = sheet.querySelector('#changesList');
    if (list) sheet.setAttribute('aria-describedby', 'changesList'); else sheet.removeAttribute('aria-describedby');
  }
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function openSheet(html, onSubmit) {
    if (!document.querySelector('.sheet-backdrop')) {
      sheetOpener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      if (sheetOpener) sheetOpener._k = focusKey(sheetOpener);
    }
    closeSheet(false);
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" tabindex="-1"><div class="grab" aria-hidden="true"></div>${html}</div>`;
    labelSheet(wrap.querySelector('.sheet'));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) { stopMic(); closeSheet(); } });
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    wrap.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = [...wrap.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1], cur = document.activeElement;
      if (e.shiftKey && (cur === first || cur === wrap.querySelector('.sheet'))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    });
    // Pull the sheet down to dismiss it.
    (() => {
      const sh = wrap.querySelector('.sheet'); let y0 = null, dy = 0;
      sh.addEventListener('touchstart', (e) => { y0 = sh.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; sh.style.transition = 'none'; }, { passive: true });
      sh.addEventListener('touchmove', (e) => {
        if (y0 === null) return;
        dy = e.touches[0].clientY - y0;
        if (dy > 0 && sh.scrollTop <= 0) sh.style.transform = `translateY(${dy}px)`; else sh.style.transform = '';
      }, { passive: true });
      sh.addEventListener('touchend', () => {
        if (y0 === null) return;
        sh.style.transition = 'transform .2s ease';
        if (dy > 110 && sh.scrollTop <= 0) { sh.style.transform = 'translateY(100%)'; setTimeout(() => { stopMic(); closeSheet(); }, 180); }
        else sh.style.transform = '';
        y0 = null;
      });
    })();
    const form = wrap.querySelector('#sheetForm');
    if (!(form && onSubmit)) setTimeout(() => { const sh = wrap.querySelector('.sheet'); if (sh && !sh.contains(document.activeElement)) sh.focus({ preventScroll: true }); }, 30);
    if (form && onSubmit) {
      const first = form.querySelector('input:not([type=radio]):not([type=date]), textarea');
      if (first) setTimeout(() => first.focus(), 80);
      else setTimeout(() => { const sh = wrap.querySelector('.sheet'); if (sh && !sh.contains(document.activeElement)) sh.focus(); }, 80);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true; const label = btn.textContent; btn.textContent = 'Saving…';
        try {
          await onSubmit(new FormData(form));
          closeSheet();
          renderTabs();
          await refresh();
        } catch (ex) {
          btn.disabled = false; btn.textContent = label;
          toast(ex.message || 'Couldn\u2019t save. Try again.');
        }
      });
    }
  }
  function closeSheet(restore = true) {
    const was = document.querySelector('.sheet-backdrop');
    document.querySelectorAll('.sheet-backdrop').forEach((n) => n.remove());
    document.body.style.overflow = '';
    if (restore && was && sheetOpener) {
      const o = sheetOpener; sheetOpener = null;
      const back = o.isConnected ? o : (o._k && document.querySelector(o._k));
      if (back && back.focus) back.focus({ preventScroll: true });
    }
  }
  // Keep keyboard focus inside an open sheet (the page behind it is not reachable while it is up).
  document.addEventListener('focusin', (e) => {
    const sh = document.querySelector('.sheet-backdrop .sheet');
    if (sh && !sh.contains(e.target) && !e.target.closest('#toast')) sh.focus({ preventScroll: true });
  });
  // Escape closes the open sheet (same as Cancel).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented && document.querySelector('.sheet-backdrop')) { e.preventDefault(); stopMic(); closeSheet(); }
  });

  /* ---------------- actions ---------------- */
  // Pull down from the top of the page: the blue header stretches with your finger (up to 1/3 of the screen),
  // a spinner shows above the header content, then it springs back.
  (function pullToRefresh() {
    const TRIGGER = 90;
    let anchor = null, pull = 0, tracking = false, busy = false, raf = 0;
    const zone = () => document.querySelector('.ptr-zone');
    const safe = () => { const t = document.querySelector('.topbar'); return t ? Math.max(0, parseFloat(getComputedStyle(t).paddingTop) - 12) : 0; };
    const maxPull = () => Math.round(window.innerHeight / 3);
    const setH = (px, anim) => {
      const z = zone(); if (!z) return;
      z.style.setProperty('--safe', safe() + 'px');
      z.style.transition = anim ? 'height .25s cubic-bezier(.2,.8,.2,1)' : 'none';
      z.style.height = px + 'px';
      z.classList.toggle('show', px > 18);
      z.classList.toggle('ready', px >= TRIGGER);
    };
    const blocked = (t) => busy || !zone() || document.querySelector('.sheet-backdrop') || (t.closest && t.closest('input, textarea, select'));
    let x0 = 0, axis = '';
    document.addEventListener('touchstart', (e) => {
      tracking = false; anchor = null; pull = 0; axis = '';
      if (blocked(e.target) || e.touches.length !== 1) return;
      tracking = true; x0 = e.touches[0].clientX;
      anchor = window.scrollY <= 1 ? e.touches[0].clientY : null;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!tracking || busy) return;
      const y = e.touches[0].clientY;
      if (!axis) {                                    // decide once: mostly sideways (a card swipe) or mostly down
        const ax = Math.abs(e.touches[0].clientX - x0), ay = Math.abs(y - (anchor === null ? y : anchor));
        if (ax > 8 && ax > ay) { tracking = false; return; }
        if (ay > 8 || window.scrollY > 1) axis = 'v';
      }
      if (window.scrollY > 1) { anchor = null; if (pull) { pull = 0; setH(0); } return; }
      if (anchor === null) anchor = y;               // reached the top mid-scroll: start pulling from here
      const dy = y - anchor;
      if (dy <= 0) { if (pull) { pull = 0; setH(0); } return; }
      if (e.cancelable) e.preventDefault();          // stop the page itself from rubber-banding
      pull = Math.min(dy, maxPull());
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; setH(pull); });
    }, { passive: false });
    const end = async () => {
      if (!tracking) return; tracking = false; anchor = null;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      const z = zone();
      if (pull >= TRIGGER && !busy) {
        busy = true; setH(TRIGGER, true); if (z) z.classList.add('spin');
        const t0 = Date.now();
        try { await refresh({ announce: true }); } catch {}
        const wait = 600 - (Date.now() - t0); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (z) { z.classList.remove('spin'); z.classList.add('done'); }
        await new Promise((r) => setTimeout(r, 750));       // 🎉 moment
        if (z) z.classList.remove('done');
        setH(0, true); busy = false;
      } else setH(0, true);
      pull = 0;
    };
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
  })();

  (function swipeToHide() {
    let el = null, x0 = 0, y0 = 0, dx = 0, locked = false;
    document.addEventListener('touchstart', (e) => {
      const c = e.target.closest && e.target.closest('[data-swipe]');
      if (!c || e.touches.length !== 1) { el = null; return; }
      el = c; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; locked = false;
      el.style.transition = 'none';
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!el) return;
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (!locked) { if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { el.style.transform = ''; el = null; return; } if (Math.abs(mx) > 10) locked = true; else return; }
      dx = Math.min(0, mx);
      el.style.transform = `translateX(${dx}px)`; el.style.opacity = String(Math.max(.35, 1 - Math.abs(dx) / 260));
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (!el) return;
      const c = el; el = null; c.style.transition = 'transform .18s, opacity .18s';
      if (dx < -90) {
        c.style.transform = 'translateX(-110%)'; c.style.opacity = '0';
        const id = c.dataset.swipe;
        setTimeout(() => { const y = window.scrollY; hideCard(id); renderView(); window.scrollTo(0, y); toast('Hidden on this phone. Find it under \u201CHidden cards\u201D at the bottom.'); }, 180);
      } else { c.style.transform = ''; c.style.opacity = ''; }
    }, { passive: true });
  })();

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    try {
      if (a === 'skip') { e.preventDefault(); const v = $('#view'); if (v) v.focus({ preventScroll: false }); }
      else if (a === 'hide-card') { const y = window.scrollY; hideCard(el.dataset.id); renderView(); window.scrollTo(0, y); toast('Hidden on this phone. Find it under \u201CHidden cards\u201D at the bottom.'); }
      else if (a === 'tab') { state.tab = el.dataset.tab; renderTabs(); renderView(); }
      else if (a === 'filter') { state.filter = el.dataset.filter; renderView(); }
      else if (a === 'ack-changes') { writeSeen(buildSnapshot()); closeSheet(); }
      else if (a === 'going') await setGoingFor(el.dataset.id, el.dataset.val);
      else if (a === 'plan-status') await setPlanStatusFor(el.dataset.id, el.dataset.val);
      else if (a === 'edit-plan') planSheet(el.dataset.id);
      else if (a === 'del-plan') { if (!confirm('Delete this plan for everyone?')) return; await api.deletePlan(el.dataset.id); closeSheet(); toast('Plan deleted'); await refresh(); }
      else if (a === 'filter-menu') filterSheet();
      else if (a === 'hidden-cards') hiddenSheet();
      else if (a === 'unhide') { unhideCard(el.dataset.id); hiddenSheet(); renderView(); }
      else if (a === 'filter-pick') { state.filter = el.dataset.filter; closeSheet(); renderView(); }
      else if (a === 'filter-up') { moveFilter(el.dataset.filter, -1); filterSheet(); renderView(); }
      else if (a === 'filter-down') { moveFilter(el.dataset.filter, 1); filterSheet(); renderView(); }
      else if (a === 'filter-pin') { togglePin(el.dataset.filter); filterSheet(); renderView(); }
      else if (a === 'more-weeks') { const y = window.scrollY; state.weeksShown += 4; renderView(); window.scrollTo(0, y); }
      else if (a === 'toggle-past') { state.showPast = !state.showPast; renderView(); }
      else if (a === 'add') {
        if (state.tab === 'members' && state.me.is_admin) addMemberSheet();
        else if (state.tab === 'plans') planSheet();
        else if (state.tab !== 'members' && state.tab !== 'links') quickAddSheet();
      }
      else if (a === 'account') accountSheet();
      else if (a === 'close-sheet') { stopMic(); closeSheet(); }
      else if (a === 'feedback') { closeSheet(); feedbackSheet(); }
      else if (a === 'fb-kind') {
        feedbackKind = el.dataset.kind;
        document.querySelectorAll('#fbKinds button').forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-pressed', String(b === el)); });
      }
      else if (a === 'fb-send') {
        const msg = ($('#qaText').value || '').trim();
        if (!msg) { toast('Type or say something first.'); return; }
        stopMic();
        el.disabled = true;
        try { await api.sendFeedback(feedbackKind, msg); closeSheet(); toast('Sent! Thank you 💛'); }
        catch { el.disabled = false; toast('Couldn’t send that. Try again in a bit.'); }
      }
      else if (a === 'mic') toggleMic();
      else if (a === 'qa-go') quickGo();
      else if (a === 'qa-paste') {
        try {
          const txt = await navigator.clipboard.readText();
          const box = $('#qaText');
          if (box && txt) { box.value = (box.value ? box.value.trim() + '\n' : '') + txt.trim(); }
        } catch { toast('Couldn’t paste. Press and hold the box, then tap Paste.'); }
      }
      else if (a === 'manual-event') { stopMic(); addEventSheet(); }
      else if (a === 'manual-spelling') { stopMic(); addSpellingSheet(); }
      else if (a === 'manual-specials') { stopMic(); specialsSheet(); }
      else if (a === 'edit-class') specialsSheet({}, el.dataset.id);
      else if (a === 'edit-extras') extrasSheet();
      else if (a === 'set-day') { closeSheet(); await setRotationDay(el.dataset.class, el.dataset.date, el.dataset.day); }
      else if (a === 'fix-day') fixDaySheet(el.dataset.class);
      else if (a === 'del-class') {
        if (!confirm('Delete this class and its specials for everyone?')) return;
        await api.deleteClassroom(el.dataset.id); closeSheet(); toast('Class deleted'); await refresh();
      }
      else if (a === 'install' && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; closeSheet(); }
      else if (a === 'restart') { state.signin = { step: 'email', email: state.signin.email }; renderSignIn(); }
      else if (a === 'signout') { closeSheet(); await api.signOut(); state.me = null; state.signin = { step: 'email', email: '' }; renderSignIn(); }
      else if (a === 'hw-done') { toggleDone(el.dataset.id); renderView(); }
      else if (a === 'ics') { const ev = state.events.find((x) => String(x.id) === el.dataset.id); if (ev) downloadIcs(ev); }
      else if (a === 'edit-event') { if (el.dataset.occ) occurrenceSheet(el.dataset.id, el.dataset.occ); else addEventSheet({}, el.dataset.id); }
      else if (a === 'occ-change') { const ev = state.events.find((e) => String(e.id) === el.dataset.id); if (ev) addEventSheet(oneDayFrom(ev, el.dataset.occ)); }
      else if (a === 'occ-series') addEventSheet({}, el.dataset.id);
      else if (a === 'occ-cancel') {
        const ev = state.events.find((e) => String(e.id) === el.dataset.id);
        if (ev) { await cancelOneDay(ev, el.dataset.occ); closeSheet(); toast('Canceled for that day'); await refresh(); }
      }
      else if (a === 'toggle-details') {
        if (e.target.closest('a')) return;
        const row = el.closest('.details-row');
        if (row) {
          const p = row.querySelector('.details'); const b = row.querySelector('.caret-btn');
          const open = p.classList.toggle('clamp') === false;
          b.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-label', open ? 'Show less' : 'Show more');
        }
      }
      else if (a === 'clear-times') {
        document.querySelectorAll('#sheetForm input[name=time], #sheetForm input[name=end_time]').forEach((i) => { i.value = ''; });
      }
      else if (a === 'see-spelling') { state.tab = 'spelling'; renderTabs(); renderView(); }
      else if (a === 'edit-spell') addSpellingSheet({}, null, el.dataset.id);
      else if (a === 'del-event') {
        if (!confirm('Delete this event for everyone?')) return;
        await api.deleteEvent(el.dataset.id); closeSheet(); toast('Event deleted'); await refresh();
      }
      else if (a === 'del-spell') {
        if (!confirm('Delete this spelling list for everyone?')) return;
        const row = state.spelling.find((x) => String(x.id) === el.dataset.id);
        if (row) { await api.deleteSpelling(row); closeSheet(); toast('List deleted'); await refresh(); }
      }
      else if (a === 'del-member') {
        if (!confirm(`Remove ${el.dataset.email} from the group? She won\u2019t be able to see anything anymore.`)) return;
        await api.removeMember(el.dataset.email); toast('Removed'); await refresh();
      }
    } catch (ex) {
      toast(ex.message || 'Something went wrong.');
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target && e.target.name === 'category') {
      const l = document.getElementById('dateLabel');
      if (l && !/Starts/.test(l.textContent)) l.textContent = e.target.value === 'homework' ? 'Due date' : 'Date';
    }
    if (e.target && e.target.id === 'pinchZoom') { try { localStorage.setItem(PINCH_KEY, e.target.checked ? '1' : '0'); } catch {} applyZoom(); return; }
    if (e.target && e.target.id === 'myClass') { setMyClass(e.target.value); renderView(); }
  });

  // Refresh when someone comes back to the app.
  let hiddenAt = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (state.me) { refresh({ announce: Date.now() - hiddenAt > 10 * 60 * 1000 }); touchSeen(); }
  });

  /* ---------------- start ---------------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // Always look for a newer version when the app opens or comes back to the front,
    // and reload once, quietly, when one has arrived.
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      const check = () => { try { reg.update(); } catch {} };
      check();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    }).catch(() => {});
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }
      if (document.querySelector('.sheet-backdrop')) return; // don't interrupt someone typing
      location.reload();
    });
  }

  (async function init() {
    try {
      const s = await api.session();
      if (window.__bootHold) await window.__bootHold;   // first-time seasonal splash stays up a moment
      if (s) await afterSignIn(); else renderSignIn();
    } catch {
      renderSignIn('Couldn\u2019t reach the server. Check your connection and try again.');
    }
  })();
})();

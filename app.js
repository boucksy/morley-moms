/* Morley Moms — private group app
 * Plain JavaScript, no build step, so GitHub Pages can serve it as-is.
 * Runs in DEMO MODE until config.js has your Supabase details.
 */
(() => {
  'use strict';

  const cfg = window.MM_CONFIG || {};
  const LIVE = !!(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && window.supabase);
  const PHOTO_BUCKET = 'spelling-photos';

  /* ---------------- helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  const ICON = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.5 14.6c2.2.4 3.6 2 4 4.6"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r=".5"/><circle cx="16.5" cy="13" r=".5"/></svg>',
  };

  /* ---------------- data: DEMO ---------------- */
  function demoApi() {
    const now = new Date();
    const at = (days, h, m = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
    const day = (days) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(0, 0, 0, 0); return d.toISOString(); };
    const monday = mondayOf(now);
    const lastMonday = new Date(monday); lastMonday.setDate(lastMonday.getDate() - 7);
    let session = null;
    const db = {
      members: [
        { email: 'jess@example.com', display_name: 'Jess', is_admin: false },
        { email: 'priya@example.com', display_name: 'Priya', is_admin: false },
        { email: 'tanya@example.com', display_name: 'Tanya', is_admin: false },
      ],
      // Demo mode shows the real 2026–27 Morley calendar (demo-calendar.js),
      // plus a made-up weekly ride so you can see how rides look.
      events: [
        ...(window.MM_DEMO_CALENDAR || []).map((e) => {
          const allDay = !e.start;
          const starts = allDay ? parseDate(e.date) : new Date(`${e.date}T${e.start}`);
          const ends = allDay ? (e.last_day ? parseDate(e.last_day) : null) : (e.end ? new Date(`${e.date}T${e.end}`) : null);
          return { id: e.id, title: e.title, category: e.category, starts_at: starts.toISOString(), ends_at: ends ? ends.toISOString() : null,
            all_day: allDay, location: e.location, pickup_dropoff: null, details: e.details, repeat_days: e.repeat_days, repeat_until: e.repeat_until,
            created_by: 'u-miranda', created_by_name: 'Miranda' };
        }),
        { id: 'ride-demo', title: 'Jess takes the girls home (example)', category: 'rides', starts_at: new Date('2026-11-03T15:38').toISOString(),
          ends_at: new Date('2026-11-03T17:15').toISOString(), all_day: false, location: null, pickup_dropoff: 'Pickup at dismissal, 3:38',
          details: 'Example ride. Real pickups are added privately, not in the demo.', repeat_days: ['tue'], repeat_until: '2027-05-20', created_by: 'u-jess', created_by_name: 'Jess' },
      ],
      classrooms: [
        { id: 'c1', name: 'Mrs. Smith', schedule: { mon: ['Gym'], tue: ['Art'], wed: ['Gym'], thu: ['Music'], fri: ['Library'] }, notes: '', created_by: 'u-jess', created_by_name: 'Jess' },
        { id: 'c2', name: 'Mr. Lee', schedule: { mon: ['Music'], tue: ['Gym'], wed: ['Library'], thu: ['Art'], fri: ['Gym'] }, notes: 'Library books due back on Wednesday.', created_by: 'u-priya', created_by_name: 'Priya' },
      ],
      spelling: [
        { id: 's1', week_of: isoDate(monday), test_date: isoDate(addDaysTo(monday, 3)), title: 'Unit 4 — long a', words: ['rain', 'play', 'gate', 'train', 'great', 'eight', 'stay', 'paint', 'chase', 'weigh'], challenge_words: ['neighbor', 'celebrate'], notes: 'Practice sheet is due with the test.', photo_path: null, created_by: 'u-priya', created_by_name: 'Priya' },
        { id: 's0', week_of: isoDate(lastMonday), test_date: isoDate(addDaysTo(lastMonday, 4)), title: 'Unit 3 — short vowels review', words: ['jump', 'stick', 'shell', 'clock', 'trust', 'bench', 'frog', 'grin'], challenge_words: [], notes: '', photo_path: null, created_by: 'u-jess', created_by_name: 'Jess' },
      ],
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
      async deleteEvent(id) { db.events = db.events.filter((e) => e.id !== id); return delay(); },
      async listSpelling() { return delay([...db.spelling].sort((a, b) => (b.test_date || b.week_of).localeCompare(a.test_date || a.week_of))); },
      async addSpelling(row, file) {
        const photo_path = file ? URL.createObjectURL(file) : null;
        db.spelling.push({ ...row, id: uid(), photo_path, created_by: 'u-me', created_by_name: state.me.display_name });
        return delay();
      },
      async deleteSpelling(row) { db.spelling = db.spelling.filter((s) => s.id !== row.id); return delay(); },
      async photoUrl(path) { return path; },
      async transcribe() { throw new Error('Voice on iPhone works once the app is connected (see setup step 8). Type it for now.'); },
      async listClassrooms() { return delay([...db.classrooms].sort((a, b) => a.name.localeCompare(b.name))); },
      async saveClassroom(row, id) {
        const clash = db.classrooms.find((c) => c.name.toLowerCase() === row.name.toLowerCase() && c.id !== id);
        if (clash) throw new Error('That class is already in the list.');
        if (id) Object.assign(db.classrooms.find((c) => c.id === id), row);
        else db.classrooms.push({ ...row, id: uid(), created_by: 'u-me', created_by_name: state.me.display_name });
        return delay();
      },
      async deleteClassroom(id) { db.classrooms = db.classrooms.filter((c) => c.id !== id); return delay(); },
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
      async deleteEvent(id) { ok(await sb.from('events').delete().eq('id', id)); },
      async listSpelling() { return ok(await sb.from('spelling_lists').select('*').order('test_date', { ascending: false, nullsFirst: false }).order('week_of', { ascending: false }).limit(30)); },
      async addSpelling(row, file) {
        if (file) {
          const path = `${uid()}.jpg`;
          ok(await sb.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false }));
          row.photo_path = path;
        }
        ok(await sb.from('spelling_lists').insert(row));
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
      async listClassrooms() { return ok(await sb.from('classrooms').select('*').order('name')); },
      async saveClassroom(row, id) {
        const { error } = id ? await sb.from('classrooms').update(row).eq('id', id) : await sb.from('classrooms').insert(row);
        if (error) throw new Error(error.code === '23505' ? 'That class is already in the list.' : error.message);
      },
      async deleteClassroom(id) { ok(await sb.from('classrooms').delete().eq('id', id)); },
      async listMembers() { return ok(await sb.from('members').select('*').order('display_name')); },
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
    tab: 'events',
    filter: 'all',
    showPast: false,
    events: [],
    spelling: [],
    members: [],
    classrooms: [],
    signin: { step: 'email', email: '' },
  };
  const CATS = [
    { id: 'pto', label: 'PTO' },
    { id: 'school', label: 'School' },
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
        <p class="sub">Enter the email you gave the group. We'll send you a 6-digit code — no password needed.</p>
        ${demo}
        <form id="emailForm" novalidate>
          <label class="field"><span>Email</span>
            <input class="input" type="email" name="email" inputmode="email" autocomplete="email" autocapitalize="off" required value="${esc(s.email)}" placeholder="you@example.com">
          </label>
          ${err ? `<p class="hint" style="color:var(--danger)">${esc(err)}</p>` : ''}
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
          ${err ? `<p class="hint" style="color:var(--danger)">${esc(err)}</p>` : ''}
          <button class="btn btn-primary" type="submit">Sign in</button>
          <button class="link-btn" type="button" data-action="restart">Use a different email</button>
        </form>`;
    app.innerHTML = `
      <div class="signin">
        <div class="signin-hero">
          <span class="logo-mark big">MM</span>
          <h1>Morley Moms</h1>
          <p>Our private corner for school stuff, plans and fun.</p>
        </div>
        <div class="signin-card">${card}</div>
        <p class="signin-foot">Members only. You'll stay signed in on this phone.</p>
      </div>`;
    const f = $('#emailForm') || $('#codeForm');
    const input = f.querySelector('input');
    setTimeout(() => input.focus(), 50);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        if (s.step === 'email') {
          const email = input.value.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That email doesn\u2019t look quite right.');
          await api.sendCode(email);
          s.email = email; s.step = 'code';
          renderSignIn();
        } else {
          const code = input.value.replace(/\D/g, '');
          if (code.length !== 6) throw new Error('The code is 6 digits.');
          await api.verifyCode(s.email, code);
          await afterSignIn();
        }
      } catch (ex) {
        btn.disabled = false;
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
      <div class="signin">
        <div class="signin-hero"><span class="logo-mark big">MM</span><h1>Almost there</h1></div>
        <div class="signin-card">
          <h2>You're not on the list yet</h2>
          <p class="sub">This app is just for Morley Moms. Ask ${esc(cfg.ADMIN_CONTACT || 'the group admin')} to add your email, then sign in again.</p>
          <button class="btn btn-primary" data-action="signout">OK</button>
        </div>
      </div>`;
  }

  async function afterSignIn() {
    state.me = await api.me();
    if (!state.me) { renderNotMember(); return; }
    renderShell();
    await refresh();
  }

  /* ---------------- app shell ---------------- */
  function renderShell() {
    $('#app').innerHTML = `
      <div class="shell">
        <header class="topbar">
          <span class="logo-mark">MM</span>
          <h1>Morley Moms</h1>
          <button class="avatar" data-action="account" aria-label="Your account">${esc(initials(state.me.display_name || state.me.email))}</button>
        </header>
        ${LIVE ? '' : '<div class="demo-banner">Demo mode — sample data, nothing is saved</div>'}
        <main class="content" id="view"></main>
        <button class="fab" data-action="add" aria-label="Add">${ICON.plus}</button>
        <nav class="tabbar" id="tabbar"></nav>
      </div>`;
    renderTabs();
  }

  function renderTabs() {
    const tabs = [
      { id: 'events', label: 'Events', icon: ICON.calendar },
      { id: 'spelling', label: 'Spelling', icon: ICON.book },
      { id: 'specials', label: 'Specials', icon: ICON.star },
      { id: 'members', label: 'Members', icon: ICON.users },
    ];
    $('#tabbar').innerHTML = tabs.map((t) => `
      <button class="tab ${state.tab === t.id ? 'on' : ''}" data-action="tab" data-tab="${t.id}" aria-current="${state.tab === t.id ? 'page' : 'false'}">
        <span class="pill">${t.icon}</span>${t.label}
      </button>`).join('');
    const fab = $('.fab');
    if (fab) fab.style.display = state.tab === 'members' && !state.me.is_admin ? 'none' : '';
  }

  async function refresh() {
    try {
      const [events, spelling, members, classrooms] = await Promise.all([api.listEvents(), api.listSpelling(), api.listMembers(), api.listClassrooms()]);
      Object.assign(state, { events, spelling, members, classrooms });
    } catch (ex) {
      toast('Couldn\u2019t load the latest. Check your connection.');
    }
    renderView();
  }

  function renderView() {
    const view = $('#view');
    if (!view) return;
    if (state.tab === 'events') view.innerHTML = eventsView();
    if (state.tab === 'spelling') { view.innerHTML = spellingView(); loadPhotos(); }
    if (state.tab === 'specials') view.innerHTML = specialsView();
    if (state.tab === 'members') view.innerHTML = membersView();
    window.scrollTo(0, 0);
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

  function whenText(ev) {
    const s = new Date(ev.starts_at);
    if (isRepeating(ev)) {
      const days = ev.repeat_days.map((k) => DOW_SHORT[k]).join(' & ');
      const t = timeRange(ev);
      return `Every ${days}${t ? ' · ' + t : ''}${ev.repeat_until ? ' · until ' + fmtDay(parseDate(ev.repeat_until)) : ''}`;
    }
    if (ev.all_day) {
      const end = lastDayOf(ev);
      return end > localDay(ev.starts_at) ? `${fmtDay(s)} – ${fmtDay(end)}` : `${fmtDay(s)} · All day`;
    }
    return `${fmtDay(s)} · ${timeRange(ev)}`;
  }

  function eventCard(ev) {
    const repeating = isRepeating(ev);
    const next = repeating ? nextOccurrence(ev) : null;
    const d = repeating ? (next || new Date(ev.starts_at)) : new Date(ev.starts_at);
    const today = startOfToday();
    const soonCutoff = new Date(today); soonCutoff.setDate(soonCutoff.getDate() + 3);
    const happeningNow = !repeating && localDay(ev.starts_at) <= today && lastDayOf(ev) >= today;
    const soon = happeningNow || (d >= today && d <= soonCutoff);
    return `
      <article class="card event ${soon ? 'soon' : ''} ${ev.category === 'noschool' ? 'off' : ''}">
        <div class="datebadge" aria-hidden="true">
          <span class="mon">${d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
          <span class="day">${d.getDate()}</span>
        </div>
        <div class="body">
          <span class="chip chip-${esc(ev.category)}">${esc(catLabel(ev.category))}</span>${happeningNow && lastDayOf(ev) > localDay(ev.starts_at) ? ' <span class="chip chip-now">Happening now</span>' : ''}
          <h3>${esc(ev.title)}</h3>
          <p class="meta">${ICON.clock}<span>${esc(whenText(ev))}</span></p>
          ${repeating && next ? `<p class="meta">${ICON.calendar.replace('<svg', '<svg width="18" height="18"')}<span><strong>Next:</strong> ${esc(fmtDay(next))}</span></p>` : ''}
          ${ev.location ? `<p class="meta">${ICON.pin}<span>${esc(ev.location)}</span></p>` : ''}
          ${ev.pickup_dropoff ? `<p class="meta">${ICON.car}<span><strong>Drop-off / pickup:</strong> ${esc(ev.pickup_dropoff)}</span></p>` : ''}
          ${ev.details ? `<p class="details">${linkify(ev.details)}</p>` : ''}
          <div class="actions">
            <button class="btn btn-ghost btn-small" data-action="ics" data-id="${esc(ev.id)}">${ICON.calendar.replace('<svg', '<svg width="18" height="18"')} Add to calendar</button>
            ${canEdit(ev) ? `<button class="btn btn-danger btn-small" data-action="del-event" data-id="${esc(ev.id)}">Delete</button>` : ''}
          </div>
          ${ev.created_by_name ? `<p class="by">Added by ${esc(ev.created_by_name)}</p>` : ''}
        </div>
      </article>`;
  }

  function eventsView() {
    const today = startOfToday();
    const match = (e) => state.filter === 'all' || e.category === state.filter;
    const weekly = state.events.filter((e) => isRepeating(e) && match(e) && (!e.repeat_until || parseDate(e.repeat_until) >= today));
    const oneTime = state.events.filter((e) => !isRepeating(e) && match(e));
    const upcoming = oneTime.filter((e) => lastDayOf(e) >= today);
    const past = oneTime.filter((e) => lastDayOf(e) < today).reverse().slice(0, 10);
    const filters = [{ id: 'all', label: 'All' }, ...CATS].map((c) =>
      `<button class="filter ${state.filter === c.id ? 'on' : ''}" data-action="filter" data-filter="${c.id}">${c.label}</button>`).join('');
    return `
      <div class="page-head"><div><h2>What's coming up</h2><p>PTO, school days off, rides and fun plans.</p></div></div>
      <div class="filters" role="toolbar" aria-label="Filter events">${filters}</div>
      ${weekly.length ? `<p class="section-label">Every week</p>${weekly.map(eventCard).join('')}<p class="section-label">Coming up</p>` : ''}
      ${upcoming.length ? upcoming.map(eventCard).join('') : `
        <div class="card empty"><p class="big">Nothing on the calendar</p><p>Tap the + button to add an event.</p></div>`}
      ${past.length ? `
        <button class="btn btn-ghost btn-small" style="margin-top:8px" data-action="toggle-past">${state.showPast ? 'Hide past events' : 'Show past events'}</button>
        ${state.showPast ? `<p class="section-label">Past</p>${past.map(eventCard).join('')}` : ''}` : ''}`;
  }

  function lastSchoolDay() {
    const hit = state.events.filter((e) => /last day of school/i.test(e.title)).map((e) => isoDate(localDay(e.starts_at))).sort().pop();
    return hit || '';
  }

  function addEventSheet(p = {}) {
    const cat = p.category || 'pto';
    const reps = p.repeat_days || [];
    openSheet(`
      <h2>New event</h2>
      ${filledNote(p)}
      <form id="sheetForm">
        <label class="field"><span>What is it?</span><input class="input" name="title" required maxlength="120" value="${esc(p.title || '')}" placeholder="e.g. Book fair volunteers"></label>
        <div class="field"><span>Type</span>
          <div class="seg">${CATS.map((c) => `<label><input type="radio" name="category" value="${c.id}" ${c.id === cat ? 'checked' : ''}><span>${c.label}</span></label>`).join('')}</div>
        </div>
        <div class="row2">
          <label class="field ${p._filled && !p.date ? 'needs' : ''}"><span>${reps.length ? 'Starts' : 'Date'}</span><input class="input" type="date" name="date" required value="${esc(p.date || (p._filled ? '' : isoDate(new Date())))}"></label>
          <label class="field"><span>Last day <small>(if more than one)</small></span><input class="input" type="date" name="end_date" value="${esc(p.end_date || '')}"></label>
        </div>
        <div class="row2">
          <label class="field"><span>From <small>(optional)</small></span><input class="input" type="time" name="time" value="${esc(p.time || '')}"></label>
          <label class="field"><span>To <small>(optional)</small></span><input class="input" type="time" name="end_time" value="${esc(p.end_time || '')}"></label>
        </div>
        <div class="field"><span>Repeats every week? <small>(optional)</small></span>
          <div class="seg">${['mon', 'tue', 'wed', 'thu', 'fri'].map((k) => `<label><input type="checkbox" name="repeat_days" value="${k}" ${reps.includes(k) ? 'checked' : ''}><span>${DOW_SHORT[k]}</span></label>`).join('')}</div>
          <label class="field" style="margin:10px 0 0"><span>Until <small>(skips days with no school)</small></span><input class="input" type="date" name="repeat_until" value="${esc(p.repeat_until || lastSchoolDay())}"></label>
        </div>
        <label class="field"><span>Where <small>(optional)</small></span><input class="input" name="location" maxlength="200" value="${esc(p.location || '')}" placeholder="e.g. Morley Library"></label>
        <label class="field"><span>Drop-off / pickup <small>(optional)</small></span><textarea class="input" name="pickup_dropoff" maxlength="300" rows="2" style="min-height:0" placeholder="e.g. East doors at 8:45, pickup at 2:30">${esc(p.pickup_dropoff || '')}</textarea></label>
        <label class="field"><span>Details <small>(optional)</small></span><textarea class="input" name="details" maxlength="2000" placeholder="What to bring, sign-up links, anything else">${esc(p.details || '')}</textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Post event</button>
          <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
        </div>
      </form>`, async (fd) => {
      const date = fd.get('date');
      const time = fd.get('time');
      const endTime = fd.get('end_time');
      const endDate = fd.get('end_date');
      const repeatDays = fd.getAll('repeat_days');
      const starts = time ? new Date(`${date}T${time}`) : parseDate(date);
      let ends = null;
      if (time && endTime) ends = new Date(`${date}T${endTime}`);
      else if (!time && endDate && endDate > date) ends = parseDate(endDate);
      if (ends && ends < starts) throw new Error('The end is before the start. Check the times.');
      if (repeatDays.length && !fd.get('repeat_until')) throw new Error('Pick the last date it repeats until.');
      await api.addEvent({
        title: fd.get('title').trim(),
        category: fd.get('category'),
        starts_at: starts.toISOString(),
        ends_at: ends ? ends.toISOString() : null,
        all_day: !time,
        repeat_days: repeatDays.length ? repeatDays : null,
        repeat_until: repeatDays.length ? fd.get('repeat_until') : null,
        location: fd.get('location').trim() || null,
        pickup_dropoff: fd.get('pickup_dropoff').trim() || null,
        details: fd.get('details').trim() || null,
      });
      state.tab = 'events'; state.filter = 'all';
      toast('Event posted');
    });
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
        <div class="card empty"><p class="big">No lists yet</p><p>Tap + and snap the Friday-folder sheet, or just say the words.</p></div>`;
    }
    const todayIso = isoDate(startOfToday());
    const upcoming = state.spelling.filter((s) => s.test_date && s.test_date >= todayIso).sort((a, b) => a.test_date.localeCompare(b.test_date));
    const nextId = upcoming.length ? upcoming[0].id : null;
    // Upcoming tests first (soonest on top), then past lists (most recent first).
    const past = state.spelling.filter((s) => !(s.test_date && s.test_date >= todayIso))
      .sort((a, b) => (b.test_date || b.week_of).localeCompare(a.test_date || a.week_of));
    const ordered = [...upcoming, ...past];
    return `
      <div class="page-head"><div><h2>Spelling words</h2><p>Next test on top.</p></div></div>
      ${upcoming.length ? '' : '<p class="hint" style="margin:-4px 2px 12px">No upcoming tests posted yet.</p>'}
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
              <p class="spell-date" style="margin-top:${next ? '8px' : '0'}">${esc(headline)}</p>
              ${s.title ? `<h3>${esc(s.title)}</h3>` : ''}
            </div>
            ${canEdit(s) ? `<button class="btn btn-danger btn-small" data-action="del-spell" data-id="${esc(s.id)}">Delete</button>` : ''}
          </div>
          ${s.words && s.words.length ? `<div class="words">${s.words.map((w) => `<span class="word">${esc(w)}</span>`).join('')}</div>` : ''}
          ${s.challenge_words && s.challenge_words.length ? `
            <p class="words-label">Challenge words</p>
            <div class="words challenge">${s.challenge_words.map((w) => `<span class="word">${esc(w)}</span>`).join('')}</div>` : ''}
          ${s.notes ? `<p class="details">${linkify(s.notes)}</p>` : ''}
          ${s.photo_path ? `<div class="photo-loading" data-photo="${esc(s.photo_path)}">Loading photo…</div>` : ''}
          ${s.created_by_name ? `<p class="by">Added by ${esc(s.created_by_name)}</p>` : ''}
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

  const filledNote = (p) => (p && p._filled ? `<div class="filled-note"><strong>Filled in for you.</strong> Check it over, fix anything that's off, then post.</div>` : '');

  function addSpellingSheet(p = {}, photoFile = null) {
    let attached = photoFile;
    const words = (p.words || []).join(', ');
    const challenge = (p.challenge_words || []).join(', ');
    openSheet(`
      <h2>Spelling list</h2>
      ${filledNote(p)}
      <form id="sheetForm">
        <label class="field ${p._filled && !p.test_date ? 'needs' : ''}"><span>Test day</span><input class="input" type="date" name="test_date" required value="${esc(p.test_date || '')}">
          ${p._filled && !p.test_date ? '<p class="hint">Couldn’t find the test day. Pick it here.</p>' : ''}</label>
        <label class="field"><span>Unit / pattern <small>(optional)</small></span><input class="input" name="title" maxlength="120" value="${esc(p.title || '')}" placeholder="e.g. Unit 5 — long e"></label>
        <label class="field"><span>Words</span><textarea class="input" name="words" maxlength="2000" placeholder="Separated by commas or one per line">${esc(words)}</textarea></label>
        <label class="field"><span>Challenge words <small>(optional)</small></span><input class="input" name="challenge_words" maxlength="500" value="${esc(challenge)}" placeholder="e.g. neighbor, celebrate"></label>
        <div class="field"><span>Photo of the sheet <small>(optional)</small></span>
          <div id="photoSlot">${attached ? `<div class="attached">📷 Photo attached <button type="button" class="link-btn inline" data-action="drop-photo">Remove</button></div>` : '<input class="input" type="file" name="photo" accept="image/*">'}</div>
        </div>
        <label class="field"><span>Notes <small>(optional)</small></span><textarea class="input" name="notes" maxlength="1000" placeholder="Practice sheet due, tips, anything else">${esc(p.notes || '')}</textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Post list</button>
          <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
        </div>
      </form>`, async (fd) => {
      const list = (v) => [...new Set(String(v || '').split(/[\n,]+/).map((w) => w.trim()).filter(Boolean))];
      const w = list(fd.get('words')).slice(0, 60);
      const raw = fd.get('photo');
      const file = attached || (raw && raw.size > 0 ? raw : null);
      if (!w.length && !file) throw new Error('Add some words or a photo.');
      const photo = file ? await shrinkImage(file) : null;
      const testDate = fd.get('test_date');
      await api.addSpelling({
        test_date: testDate,
        week_of: isoDate(mondayOf(parseDate(testDate))),
        title: fd.get('title').trim() || null,
        words: w,
        challenge_words: list(fd.get('challenge_words')).slice(0, 20),
        notes: fd.get('notes').trim() || null,
      }, photo);
      state.tab = 'spelling';
      toast('Spelling list posted');
    });
    const slot = $('#photoSlot');
    if (slot) slot.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="drop-photo"]')) {
        e.stopPropagation(); attached = null;
        slot.innerHTML = '<input class="input" type="file" name="photo" accept="image/*">';
      }
    });
  }

  /* ---------------- specials ---------------- */
  const WEEK = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday']];
  const COMMON_SPECIALS = ['Library', 'Music', 'Art', 'Gym'];
  const SPECIAL_TIPS = { Gym: 'Wear sneakers 👟', Library: 'Return library books 📚', Art: 'Wear clothes that can get messy 🎨' };
  const MY_CLASS_KEY = 'mm.myClassroom';
  const getMyClass = () => { try { return localStorage.getItem(MY_CLASS_KEY) || ''; } catch { return ''; } };
  // Private extras (like an enrichment pull-out) live only on this phone,
  // so the group never sees which kids attend.
  const EXTRAS_KEY = 'mm.myExtras';
  const getExtras = () => { try { return JSON.parse(localStorage.getItem(EXTRAS_KEY) || 'null') || { label: 'Enrichment', days: [] }; } catch { return { label: 'Enrichment', days: [] }; } };
  const setExtras = (x) => { try { localStorage.setItem(EXTRAS_KEY, JSON.stringify(x)); } catch {} };
  const setMyClass = (id) => { try { if (id) localStorage.setItem(MY_CLASS_KEY, id); else localStorage.removeItem(MY_CLASS_KEY); } catch {} };

  // Next school days (skips weekends): today if it's a weekday, then the next one.
  function schoolDays() {
    const out = []; const d = startOfToday();
    while (out.length < 2) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  const keyOf = (d) => WEEK[d.getDay() - 1][0];
  const dayLabel = (d) => {
    const diff = Math.round((d - startOfToday()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  };

  function specialChips(list) {
    return list && list.length ? list.map((x) => `<span class="sp-chip">${esc(x)}</span>`).join('') : '<span class="sp-none">—</span>';
  }

  function specialsView() {
    const rooms = state.classrooms;
    const myId = getMyClass();
    const mine = rooms.find((c) => c.id === myId);
    let hero = '';
    if (rooms.length) {
      const picker = `
        <label class="field my-class"><span>My kid’s class</span>
          <select class="input" id="myClass">
            <option value="">Choose a class…</option>
            ${rooms.map((c) => `<option value="${esc(c.id)}" ${c.id === myId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </label>`;
      const days = mine ? schoolDays().map((d) => {
        const extras = getExtras();
        const list = [...((mine.schedule && mine.schedule[keyOf(d)]) || []), ...(extras.days.includes(keyOf(d)) ? [extras.label] : [])];
        const tips = list.map((x) => SPECIAL_TIPS[x]).filter(Boolean);
        return `
          <div class="sp-day">
            <p class="sp-when">${esc(dayLabel(d))} <small>${esc(d.toLocaleDateString(undefined, { weekday: 'short' }))}</small></p>
            <p class="sp-what">${list.length ? esc(list.join(' + ')) : 'No specials'}</p>
            ${tips.length ? `<p class="sp-tip">${esc(tips.join(' · '))}</p>` : ''}
          </div>`;
      }).join('') : '';
      const ex = getExtras();
      const exLine = mine ? `<button type="button" class="sp-extras" data-action="edit-extras">${ex.days.length
        ? `${esc(ex.label)}: ${esc(ex.days.map((k) => WEEK.find((w) => w[0] === k)[1].slice(0, 3)).join(', '))} <small>· only on this phone · edit</small>`
        : `+ Add ${esc(ex.label.toLowerCase())} days <small>· only on this phone</small>`}</button>` : '';
      hero = `<div class="card sp-hero">${picker}${mine ? `<div class="sp-days">${days}</div>${exLine}` : '<p class="hint">Pick your class to see today’s and tomorrow’s specials up top.</p>'}</div>`;
    }
    return `
      <div class="page-head"><div><h2>Specials</h2><p>Library, music, art and gym, by class.</p></div></div>
      ${hero}
      ${rooms.length ? rooms.map((c) => `
        <article class="card sp-room ${c.id === myId ? 'mine' : ''}">
          <div class="spell-head">
            <h3 class="sp-name">${esc(c.name)}${c.id === myId ? ' <span class="chip chip-volunteer">My class</span>' : ''}</h3>
            <div class="actions" style="margin:0">
              <button class="btn btn-ghost btn-small" data-action="edit-class" data-id="${esc(c.id)}">${ICON.edit} Edit</button>
            </div>
          </div>
          <div class="sp-week">
            ${WEEK.map(([k, label]) => `<div class="sp-row ${mine && c.id === myId && schoolDays()[0] && keyOf(schoolDays()[0]) === k && startOfToday().getDay() >= 1 && startOfToday().getDay() <= 5 ? 'today' : ''}"><span class="sp-d">${label.slice(0, 3)}</span><span class="sp-list">${specialChips((c.schedule || {})[k])}</span></div>`).join('')}
          </div>
          ${c.notes ? `<p class="details">${linkify(c.notes)}</p>` : ''}
          ${canEdit(c) ? `<button class="link-btn inline danger" data-action="del-class" data-id="${esc(c.id)}" style="margin-top:12px">Delete this class</button>` : ''}
        </article>`).join('') : `
        <div class="card empty"><p class="big">No classes yet</p><p>Tap + and say something like “Mrs. Smith’s class has gym Monday and Wednesday, art Tuesday, music Thursday and library Friday.”</p></div>`}`;
  }

  function extrasSheet() {
    const ex = getExtras();
    openSheet(`
      <h2>Just for my kid</h2>
      <p class="qa-sub">For a program only some kids go to, like enrichment. This is saved only on your phone. Nobody else in the group sees it.</p>
      <form id="sheetForm">
        <label class="field"><span>What it’s called</span><input class="input" name="label" required maxlength="30" value="${esc(ex.label)}"></label>
        <div class="field"><span>Which days?</span>
          <div class="seg">${WEEK.map(([k, label]) => `<label><input type="checkbox" name="days" value="${k}" ${ex.days.includes(k) ? 'checked' : ''}><span>${label.slice(0, 3)}</span></label>`).join('')}</div>
        </div>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Save on this phone</button>
          <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
        </div>
      </form>`, async (fd) => {
      setExtras({ label: fd.get('label').trim() || 'Enrichment', days: fd.getAll('days') });
      state.tab = 'specials';
      toast('Saved on this phone');
    });
  }

  function specialsSheet(p = {}, editId = null) {
    // Match a spoken class to one we already have, so it updates instead of duplicating.
    const existing = editId ? state.classrooms.find((c) => c.id === editId)
      : (p.name ? state.classrooms.find((c) => c.name.toLowerCase() === String(p.name).toLowerCase()) : null);
    const base = existing ? { ...(existing.schedule || {}) } : {};
    const sched = { ...base, ...(p.schedule || {}) };
    const name = p.name || (existing && existing.name) || '';
    const id = existing ? existing.id : null;
    const dayRow = ([k, label]) => {
      const picked = sched[k] || [];
      return `
        <div class="sp-edit-day">
          <p class="sp-edit-label">${label}</p>
          <div class="seg">${COMMON_SPECIALS.map((sp) => `<label><input type="checkbox" name="d_${k}" value="${sp}" ${picked.includes(sp) ? 'checked' : ''}><span>${sp}</span></label>`).join('')}</div>
        </div>`;
    };
    openSheet(`
      <h2>${id ? 'Update specials' : 'Class specials'}</h2>
      ${filledNote(p)}
      ${p._filled && existing ? `<p class="hint" style="margin:-8px 0 14px">Updating ${esc(existing.name)}. Days you didn’t mention stay the same.</p>` : ''}
      <form id="sheetForm">
        <label class="field ${p._filled && !name ? 'needs' : ''}"><span>Class</span>
          <input class="input" name="name" required maxlength="60" value="${esc(name)}" placeholder="e.g. Mrs. Smith" list="classList">
          <datalist id="classList">${state.classrooms.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
        </label>
        ${WEEK.map(dayRow).join('')}
        <label class="field"><span>Notes <small>(optional)</small></span><textarea class="input" name="notes" maxlength="500" placeholder="e.g. Library books due back Wednesday">${esc((p.notes ?? (existing && existing.notes)) || '')}</textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Save specials</button>
          <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
        </div>
      </form>`, async (fd) => {
      const schedule = {};
      for (const [k] of WEEK) {
        const list = fd.getAll(`d_${k}`);
        if (list.length) schedule[k] = [...new Set(list)];
      }
      const nm = fd.get('name').trim();
      const target = id || (state.classrooms.find((c) => c.name.toLowerCase() === nm.toLowerCase()) || {}).id || null;
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
      <p class="qa-sub">Say it like you'd text it. The app sorts out if it's spelling, specials or an event.</p>
      ${canTalk ? `
        <div class="qa-mic">
          <button type="button" class="mic" data-action="mic" aria-label="Tap to talk">${ICON.mic}</button>
          <p id="micStatus">Tap to talk</p>
        </div>` : ''}
      <textarea id="qaText" class="input qa-text" placeholder="${canTalk ? 'Or type it here…' : 'Type it here, or use the 🎤 on your keyboard…'}"></textarea>
      <button type="button" class="btn btn-primary" data-action="qa-go" style="margin-top:12px">Fill it in</button>
      <div class="qa-or"><span>or</span></div>
      <label class="btn btn-yellow qa-photo">${ICON.camera} Snap the paper
        <input type="file" id="qaPhoto" accept="image/*" hidden>
      </label>
      <p class="hint" style="text-align:center">Works great for the Friday-folder spelling sheet or a flyer.</p>
      <div id="qaBusy" class="qa-busy" hidden><div class="bar"><span></span></div><p>Reading the paper…</p></div>
      <div class="qa-examples">
        <p class="words-label">Try saying</p>
        <p>“Spelling test Thursday the 12th. Words are rain, play, gate, train. Challenge words neighbor and celebrate.”</p>
        <p>“PTO meeting Friday at 6:30 in the library.”</p>
        <p>“Mrs. Smith’s class has gym Monday and Wednesday, art Tuesday, music Thursday and library Friday.”</p>
      </div>
      <div class="qa-manual">Rather fill it in yourself?
        <button type="button" class="link-btn inline" data-action="manual-event">Event</button> ·
        <button type="button" class="link-btn inline" data-action="manual-spelling">Spelling</button> ·
        <button type="button" class="link-btn inline" data-action="manual-specials">Specials</button>
      </div>`);
    const photo = $('#qaPhoto');
    photo.addEventListener('change', () => { if (photo.files && photo.files[0]) readPhoto(photo.files[0]); });
  }

  function micUi(mode, text) {
    const btn = $('.mic'); const status = $('#micStatus');
    if (btn) { btn.classList.toggle('on', mode === 'listening'); btn.classList.toggle('busy', mode === 'working'); btn.disabled = mode === 'working'; }
    if (status) status.textContent = text;
  }

  function micDone() {
    const box = $('#qaText');
    micUi('idle', box && box.value.trim() ? 'Got it. Tap “Fill it in”, or tap the mic to add more.' : 'Tap to talk');
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
      micUi('listening', 'Listening… tap again when you’re done');
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
      micUi('listening', `Listening… 0:${String(sec).padStart(2, '0')} · tap when you’re done`);
      if (sec >= 59 && recorder) recorder.stop();
    };
    tick();
    recTimer = setInterval(tick, 500);
  }

  function stopMic() {
    if (recognizer) { const r = recognizer; recognizer = null; try { r.abort(); } catch {} }
    if (recorder) { const r = recorder; r.onstop = null; recorder = null; clearInterval(recTimer); try { r.stop(); r.stream.getTracks().forEach((t) => t.stop()); } catch {} }
  }

  function openFilled(r, photoFile) {
    stopMic();
    if (r.type === 'spelling') addSpellingSheet({ ...r, _filled: true }, photoFile || null);
    else if (r.type === 'specials') specialsSheet({ ...r, _filled: true });
    else addEventSheet({ ...r, _filled: true });
  }

  function quickGo() {
    const text = ($('#qaText').value || '').trim();
    if (!text) { toast('Say or type what you want to add first.'); return; }
    openFilled(window.MMQuick.parse(text));
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

  async function readPhoto(file) {
    stopMic();
    const busy = $('#qaBusy'); const bar = busy && busy.querySelector('.bar span'); const label = busy && busy.querySelector('p');
    if (busy) busy.hidden = false;
    const setPct = (p, msg) => { if (bar) bar.style.width = Math.round(p * 100) + '%'; if (label && msg) label.textContent = msg; };
    setPct(0.05, 'Getting the reader ready…');
    const small = await shrinkImage(file, 2000);
    try {
      await loadTesseract();
      setPct(0.15, 'Reading the paper…');
      const { data } = await window.Tesseract.recognize(small, 'eng', {
        logger: (m) => { if (m.status === 'recognizing text') setPct(0.15 + m.progress * 0.85, `Reading the paper… ${Math.round(m.progress * 100)}%`); },
      });
      const text = (data && data.text) || '';
      if (text.replace(/\W/g, '').length < 6) throw new Error('empty');
      const r = window.MMQuick.parse(text, { fromPhoto: true });
      openFilled(r, r.type === 'spelling' ? small : null);
    } catch {
      toast('Couldn’t read that one. The photo is attached; add the words if you can.');
      openFilled({ type: 'spelling' }, small);
    }
  }

  /* ---------------- members ---------------- */
  function membersView() {
    const admin = state.me.is_admin;
    return `
      <div class="page-head"><div><h2>Members</h2><p>${state.members.length} Morley Moms${admin ? ' · you\u2019re an admin' : ''}</p></div></div>
      ${admin ? `<p class="hint" style="margin:-4px 2px 12px">Only people on this list can sign in. Tap + to add someone.</p>` : ''}
      <div class="card" style="padding:4px 16px">
        ${state.members.map((m) => `
          <div class="member">
            <span class="ava">${esc(initials(m.display_name || m.email))}</span>
            <div class="who"><strong>${esc(m.display_name || m.email)}${m.is_admin ? ' <span class="chip chip-volunteer">Admin</span>' : ''}</strong>
              ${admin ? `<span>${esc(m.email)}</span>` : ''}</div>
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
        <p class="hint" style="margin:-6px 0 16px">Then send her the app link. She signs in with this email and a 6-digit code.</p>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Add to the group</button>
          <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
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

  function accountSheet() {
    let install = '';
    if (!isStandalone()) {
      install = isIOS()
        ? `<div class="card" style="background:var(--yellow-soft);box-shadow:none"><strong>Put Morley Moms on your home screen</strong>
            <ol class="install-steps"><li>Open this page in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button (square with an arrow).</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li></ol></div>`
        : deferredInstall
          ? `<button class="btn btn-yellow" data-action="install" style="margin-bottom:12px">Install Morley Moms on this phone</button>`
          : `<div class="card" style="background:var(--yellow-soft);box-shadow:none"><strong>Put Morley Moms on your home screen</strong>
            <ol class="install-steps"><li>In Chrome, tap the <strong>⋮</strong> menu.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li></ol></div>`;
    }
    openSheet(`
      <h2>${esc(state.me.display_name || 'Your account')}</h2>
      <p class="sub" style="color:var(--ink-2);margin:-8px 0 16px">${esc(state.me.email)}${state.me.is_admin ? ' · Admin' : ''}</p>
      ${install}
      <div class="sheet-actions">
        <button class="btn btn-ghost" data-action="signout">Sign out</button>
        <button class="btn btn-ghost" data-action="close-sheet">Close</button>
      </div>`);
  }

  /* ---------------- sheets ---------------- */
  function openSheet(html, onSubmit) {
    closeSheet();
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    wrap.addEventListener('click', (e) => { if (e.target === wrap) { stopMic(); closeSheet(); } });
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    const form = wrap.querySelector('#sheetForm');
    if (form && onSubmit) {
      const first = form.querySelector('input:not([type=radio]):not([type=date]), textarea');
      if (first) setTimeout(() => first.focus(), 80);
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
  function closeSheet() {
    document.querySelectorAll('.sheet-backdrop').forEach((n) => n.remove());
    document.body.style.overflow = '';
  }

  /* ---------------- actions ---------------- */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    try {
      if (a === 'tab') { state.tab = el.dataset.tab; renderTabs(); renderView(); }
      else if (a === 'filter') { state.filter = el.dataset.filter; renderView(); }
      else if (a === 'toggle-past') { state.showPast = !state.showPast; renderView(); }
      else if (a === 'add') {
        if (state.tab === 'members' && state.me.is_admin) addMemberSheet();
        else if (state.tab !== 'members') quickAddSheet();
      }
      else if (a === 'account') accountSheet();
      else if (a === 'close-sheet') { stopMic(); closeSheet(); }
      else if (a === 'mic') toggleMic();
      else if (a === 'qa-go') quickGo();
      else if (a === 'manual-event') { stopMic(); addEventSheet(); }
      else if (a === 'manual-spelling') { stopMic(); addSpellingSheet(); }
      else if (a === 'manual-specials') { stopMic(); specialsSheet(); }
      else if (a === 'edit-class') specialsSheet({}, el.dataset.id);
      else if (a === 'edit-extras') extrasSheet();
      else if (a === 'del-class') {
        if (!confirm('Delete this class and its specials for everyone?')) return;
        await api.deleteClassroom(el.dataset.id); toast('Class deleted'); await refresh();
      }
      else if (a === 'install' && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; closeSheet(); }
      else if (a === 'restart') { state.signin = { step: 'email', email: state.signin.email }; renderSignIn(); }
      else if (a === 'signout') { closeSheet(); await api.signOut(); state.me = null; state.signin = { step: 'email', email: '' }; renderSignIn(); }
      else if (a === 'ics') { const ev = state.events.find((x) => String(x.id) === el.dataset.id); if (ev) downloadIcs(ev); }
      else if (a === 'del-event') {
        if (!confirm('Delete this event for everyone?')) return;
        await api.deleteEvent(el.dataset.id); toast('Event deleted'); await refresh();
      }
      else if (a === 'del-spell') {
        if (!confirm('Delete this spelling list for everyone?')) return;
        const row = state.spelling.find((x) => String(x.id) === el.dataset.id);
        if (row) { await api.deleteSpelling(row); toast('List deleted'); await refresh(); }
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
    if (e.target && e.target.id === 'myClass') { setMyClass(e.target.value); renderView(); }
  });

  // Refresh when someone comes back to the app.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.me) refresh(); });

  /* ---------------- start ---------------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  (async function init() {
    try {
      const s = await api.session();
      if (s) await afterSignIn(); else renderSignIn();
    } catch {
      renderSignIn('Couldn\u2019t reach the server. Check your connection and try again.');
    }
  })();
})();

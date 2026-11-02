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
  const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
      events: [
        { id: 'e1', title: 'PTO monthly meeting', category: 'pto', starts_at: at(2, 18, 30), all_day: false, location: 'School library', pickup_dropoff: '', details: 'Childcare in the gym. Agenda: winter carnival + teacher appreciation.', created_by: 'u-jess', created_by_name: 'Jess' },
        { id: 'e2', title: 'Book fair volunteers', category: 'volunteer', starts_at: at(5, 8, 0), all_day: false, location: 'Front hallway', pickup_dropoff: '', details: 'Need 2 people per shift, 8–10 and 2–4. Sign-up sheet: https://example.com/signup', created_by: 'u-priya', created_by_name: 'Priya' },
        { id: 'e3', title: 'Field trip: Children\u2019s Museum', category: 'school', starts_at: at(9, 9, 15), all_day: false, location: 'Children\u2019s Museum', pickup_dropoff: 'Drop off at the east doors by 8:45. Pickup back at school at 2:30.', details: 'Sack lunch, no glass. Chaperones meet in room 12.', created_by: 'u-jess', created_by_name: 'Jess' },
        { id: 'e4', title: 'Moms\u2019 coffee + walk', category: 'social', starts_at: at(12, 9, 0), all_day: false, location: 'Holmes Lake trailhead', pickup_dropoff: '', details: 'Strollers welcome. Coffee after!', created_by: 'u-tanya', created_by_name: 'Tanya' },
        { id: 'e5', title: 'No school — teacher workday', category: 'kids', starts_at: day(16), all_day: true, location: '', pickup_dropoff: '', details: 'Playdate at the park if weather is nice?', created_by: 'u-priya', created_by_name: 'Priya' },
        { id: 'e0', title: 'Halloween parade', category: 'school', starts_at: at(-3, 13, 30), all_day: false, location: 'School playground', pickup_dropoff: '', details: '', created_by: 'u-jess', created_by_name: 'Jess' },
      ],
      spelling: [
        { id: 's1', week_of: isoDate(monday), title: 'Unit 4 — long a', words: ['rain', 'play', 'gate', 'train', 'great', 'eight', 'stay', 'paint', 'chase', 'weigh'], notes: 'Test on Friday. Challenge words: neighbor, celebrate.', photo_path: null, created_by: 'u-priya', created_by_name: 'Priya' },
        { id: 's0', week_of: isoDate(lastMonday), title: 'Unit 3 — short vowels review', words: ['jump', 'stick', 'shell', 'clock', 'trust', 'bench', 'frog', 'grin'], notes: '', photo_path: null, created_by: 'u-jess', created_by_name: 'Jess' },
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
      async listSpelling() { return delay([...db.spelling].sort((a, b) => b.week_of.localeCompare(a.week_of))); },
      async addSpelling(row, file) {
        const photo_path = file ? URL.createObjectURL(file) : null;
        db.spelling.push({ ...row, id: uid(), photo_path, created_by: 'u-me', created_by_name: state.me.display_name });
        return delay();
      },
      async deleteSpelling(row) { db.spelling = db.spelling.filter((s) => s.id !== row.id); return delay(); },
      async photoUrl(path) { return path; },
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
      async listSpelling() { return ok(await sb.from('spelling_lists').select('*').order('week_of', { ascending: false }).limit(30)); },
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
    signin: { step: 'email', email: '' },
  };
  const CATS = [
    { id: 'pto', label: 'PTO' },
    { id: 'school', label: 'School' },
    { id: 'volunteer', label: 'Volunteer' },
    { id: 'social', label: 'Moms out' },
    { id: 'kids', label: 'Kids' },
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
      const [events, spelling, members] = await Promise.all([api.listEvents(), api.listSpelling(), api.listMembers()]);
      Object.assign(state, { events, spelling, members });
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
    if (state.tab === 'members') view.innerHTML = membersView();
    window.scrollTo(0, 0);
  }

  /* ---------------- events ---------------- */
  function eventCard(ev) {
    const d = new Date(ev.starts_at);
    const soonCutoff = new Date(); soonCutoff.setDate(soonCutoff.getDate() + 3);
    const soon = d >= startOfToday() && d <= soonCutoff;
    const when = ev.all_day ? `${fmtDay(d)} · All day` : `${fmtDay(d)} · ${fmtTime(d)}`;
    return `
      <article class="card event ${soon ? 'soon' : ''}">
        <div class="datebadge" aria-hidden="true">
          <span class="mon">${d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
          <span class="day">${d.getDate()}</span>
        </div>
        <div class="body">
          <span class="chip chip-${esc(ev.category)}">${esc(catLabel(ev.category))}</span>
          <h3>${esc(ev.title)}</h3>
          <p class="meta">${ICON.clock}<span>${esc(when)}</span></p>
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
    const upcoming = state.events.filter((e) => new Date(e.starts_at) >= today && match(e));
    const past = state.events.filter((e) => new Date(e.starts_at) < today && match(e)).reverse().slice(0, 10);
    const filters = [{ id: 'all', label: 'All' }, ...CATS].map((c) =>
      `<button class="filter ${state.filter === c.id ? 'on' : ''}" data-action="filter" data-filter="${c.id}">${c.label}</button>`).join('');
    return `
      <div class="page-head"><div><h2>What's coming up</h2><p>PTO, school, volunteering and fun plans.</p></div></div>
      <div class="filters" role="toolbar" aria-label="Filter events">${filters}</div>
      ${upcoming.length ? upcoming.map(eventCard).join('') : `
        <div class="card empty"><p class="big">Nothing on the calendar</p><p>Tap the + button to add an event.</p></div>`}
      ${past.length ? `
        <button class="btn btn-ghost btn-small" style="margin-top:8px" data-action="toggle-past">${state.showPast ? 'Hide past events' : 'Show past events'}</button>
        ${state.showPast ? `<p class="section-label">Past</p>${past.map(eventCard).join('')}` : ''}` : ''}`;
  }

  function addEventSheet() {
    openSheet(`
      <h2>New event</h2>
      <form id="sheetForm">
        <label class="field"><span>What is it?</span><input class="input" name="title" required maxlength="120" placeholder="e.g. Book fair volunteers"></label>
        <div class="field"><span>Type</span>
          <div class="seg">${CATS.map((c, i) => `<label><input type="radio" name="category" value="${c.id}" ${i === 0 ? 'checked' : ''}><span>${c.label}</span></label>`).join('')}</div>
        </div>
        <div class="row2">
          <label class="field"><span>Date</span><input class="input" type="date" name="date" required value="${isoDate(new Date())}"></label>
          <label class="field"><span>Time <small>(optional)</small></span><input class="input" type="time" name="time"></label>
        </div>
        <label class="field"><span>Where <small>(optional)</small></span><input class="input" name="location" maxlength="200" placeholder="e.g. School gym"></label>
        <label class="field"><span>Drop-off / pickup <small>(optional)</small></span><input class="input" name="pickup_dropoff" maxlength="300" placeholder="e.g. East doors at 8:45, pickup at 2:30"></label>
        <label class="field"><span>Details <small>(optional)</small></span><textarea class="input" name="details" maxlength="2000" placeholder="What to bring, sign-up links, anything else"></textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Post event</button>
          <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
        </div>
      </form>`, async (fd) => {
      const date = fd.get('date');
      const time = fd.get('time');
      const starts = time ? new Date(`${date}T${time}`) : parseDate(date);
      await api.addEvent({
        title: fd.get('title').trim(),
        category: fd.get('category'),
        starts_at: starts.toISOString(),
        all_day: !time,
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
      const next = new Date(d); next.setDate(next.getDate() + 1);
      start = `DTSTART;VALUE=DATE:${ymd(d)}`; end = `DTEND;VALUE=DATE:${ymd(next)}`;
    } else {
      start = `DTSTART:${utc(d)}`; end = `DTEND:${utc(new Date(d.getTime() + 60 * 60 * 1000))}`;
    }
    const desc = [ev.pickup_dropoff ? `Drop-off / pickup: ${ev.pickup_dropoff}` : '', ev.details || ''].filter(Boolean).join('\n\n');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Morley Moms//EN', 'BEGIN:VEVENT',
      `UID:${ev.id}@morleymoms`, `DTSTAMP:${utc(new Date())}`, start, end,
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
  function spellingView() {
    const thisWeek = isoDate(mondayOf(new Date()));
    if (!state.spelling.length) {
      return `<div class="page-head"><div><h2>Spelling words</h2></div></div>
        <div class="card empty"><p class="big">No lists yet</p><p>Tap + to add this week's words or snap a photo of the list.</p></div>`;
    }
    return `
      <div class="page-head"><div><h2>Spelling words</h2><p>Newest first. Test is usually Friday.</p></div></div>
      ${state.spelling.map((s) => {
        const current = s.week_of === thisWeek;
        return `
        <article class="card spell ${current ? 'current' : ''}">
          <div class="spell-head">
            <div>
              ${current ? '<span class="chip chip-volunteer">This week</span>' : ''}
              <h3 style="margin-top:${current ? '8px' : '0'}">${esc(s.title || 'Spelling list')}</h3>
              <p class="when">Week of ${esc(fmtDay(parseDate(s.week_of)))}</p>
            </div>
            ${canEdit(s) ? `<button class="btn btn-danger btn-small" data-action="del-spell" data-id="${esc(s.id)}">Delete</button>` : ''}
          </div>
          ${s.words && s.words.length ? `<div class="words">${s.words.map((w) => `<span class="word">${esc(w)}</span>`).join('')}</div>` : ''}
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

  function addSpellingSheet() {
    openSheet(`
      <h2>New spelling list</h2>
      <form id="sheetForm">
        <label class="field"><span>Week of</span><input class="input" type="date" name="week_of" required value="${isoDate(mondayOf(new Date()))}"></label>
        <label class="field"><span>Title <small>(optional)</small></span><input class="input" name="title" maxlength="120" placeholder="e.g. Unit 5 — long e"></label>
        <label class="field"><span>Words</span><textarea class="input" name="words" maxlength="2000" placeholder="One per line, or separated by commas"></textarea>
          <p class="hint">Or skip typing and just add a photo below.</p></label>
        <label class="field"><span>Photo of the list <small>(optional)</small></span><input class="input" type="file" name="photo" accept="image/*"></label>
        <label class="field"><span>Notes <small>(optional)</small></span><textarea class="input" name="notes" maxlength="1000" placeholder="Test day, challenge words, tips"></textarea></label>
        <div class="sheet-actions">
          <button class="btn btn-primary" type="submit">Post list</button>
          <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
        </div>
      </form>`, async (fd) => {
      const words = fd.get('words').split(/[\n,]+/).map((w) => w.trim()).filter(Boolean).slice(0, 60);
      const raw = fd.get('photo');
      const hasPhoto = raw && raw.size > 0;
      if (!words.length && !hasPhoto) throw new Error('Add some words or a photo.');
      const photo = hasPhoto ? await shrinkImage(raw) : null;
      await api.addSpelling({
        week_of: fd.get('week_of'),
        title: fd.get('title').trim() || null,
        words,
        notes: fd.get('notes').trim() || null,
      }, photo);
      state.tab = 'spelling';
      toast('Spelling list posted');
    });
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
    wrap.addEventListener('click', (e) => { if (e.target === wrap) closeSheet(); });
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
        if (state.tab === 'events') addEventSheet();
        else if (state.tab === 'spelling') addSpellingSheet();
        else if (state.tab === 'members' && state.me.is_admin) addMemberSheet();
      }
      else if (a === 'account') accountSheet();
      else if (a === 'close-sheet') closeSheet();
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

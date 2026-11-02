/* Morley Moms — Quick Add "brain".
 * Turns what a mom says (or what a photo of the Friday-folder paper says)
 * into a filled-in spelling list or event. Runs entirely on the phone:
 * free, private, no AI service. Whatever it guesses is shown in a form to
 * check before anything is posted, so it never has to be perfect.
 */
(function (root) {
  'use strict';

  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
  const DAY_RE = '(sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?';
  const ORD = '(\\d{1,2})(?:st|nd|rd|th)?';
  const WORD_NUMS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, 'twenty first': 21, 'twenty second': 22, 'twenty third': 23, 'twenty fourth': 24, 'twenty fifth': 25, 'twenty sixth': 26, 'twenty seventh': 27, 'twenty eighth': 28, 'twenty ninth': 29, thirtieth: 30, 'thirty first': 31 };

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

  // Speech gives "twelfth" / "twenty-first"; turn those into digits first.
  function normalize(text) {
    let t = ' ' + String(text || '').replace(/’/g, "'").replace(/[–—]/g, ' - ') + ' ';
    t = t.replace(/twenty[\s-](first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)/gi, (m, w) => ' ' + (20 + WORD_NUMS[w.toLowerCase()]) + 'th ');
    t = t.replace(/thirty[\s-]first/gi, ' 31st ');
    t = t.replace(/\b(the|on)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth)\b/gi,
      (m, pre, w) => `${pre} ${WORD_NUMS[w.toLowerCase()]}th`);
    t = t.replace(new RegExp(MONTH_RE + '\\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth)\\b', 'gi'),
      (m, mon, w) => `${mon} ${WORD_NUMS[w.toLowerCase()]}th`);
    t = t.replace(/\b(\d{1,2})\s*(?:o'?clock)\b/gi, '$1:00');
    t = t.replace(/\b(\d{1,2})\s*(?::\s*)?(\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?=\W)/gi,
      (m, h, mm, ap) => ` ${h}:${mm || '00'} ${/p/i.test(ap) ? 'pm' : 'am'} `);
    return t.replace(/[ \t]+/g, ' ');
  }

  /* ---------- dates & times ---------- */
  function findDate(t, now) {
    const today = dayStart(now);
    const hits = [];
    const roll = (d) => { if (d < today) d.setFullYear(d.getFullYear() + 1); return d; };
    let m;

    // "November 12" / "Nov 12th" / "12th of November"
    const reMD = new RegExp('\\b' + MONTH_RE + '\\s+' + ORD + '\\b', 'gi');
    while ((m = reMD.exec(t))) {
      const mon = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
      const d = new Date(today.getFullYear(), mon, +m[2]);
      if (d.getMonth() !== mon) continue;
      hits.push({ i: m.index, text: m[0], date: roll(d), strength: 3 });
    }
    const reDM = new RegExp('\\b' + ORD + '\\s+of\\s+' + MONTH_RE, 'gi');
    while ((m = reDM.exec(t))) {
      const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
      hits.push({ i: m.index, text: m[0], date: roll(new Date(today.getFullYear(), mon, +m[1])), strength: 3 });
    }
    // 11/12 or 11/12/26
    const reNum = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
    while ((m = reNum.exec(t))) {
      if (+m[1] > 12 || +m[2] > 31) continue;
      let y = m[3] ? +m[3] : today.getFullYear();
      if (y < 100) y += 2000;
      const d = new Date(y, +m[1] - 1, +m[2]);
      hits.push({ i: m.index, text: m[0], date: m[3] ? d : roll(d), strength: 3 });
    }
    // "the 12th" (this month, or next month if already past)
    const reThe = /\b(?:the|on)\s+(\d{1,2})(?:st|nd|rd|th)\b/gi;
    while ((m = reThe.exec(t))) {
      const want = +m[1];
      if (want < 1 || want > 31) continue;
      // Next month that actually has that day and isn't in the past.
      for (let k = 0; k < 13; k++) {
        const d = new Date(today.getFullYear(), today.getMonth() + k, want);
        if (d.getDate() === want && d >= today) { hits.push({ i: m.index, text: m[0], date: d, strength: 2 }); break; }
      }
    }
    // weekday names
    const reDay = new RegExp('\\b(?:(next|this|on)\\s+)?' + DAY_RE + '\\b', 'gi');
    while ((m = reDay.exec(t))) {
      const want = DAYS.indexOf(m[2].slice(0, 3).toLowerCase());
      const d = new Date(today);
      let add = (want - d.getDay() + 7) % 7;
      if (m[1] && m[1].toLowerCase() === 'next' && add === 0) add = 7;
      d.setDate(d.getDate() + add);
      hits.push({ i: m.index, text: m[0], date: d, strength: 1 });
    }
    // today / tomorrow / tonight
    const reRel = /\b(today|tonight|tomorrow)\b/gi;
    while ((m = reRel.exec(t))) {
      const d = new Date(today);
      if (/tomorrow/i.test(m[1])) d.setDate(d.getDate() + 1);
      hits.push({ i: m.index, text: m[0], date: d, strength: 1, tonight: /tonight/i.test(m[1]) });
    }
    if (!hits.length) return { date: null, texts: [] };
    // The most specific mention wins; ties go to the earliest mention.
    hits.sort((a, b) => b.strength - a.strength || a.i - b.i);
    return { date: hits[0].date, tonight: !!hits[0].tonight, texts: hits.map((h) => h.text) };
  }

  function findTime(t) {
    let m;
    if ((m = /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i.exec(t))) {
      let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12;
      return { time: `${pad(h)}:${m[2]}`, text: m[0] };
    }
    if ((m = /\bnoon\b/i.exec(t))) return { time: '12:00', text: m[0] };
    if ((m = /\b(?:at|from|starts?(?: at)?|by)\s+(\d{1,2})(?::(\d{2}))?\s*(?:to|until|till|-)\s*\d{1,2}(?::\d{2})?\b/i.exec(t))) {
      let h = +m[1]; if (h >= 1 && h <= 7) h += 12;
      return { time: `${pad(h)}:${m[2] || '00'}`, text: m[0] };
    }
    if ((m = /\b(?:at|from|starts?(?: at)?|by)\s+(\d{1,2})(?::(\d{2}))?\b(?!\s*(?:st|nd|rd|th|\/))/i.exec(t))) {
      let h = +m[1];
      if (h > 23) return { time: null, text: '' };
      const after = t.slice(m.index + m[0].length, m.index + m[0].length + 25);
      if (h <= 12) {
        if (/morning/i.test(after)) h = h % 12;
        else if (/evening|night|afternoon/i.test(after) || h <= 7) h = (h % 12) + 12;
        else if (h === 12) h = 12;
      }
      return { time: `${pad(h)}:${m[2] || '00'}`, text: m[0] };
    }
    if ((m = /\b(\d{1,2}):(\d{2})\b/.exec(t))) {
      let h = +m[1]; if (h >= 1 && h <= 6) h += 12;
      return { time: `${pad(h)}:${m[2]}`, text: m[0] };
    }
    return { time: null, text: '' };
  }

  /* ---------- what kind of thing is it? ---------- */
  function classify(t, fromPhoto) {
    if (/\bspell(?:ing)?\b|\bword list\b|\bwords? (?:are|is|for)\b|\bthis week'?s words\b|\bchallenge words?\b|\bbonus words?\b/i.test(t)) return 'spelling';
    if (fromPhoto) {
      // A photo of a numbered list of single words is almost certainly spelling.
      const numbered = (t.match(/^\s*\d{1,2}\s*[.)\-:]\s*[A-Za-z'-]+\s*$/gm) || []).length;
      if (numbered >= 4) return 'spelling';
    }
    return 'event';
  }

  function categoryOf(t) {
    if (/\bp\.?\s?t\.?\s?o\.?\b|\bp\.?\s?t\.?\s?a\.?\b|\bboard meeting\b/i.test(t)) return 'pto';
    if (/\bvolunteer|sign[\s-]?ups?\b|\bhelp(?:ers)? needed\b|\bneed(?:s|ing)? (?:help|people|volunteers|someone|donations?)\b|\bdonat|\bbring (?:in )?(?:snacks?|supplies)|\bdrive\b/i.test(t)) return 'volunteer';
    if (/\bmoms?'? (?:night|out|coffee|walk|brunch|lunch|dinner|drinks?)\b|\bgirls'? night\b|\bcoffee\b|\bbrunch\b|\bhappy hour\b|\bwine\b|\bbook club\b/i.test(t)) return 'social';
    if (/\bno school\b|\bplay ?date\b|\bbirthday\b|\bparty\b|\bpark\b|\bsleepover\b|\bkids'? (?:night|event)\b|\btrick or treat|\bhalloween walk\b/i.test(t)) return 'kids';
    return 'school';
  }

  /* ---------- spelling ---------- */
  const NOT_WORDS = new Set('a an and the is are for on of to this that week weeks words word spelling test list our challenge bonus unit lesson s quiz by'.split(' '));

  function splitWords(seg) {
    return seg
      .replace(/\b\d{1,2}\s*[.)\-:]/g, ' ')            // "1." list numbers
      .split(/[,;\n•|]+|\s+and\s+|\s+/i)
      .map((w) => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase())
      .filter((w) => w.length > 0 && /^[a-z][a-z'-]*$/.test(w));
  }

  function findSpelling(raw, now, fromPhoto) {
    const t = normalize(raw);
    const out = { type: 'spelling', test_date: null, title: '', words: [], challenge_words: [], notes: '' };

    // Test date: prefer a date mentioned near the word "test"/"quiz".
    const testCtx = /\b(?:test|quiz)\b[^\n]{0,45}/i.exec(t);
    const dateFromCtx = testCtx ? findDate(testCtx[0], now) : { date: null };
    const anyDate = findDate(t, now);
    const d = dateFromCtx.date || anyDate.date;
    if (d) out.test_date = iso(d);

    // Unit / pattern for the subtitle
    const unit = /\b(unit|lesson|list|week)\s+(\d{1,2}|[a-z]+(?=\s*[:\-,]))/i.exec(t);
    const pattern = /\b((?:long|short)\s+[aeiou]|[a-z]{1,4}\s+(?:pattern|sound|blend|digraph)s?|(?:r|l)-controlled\s+\w+|silent\s+e|vowel teams?|compound words|contractions|prefixes|suffixes|homophones)\b/i.exec(t);
    const unitText = unit && /\d/.test(unit[2]) ? `${unit[1][0].toUpperCase()}${unit[1].slice(1).toLowerCase()} ${unit[2]}` : '';
    out.title = [unitText, pattern ? pattern[1].toLowerCase() : ''].filter(Boolean).join(' — ');

    // Strip out the date/time phrases so they don't become "words".
    let body = t;
    // Only remove the date we used (once), so words like "tomorrow" or "Monday" can still be spelling words.
    const used = (dateFromCtx.date ? dateFromCtx.texts : anyDate.texts)[0];
    if (used) body = body.replace(used, ' ');

    const chIdx = body.search(/\b(?:challenge|bonus)(?:\s+words?)?\b|\bextra\s+words?\b/i);
    let main = chIdx >= 0 ? body.slice(0, chIdx) : body;
    let challenge = chIdx >= 0 ? body.slice(chIdx).replace(/^\s*(?:challenge|bonus|extra)(?:\s+words?)?\s*(?:are|is|:|-)?/i, '') : '';

    const marker = /\bwords?\s*(?:are|is|:|-)\s*|\bwords?\s+(?=\S)(?!(?:for|this|test|list)\b)/i.exec(main);
    if (marker) {
      main = main.slice(marker.index + marker[0].length);
    } else if (fromPhoto) {
      // Photo with no "words" label: keep the lines that look like list items.
      const lines = raw.split(/\n+/);
      const items = lines.filter((l) => /^\s*\d{1,2}\s*[.)\-:]\s*\S/.test(l) || /^\s*[A-Za-z'-]{2,20}\s*$/.test(l));
      main = items.join('\n');
    } else {
      main = '';
    }
    // Stop the word list at a sentence that's clearly about something else.
    main = main.split(/\b(?:test|quiz|due|please|practice|study|parents?|signature|sign)\b/i)[0];
    challenge = challenge.split(/\b(?:test|quiz|due|please|practice|study|parents?|signature)\b/i)[0];

    const notes = String(raw || '').split(/(?<=[.!?])\s+|\n+/).filter((x) => /\b(?:please|practice|due|study|sign|bring|return)\b/i.test(x));
    out.notes = notes.map((x) => x.trim()).join(' ').slice(0, 300);
    out.words = [...new Set(splitWords(main).filter((w) => !NOT_WORDS.has(w)))].slice(0, 40);
    out.challenge_words = [...new Set(splitWords(challenge).filter((w) => !NOT_WORDS.has(w)))].slice(0, 15);
    return out;
  }

  /* ---------- classroom specials ---------- */
  const SPECIAL_NAMES = [
    ['PE', /^(?:p\.?\s?e\.?|phys(?:ical)?\.?\s?ed(?:ucation)?|gym)$/i],
    ['Art', /^art$/i],
    ['Music', /^music$/i],
    ['Library', /^(?:library|media(?: center)?)$/i],
    ['STEM', /^(?:stem|steam|science lab)$/i],
    ['Tech', /^(?:computers?|tech(?:nology)?|computer lab)$/i],
    ['Guidance', /^(?:guidance|counseling|counselor)$/i],
    ['Spanish', /^spanish$/i],
    ['Band', /^band$/i],
    ['Drama', /^drama$/i],
    ['Health', /^health$/i],
    ['Dance', /^dance$/i],
  ];
  const SPECIAL_TOKEN = '(p\\.?\\s?e\\.?(?=[\\s,.;]|$)|phys(?:ical)?\\.?\\s?ed(?:ucation)?|gym|art|music|library|media(?: center)?|stem|steam|science lab|computers?|computer lab|tech(?:nology)?|guidance|counseling|counselor|spanish|band|drama|health|dance)';
  const WEEKDAY_TOKEN = '(mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri)(?:day)?s?';
  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const canonSpecial = (w) => { const x = w.replace(/\s+/g, ' ').trim(); const hit = SPECIAL_NAMES.find(([, re]) => re.test(x)); return hit ? hit[0] : x; };
  const dayKey = (w) => DAY_KEYS[['mon', 'tue', 'wed', 'thu', 'fri'].indexOf(w.slice(0, 3).toLowerCase())];

  function looksLikeSpecials(t) {
    const hasSpecial = new RegExp('\\b' + SPECIAL_TOKEN + '\\b', 'i').test(t);
    const hasDay = new RegExp('\\b' + WEEKDAY_TOKEN + '\\b', 'i').test(t);
    if (/\bspecials?\b/i.test(t) && (hasSpecial || hasDay)) return true;
    const hasClass = /\b(?:mrs?|ms|miss|mx|dr)\.?\s+[a-z]/i.test(t) || /\b(?:room|class(?:room)?)\s+\d/i.test(t) || /'s class\b/i.test(t);
    return hasClass && hasSpecial && hasDay;
  }

  function findSpecials(raw) {
    const t = normalize(raw);
    const out = { type: 'specials', name: '', schedule: {} };
    let m;
    if ((m = /\b(mrs|mr|ms|miss|mx|dr)\.?\s+([a-z][a-z'\-]+?)(?:'s)?\b/i.exec(t))) {
      const title = m[1].toLowerCase() === 'miss' ? 'Miss' : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() + '.';
      out.name = `${title} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}`;
    } else if ((m = /\b(?:room|class(?:room)?)\s+(\d+[a-z]?)\b/i.exec(t))) {
      out.name = `Room ${m[1].toUpperCase()}`;
    } else if ((m = /\b([a-z]+)'s class\b/i.exec(t))) {
      out.name = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    }
    // Find specials and weekdays in the order they were said, then pair the
    // runs up: "PE on Monday and Wednesday" or "Monday is PE and art".
    const re = new RegExp('\\b(?:' + SPECIAL_TOKEN + '|' + WEEKDAY_TOKEN + ')\\b', 'gi');
    const runs = [];
    while ((m = re.exec(t))) {
      const kind = m[1] ? 'special' : 'day';
      const val = m[1] ? canonSpecial(m[1]) : dayKey(m[2]);
      if (kind === 'special' && t.slice(Math.max(0, m.index - 4), m.index).match(/\bno\s$/i)) continue;
      const last = runs[runs.length - 1];
      if (last && last.kind === kind) { if (!last.items.includes(val)) last.items.push(val); }
      else runs.push({ kind, items: [val] });
    }
    if (!runs.length) return out;
    const first = runs[0].kind;
    for (let i = 0; i < runs.length; i++) {
      if (runs[i].kind !== first) continue;
      const partner = runs[i + 1];
      if (!partner) break;
      const specials = first === 'special' ? runs[i].items : partner.items;
      const days = first === 'day' ? runs[i].items : partner.items;
      for (const d of days) {
        out.schedule[d] = out.schedule[d] || [];
        for (const sp of specials) if (!out.schedule[d].includes(sp)) out.schedule[d].push(sp);
      }
    }
    return out;
  }

  /* ---------- events ---------- */
  const PLACES = /\b(?:the\s+)?(gym|library|cafeteria|front office|office|playground|auditorium|music room|art room|front doors?|east doors?|west doors?|north doors?|south doors?|main entrance|parking lot|pickup line|room \d+)\b/i;

  function findEvent(raw, now) {
    const t = normalize(raw);
    const out = { type: 'event', title: '', category: categoryOf(t), date: null, time: '', location: '', pickup_dropoff: '', details: '' };
    const dt = findDate(t, now);
    const tm = findTime(t);
    if (dt.date) out.date = iso(dt.date);
    if (tm.time) out.time = tm.time;
    else if (dt.tonight) out.time = '18:00';

    // Drop-off / pickup sentence
    const pu = /[^.\n]*\b(?:drop[\s-]?off|pick[\s-]?up)\b[^.\n]*/i.exec(raw || '');
    if (pu) out.pickup_dropoff = pu[0].trim().replace(/^and\s+/i, '');

    // Location: a known school spot, or "at/in <place>" that isn't a time or date.
    const known = PLACES.exec(t);
    const atPlace = /\b(?:at|in)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9'&]*(?:\s+[A-Za-z0-9'&]+){0,4}?)(?=\s+(?:on|at|from|this|next|tomorrow|today|tonight|for|to|with|starting|by|in)\b|[,.;!\n]|\s*$)/gi;
    let m; let loc = '';
    while ((m = atPlace.exec(t))) {
      const cand = m[1].trim();
      if (!cand || /^\d/.test(cand)) continue;
      if (new RegExp('^' + DAY_RE + '$', 'i').test(cand) || new RegExp('^' + MONTH_RE, 'i').test(cand)) continue;
      if (/^(?:the\s+)?(?:morning|evening|afternoon|night|noon|school day|time|least|all)$/i.test(cand)) continue;
      if (out.pickup_dropoff && out.pickup_dropoff.toLowerCase().includes(cand.toLowerCase())) continue;
      loc = cand; break;
    }
    const inPickup = (x) => out.pickup_dropoff && out.pickup_dropoff.toLowerCase().includes(x.toLowerCase());
    if (known && !inPickup(known[1]) && (!loc || loc.length < known[1].length)) loc = known[0].trim().replace(/^the\s+/i, '');
    if (!loc) {
      const trip = /\btrip\s+to\s+(?:the\s+)?([A-Za-z][A-Za-z0-9'&]*(?:\s+[A-Za-z0-9'&]+){0,4}?)(?=\s+(?:on|at|this|next|tomorrow|for|by)\b|[,.;!\n]|\s*$)/i.exec(t);
      if (trip) loc = trip[1];
    }
    if (loc) out.location = loc.replace(/(^|\s)\w/g, (c) => c.toUpperCase()).replace(/(?!^)\b(Of|And|The|To|On|At|In|By)\b/g, (w) => w.toLowerCase());

    // Anything after the first sentence (other than the pickup line) becomes the details.
    const sentences = String(raw || '').split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
    out.details = sentences.slice(1).filter((x) => !(out.pickup_dropoff && x.includes(out.pickup_dropoff))).join(' ');

    // Title: the first phrase, minus filler, dates, times and places.
    let title = t.split(/[.!?\n]/)[0];
    title = title.replace(/\b(?:drop[\s-]?off|pick[\s-]?up)\b.*$/i, '');
    for (const s of [...dt.texts, tm.text]) {
      if (!s) continue;
      const escd = s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp('(?:\\b(?:on|this|next|by|is)\\s+)?' + escd, 'gi'), ' ');
    }
    title = title
      .replace(/\bin the (?:morning|afternoon|evening)\b|\btonight\b/gi, ' ')
      .replace(/^\s*we(?:'re| are)? (?:need|needing|looking for)\s+/i, ' ')
      .replace(/^\s*(?:okay|ok|so|hey|um+|uh+|add|post|new|please|can you|reminder|heads up)[,:\s]+/gi, ' ')
      .replace(/^\s*(?:there(?:'s| is) (?:a|an)|we(?:'ve| have) (?:a|an|got a)|it'?s|this is)\s+/i, ' ')
      .replace(/\b(?:is|will be|happens|happening|starts?|from)\s*$/i, ' ')
      .replace(/\b(?:at|in)\s+(?:the\s+)?[A-Za-z0-9'& ]{1,40}$/i, (s) => (loc && s.toLowerCase().includes(loc.toLowerCase()) ? ' ' : s))
      .replace(/\b(?:on|at|this|next|by|from|is|for)\s*$/i, ' ')
      .replace(/\b(?:on|at|this|next|by)\s*$/i, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(?:a|an|the)\s+/i, '')
      .replace(/[,;:\-\s]+$/, '');
    if (title.length > 70) title = title.slice(0, 70).replace(/\s+\S*$/, '') + '…';
    if (title.length < 3) title = '';
    out.title = title ? title[0].toUpperCase() + title.slice(1) : '';
    return out;
  }

  function parse(raw, opts = {}) {
    const now = opts.now || new Date();
    const t = normalize(raw);
    let kind = opts.force || classify(t, !!opts.fromPhoto);
    if (!opts.force && kind === 'event' && looksLikeSpecials(t)) kind = 'specials';
    if (kind === 'spelling') return findSpelling(raw, now, !!opts.fromPhoto);
    if (kind === 'specials') return findSpecials(raw);
    return findEvent(raw, now);
  }

  const api = { parse, findDate: (t, now) => findDate(normalize(t), now || new Date()), findTime: (t) => findTime(normalize(t)), classify: (t, p) => classify(normalize(t), p) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MMQuick = api;
})(typeof window !== 'undefined' ? window : globalThis);

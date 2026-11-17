/* Who Needs a Whiteboard? — Caregiver Hiring & Orientation Desk
 * A no-build, offline-first app. All data lives in this browser's localStorage.
 * Use Settings → Export backup regularly.
 */
'use strict';

/* ============================== Constants ============================== */
const STORE_KEY = 'wnaw.data.v1';
const UI_KEY = 'wnaw.ui.v1';
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Active'];
const STAGE_HINT = {
  Applied: 'New — not yet contacted',
  Screening: 'Phone screen & references',
  Interview: 'Interview scheduled / done',
  Offer: 'Offer extended',
  Hired: 'Accepted — needs orientation',
  Active: 'Oriented & on the schedule',
};
const ARCHIVED = 'Archived';
const INTERVIEW_TYPES = ['In person', 'Phone', 'Video', 'Working interview'];
const SHIFTS = ['Days', 'Evenings', 'Overnights', 'Weekends', 'Live-in', 'PRN / on-call'];

const DEFAULT_SETTINGS = {
  company: 'Sunrise Senior Care',
  hrName: '',
  phone: '',
  orientationLocation: 'Main Office — Training Room',
  defaultCapacity: 8,
  staleApplicantDays: 2,
  interviewers: ['HR Manager', 'Director of Nursing', 'Care Coordinator', 'Scheduler'],
  positions: ['CNA', 'HHA', 'Caregiver / PCA', 'Med Tech', 'LPN', 'RN', 'Companion', 'Dietary Aide', 'Activities Aide'],
  sources: ['Indeed', 'Company website', 'Employee referral', 'Walk-in', 'Job fair', 'Facebook', 'Care.com', 'School / CNA program', 'Other'],
  checklist: [
    'Application & references verified',
    'Background check cleared',
    'Drug screen',
    'TB test / chest X-ray',
    'I-9 & photo ID verified',
    'W-4 & state tax forms',
    'Direct deposit form',
    'CPR / First Aid card on file',
    'Employee handbook signed',
    'HIPAA & confidentiality training',
    'Elder abuse / neglect training',
    'Uniform & badge issued',
    'Shadow shift scheduled',
  ],
  credentialTypes: ['CPR / First Aid', 'TB Test', 'CNA License', 'HHA Certificate', "Driver's License", 'Auto Insurance', 'Background Check', 'Dementia Care Cert.', 'Med Tech Cert.'],
  requiredCreds: ['CPR / First Aid', 'TB Test'],
  orientationBring: 'Photo ID, Social Security card (or other I-9 documents), voided check for direct deposit, CPR card, and TB results.',
  templates: [
    {
      id: 't-invite', name: 'Interview invitation', subject: 'Interview with {company} — {weekday}, {date}',
      body: 'Hi {first},\n\nThank you for applying for the {position} position with {company}! We would love to meet you.\n\nYour interview is scheduled for:\n  {weekday}, {date} at {time}\n  {location}\n\nPlease reply to confirm, or call {phone} if you need a different time.\n\nWarmly,\n{hr}\n{company}',
    },
    {
      id: 't-remind', name: 'Interview reminder (day before)', subject: 'Reminder: your interview is {weekday} at {time}',
      body: 'Hi {first}, this is {hr} from {company}. Just a friendly reminder that your interview is {weekday}, {date} at {time} at {location}. See you then! Reply or call {phone} with any questions.',
    },
    {
      id: 't-offer', name: 'Job offer', subject: 'Your offer from {company}',
      body: 'Hi {first},\n\nCongratulations! We are excited to offer you the {position} position with {company}.\n\nNext steps: we will confirm your background check and paperwork and then schedule your orientation day. Please reply to accept, and let me know your shift availability.\n\nWelcome to the team!\n{hr}\n{phone}',
    },
    {
      id: 't-orient', name: 'Orientation confirmation', subject: 'Orientation day — {weekday}, {date}',
      body: 'Hi {first},\n\nWelcome aboard! Your orientation is:\n\n  {weekday}, {date}\n  {time}\n  {location}\n\nPlease bring: {bring}\n\nStill needed before orientation: {missing}\n\nCall {phone} if anything comes up.\n\n{hr}\n{company}',
    },
    {
      id: 't-orient-remind', name: 'Orientation reminder (day before)', subject: 'See you {weekday} for orientation!',
      body: 'Hi {first}! Reminder from {company}: orientation is {weekday}, {date} at {time}, {location}. Please bring: {bring} Call {phone} if you are running late.',
    },
    {
      id: 't-missing', name: 'Missing paperwork', subject: 'A few items still needed — {company}',
      body: 'Hi {first},\n\nWe are almost ready for you! We are still missing:\n\n{missing}\n\nPlease bring or send these as soon as you can. Thank you!\n\n{hr}\n{phone}',
    },
    {
      id: 't-renew', name: 'Credential renewal reminder', subject: 'Time to renew: {expiring}',
      body: 'Hi {first},\n\nOur records show the following needs to be renewed soon:\n\n{expiring}\n\nPlease send a copy of your updated card/certificate to HR. Thank you for keeping our residents safe!\n\n{hr}\n{company}',
    },
    {
      id: 't-decline', name: 'Not moving forward', subject: 'Your application with {company}',
      body: 'Hi {first},\n\nThank you for your interest in the {position} position and for the time you spent with us. We have decided not to move forward at this time. We will keep your application on file and wish you the very best.\n\nSincerely,\n{hr}\n{company}',
    },
  ],
};

/* ============================== Date helpers ============================== */
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000); // b − a
const wdIndex = iso => parseISO(iso).getDay();
const isWeekend = iso => { const w = wdIndex(iso); return w === 0 || w === 6; };
const validISO = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const fmtLong = iso => { const d = parseISO(iso); return `${WD[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
const fmtMD = iso => { const d = parseISO(iso); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
const fmtShort = iso => { const d = parseISO(iso); return `${WD[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
function rel(iso) {
  const n = diffDays(todayISO(), iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return `this ${WD[wdIndex(iso)]} · in ${n} days`;
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
function fmtTime(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}
const toMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
function nextDow(dow, minDays = 1) {
  let d = addDays(todayISO(), minDays);
  while (wdIndex(d) !== dow) d = addDays(d, 1);
  return d;
}

/* ============================== Generic helpers ============================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const first = name => String(name || '').trim().split(/\s+/)[0] || '';

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---- date display snippets (the weekday is always spotlighted) ---- */
function dateChip(iso, size = '') {
  const d = parseISO(iso);
  const today = iso === todayISO() ? ' is-today' : '';
  return `<div class="datechip wd${d.getDay()} ${size}${today}" title="${esc(fmtLong(iso))}">
    <span class="dc-wd">${WD[d.getDay()].slice(0, 3)}</span>
    <span class="dc-day">${d.getDate()}</span>
    <span class="dc-mon">${MONTHS[d.getMonth()].slice(0, 3)}</span></div>`;
}
function dateText(iso, withRel = true) {
  if (!validISO(iso)) return '<span class="muted">—</span>';
  const w = wdIndex(iso);
  return `<span class="wdtag wd${w}">${WD[w].slice(0, 3)}</span> ${esc(fmtMD(iso))}${parseISO(iso).getFullYear() !== new Date().getFullYear() ? ', ' + parseISO(iso).getFullYear() : ''}${withRel ? ` <span class="rel">· ${rel(iso)}</span>` : ''}`;
}

/* ============================== State ============================== */
let S = load();
const ui = Object.assign({ tab: 'day', day: todayISO(), month: todayISO().slice(0, 7), q: '', pos: '', showArchived: false, compIssuesOnly: false, msg: {} }, loadUI());
ui.day = todayISO(); // always open on today

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { console.warn('load failed', e); }
  return seed();
}
function normalize(d) {
  d = d && typeof d === 'object' ? d : {};
  d.applicants = Array.isArray(d.applicants) ? d.applicants : [];
  d.interviews = Array.isArray(d.interviews) ? d.interviews : [];
  d.orientations = Array.isArray(d.orientations) ? d.orientations : [];
  d.settings = Object.assign({}, structuredClone(DEFAULT_SETTINGS), d.settings || {});
  for (const a of d.applicants) {
    a.checklist = a.checklist || {};
    a.credentials = a.credentials || [];
    a.log = a.log || [];
    a.availability = a.availability || [];
  }
  for (const o of d.orientations) o.attendees = o.attendees || [];
  return d;
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('⚠️ Could not save — browser storage is full or blocked.'); }
}
function loadUI() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch { return {}; } }
function persistUI() { try { localStorage.setItem(UI_KEY, JSON.stringify({ tab: ui.tab, pos: ui.pos, showArchived: ui.showArchived })); } catch { /* ignore */ } }

/* ---- lookups ---- */
const getA = id => S.applicants.find(a => a.id === id);
const getI = id => S.interviews.find(i => i.id === id);
const getO = id => S.orientations.find(o => o.id === id);
const byDateTime = (a, b) => (a.date + (a.time || a.start || '')).localeCompare(b.date + (b.time || b.start || ''));

function logA(a, text) { a.log.unshift({ at: new Date().toISOString(), text }); }
function setStage(a, stage, note) {
  if (a.stage === stage) return;
  const from = a.stage;
  a.stage = stage;
  a.stageSince = todayISO();
  if (stage === 'Hired' && !a.hiredOn) a.hiredOn = todayISO();
  logA(a, note || `Moved ${from} → ${stage}`);
}
function checklistDone(a) { return S.settings.checklist.filter(k => a.checklist[k]).length; }
function missingItems(a) { return S.settings.checklist.filter(k => !a.checklist[k]); }
function orientationFor(aid) {
  // the most relevant orientation: upcoming scheduled first, else most recent attended
  const mine = S.orientations.filter(o => o.attendees.some(x => x.applicantId === aid)).sort(byDateTime);
  const t = todayISO();
  return mine.find(o => o.date >= t && o.attendees.find(x => x.applicantId === aid).status === 'Scheduled')
    || mine.reverse().find(o => o.attendees.find(x => x.applicantId === aid).status === 'Attended')
    || null;
}
function needsOrientation(a) {
  if (!['Offer', 'Hired'].includes(a.stage)) return false;
  return !orientationFor(a.id);
}
function nextInterview(aid) {
  const t = todayISO();
  return S.interviews.filter(i => i.applicantId === aid && i.date >= t && !i.outcome).sort(byDateTime)[0];
}
function credStatus(c) {
  if (!validISO(c.expires)) return { cls: 'ok', label: 'No expiry', days: Infinity };
  const days = diffDays(todayISO(), c.expires);
  if (days < 0) return { cls: 'bad', label: `Expired ${-days}d ago`, days };
  if (days <= 30) return { cls: 'warn', label: `${days}d left`, days };
  if (days <= 60) return { cls: 'soon', label: `${days}d left`, days };
  return { cls: 'ok', label: 'Current', days };
}
const isStaff = a => a.stage === 'Hired' || a.stage === 'Active';

function eventsOn(iso) {
  return {
    interviews: S.interviews.filter(i => i.date === iso).sort(byDateTime),
    orientations: S.orientations.filter(o => o.date === iso).sort(byDateTime),
    followups: S.applicants.filter(a => a.followUp === iso && a.stage !== ARCHIVED),
  };
}

function conflictsFor(date, start, end, ignoreId) {
  const s = toMin(start), e = toMin(end);
  const out = [];
  for (const i of S.interviews) {
    if (i.id === ignoreId || i.date !== date || i.outcome === 'Rescheduled') continue;
    const is = toMin(i.time), ie = is + (+i.duration || 30);
    if (s < ie && is < e) out.push(`Interview with ${getA(i.applicantId)?.name || '?'} at ${fmtTime(i.time)}`);
  }
  for (const o of S.orientations) {
    if (o.id === ignoreId || o.date !== date) continue;
    if (s < toMin(o.end) && toMin(o.start) < e) out.push(`Orientation ${fmtTime(o.start)}–${fmtTime(o.end)}`);
  }
  return out;
}

/* ---- "needs attention" engine ---- */
function alerts() {
  const t = todayISO();
  const out = [];
  const st = S.settings;
  for (const i of S.interviews) {
    if (i.date < t && !i.outcome) {
      const a = getA(i.applicantId);
      if (a) out.push({ lvl: 'bad', icon: '📝', text: `Record the outcome of <b>${esc(a.name)}</b>'s interview (${fmtShort(i.date)})`, act: 'editInterview', id: i.id });
    }
  }
  for (const a of S.applicants) {
    if (a.stage === ARCHIVED) continue;
    if (a.stage === 'Applied' && validISO(a.appliedOn) && diffDays(a.appliedOn, t) >= st.staleApplicantDays) {
      out.push({ lvl: 'warn', icon: '⏰', text: `<b>${esc(a.name)}</b> applied ${diffDays(a.appliedOn, t)} days ago and hasn't been contacted — caregivers get snapped up fast!`, act: 'openApplicant', id: a.id });
    }
    if (a.stage === 'Offer' && validISO(a.stageSince) && diffDays(a.stageSince, t) >= 3) {
      out.push({ lvl: 'warn', icon: '🤝', text: `Offer to <b>${esc(a.name)}</b> has been out ${diffDays(a.stageSince, t)} days — follow up`, act: 'openApplicant', id: a.id });
    }
    if (a.stage === 'Hired' && needsOrientation(a)) {
      out.push({ lvl: 'warn', icon: '🎓', text: `<b>${esc(a.name)}</b> is hired but not booked for orientation`, act: 'assignOrientation', id: a.id });
    }
    if (validISO(a.followUp) && a.followUp < t) {
      out.push({ lvl: 'warn', icon: '📞', text: `Overdue follow-up with <b>${esc(a.name)}</b> (was due ${fmtShort(a.followUp)})`, act: 'openApplicant', id: a.id });
    }
    if (isStaff(a)) {
      for (const c of a.credentials) {
        const cs = credStatus(c);
        if (cs.cls === 'bad') out.push({ lvl: 'bad', icon: '🛑', text: `<b>${esc(a.name)}</b>'s ${esc(c.type)} expired ${fmtShort(c.expires)}`, act: 'openApplicant', id: a.id });
      }
    }
  }
  for (const o of S.orientations) {
    const d = diffDays(t, o.date);
    if (d < 0 || d > 5) continue;
    const active = o.attendees.filter(x => x.status === 'Scheduled');
    if (!active.length) out.push({ lvl: 'info', icon: '🪑', text: `Orientation on <b>${fmtShort(o.date)}</b> has no one booked yet`, act: 'gotoTab', tab: 'orientations' });
    if (active.length > +o.capacity) out.push({ lvl: 'bad', icon: '🚨', text: `Orientation on <b>${fmtShort(o.date)}</b> is over capacity (${active.length}/${o.capacity})`, act: 'gotoTab', tab: 'orientations' });
    for (const x of active) {
      const a = getA(x.applicantId);
      if (!a) continue;
      const miss = missingItems(a).length;
      if (miss && d <= 3) out.push({ lvl: d <= 1 ? 'bad' : 'warn', icon: '📋', text: `<b>${esc(a.name)}</b> has ${plural(miss, 'onboarding item')} open — orientation is <b>${diffDays(t, o.date) === 0 ? 'TODAY' : fmtShort(o.date)}</b> (${rel(o.date)})`, act: 'checklist', id: a.id });
    }
  }
  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.lvl] - rank[b.lvl]);
}

/* ============================== Rendering ============================== */
const TABS = [
  ['day', '📅', 'Day'],
  ['calendar', '🗓️', 'Calendar'],
  ['applicants', '👥', 'Applicants'],
  ['interviews', '🗣️', 'Interviews'],
  ['orientations', '🎓', 'Orientations'],
  ['compliance', '🛡️', 'Compliance'],
  ['messages', '✉️', 'Messages'],
  ['settings', '⚙️', 'Settings'],
];

function render() {
  renderSpotlight();
  renderTabs();
  renderBanner();
  const fn = VIEWS[ui.tab] || VIEWS.day;
  $('#view').innerHTML = fn();
  initDateHints($('#view'));
}

function renderSpotlight() {
  const now = new Date();
  const t = todayISO();
  const w = now.getDay();
  const ev = eventsOn(t);
  const weekStart = addDays(t, -((w + 6) % 7));
  let strip = '';
  for (let k = 0; k < 14; k++) {
    const d = addDays(weekStart, k);
    const e = eventsOn(d);
    const nI = e.interviews.filter(i => i.outcome !== 'Rescheduled').length, nO = e.orientations.length;
    const cls = [`wd${wdIndex(d)}`, d === t ? 'is-today' : '', d < t ? 'is-past' : '', d === ui.day && ui.tab === 'day' ? 'is-viewing' : '', isWeekend(d) ? 'is-weekend' : '', k === 7 ? 'next-week' : ''].join(' ');
    strip += `<button class="ws-day ${cls}" data-act="gotoDay" data-date="${d}" title="${esc(fmtLong(d))}">
      <span class="ws-wd">${WD[wdIndex(d)].slice(0, 3)}</span>
      <span class="ws-num">${parseISO(d).getDate()}</span>
      <span class="ws-dots">${nO ? `<i class="dot o" title="Orientation">🎓</i>` : ''}${nI ? `<i class="dot i">${nI}</i>` : ''}</span>
    </button>`;
  }
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const nI = ev.interviews.filter(i => !i.outcome || i.outcome !== 'Rescheduled').length;
  $('#spotlight').innerHTML = `
    <div class="spot wd${w}">
      <div class="spot-main">
        <div class="spot-label">Today is</div>
        <div class="spot-wd">${WD[w]}</div>
        <div class="spot-date">${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}</div>
        <div class="spot-meta"><span id="clock">${time}</span> · Week ${isoWeek(now)} ·
          <b>${plural(nI, 'interview')}</b> · <b>${plural(ev.orientations.length, 'orientation')}</b> today</div>
      </div>
      <div class="spot-week">
        <div class="ws-head"><span>This week</span><span>Next week</span></div>
        <div class="weekstrip">${strip}</div>
      </div>
    </div>`;
}

function renderTabs() {
  const al = alerts();
  const counts = {
    day: al.filter(a => a.lvl !== 'info').length,
    interviews: S.interviews.filter(i => i.date < todayISO() && !i.outcome).length,
    applicants: S.applicants.filter(a => a.stage === 'Applied').length,
    compliance: complianceIssues().length,
    orientations: S.applicants.filter(a => a.stage === 'Hired' && needsOrientation(a)).length,
  };
  $('#tabs').innerHTML = `<div class="tabs-inner">
    ${TABS.map(([k, ic, label]) => `<button class="tab ${ui.tab === k ? 'active' : ''}" data-act="gotoTab" data-tab="${k}">
      <span class="tab-ic">${ic}</span><span class="tab-label">${label}</span>${counts[k] ? `<span class="badge">${counts[k]}</span>` : ''}</button>`).join('')}
    <span class="spacer"></span>
    ${installPrompt ? '<button class="btn small primary" data-act="installApp" title="Install as an app on this device">⬇ Install app</button>' : ''}
    <div class="quick">
      <button class="btn small" data-act="newApplicant">＋ Applicant</button>
      <button class="btn small" data-act="newInterview">＋ Interview</button>
      <button class="btn small" data-act="newOrientation">＋ Orientation</button>
    </div></div>`;
}

function renderBanner() {
  $('#banner').innerHTML = S.demo
    ? `<div class="demo-banner">👋 You're looking at <b>sample data</b> so you can try things out. <button class="btn small" data-act="clearDemo">Start fresh with my own data</button></div>`
    : '';
}

const VIEWS = {};

/* ---------------------------- Day view ---------------------------- */
VIEWS.day = () => {
  const d = ui.day;
  const t = todayISO();
  const ev = eventsOn(d);
  const items = [
    ...ev.orientations.map(o => ({ time: o.start, html: orientationAgendaItem(o) })),
    ...ev.interviews.map(i => ({ time: i.time, html: interviewAgendaItem(i) })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const fu = ev.followups.map(a => `<li class="agenda-item followup">
      <div class="ai-time">📞</div>
      <div class="ai-body"><div class="ai-title">Follow up with <a href="#" data-act="openApplicant" data-id="${a.id}">${esc(a.name)}</a></div>
      <div class="ai-sub">${esc(a.position)} · ${esc(a.stage)} ${a.phone ? `· <a href="tel:${esc(a.phone)}">${esc(a.phone)}</a>` : ''}</div></div>
      <div class="ai-actions"><button class="btn small" data-act="clearFollowUp" data-id="${a.id}">Done</button></div></li>`).join('');
  const w = wdIndex(d);
  const al = alerts();
  const offset = diffDays(t, d);

  const stats = statsRow();
  return `
  <section class="dayhead wd${w}">
    ${dateChip(d, 'xl')}
    <div class="dh-text">
      <div class="dh-rel">${offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : offset > 0 ? `${offset} days from today` : `${-offset} days ago`}${isWeekend(d) ? ' · <span class="weekend-flag">Weekend</span>' : ''}</div>
      <h1 class="dh-wd">${WD[w]}</h1>
      <div class="dh-date">${MONTHS[parseISO(d).getMonth()]} ${parseISO(d).getDate()}, ${parseISO(d).getFullYear()}</div>
    </div>
    <div class="dh-nav no-print">
      <button class="btn" data-act="dayShift" data-n="-1" title="Previous day (←)">◀ ${WD[wdIndex(addDays(d, -1))].slice(0, 3)}</button>
      <button class="btn ${d === t ? 'primary' : ''}" data-act="dayToday" title="Jump to today (T)">Today</button>
      <button class="btn" data-act="dayShift" data-n="1" title="Next day (→)">${WD[wdIndex(addDays(d, 1))].slice(0, 3)} ▶</button>
      <input type="date" value="${d}" data-change="dayPick" aria-label="Pick a day" class="nohint">
      <button class="btn" data-act="printDay" title="Print a one-page day sheet">🖨 Day sheet</button>
    </div>
  </section>
  ${d === t ? stats : ''}
  <div class="grid-2">
    <section class="card">
      <div class="card-head"><h2>Schedule for ${WD[w]}</h2>
        <div class="no-print"><button class="btn small" data-act="newInterview" data-date="${d}">＋ Interview</button>
        <button class="btn small" data-act="newOrientation" data-date="${d}">＋ Orientation</button></div></div>
      ${items.length || fu ? `<ul class="agenda">${items.map(x => x.html).join('')}${fu}</ul>`
        : `<div class="empty">Nothing booked for ${WD[w]}. ${isWeekend(d) ? 'Enjoy the weekend! 🌤' : 'A good day to call back new applicants.'}</div>`}
    </section>
    <section class="card">
      <div class="card-head"><h2>Needs attention</h2><span class="muted">${plural(al.length, 'item')}</span></div>
      ${al.length ? `<ul class="alerts">${al.map(x => `<li class="alert ${x.lvl}"><span class="al-ic">${x.icon}</span><span class="al-text">${x.text}</span>
        <button class="btn small no-print" data-act="${x.act}" ${x.id ? `data-id="${x.id}"` : ''} ${x.tab ? `data-tab="${x.tab}"` : ''}>Open</button></li>`).join('')}</ul>`
        : '<div class="empty">🎉 All caught up. Nice work!</div>'}
      ${upcomingExpirations()}
    </section>
  </div>
  ${weekAhead(d)}`;
};

function statsRow() {
  const t = todayISO();
  const weekStart = addDays(t, -((wdIndex(t) + 6) % 7));
  const weekEnd = addDays(weekStart, 6);
  const live = S.applicants.filter(a => a.stage !== ARCHIVED);
  const newThisWeek = S.applicants.filter(a => a.appliedOn >= weekStart && a.appliedOn <= weekEnd).length;
  const intThisWeek = S.interviews.filter(i => i.date >= weekStart && i.date <= weekEnd && i.outcome !== 'Rescheduled').length;
  const hiredMonth = S.applicants.filter(a => (a.hiredOn || '').slice(0, 7) === t.slice(0, 7)).length;
  const nextO = S.orientations.filter(o => o.date >= t).sort(byDateTime)[0];
  const seats = nextO ? Math.max(0, +nextO.capacity - nextO.attendees.filter(x => x.status !== 'No-show').length) : 0;
  const pastI = S.interviews.filter(i => i.outcome && i.outcome !== 'Rescheduled');
  const noShow = pastI.length ? Math.round(100 * pastI.filter(i => i.outcome === 'No-show').length / pastI.length) : 0;
  const tile = (n, label, sub = '', act = '') => `<button class="stat" ${act}><span class="stat-n">${n}</span><span class="stat-l">${label}</span>${sub ? `<span class="stat-s">${sub}</span>` : ''}</button>`;
  return `<section class="stats">
    ${tile(live.filter(a => !isStaff(a)).length, 'In the pipeline', `${newThisWeek} new this week`, 'data-act="gotoTab" data-tab="applicants"')}
    ${tile(intThisWeek, 'Interviews this week', `${noShow}% no-show rate`, 'data-act="gotoTab" data-tab="interviews"')}
    ${tile(hiredMonth, `Hired in ${MONTHS[parseISO(t).getMonth()]}`, `${S.applicants.filter(a => a.stage === 'Active').length} active caregivers`)}
    ${tile(nextO ? `${WD[wdIndex(nextO.date)].slice(0, 3)} ${parseISO(nextO.date).getDate()}` : '—', 'Next orientation', nextO ? `${seats} open seat${seats === 1 ? '' : 's'} · ${rel(nextO.date)}` : 'none scheduled', 'data-act="gotoTab" data-tab="orientations"')}
  </section>`;
}

function interviewAgendaItem(i) {
  const a = getA(i.applicantId) || { name: '(deleted applicant)' };
  const end = fromMin(toMin(i.time) + (+i.duration || 30));
  const past = i.date < todayISO() || (i.date === todayISO() && toMin(end) < new Date().getHours() * 60 + new Date().getMinutes());
  return `<li class="agenda-item interview ${i.outcome ? 'has-outcome' : ''} ${i.outcome === 'Rescheduled' ? 'struck' : ''}">
    <div class="ai-time">${fmtTime(i.time)}<small>${fmtTime(end)}</small></div>
    <div class="ai-body">
      <div class="ai-title">🗣 Interview: <a href="#" data-act="openApplicant" data-id="${a.id}">${esc(a.name)}</a> <span class="pill">${esc(a.position || '')}</span></div>
      <div class="ai-sub">${esc(i.type)} · with ${esc(i.interviewer || '—')} · ${esc(i.location || '')} ${a.phone ? `· <a href="tel:${esc(a.phone)}">${esc(a.phone)}</a>` : ''}</div>
      ${i.outcome ? `<div class="outcome o-${esc(i.outcome.replace(/\W/g, ''))}">${esc(i.outcome)}</div>` : ''}
    </div>
    <div class="ai-actions no-print">${!i.outcome && past ? outcomeButtons(i) : !i.outcome ? `<button class="btn small" data-act="message" data-aid="${a.id}" data-tpl="t-remind" data-ev="i:${i.id}">✉️ Remind</button>` : ''}
      <button class="btn small ghost" data-act="editInterview" data-id="${i.id}">Edit</button></div>
  </li>`;
}
function outcomeButtons(i) {
  return `<button class="btn small good" data-act="outcome" data-id="${i.id}" data-v="Passed">✓ Passed</button>
    <button class="btn small" data-act="outcome" data-id="${i.id}" data-v="Not a fit">✗ Not a fit</button>
    <button class="btn small warn" data-act="outcome" data-id="${i.id}" data-v="No-show">No-show</button>`;
}
function orientationAgendaItem(o) {
  const att = o.attendees.filter(x => x.status !== 'No-show');
  return `<li class="agenda-item orientation">
    <div class="ai-time">${fmtTime(o.start)}<small>${fmtTime(o.end)}</small></div>
    <div class="ai-body">
      <div class="ai-title">🎓 Orientation day <span class="pill">${att.length}/${o.capacity} seats</span></div>
      <div class="ai-sub">${esc(o.location)} · Trainer: ${esc(o.trainer || '—')}</div>
      <div class="att-mini">${o.attendees.map(x => { const a = getA(x.applicantId); if (!a) return ''; const miss = missingItems(a).length;
        return `<span class="att-chip s-${x.status}">${esc(a.name)}${miss ? ` <i class="miss" title="${miss} onboarding items open">${miss}</i>` : ' ✓'}</span>`; }).join('') || '<span class="muted">No one booked yet</span>'}</div>
    </div>
    <div class="ai-actions no-print"><button class="btn small" data-act="gotoTab" data-tab="orientations">Manage</button>
      <button class="btn small ghost" data-act="printRoster" data-id="${o.id}">🖨 Roster</button></div>
  </li>`;
}
function upcomingExpirations() {
  const rows = [];
  for (const a of S.applicants.filter(isStaff)) for (const c of a.credentials) {
    const cs = credStatus(c);
    if (cs.cls === 'warn' || cs.cls === 'soon') rows.push({ a, c, cs });
  }
  if (!rows.length) return '';
  rows.sort((x, y) => x.c.expires.localeCompare(y.c.expires));
  return `<h3 class="sub-h">Credentials expiring in the next 60 days</h3><ul class="mini-list">${rows.map(r => `<li>
    <span class="status ${r.cs.cls}">${r.cs.label}</span> <a href="#" data-act="openApplicant" data-id="${r.a.id}">${esc(r.a.name)}</a> — ${esc(r.c.type)} · ${dateText(r.c.expires, false)}
    <button class="btn tiny no-print" data-act="message" data-aid="${r.a.id}" data-tpl="t-renew">✉️</button></li>`).join('')}</ul>`;
}
function weekAhead(from) {
  const days = [];
  for (let k = 1; k <= 7; k++) {
    const d = addDays(from, k);
    const e = eventsOn(d);
    const list = [
      ...e.orientations.map(o => ({ t: o.start, s: `🎓 Orientation (${o.attendees.filter(x => x.status !== 'No-show').length}/${o.capacity})` })),
      ...e.interviews.filter(i => i.outcome !== 'Rescheduled').map(i => ({ t: i.time, s: `🗣 ${esc(getA(i.applicantId)?.name || '?')}` })),
      ...e.followups.map(a => ({ t: '99', s: `📞 ${esc(a.name)}` })),
    ].sort((a, b) => a.t.localeCompare(b.t));
    days.push(`<button class="wa-day wd${wdIndex(d)} ${isWeekend(d) ? 'is-weekend' : ''}" data-act="gotoDay" data-date="${d}">
      <div class="wa-head"><span class="wa-wd">${WD[wdIndex(d)]}</span><span class="wa-date">${fmtMD(d)}</span></div>
      <ul>${list.map(x => `<li>${x.t !== '99' ? `<b>${fmtTime(x.t)}</b> ` : ''}${x.s}</li>`).join('') || '<li class="muted">—</li>'}</ul></button>`);
  }
  return `<section class="card"><div class="card-head"><h2>The next 7 days</h2></div><div class="week-ahead">${days.join('')}</div></section>`;
}

/* ---------------------------- Calendar ---------------------------- */
VIEWS.calendar = () => {
  const [y, m] = ui.month.split('-').map(Number);
  const firstD = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const start = addDays(toISO(firstD), -firstD.getDay());
  const weeks = Math.ceil((firstD.getDay() + days) / 7);
  const t = todayISO();
  let cells = '';
  for (let k = 0; k < weeks * 7; k++) {
    const d = addDays(start, k);
    const e = eventsOn(d);
    const inMonth = parseISO(d).getMonth() === m - 1;
    const chips = [
      ...e.orientations.map(o => ({ t: o.start, h: `<span class="cchip o">🎓 ${fmtTime(o.start)} Orientation · ${o.attendees.filter(x => x.status !== 'No-show').length}/${o.capacity}</span>` })),
      ...e.interviews.filter(i => i.outcome !== 'Rescheduled').map(i => ({ t: i.time, h: `<span class="cchip i ${i.outcome ? 'done' : ''}">${fmtTime(i.time)} ${esc(first(getA(i.applicantId)?.name))}</span>` })),
      ...e.followups.map(a => ({ t: '99', h: `<span class="cchip f">📞 ${esc(first(a.name))}</span>` })),
    ].sort((a, b) => a.t.localeCompare(b.t));
    const shown = chips.slice(0, 4).map(c => c.h).join('');
    cells += `<button class="cal-cell wd${wdIndex(d)} ${inMonth ? '' : 'out'} ${d === t ? 'is-today' : ''} ${isWeekend(d) ? 'is-weekend' : ''} ${d < t ? 'is-past' : ''}" data-act="gotoDay" data-date="${d}" aria-label="${esc(fmtLong(d))}">
      <span class="cal-num"><span class="cal-wd-mobile">${WD[wdIndex(d)].slice(0, 3)}</span> ${parseISO(d).getDate()}${d === t ? ' <em>TODAY</em>' : ''}</span>
      ${shown}${chips.length > 4 ? `<span class="cchip more">+${chips.length - 4} more</span>` : ''}</button>`;
  }
  return `<section class="card cal-card">
    <div class="card-head cal-head">
      <h1>${MONTHS[m - 1]} ${y}</h1>
      <div><button class="btn" data-act="monthShift" data-n="-1">◀</button>
        <button class="btn" data-act="monthToday">This month</button>
        <button class="btn" data-act="monthShift" data-n="1">▶</button></div>
    </div>
    <div class="cal-legend"><span class="cchip o">🎓 Orientation</span><span class="cchip i">Interview</span><span class="cchip f">📞 Follow-up</span></div>
    <div class="cal-grid">
      ${WD.map((w, i) => `<div class="cal-wd wd${i} ${i === 0 || i === 6 ? 'is-weekend' : ''} ${i === new Date().getDay() ? 'is-today-col' : ''}">${w}</div>`).join('')}
      ${cells}
    </div></section>`;
};

/* ---------------------------- Applicants ---------------------------- */
VIEWS.applicants = () => `
  <section class="toolbar">
    <input type="search" placeholder="🔎 Search name, phone, email, notes…" value="${esc(ui.q)}" data-input="appSearch" class="grow">
    <select data-change="posFilter" aria-label="Filter by position"><option value="">All positions</option>${S.settings.positions.map(p => `<option ${p === ui.pos ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
    <label class="check"><input type="checkbox" data-change="toggleArchived" ${ui.showArchived ? 'checked' : ''}> Show archived</label>
    <button class="btn" data-act="exportCSV">⬇ CSV</button>
    <button class="btn primary" data-act="newApplicant">＋ New applicant</button>
  </section>
  <div id="board">${boardHTML()}</div>`;

function boardHTML() {
  const q = ui.q.trim().toLowerCase();
  const match = a => (!ui.pos || a.position === ui.pos) && (!q || [a.name, a.phone, a.email, a.notes, a.position, a.source].join(' ').toLowerCase().includes(q));
  const cols = [...STAGES, ...(ui.showArchived ? [ARCHIVED] : [])];
  return `<div class="board">${cols.map(stage => {
    const list = S.applicants.filter(a => a.stage === stage && match(a)).sort((a, b) => (a.appliedOn || '').localeCompare(b.appliedOn || ''));
    return `<section class="col col-${stage}">
      <div class="col-head"><h2>${stage}</h2><span class="count">${list.length}</span></div>
      <div class="col-hint">${STAGE_HINT[stage] || 'Not moving forward / withdrew'}</div>
      ${list.map(appCard).join('') || '<div class="empty small">—</div>'}
    </section>`;
  }).join('')}</div>`;
}
function appCard(a) {
  const t = todayISO();
  const idx = STAGES.indexOf(a.stage);
  const inStage = validISO(a.stageSince) ? diffDays(a.stageSince, t) : 0;
  const ni = nextInterview(a.id);
  const o = orientationFor(a.id);
  let next = '';
  if (ni) next = `<div class="ac-next">🗣 ${dateText(ni.date, false)} · ${fmtTime(ni.time)}</div>`;
  else if (o && o.date >= t) next = `<div class="ac-next">🎓 Orientation ${dateText(o.date, false)}</div>`;
  else if (a.followUp) next = `<div class="ac-next ${a.followUp < t ? 'late' : ''}">📞 Follow up ${dateText(a.followUp, false)}</div>`;
  const prog = isStaff(a) || a.stage === 'Offer' ? progressBar(checklistDone(a), S.settings.checklist.length) : '';
  const stale = (a.stage === 'Applied' && validISO(a.appliedOn) && diffDays(a.appliedOn, t) >= S.settings.staleApplicantDays) ? ' stale' : '';
  return `<article class="acard${stale}" data-act="openApplicant" data-id="${a.id}" tabindex="0">
    <div class="ac-top"><span class="ac-name">${esc(a.name)}</span><span class="pill">${esc(a.position)}</span></div>
    <div class="ac-meta">Applied ${dateText(a.appliedOn, false)} · ${inStage}d in stage</div>
    ${a.availability.length ? `<div class="ac-avail">${a.availability.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
    ${next}${prog}
    ${a.stage === ARCHIVED ? `<div class="ac-meta">${esc(a.archivedReason || '')}</div>` : ''}
    <div class="ac-actions">
      ${idx > 0 ? `<button class="btn tiny ghost" data-act="stageMove" data-id="${a.id}" data-dir="-1" title="Back to ${STAGES[idx - 1]}">◀</button>` : ''}
      ${a.phone ? `<a class="btn tiny ghost" href="tel:${esc(a.phone)}" title="Call ${esc(a.phone)}">📞</a>` : ''}
      ${a.stage === 'Applied' || a.stage === 'Screening' ? `<button class="btn tiny ghost" data-act="newInterview" data-aid="${a.id}" title="Schedule interview">🗣</button>` : ''}
      ${needsOrientation(a) ? `<button class="btn tiny ghost" data-act="assignOrientation" data-id="${a.id}" title="Book orientation">🎓</button>` : ''}
      <span class="spacer"></span>
      ${idx >= 0 && idx < STAGES.length - 1 ? `<button class="btn tiny" data-act="stageMove" data-id="${a.id}" data-dir="1">${STAGES[idx + 1]} ▶</button>` : ''}
      ${a.stage === ARCHIVED ? `<button class="btn tiny" data-act="restore" data-id="${a.id}">Restore</button>` : ''}
    </div>
  </article>`;
}
function progressBar(n, total) {
  const pct = total ? Math.round(100 * n / total) : 0;
  return `<div class="progress ${pct === 100 ? 'full' : ''}" title="${n} of ${total} onboarding items"><span style="width:${pct}%"></span><em>${n}/${total} onboarding</em></div>`;
}

/* ---------------------------- Interviews ---------------------------- */
VIEWS.interviews = () => {
  const t = todayISO();
  const needs = S.interviews.filter(i => i.date < t && !i.outcome).sort(byDateTime);
  const upcoming = S.interviews.filter(i => i.date >= t && i.outcome !== 'Rescheduled').sort(byDateTime);
  const past = S.interviews.filter(i => i.date < t && i.outcome).sort(byDateTime).reverse().slice(0, 40);
  const group = list => {
    const by = {};
    for (const i of list) (by[i.date] = by[i.date] || []).push(i);
    return Object.entries(by).map(([d, l]) => `<div class="dgroup">
      <div class="dgroup-head wd${wdIndex(d)}">${dateChip(d)}<div><div class="dg-wd">${WD[wdIndex(d)]}</div><div class="dg-date">${fmtMD(d)} · ${rel(d)}</div></div></div>
      <ul class="agenda">${l.map(interviewAgendaItem).join('')}</ul></div>`).join('');
  };
  return `<section class="toolbar"><h1 class="grow">Interviews</h1><button class="btn primary" data-act="newInterview">＋ Schedule interview</button></section>
    ${needs.length ? `<section class="card attn"><div class="card-head"><h2>📝 Waiting for an outcome</h2><span class="muted">${needs.length}</span></div>${group(needs)}</section>` : ''}
    <section class="card"><div class="card-head"><h2>Upcoming</h2><span class="muted">${upcoming.length}</span></div>${upcoming.length ? group(upcoming) : '<div class="empty">No upcoming interviews. Check the <a href="#" data-act="gotoTab" data-tab="applicants">Applied column</a> for people to call.</div>'}</section>
    <section class="card"><div class="card-head"><h2>Recent results</h2></div>${past.length ? group(past) : '<div class="empty">No completed interviews yet.</div>'}</section>`;
};

/* ---------------------------- Orientations ---------------------------- */
VIEWS.orientations = () => {
  const t = todayISO();
  const upcoming = S.orientations.filter(o => o.date >= t).sort(byDateTime);
  const past = S.orientations.filter(o => o.date < t).sort(byDateTime).reverse().slice(0, 12);
  const waiting = S.applicants.filter(needsOrientation);
  return `<section class="toolbar"><h1 class="grow">Orientation days</h1>
      <button class="btn primary" data-act="newOrientation">＋ New orientation day</button></section>
    ${waiting.length ? `<section class="card attn"><div class="card-head"><h2>Waiting for an orientation seat</h2><span class="muted">${waiting.length}</span></div>
      <ul class="mini-list">${waiting.map(a => `<li><a href="#" data-act="openApplicant" data-id="${a.id}">${esc(a.name)}</a> <span class="pill">${esc(a.position)}</span> <span class="muted">${esc(a.stage)}${a.hiredOn ? ` since ${fmtShort(a.hiredOn)}` : ''}</span>
        <button class="btn tiny" data-act="assignOrientation" data-id="${a.id}">Book a seat</button></li>`).join('')}</ul></section>` : ''}
    ${upcoming.length ? upcoming.map(orientationCard).join('') : '<section class="card"><div class="empty">No upcoming orientation days. Create one — you can repeat it weekly in one step.</div></section>'}
    ${past.length ? `<details class="card"><summary><h2>Past orientations (${past.length})</h2></summary>${past.map(orientationCard).join('')}</details>` : ''}`;
};
function orientationCard(o) {
  const t = todayISO();
  const isPast = o.date < t;
  const active = o.attendees.filter(x => x.status !== 'No-show');
  const pct = Math.min(100, Math.round(100 * active.length / (+o.capacity || 1)));
  const eligible = S.applicants.filter(a => needsOrientation(a) && !o.attendees.some(x => x.applicantId === a.id));
  const ready = active.filter(x => { const a = getA(x.applicantId); return a && !missingItems(a).length; }).length;
  return `<section class="card ocard wd${wdIndex(o.date)} ${isPast ? 'is-past' : ''}">
    <div class="oc-head">
      ${dateChip(o.date, 'lg')}
      <div class="oc-title">
        <div class="oc-wd">${WD[wdIndex(o.date)]} <span class="rel">${rel(o.date)}</span></div>
        <div class="oc-date">${fmtMD(o.date)}, ${parseISO(o.date).getFullYear()} · ${fmtTime(o.start)} – ${fmtTime(o.end)}</div>
        <div class="muted">📍 ${esc(o.location)} · 👩‍🏫 ${esc(o.trainer || 'Trainer TBD')}</div>
      </div>
      <div class="oc-cap">
        <div class="cap-bar ${active.length > o.capacity ? 'over' : ''}"><span style="width:${pct}%"></span></div>
        <div><b>${active.length}</b> / ${o.capacity} seats · <b>${ready}</b> paperwork-ready</div>
      </div>
      <div class="oc-actions">
        <button class="btn small" data-act="printRoster" data-id="${o.id}">🖨 Sign-in sheet</button>
        <button class="btn small" data-act="editOrientation" data-id="${o.id}">Edit</button>
      </div>
    </div>
    ${o.agenda ? `<details class="oc-agenda"><summary>Agenda</summary><pre>${esc(o.agenda)}</pre></details>` : ''}
    <table class="table att-table">
      <thead><tr><th>Caregiver</th><th>Position</th><th>Phone</th><th>Onboarding</th><th>Status</th><th></th></tr></thead>
      <tbody>${o.attendees.map(x => {
        const a = getA(x.applicantId);
        if (!a) return '';
        return `<tr class="s-${x.status}">
          <td><a href="#" data-act="openApplicant" data-id="${a.id}">${esc(a.name)}</a></td>
          <td>${esc(a.position)}</td>
          <td>${a.phone ? `<a href="tel:${esc(a.phone)}">${esc(a.phone)}</a>` : '—'}</td>
          <td><button class="linkish" data-act="checklist" data-id="${a.id}">${progressBar(checklistDone(a), S.settings.checklist.length)}</button></td>
          <td><span class="status s-${x.status}">${x.status}</span></td>
          <td class="row-actions">
            ${o.date <= t && x.status !== 'Attended' ? `<button class="btn tiny good" data-act="attStatus" data-o="${o.id}" data-a="${a.id}" data-v="Attended">✓ Attended</button>` : ''}
            ${o.date <= t && x.status !== 'No-show' ? `<button class="btn tiny warn" data-act="attStatus" data-o="${o.id}" data-a="${a.id}" data-v="No-show">No-show</button>` : ''}
            ${x.status !== 'Scheduled' ? `<button class="btn tiny ghost" data-act="attStatus" data-o="${o.id}" data-a="${a.id}" data-v="Scheduled">Undo</button>` : ''}
            ${!isPast ? `<button class="btn tiny ghost" data-act="message" data-aid="${a.id}" data-tpl="t-orient" data-ev="o:${o.id}" title="Send confirmation">✉️</button>` : ''}
            <button class="btn tiny ghost" data-act="removeAttendee" data-o="${o.id}" data-a="${a.id}" title="Remove from this session">✕</button>
          </td></tr>`;
      }).join('') || '<tr><td colspan="6" class="empty small">No one booked yet.</td></tr>'}</tbody>
    </table>
    ${!isPast ? `<div class="oc-add">
      ${eligible.length ? `<select id="add-${o.id}" aria-label="Add caregiver">${eligible.map(a => `<option value="${a.id}">${esc(a.name)} — ${esc(a.position)} (${esc(a.stage)})</option>`).join('')}</select>
      <button class="btn small" data-act="addAttendee" data-o="${o.id}">＋ Add to this day</button>
      ${eligible.length > 1 && active.length + eligible.length <= o.capacity ? `<button class="btn small ghost" data-act="addAllAttendees" data-o="${o.id}">＋ Add all ${eligible.length}</button>` : ''}`
        : '<span class="muted">Everyone hired is already booked. 👍</span>'}
      </div>` : ''}
  </section>`;
}

/* ---------------------------- Compliance ---------------------------- */
function complianceIssues() {
  const out = [];
  for (const a of S.applicants.filter(isStaff)) {
    for (const c of a.credentials) { const cs = credStatus(c); if (cs.cls === 'bad' || cs.cls === 'warn') out.push({ a, c, cs }); }
    for (const r of S.settings.requiredCreds) if (!a.credentials.some(c => c.type === r)) out.push({ a, c: { type: r }, cs: { cls: 'bad', label: 'Not on file', days: -Infinity } });
  }
  return out;
}
VIEWS.compliance = () => {
  const staff = S.applicants.filter(isStaff).sort((a, b) => a.name.localeCompare(b.name));
  const rows = [];
  for (const a of staff) {
    for (const c of a.credentials) rows.push({ a, c, cs: credStatus(c) });
    for (const r of S.settings.requiredCreds) if (!a.credentials.some(c => c.type === r)) rows.push({ a, c: { type: r }, cs: { cls: 'bad', label: 'Not on file', days: -Infinity } });
  }
  rows.sort((x, y) => x.cs.days - y.cs.days);
  const shown = ui.compIssuesOnly ? rows.filter(r => r.cs.cls !== 'ok') : rows;
  const count = k => rows.filter(r => r.cs.cls === k).length;
  return `<section class="toolbar"><h1 class="grow">Compliance & credentials</h1>
      <label class="check"><input type="checkbox" data-change="compIssues" ${ui.compIssuesOnly ? 'checked' : ''}> Only show problems</label></section>
    <section class="stats">
      <div class="stat bad"><span class="stat-n">${count('bad')}</span><span class="stat-l">Expired / missing</span></div>
      <div class="stat warn"><span class="stat-n">${count('warn')}</span><span class="stat-l">Expire within 30 days</span></div>
      <div class="stat soon"><span class="stat-n">${count('soon')}</span><span class="stat-l">Expire in 31–60 days</span></div>
      <div class="stat"><span class="stat-n">${staff.length}</span><span class="stat-l">Caregivers on file</span><span class="stat-s">${staff.filter(a => !missingItems(a).length).length} with complete onboarding</span></div>
    </section>
    <section class="card"><table class="table">
      <thead><tr><th>Status</th><th>Caregiver</th><th>Credential</th><th>Expires</th><th>Onboarding</th><th></th></tr></thead>
      <tbody>${shown.map(r => `<tr>
        <td><span class="status ${r.cs.cls}">${r.cs.label}</span></td>
        <td><a href="#" data-act="openApplicant" data-id="${r.a.id}">${esc(r.a.name)}</a> <span class="pill">${esc(r.a.position)}</span></td>
        <td>${esc(r.c.type)}</td>
        <td>${r.c.expires ? dateText(r.c.expires) : '—'}</td>
        <td>${progressBar(checklistDone(r.a), S.settings.checklist.length)}</td>
        <td class="row-actions"><button class="btn tiny" data-act="openApplicant" data-id="${r.a.id}">Update</button>
          ${r.cs.cls !== 'ok' ? `<button class="btn tiny ghost" data-act="message" data-aid="${r.a.id}" data-tpl="t-renew">✉️ Remind</button>` : ''}</td>
      </tr>`).join('') || `<tr><td colspan="6" class="empty">${staff.length ? 'No problems found. 🎉' : 'Hired caregivers and their credentials will show up here.'}</td></tr>`}</tbody>
    </table></section>`;
};

/* ---------------------------- Messages ---------------------------- */
function eventsForApplicant(aid) {
  const out = [];
  for (const i of S.interviews.filter(i => i.applicantId === aid && i.outcome !== 'Rescheduled').sort(byDateTime))
    out.push({ key: 'i:' + i.id, date: i.date, time: fmtTime(i.time), location: i.location, label: `Interview — ${fmtShort(i.date)} ${fmtTime(i.time)}` });
  for (const o of S.orientations.filter(o => o.attendees.some(x => x.applicantId === aid)).sort(byDateTime))
    out.push({ key: 'o:' + o.id, date: o.date, time: `${fmtTime(o.start)} – ${fmtTime(o.end)}`, location: o.location, label: `Orientation — ${fmtShort(o.date)}` });
  return out;
}
function fillTemplate(text, a, ev) {
  const st = S.settings;
  const exp = a ? a.credentials.filter(c => { const s = credStatus(c); return s.cls !== 'ok'; }).map(c => `${c.type} (expires ${fmtLong(c.expires)})`) : [];
  const missing = a ? missingItems(a) : [];
  const map = {
    name: a?.name || '[Name]', first: first(a?.name) || '[Name]', position: a?.position || '[Position]',
    company: st.company || '[Company]', hr: st.hrName || '[Your name]', phone: st.phone || '[Phone]',
    weekday: ev ? WD[wdIndex(ev.date)] : '[Weekday]', date: ev ? `${fmtMD(ev.date)}, ${parseISO(ev.date).getFullYear()}` : '[Date]',
    time: ev?.time || '[Time]', location: ev?.location || '[Location]', bring: st.orientationBring,
    missing: a ? (missing.length ? missing.map(m => '  • ' + m).join('\n') : 'nothing — you are all set!') : '[missing items]',
    expiring: a ? (exp.join(', ') || 'nothing at this time') : '[credentials]',
  };
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
}
VIEWS.messages = () => {
  const st = S.settings;
  const people = S.applicants.filter(a => a.stage !== ARCHIVED).sort((a, b) => a.name.localeCompare(b.name));
  const aid = ui.msg.aid && getA(ui.msg.aid) ? ui.msg.aid : people[0]?.id;
  const tid = ui.msg.tpl && st.templates.find(t => t.id === ui.msg.tpl) ? ui.msg.tpl : st.templates[0]?.id;
  const a = getA(aid);
  const tpl = st.templates.find(t => t.id === tid);
  const evs = a ? eventsForApplicant(a.id) : [];
  const evKey = ui.msg.ev && evs.some(e => e.key === ui.msg.ev) ? ui.msg.ev
    : (evs.find(e => e.date >= todayISO() && (tid?.includes('orient') ? e.key.startsWith('o:') : e.key.startsWith('i:'))) || evs.find(e => e.date >= todayISO()) || evs[evs.length - 1])?.key;
  ui.msg = { aid, tpl: tid, ev: evKey };
  const ev = evs.find(e => e.key === evKey);
  const subject = tpl ? fillTemplate(tpl.subject, a, ev) : '';
  const body = tpl ? fillTemplate(tpl.body, a, ev) : '';
  return `<section class="toolbar"><h1 class="grow">Messages</h1></section>
  <div class="grid-2 msg-grid">
    <section class="card">
      <div class="card-head"><h2>Write a message</h2></div>
      <div class="form-grid">
        <label class="field"><span>To</span><select data-change="msgA">${people.map(p => `<option value="${p.id}" ${p.id === aid ? 'selected' : ''}>${esc(p.name)} — ${esc(p.stage)}</option>`).join('')}</select></label>
        <label class="field"><span>Template</span><select data-change="msgT">${st.templates.map(t => `<option value="${t.id}" ${t.id === tid ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
        <label class="field span-2"><span>About</span><select data-change="msgE">${evs.length ? evs.map(e => `<option value="${e.key}" ${e.key === evKey ? 'selected' : ''}>${esc(e.label)}</option>`).join('') : '<option value="">(no interviews or orientations yet)</option>'}</select></label>
      </div>
      ${ev ? `<div class="msg-date wd${wdIndex(ev.date)}">${dateChip(ev.date)}<div><b>${WD[wdIndex(ev.date)]}</b>, ${fmtMD(ev.date)} · ${esc(ev.time)}<div class="muted">${rel(ev.date)}</div></div></div>` : ''}
      <label class="field"><span>Subject</span><input id="msg-subject" value="${esc(subject)}"></label>
      <label class="field"><span>Message</span><textarea id="msg-body" rows="13">${esc(body)}</textarea></label>
      <div class="btn-row">
        <button class="btn primary" data-act="copyMsg">📋 Copy message</button>
        ${a?.email ? `<button class="btn" data-act="mailMsg" data-to="${esc(a.email)}">📧 Open in email</button>` : '<span class="muted">No email on file</span>'}
        ${a?.phone ? `<button class="btn" data-act="smsMsg" data-to="${esc(a.phone)}">💬 Text</button>` : ''}
        ${a ? `<button class="btn ghost" data-act="logMsg" data-id="${a.id}">✓ Mark as sent</button>` : ''}
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Templates</h2><button class="btn small" data-act="editTemplate">＋ New</button></div>
      <p class="muted">Placeholders: <code>{first}</code> <code>{name}</code> <code>{position}</code> <code>{weekday}</code> <code>{date}</code> <code>{time}</code> <code>{location}</code> <code>{missing}</code> <code>{expiring}</code> <code>{bring}</code> <code>{company}</code> <code>{hr}</code> <code>{phone}</code></p>
      <ul class="mini-list">${st.templates.map(t => `<li><b>${esc(t.name)}</b><span class="spacer"></span>
        <button class="btn tiny ghost" data-act="editTemplate" data-id="${t.id}">Edit</button></li>`).join('')}</ul>
    </section>
  </div>`;
};

/* ---------------------------- Settings ---------------------------- */
VIEWS.settings = () => {
  const st = S.settings;
  const lines = arr => esc(arr.join('\n'));
  return `<section class="toolbar"><h1 class="grow">Settings</h1></section>
  <form id="settings-form" class="card">
    <div class="form-grid">
      <label class="field"><span>Organization name</span><input name="company" value="${esc(st.company)}"></label>
      <label class="field"><span>Your name (signs messages)</span><input name="hrName" value="${esc(st.hrName)}"></label>
      <label class="field"><span>HR phone</span><input name="phone" value="${esc(st.phone)}"></label>
      <label class="field"><span>Default orientation location</span><input name="orientationLocation" value="${esc(st.orientationLocation)}"></label>
      <label class="field"><span>Default orientation capacity</span><input name="defaultCapacity" type="number" min="1" value="${esc(st.defaultCapacity)}"></label>
      <label class="field"><span>Flag new applicants not contacted after (days)</span><input name="staleApplicantDays" type="number" min="1" value="${esc(st.staleApplicantDays)}"></label>
      <label class="field span-2"><span>"Please bring" for orientation</span><textarea name="orientationBring" rows="2">${esc(st.orientationBring)}</textarea></label>
      <label class="field"><span>Onboarding checklist (one per line)</span><textarea name="checklist" rows="10">${lines(st.checklist)}</textarea></label>
      <label class="field"><span>Credential types (one per line)</span><textarea name="credentialTypes" rows="10">${lines(st.credentialTypes)}</textarea></label>
      <label class="field"><span>Required for every caregiver (one per line)</span><textarea name="requiredCreds" rows="4">${lines(st.requiredCreds)}</textarea></label>
      <label class="field"><span>Interviewers / trainers (one per line)</span><textarea name="interviewers" rows="4">${lines(st.interviewers)}</textarea></label>
      <label class="field"><span>Positions (one per line)</span><textarea name="positions" rows="6">${lines(st.positions)}</textarea></label>
      <label class="field"><span>Applicant sources (one per line)</span><textarea name="sources" rows="6">${lines(st.sources)}</textarea></label>
    </div>
    <div class="btn-row"><button type="submit" class="btn primary">Save settings</button></div>
  </form>
  <section class="card">
    <div class="card-head"><h2>Your data</h2></div>
    <p class="muted">Everything is stored privately in <b>this browser on this computer</b>. Download a backup every week (Friday is a good habit!) and keep it somewhere safe. ${S.lastBackup ? `Last backup: <b>${dateText(S.lastBackup)}</b>.` : '<b>No backup downloaded yet.</b>'}</p>
    <div class="btn-row">
      <button class="btn primary" data-act="exportJSON">⬇ Download backup</button>
      <label class="btn">⬆ Restore from backup<input type="file" accept="application/json,.json" data-change="importJSON" hidden></label>
      <button class="btn" data-act="exportCSV">⬇ Applicants spreadsheet (CSV)</button>
      <button class="btn" data-act="loadDemo">Load sample data</button>
      <button class="btn danger" data-act="eraseAll">Erase everything</button>
    </div>
  </section>
  <section class="card"><div class="card-head"><h2>Keyboard shortcuts</h2></div>
    <ul class="mini-list"><li><kbd>←</kbd> <kbd>→</kbd> previous / next day</li><li><kbd>T</kbd> jump to today</li><li><kbd>1</kbd>–<kbd>8</kbd> switch sections</li><li><kbd>N</kbd> new applicant</li><li><kbd>Esc</kbd> close a window</li></ul></section>`;
};

/* ============================== Modals ============================== */
function openModal({ title, body, submitLabel = 'Save', onSubmit, wide = false, footer = '' }) {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-act="closeModalBg">
    <form class="modal ${wide ? 'wide' : ''}" id="modal-form">
      <div class="modal-head"><h2>${title}</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="Close">✕</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">${footer}<span class="spacer"></span>
        <button type="button" class="btn" data-act="closeModal">${onSubmit ? 'Cancel' : 'Close'}</button>
        ${onSubmit ? `<button type="submit" class="btn primary">${submitLabel}</button>` : ''}</div>
    </form></div>`;
  const form = $('#modal-form');
  document.body.classList.add('modal-open');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (onSubmit(form, new FormData(form)) !== false) { closeModal(); save(); render(); }
  });
  initDateHints(form);
  const f = form.querySelector('.modal-body input:not([type=checkbox]):not([type=hidden]), .modal-body select, .modal-body textarea');
  if (f) setTimeout(() => f.focus(), 30);
}
function closeModal() { $('#modal-root').innerHTML = ''; document.body.classList.remove('modal-open'); }

const opt = (list, val) => list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const withCurrent = (list, v) => (v && !list.includes(v) ? [...list, v] : list);

/* ---- live weekday hint under every date field ---- */
function initDateHints(root) {
  for (const inp of $$('input[type=date]:not(.nohint)', root)) {
    let hint = inp.nextElementSibling;
    if (!hint || !hint.classList.contains('date-hint')) {
      hint = document.createElement('div');
      hint.className = 'date-hint';
      inp.after(hint);
    }
    const upd = () => {
      const v = inp.value;
      if (!validISO(v)) { hint.innerHTML = ''; return; }
      const w = wdIndex(v);
      const e = eventsOn(v);
      const n = e.interviews.filter(i => i.outcome !== 'Rescheduled').length + e.orientations.length;
      const showBusy = inp.dataset.busy !== 'off';
      hint.innerHTML = `<span class="wdtag wd${w}">${WD[w].toUpperCase()}</span> <span class="rel">${rel(v)}</span>
        ${isWeekend(v) && inp.dataset.weekend !== 'ok' ? ' <span class="weekend-flag">⚠ Weekend</span>' : ''}
        ${showBusy && n ? ` <span class="muted">· ${plural(n, 'other event')} that day</span>` : ''}`;
    };
    inp.addEventListener('input', upd);
    inp.addEventListener('change', upd);
    upd();
  }
}

/* ---- Applicant ---- */
function applicantModal(id) {
  const st = S.settings;
  const a = id ? getA(id) : { name: '', phone: '', email: '', position: st.positions[0], source: st.sources[0], appliedOn: todayISO(), stage: 'Applied', availability: [], notes: '', checklist: {}, credentials: [], log: [], followUp: '' };
  if (!a) return;
  const showOnboard = id && ['Offer', 'Hired', 'Active'].includes(a.stage);
  const ints = id ? S.interviews.filter(i => i.applicantId === id).sort(byDateTime) : [];
  const orients = id ? S.orientations.filter(o => o.attendees.some(x => x.applicantId === id)).sort(byDateTime) : [];
  const credRow = (c = {}) => `<div class="cred-row">
      <select name="cred_type">${opt(withCurrent(st.credentialTypes, c.type), c.type)}</select>
      <input type="date" name="cred_exp" value="${esc(c.expires || '')}" data-busy="off" data-weekend="ok" aria-label="Expiration date">
      <button type="button" class="btn tiny ghost" data-act="removeRow">✕</button></div>`;
  const body = `
    <div class="form-grid">
      <label class="field"><span>Full name *</span><input name="name" required value="${esc(a.name)}" autocomplete="off"></label>
      <label class="field"><span>Position</span><select name="position">${opt(withCurrent(st.positions, a.position), a.position)}</select></label>
      <label class="field"><span>Phone</span><input name="phone" type="tel" value="${esc(a.phone)}"></label>
      <label class="field"><span>Email</span><input name="email" type="email" value="${esc(a.email)}"></label>
      <label class="field"><span>Applied on</span><input name="appliedOn" type="date" value="${esc(a.appliedOn)}" data-busy="off" data-weekend="ok"></label>
      <label class="field"><span>Source</span><select name="source">${opt(withCurrent(st.sources, a.source), a.source)}</select></label>
      <label class="field"><span>Stage</span><select name="stage">${opt([...STAGES, ARCHIVED], a.stage)}</select></label>
      <label class="field"><span>Follow-up reminder</span><input name="followUp" type="date" value="${esc(a.followUp || '')}"></label>
      <div class="field span-2"><span>Shift availability</span><div class="checks">${SHIFTS.map(s => `<label class="check"><input type="checkbox" name="avail" value="${esc(s)}" ${a.availability.includes(s) ? 'checked' : ''}> ${s}</label>`).join('')}</div></div>
      <label class="field span-2"><span>Notes (experience, languages, car/license, pay expectations…)</span><textarea name="notes" rows="3">${esc(a.notes)}</textarea></label>
      ${a.stage === ARCHIVED || !id ? `<label class="field span-2"><span>Archive reason (if archived)</span><input name="archivedReason" value="${esc(a.archivedReason || '')}" placeholder="e.g., Withdrew, took another job, failed background"></label>` : ''}
    </div>
    ${showOnboard ? `<h3 class="sub-h">Onboarding checklist <span class="muted">${checklistDone(a)}/${st.checklist.length}</span></h3>
      <div class="checks cols">${st.checklist.map(k => `<label class="check"><input type="checkbox" name="ck" value="${esc(k)}" ${a.checklist[k] ? 'checked' : ''}> ${esc(k)}</label>`).join('')}</div>
      <h3 class="sub-h">Credentials & expiration dates</h3>
      <div id="cred-rows">${a.credentials.map(credRow).join('')}</div>
      <button type="button" class="btn small" data-act="addCredRow">＋ Add credential</button>
      <template id="cred-tpl">${credRow()}</template>` : ''}
    ${id ? `<div class="grid-2 tight">
      <div><h3 class="sub-h">Interviews</h3><ul class="mini-list">${ints.map(i => `<li>${dateText(i.date, false)} ${fmtTime(i.time)} · ${esc(i.type)} <span class="outcome o-${esc((i.outcome || 'pending').replace(/\W/g, ''))}">${esc(i.outcome || 'Pending')}</span></li>`).join('') || '<li class="muted">None yet</li>'}</ul></div>
      <div><h3 class="sub-h">Orientation</h3><ul class="mini-list">${orients.map(o => `<li>${dateText(o.date, false)} · ${esc(o.attendees.find(x => x.applicantId === id).status)}</li>`).join('') || '<li class="muted">Not booked</li>'}</ul></div>
    </div>
    <h3 class="sub-h">History</h3>
    <div class="log-add"><input id="log-note" placeholder="Add a note (e.g., left voicemail)…"><button type="button" class="btn small" data-act="addLog" data-id="${id}">Add note</button></div>
    <ul class="log">${a.log.slice(0, 30).map(l => `<li><span class="muted">${fmtShort(toISO(new Date(l.at)))} ${new Date(l.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span> ${esc(l.text)}</li>`).join('')}</ul>` : ''}`;
  const footer = id ? `<button type="button" class="btn small danger" data-act="deleteApplicant" data-id="${id}">Delete</button>
      ${a.stage !== ARCHIVED ? `<button type="button" class="btn small" data-act="archive" data-id="${id}">Archive</button>` : ''}
      <button type="button" class="btn small" data-act="newInterview" data-aid="${id}">🗣 Interview</button>
      ${needsOrientation(a) ? `<button type="button" class="btn small" data-act="assignOrientation" data-id="${id}">🎓 Orientation</button>` : ''}
      <button type="button" class="btn small" data-act="message" data-aid="${id}">✉️ Message</button>` : '';
  openModal({
    title: id ? esc(a.name) : 'New applicant', wide: true, body, footer, submitLabel: id ? 'Save changes' : 'Add applicant',
    onSubmit: (form, fd) => {
      const rec = id ? a : { id: uid(), log: [], checklist: {}, credentials: [], stageSince: todayISO() };
      const prevStage = rec.stage;
      rec.name = fd.get('name').trim();
      rec.phone = fd.get('phone').trim();
      rec.email = fd.get('email').trim();
      rec.position = fd.get('position');
      rec.source = fd.get('source');
      rec.appliedOn = fd.get('appliedOn') || todayISO();
      rec.followUp = fd.get('followUp') || '';
      rec.availability = fd.getAll('avail');
      rec.notes = fd.get('notes');
      if (fd.has('archivedReason')) rec.archivedReason = fd.get('archivedReason');
      if (showOnboard) {
        const ck = new Set(fd.getAll('ck'));
        rec.checklist = Object.fromEntries(st.checklist.map(k => [k, ck.has(k)]));
        const types = fd.getAll('cred_type'), exps = fd.getAll('cred_exp');
        rec.credentials = types.map((t, i) => ({ type: t, expires: exps[i] || '' }));
      }
      if (!id) { rec.stage = fd.get('stage'); logA(rec, `Application received (${rec.source})`); S.applicants.push(rec); toast(`Added ${rec.name}`); }
      else if (fd.get('stage') !== prevStage) setStage(rec, fd.get('stage'));
    },
  });
}

function checklistModal(id) {
  const a = getA(id);
  if (!a) return;
  const st = S.settings;
  openModal({
    title: `Onboarding — ${esc(a.name)}`,
    body: `<p class="muted">Tick off paperwork as it comes in. ${missingItems(a).length ? `<b>${missingItems(a).length}</b> still open.` : 'All complete!'}</p>
      <div class="checks cols">${st.checklist.map(k => `<label class="check"><input type="checkbox" name="ck" value="${esc(k)}" ${a.checklist[k] ? 'checked' : ''}> ${esc(k)}</label>`).join('')}</div>`,
    footer: `<button type="button" class="btn small" data-act="message" data-aid="${id}" data-tpl="t-missing">✉️ Ask for missing items</button>`,
    onSubmit: (form, fd) => {
      const ck = new Set(fd.getAll('ck'));
      a.checklist = Object.fromEntries(st.checklist.map(k => [k, ck.has(k)]));
      logA(a, `Onboarding checklist updated (${checklistDone(a)}/${st.checklist.length})`);
    },
  });
}

/* ---- Interview ---- */
function interviewModal(id, aid, date) {
  const st = S.settings;
  const people = S.applicants.filter(a => a.stage !== ARCHIVED).sort((a, b) => a.name.localeCompare(b.name));
  if (!people.length) { toast('Add an applicant first.'); applicantModal(); return; }
  const i = id ? getI(id) : { applicantId: aid || people[0].id, date: date || suggestDay(), time: '10:00', duration: 30, type: 'In person', interviewer: st.interviewers[0] || '', location: st.orientationLocation, outcome: '', notes: '' };
  if (!i) return;
  const body = `<div class="form-grid">
      <label class="field span-2"><span>Applicant</span><select name="applicantId">${opt(people.map(p => [p.id, `${p.name} — ${p.position} (${p.stage})`]), i.applicantId)}</select></label>
      <label class="field"><span>Date</span><input type="date" name="date" required value="${esc(i.date)}"></label>
      <label class="field"><span>Start time</span><input type="time" name="time" required value="${esc(i.time)}" step="300"></label>
      <label class="field"><span>Length</span><select name="duration">${opt([['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hours'], ['120', '2 hours']], String(i.duration))}</select></label>
      <label class="field"><span>Type</span><select name="type">${opt(INTERVIEW_TYPES, i.type)}</select></label>
      <label class="field"><span>Interviewer</span><select name="interviewer">${opt(withCurrent(st.interviewers, i.interviewer), i.interviewer)}</select></label>
      <label class="field"><span>Location / link</span><input name="location" value="${esc(i.location)}"></label>
      ${id ? `<label class="field"><span>Outcome</span><select name="outcome">${opt([['', '— Pending —'], 'Passed', 'Not a fit', 'No-show', 'Rescheduled'], i.outcome)}</select></label>` : ''}
      <label class="field span-2"><span>Notes / impressions</span><textarea name="notes" rows="3">${esc(i.notes)}</textarea></label>
    </div><div id="conflict-box"></div>`;
  openModal({
    title: id ? 'Edit interview' : 'Schedule interview', body, submitLabel: id ? 'Save' : 'Schedule',
    footer: id ? `<button type="button" class="btn small danger" data-act="deleteInterview" data-id="${id}">Delete</button>` : '',
    onSubmit: (form, fd) => {
      const rec = id ? i : { id: uid(), outcome: '' };
      const data = Object.fromEntries(fd.entries());
      const conflicts = conflictsFor(data.date, data.time, fromMin(toMin(data.time) + +data.duration), rec.id);
      if (conflicts.length && !confirm(`Heads up — this overlaps with:\n\n• ${conflicts.join('\n• ')}\n\nSchedule anyway?`)) return false;
      if (isWeekend(data.date) && (!id || data.date !== i.date) && !confirm(`${fmtLong(data.date)} is a ${WD[wdIndex(data.date)].toUpperCase()}. Schedule on the weekend?`)) return false;
      const prevOutcome = rec.outcome;
      Object.assign(rec, data, { duration: +data.duration });
      if (!id) {
        S.interviews.push(rec);
        const a = getA(rec.applicantId);
        if (a) { if (STAGES.indexOf(a.stage) < STAGES.indexOf('Interview')) setStage(a, 'Interview', 'Interview scheduled'); logA(a, `Interview booked for ${fmtLong(rec.date)} at ${fmtTime(rec.time)}`); }
        toast(`Interview booked: ${fmtLong(rec.date)} at ${fmtTime(rec.time)}`);
        ui.msg = { aid: rec.applicantId, tpl: 't-invite', ev: 'i:' + rec.id };
        setTimeout(() => { if (confirm('Interview booked! Open the invitation message for them now?')) { ui.tab = 'messages'; render(); } }, 50);
      } else if (rec.outcome !== prevOutcome && rec.outcome) applyOutcome(rec, rec.outcome, true);
    },
  });
  // live conflict checking
  const form = $('#modal-form');
  const check = () => {
    const d = form.date.value, t = form.time.value, dur = +form.duration.value;
    const c = validISO(d) && t ? conflictsFor(d, t, fromMin(toMin(t) + dur), i.id) : [];
    $('#conflict-box').innerHTML = c.length ? `<div class="alert warn">⚠ Overlaps with: ${c.map(esc).join('; ')}</div>` : '';
  };
  ['input', 'change'].forEach(evn => form.addEventListener(evn, check));
  check();
}
function suggestDay() {
  let d = addDays(todayISO(), 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}
function applyOutcome(i, v, fromForm = false) {
  const a = getA(i.applicantId);
  i.outcome = v;
  if (!a) return;
  logA(a, `Interview ${fmtShort(i.date)}: ${v}`);
  if (v === 'Passed' && STAGES.indexOf(a.stage) < STAGES.indexOf('Offer')) {
    if (confirm(`Great! Move ${a.name} to "Offer"?`)) { setStage(a, 'Offer'); ui.msg = { aid: a.id, tpl: 't-offer' }; }
  } else if (v === 'Not a fit') {
    if (confirm(`Archive ${a.name} as not moving forward?`)) { setStage(a, ARCHIVED); a.archivedReason = 'Not a fit after interview'; }
  } else if (v === 'No-show') {
    a.noShows = (a.noShows || 0) + 1;
    if (!fromForm && confirm(`${a.name} didn't show. Set a follow-up reminder for tomorrow to try once more?`)) a.followUp = suggestDay();
  }
}

/* ---- Orientation ---- */
function orientationModal(id, date) {
  const st = S.settings;
  const o = id ? getO(id) : { date: date || nextDow(1), start: '09:00', end: '15:00', location: st.orientationLocation, trainer: st.interviewers[0] || '', capacity: st.defaultCapacity, agenda: '9:00  Welcome, paperwork & badge photos\n10:00 Company mission, resident rights & elder abuse prevention\n11:00 HIPAA & confidentiality\n12:00 Lunch\n12:30 Infection control & hand hygiene\n1:30  Safe transfers, fall prevention & body mechanics\n2:30  Scheduling app, timekeeping & who to call\n3:00  Wrap-up / shadow shift assignments', attendees: [] };
  if (!o) return;
  const body = `<div class="form-grid">
      <label class="field"><span>Date</span><input type="date" name="date" required value="${esc(o.date)}"></label>
      <label class="field"><span>Seats</span><input type="number" name="capacity" min="1" required value="${esc(o.capacity)}"></label>
      <label class="field"><span>Start</span><input type="time" name="start" required value="${esc(o.start)}" step="300"></label>
      <label class="field"><span>End</span><input type="time" name="end" required value="${esc(o.end)}" step="300"></label>
      <label class="field"><span>Location</span><input name="location" value="${esc(o.location)}"></label>
      <label class="field"><span>Trainer</span><select name="trainer">${opt(withCurrent(st.interviewers, o.trainer), o.trainer)}</select></label>
      ${!id ? `<label class="field span-2"><span>Repeat</span><select name="repeat">${opt([['1', 'Just this day'], ['2', 'Weekly for 2 weeks'], ['4', 'Weekly for 4 weeks'], ['8', 'Weekly for 8 weeks'], ['13', 'Weekly for 3 months'], ['b4', 'Every other week ×4'], ['b6', 'Every other week ×6']], '1')}</select></label>` : ''}
      <label class="field span-2"><span>Agenda</span><textarea name="agenda" rows="8">${esc(o.agenda)}</textarea></label>
    </div><div id="repeat-preview"></div>`;
  openModal({
    title: id ? 'Edit orientation day' : 'New orientation day', body, submitLabel: id ? 'Save' : 'Create',
    footer: id ? `<button type="button" class="btn small danger" data-act="deleteOrientation" data-id="${id}">Delete</button>` : '',
    onSubmit: (form, fd) => {
      const data = Object.fromEntries(fd.entries());
      if (toMin(data.end) <= toMin(data.start)) { alert('End time must be after the start time.'); return false; }
      data.capacity = +data.capacity;
      if (id) { delete data.repeat; Object.assign(o, data); return; }
      const dates = repeatDates(data.date, data.repeat);
      delete data.repeat;
      const weekend = dates.filter(isWeekend);
      if (weekend.length && !confirm(`${weekend.map(d => fmtLong(d)).join(', ')} ${weekend.length > 1 ? 'fall' : 'falls'} on a weekend. Continue?`)) return false;
      for (const d of dates) S.orientations.push({ ...data, id: uid(), date: d, attendees: [] });
      toast(dates.length > 1 ? `Created ${dates.length} orientation days, every ${WD[wdIndex(data.date)]}` : `Orientation created for ${fmtLong(data.date)}`);
    },
  });
  const form = $('#modal-form');
  const prev = () => {
    if (!form.repeat) return;
    const ds = validISO(form.date.value) ? repeatDates(form.date.value, form.repeat.value) : [];
    $('#repeat-preview').innerHTML = ds.length > 1 ? `<div class="repeat-preview"><b>Will create:</b> ${ds.map(d => `<span class="wdtag wd${wdIndex(d)}">${WD[wdIndex(d)].slice(0, 3)}</span> ${fmtMD(d)}`).join(' · ')}</div>` : '';
  };
  form.addEventListener('change', prev); form.addEventListener('input', prev); prev();
}
function repeatDates(start, rep) {
  const biweekly = String(rep).startsWith('b');
  const n = parseInt(String(rep).replace('b', ''), 10) || 1;
  return Array.from({ length: n }, (_, k) => addDays(start, k * (biweekly ? 14 : 7)));
}
function assignOrientationModal(aid) {
  const a = getA(aid);
  if (!a) return;
  const t = todayISO();
  const list = S.orientations.filter(o => o.date >= t).sort(byDateTime);
  const body = list.length ? `<p>Pick an orientation day for <b>${esc(a.name)}</b>:</p>
    <div class="pick-list">${list.map((o, k) => {
      const n = o.attendees.filter(x => x.status !== 'No-show').length;
      const full = n >= o.capacity;
      return `<label class="pick wd${wdIndex(o.date)} ${full ? 'full' : ''}"><input type="radio" name="oid" value="${o.id}" ${!full && !list.slice(0, k).some(p => p.attendees.filter(x => x.status !== 'No-show').length < p.capacity) ? 'checked' : ''}>
        ${dateChip(o.date)}<span><b>${WD[wdIndex(o.date)]}</b>, ${fmtMD(o.date)} · ${fmtTime(o.start)}–${fmtTime(o.end)}<br><span class="muted">${rel(o.date)} · ${n}/${o.capacity} seats${full ? ' · FULL' : ''}</span></span></label>`;
    }).join('')}</div>` : '<div class="empty">No upcoming orientation days yet.</div>';
  openModal({
    title: '🎓 Book orientation', body, submitLabel: 'Book seat',
    footer: `<button type="button" class="btn small" data-act="newOrientation">＋ New orientation day</button>`,
    onSubmit: list.length ? (form, fd) => {
      const o = getO(fd.get('oid'));
      if (!o) { alert('Choose a day.'); return false; }
      addToOrientation(o, a);
      ui.msg = { aid: a.id, tpl: 't-orient', ev: 'o:' + o.id };
    } : null,
  });
}
function addToOrientation(o, a, quiet = false) {
  const n = o.attendees.filter(x => x.status !== 'No-show').length;
  if (n >= o.capacity && !confirm(`That orientation is full (${n}/${o.capacity}). Add ${a.name} anyway?`)) return false;
  // remove from any other upcoming session they were scheduled for
  for (const other of S.orientations) if (other !== o && other.date >= todayISO()) other.attendees = other.attendees.filter(x => !(x.applicantId === a.id && x.status === 'Scheduled'));
  if (!o.attendees.some(x => x.applicantId === a.id)) o.attendees.push({ applicantId: a.id, status: 'Scheduled' });
  if (a.stage === 'Offer') setStage(a, 'Hired', 'Accepted offer — booked for orientation');
  logA(a, `Booked for orientation ${fmtLong(o.date)}`);
  if (!quiet) toast(`${a.name} booked for ${WD[wdIndex(o.date)]}, ${fmtMD(o.date)}`);
  return true;
}

function templateModal(id) {
  const st = S.settings;
  const tpl = id ? st.templates.find(t => t.id === id) : { name: '', subject: '', body: '' };
  openModal({
    title: id ? 'Edit template' : 'New template', wide: true,
    body: `<label class="field"><span>Name</span><input name="name" required value="${esc(tpl.name)}"></label>
      <label class="field"><span>Subject</span><input name="subject" value="${esc(tpl.subject)}"></label>
      <label class="field"><span>Body</span><textarea name="body" rows="12">${esc(tpl.body)}</textarea></label>`,
    footer: id ? `<button type="button" class="btn small danger" data-act="deleteTemplate" data-id="${id}">Delete</button>` : '',
    onSubmit: (form, fd) => {
      const data = Object.fromEntries(fd.entries());
      if (id) Object.assign(tpl, data); else { const t = { id: 't-' + uid(), ...data }; st.templates.push(t); ui.msg.tpl = t.id; }
    },
  });
}

/* ============================== Printing ============================== */
function printRoster(o) {
  const st = S.settings;
  const w = wdIndex(o.date);
  const rows = o.attendees.filter(x => x.status !== 'No-show').map(x => getA(x.applicantId)).filter(Boolean);
  const blanks = Math.max(0, Math.min(4, o.capacity - rows.length));
  $('#print-root').innerHTML = `<div class="print-sheet">
    <div class="ps-head"><div class="ps-wd">${WD[w].toUpperCase()}</div><div class="ps-date">${fmtMD(o.date)}, ${parseISO(o.date).getFullYear()}</div>
      <div class="ps-sub">${esc(st.company)} · New Caregiver Orientation · ${fmtTime(o.start)} – ${fmtTime(o.end)} · ${esc(o.location)} · Trainer: ${esc(o.trainer)}</div></div>
    <table class="ps-table"><thead><tr><th>#</th><th>Name</th><th>Position</th><th>Phone</th><th>Time in</th><th>Signature</th><th>Time out</th><th>Missing paperwork</th></tr></thead>
    <tbody>${rows.map((a, k) => `<tr><td>${k + 1}</td><td>${esc(a.name)}</td><td>${esc(a.position)}</td><td>${esc(a.phone)}</td><td></td><td></td><td></td><td class="small">${esc(missingItems(a).join(', '))}</td></tr>`).join('')}
    ${Array.from({ length: blanks }, (_, k) => `<tr><td>${rows.length + k + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>
    ${o.agenda ? `<h3>Agenda</h3><pre>${esc(o.agenda)}</pre>` : ''}
    <div class="ps-foot">Trainer signature: ____________________________ &nbsp;&nbsp; Date: ${fmtLong(o.date)}</div></div>`;
  document.body.classList.add('printing-roster');
  window.print();
  setTimeout(() => { document.body.classList.remove('printing-roster'); $('#print-root').innerHTML = ''; }, 500);
}

/* ============================== Import / export ============================== */
function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCSV() {
  const cols = ['name', 'position', 'stage', 'phone', 'email', 'source', 'appliedOn', 'appliedWeekday', 'hiredOn', 'followUp', 'availability', 'onboarding', 'notes'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = S.applicants.map(a => [a.name, a.position, a.stage, a.phone, a.email, a.source, a.appliedOn, validISO(a.appliedOn) ? WD[wdIndex(a.appliedOn)] : '', a.hiredOn || '', a.followUp || '', a.availability.join('; '), `${checklistDone(a)}/${S.settings.checklist.length}`, a.notes].map(q).join(','));
  download(`applicants-${todayISO()}.csv`, [cols.join(','), ...rows].join('\n'), 'text/csv');
}

/* ============================== Actions ============================== */
const ACT = {
  gotoTab: ds => { ui.tab = ds.tab; persistUI(); closeModal(); render(); window.scrollTo(0, 0); },
  gotoDay: ds => { ui.day = ds.date; ui.tab = 'day'; persistUI(); render(); },
  dayShift: ds => { ui.day = addDays(ui.day, +ds.n); render(); },
  dayToday: () => { ui.day = todayISO(); render(); },
  monthShift: ds => { const [y, m] = ui.month.split('-').map(Number); const d = new Date(y, m - 1 + +ds.n, 1); ui.month = toISO(d).slice(0, 7); render(); },
  monthToday: () => { ui.month = todayISO().slice(0, 7); render(); },
  printDay: () => window.print(),
  closeModal: () => closeModal(),
  closeModalBg: (ds, el, e) => { if (e.target === el) closeModal(); },

  newApplicant: () => applicantModal(),
  openApplicant: ds => applicantModal(ds.id),
  checklist: ds => checklistModal(ds.id),
  stageMove: ds => {
    const a = getA(ds.id);
    const idx = STAGES.indexOf(a.stage) + +ds.dir;
    if (idx < 0 || idx >= STAGES.length) return;
    const to = STAGES[idx];
    setStage(a, to);
    save(); render();
    toast(`${a.name} → ${to}`);
    if (to === 'Interview' && !nextInterview(a.id)) interviewModal(null, a.id);
    else if ((to === 'Hired') && needsOrientation(a)) assignOrientationModal(a.id);
    else if (to === 'Active' && missingItems(a).length) toast(`${a.name} is Active but has ${missingItems(a).length} onboarding items open`);
  },
  archive: ds => {
    const a = getA(ds.id);
    const why = prompt(`Archive ${a.name}? Reason (optional):`, 'Withdrew / not moving forward');
    if (why === null) return;
    setStage(a, ARCHIVED, `Archived: ${why}`);
    a.archivedReason = why;
    closeModal(); save(); render();
  },
  restore: ds => { const a = getA(ds.id); setStage(a, 'Applied', 'Restored from archive'); save(); render(); },
  deleteApplicant: ds => {
    const a = getA(ds.id);
    if (!confirm(`Permanently delete ${a.name} and their interviews? (Archive keeps a record instead.)`)) return;
    S.applicants = S.applicants.filter(x => x.id !== a.id);
    S.interviews = S.interviews.filter(i => i.applicantId !== a.id);
    for (const o of S.orientations) o.attendees = o.attendees.filter(x => x.applicantId !== a.id);
    closeModal(); save(); render();
  },
  addCredRow: () => { $('#cred-rows').insertAdjacentHTML('beforeend', $('#cred-tpl').innerHTML); initDateHints($('#cred-rows')); },
  removeRow: (ds, el) => el.closest('.cred-row').remove(),
  addLog: ds => {
    const a = getA(ds.id);
    const inp = $('#log-note');
    if (!inp.value.trim()) return;
    logA(a, inp.value.trim());
    save();
    $('.log').insertAdjacentHTML('afterbegin', `<li><span class="muted">Just now</span> ${esc(inp.value.trim())}</li>`);
    inp.value = '';
  },
  clearFollowUp: ds => { const a = getA(ds.id); logA(a, `Followed up (${fmtShort(a.followUp)})`); a.followUp = ''; save(); render(); },

  newInterview: ds => interviewModal(null, ds.aid, ds.date),
  editInterview: ds => interviewModal(ds.id),
  outcome: ds => { const i = getI(ds.id); applyOutcome(i, ds.v); save(); render(); },
  deleteInterview: ds => { if (!confirm('Delete this interview?')) return; S.interviews = S.interviews.filter(i => i.id !== ds.id); closeModal(); save(); render(); },

  newOrientation: ds => orientationModal(null, ds.date),
  editOrientation: ds => orientationModal(ds.id),
  deleteOrientation: ds => {
    const o = getO(ds.id);
    if (!confirm(`Delete the ${fmtLong(o.date)} orientation${o.attendees.length ? ` (${o.attendees.length} people booked will be unassigned)` : ''}?`)) return;
    S.orientations = S.orientations.filter(x => x.id !== ds.id);
    closeModal(); save(); render();
  },
  assignOrientation: ds => assignOrientationModal(ds.id),
  addAttendee: ds => { const sel = $(`#add-${ds.o}`); const a = getA(sel?.value); if (a && addToOrientation(getO(ds.o), a)) { save(); render(); } },
  addAllAttendees: ds => {
    const o = getO(ds.o);
    const list = S.applicants.filter(a => needsOrientation(a) && !o.attendees.some(x => x.applicantId === a.id));
    list.forEach(a => addToOrientation(o, a, true));
    toast(`Added ${plural(list.length, 'caregiver')} to ${WD[wdIndex(o.date)]}'s orientation`);
    save(); render();
  },
  attStatus: ds => {
    const o = getO(ds.o), a = getA(ds.a);
    const x = o.attendees.find(z => z.applicantId === ds.a);
    x.status = ds.v;
    logA(a, `Orientation ${fmtShort(o.date)}: ${ds.v}`);
    if (ds.v === 'Attended' && a.stage === 'Hired') { setStage(a, 'Active', 'Completed orientation'); toast(`${a.name} completed orientation — now Active 🎉`); }
    if (ds.v === 'No-show') toast(`${a.name} marked no-show — they're back on the "needs orientation" list`);
    save(); render();
  },
  removeAttendee: ds => {
    const o = getO(ds.o);
    o.attendees = o.attendees.filter(x => x.applicantId !== ds.a);
    save(); render();
  },
  printRoster: ds => printRoster(getO(ds.id)),

  message: ds => { ui.msg = { aid: ds.aid, tpl: ds.tpl || ui.msg.tpl, ev: ds.ev }; ui.tab = 'messages'; closeModal(); persistUI(); render(); window.scrollTo(0, 0); },
  copyMsg: async () => {
    const text = `${$('#msg-subject').value}\n\n${$('#msg-body').value}`;
    try { await navigator.clipboard.writeText(text); toast('Copied! Paste it into your email or text app.'); }
    catch { $('#msg-body').select(); document.execCommand('copy'); toast('Copied.'); }
  },
  mailMsg: ds => { location.href = `mailto:${encodeURIComponent(ds.to)}?subject=${encodeURIComponent($('#msg-subject').value)}&body=${encodeURIComponent($('#msg-body').value)}`; },
  smsMsg: ds => { location.href = `sms:${encodeURIComponent(ds.to)}?&body=${encodeURIComponent($('#msg-body').value)}`; },
  logMsg: ds => { const a = getA(ds.id); const t = S.settings.templates.find(x => x.id === ui.msg.tpl); logA(a, `Sent message: ${t?.name || 'custom'}`); if (a.stage === 'Applied') setStage(a, 'Screening', 'Contacted — moved to Screening'); save(); render(); toast('Logged in their history.'); },
  editTemplate: ds => templateModal(ds.id),
  deleteTemplate: ds => { if (!confirm('Delete this template?')) return; S.settings.templates = S.settings.templates.filter(t => t.id !== ds.id); closeModal(); save(); render(); },

  exportCSV,
  exportJSON: () => { S.lastBackup = todayISO(); save(); download(`whiteboard-backup-${todayISO()}.json`, JSON.stringify(S, null, 2), 'application/json'); render(); },
  loadDemo: () => { if (S.applicants.length && !confirm('Replace your current data with sample data?')) return; S = seed(); save(); render(); },
  clearDemo: () => { if (!confirm('Remove the sample data and start with a clean slate? (Your settings are kept.)')) return; const st = S.settings; S = normalize({ settings: st }); save(); render(); },
  eraseAll: () => { if (!confirm('Erase ALL applicants, interviews, orientations and settings from this browser? Download a backup first!')) return; S = normalize({}); save(); render(); },
};

const CHANGE = {
  dayPick: el => { if (validISO(el.value)) { ui.day = el.value; render(); } },
  posFilter: el => { ui.pos = el.value; persistUI(); $('#board').innerHTML = boardHTML(); },
  toggleArchived: el => { ui.showArchived = el.checked; persistUI(); $('#board').innerHTML = boardHTML(); },
  compIssues: el => { ui.compIssuesOnly = el.checked; render(); },
  msgA: el => { ui.msg = { aid: el.value, tpl: ui.msg.tpl }; render(); },
  msgT: el => { ui.msg = { aid: ui.msg.aid, tpl: el.value }; render(); },
  msgE: el => { ui.msg.ev = el.value; render(); },
  importJSON: el => {
    const f = el.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!Array.isArray(d.applicants)) throw new Error('not a backup');
        if (!confirm(`Restore backup with ${d.applicants.length} applicants, ${(d.interviews || []).length} interviews and ${(d.orientations || []).length} orientations? This replaces what's here now.`)) return;
        S = normalize(d); save(); render(); toast('Backup restored.');
      } catch { alert("That file doesn't look like a Who Needs a Whiteboard backup."); }
    };
    r.readAsText(f);
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (e.target.closest('a[href^="tel:"]')) return; // let phone links dial
  if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
  fn(el.dataset, el, e);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el);
});
document.addEventListener('input', e => {
  if (e.target.dataset?.input === 'appSearch') { ui.q = e.target.value; $('#board').innerHTML = boardHTML(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'settings-form') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const st = S.settings;
  const lines = k => fd.get(k).split('\n').map(s => s.trim()).filter(Boolean);
  for (const k of ['company', 'hrName', 'phone', 'orientationLocation', 'orientationBring']) st[k] = fd.get(k).trim();
  st.defaultCapacity = Math.max(1, +fd.get('defaultCapacity') || 8);
  st.staleApplicantDays = Math.max(1, +fd.get('staleApplicantDays') || 2);
  for (const k of ['checklist', 'credentialTypes', 'requiredCreds', 'interviewers', 'positions', 'sources']) { const v = lines(k); if (v.length || k === 'requiredCreds') st[k] = v; }
  save(); render(); toast('Settings saved.');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#modal-root').innerHTML) { closeModal(); return; }
  if (e.key === 'Enter' && e.target.classList?.contains('acard')) { ACT.openApplicant(e.target.dataset); return; }
  if (e.target.closest('input, textarea, select, [contenteditable]') || $('#modal-root').innerHTML || e.metaKey || e.ctrlKey || e.altKey) return;
  if (ui.tab === 'day' && e.key === 'ArrowLeft') ACT.dayShift({ n: -1 });
  else if (ui.tab === 'day' && e.key === 'ArrowRight') ACT.dayShift({ n: 1 });
  else if (e.key.toLowerCase() === 't') { ui.tab = 'day'; ACT.dayToday(); }
  else if (e.key.toLowerCase() === 'n') applicantModal();
  else if (/^[1-8]$/.test(e.key)) ACT.gotoTab({ tab: TABS[+e.key - 1][0] });
});

/* keep the clock & "today" fresh — handles leaving the app open overnight */
let lastDay = todayISO();
setInterval(() => {
  const t = todayISO();
  if (t !== lastDay) {
    if (ui.day === lastDay) ui.day = t;
    lastDay = t;
    if (!$('#modal-root').innerHTML) render(); else renderSpotlight();
  } else {
    const c = $('#clock');
    if (c) c.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}, 15000);

/* ============================== Sample data ============================== */
function seed() {
  const t = todayISO();
  const D = n => addDays(t, n);
  const st = structuredClone(DEFAULT_SETTINGS);
  const all = st.checklist;
  const ck = n => Object.fromEntries(all.map((k, i) => [k, i < n]));
  const A = (name, position, stage, applied, extra = {}) => ({
    id: uid(), name, position, stage, appliedOn: D(applied), stageSince: D(Math.min(0, applied + 2)),
    phone: `(555) 01${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 8999)}`,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`, source: st.sources[Math.floor(Math.random() * 6)],
    availability: extra.availability || ['Days', 'Weekends'], notes: extra.notes || '', checklist: extra.checklist || {}, credentials: extra.credentials || [],
    log: [{ at: new Date(parseISO(D(applied))).toISOString(), text: 'Application received' }], followUp: extra.followUp || '', hiredOn: extra.hiredOn || '',
  });
  const apps = [
    A('Maria Gonzalez', 'CNA', 'Applied', -4, { notes: 'Bilingual (Spanish). 6 yrs memory care.', availability: ['Evenings', 'Weekends'] }),
    A('James Carter', 'Caregiver / PCA', 'Applied', -1, { availability: ['Overnights'] }),
    A('Hannah Lee', 'Companion', 'Applied', 0, { notes: 'Nursing student, wants PRN.', availability: ['PRN / on-call', 'Weekends'] }),
    A('Aisha Thompson', 'HHA', 'Screening', -6, { followUp: t, notes: 'Waiting on 2nd reference.' }),
    A('Robert Kim', 'Med Tech', 'Screening', -5, { followUp: D(2) }),
    A('Linda Nguyen', 'CNA', 'Interview', -7),
    A('DeShawn Williams', 'Caregiver / PCA', 'Interview', -8, { notes: 'Has own car, OK with client transport.' }),
    A('Emily Rossi', 'LPN', 'Interview', -9),
    A('Patricia Brown', 'CNA', 'Interview', -10),
    A('Grace Okafor', 'CNA', 'Offer', -14, { checklist: ck(5), credentials: [{ type: 'CPR / First Aid', expires: D(400) }, { type: 'CNA License', expires: D(500) }] }),
    A('Tom Becker', 'HHA', 'Hired', -16, { checklist: ck(9), hiredOn: D(-3), credentials: [{ type: 'CPR / First Aid', expires: D(300) }, { type: 'TB Test', expires: D(340) }] }),
    A('Sofia Petrova', 'Caregiver / PCA', 'Hired', -18, { checklist: ck(12), hiredOn: D(-5), credentials: [{ type: 'CPR / First Aid', expires: D(200) }, { type: 'TB Test', expires: D(320) }] }),
    A("Kevin O'Brien", 'Caregiver / PCA', 'Hired', -12, { checklist: ck(4), hiredOn: D(-1), credentials: [{ type: 'TB Test', expires: D(360) }] }),
    A('Rosa Delgado', 'CNA', 'Active', -40, { checklist: ck(13), hiredOn: D(-20), credentials: [{ type: 'CPR / First Aid', expires: D(12) }, { type: 'TB Test', expires: D(150) }, { type: 'CNA License', expires: D(45) }] }),
    A('Marcus Hill', 'Med Tech', 'Active', -60, { checklist: ck(13), hiredOn: D(-45), credentials: [{ type: 'CPR / First Aid', expires: D(-3) }, { type: 'TB Test', expires: D(90) }, { type: 'Med Tech Cert.', expires: D(250) }] }),
    A('Janet Morris', 'HHA', 'Active', -50, { checklist: ck(13), hiredOn: D(-30), credentials: [{ type: 'CPR / First Aid', expires: D(380) }, { type: 'TB Test', expires: D(25) }, { type: "Driver's License", expires: D(700) }] }),
    A('Paul Svensson', 'Caregiver / PCA', ARCHIVED, -20, {}),
  ];
  apps[apps.length - 1].archivedReason = 'Took another job';
  const by = n => apps.find(a => a.name === n).id;
  const I = (name, dayOff, time, extra = {}) => ({ id: uid(), applicantId: by(name), date: D(dayOff), time, duration: 30, type: 'In person', interviewer: st.interviewers[0], location: st.orientationLocation, outcome: '', notes: '', ...extra });
  const interviews = [
    I('Linda Nguyen', 0, '10:00'),
    I('DeShawn Williams', 0, '14:30', { type: 'Video', location: 'Video call link' }),
    I('Emily Rossi', 1, '09:30', { interviewer: 'Director of Nursing', duration: 45 }),
    I('Patricia Brown', -1, '15:00'),
    I('Grace Okafor', -6, '11:00', { outcome: 'Passed' }),
    I('Tom Becker', -10, '13:00', { outcome: 'Passed' }),
    I('Sofia Petrova', -12, '10:30', { outcome: 'Passed' }),
    I('Paul Svensson', -9, '09:00', { outcome: 'No-show' }),
    I("Kevin O'Brien", -7, '16:00', { outcome: 'Passed' }),
  ];
  const agenda = '9:00  Welcome, paperwork & badge photos\n10:00 Mission, resident rights & elder abuse prevention\n11:00 HIPAA & confidentiality\n12:00 Lunch (provided)\n12:30 Infection control & hand hygiene\n1:30  Safe transfers & fall prevention\n2:30  Scheduling app & timekeeping\n3:00  Wrap-up';
  const O = (date, attendees) => ({ id: uid(), date, start: '09:00', end: '15:00', location: st.orientationLocation, trainer: 'Care Coordinator', capacity: 6, agenda, attendees });
  const nextO = nextDow(4, 2); // the Thursday at least 2 days out
  const orientations = [
    O(addDays(nextO, -14), [{ applicantId: by('Rosa Delgado'), status: 'Attended' }, { applicantId: by('Janet Morris'), status: 'Attended' }]),
    O(nextO, [{ applicantId: by('Tom Becker'), status: 'Scheduled' }, { applicantId: by('Sofia Petrova'), status: 'Scheduled' }]),
    O(addDays(nextO, 7), []),
  ];
  return normalize({ demo: true, settings: st, applicants: apps, interviews, orientations });
}

/* ============================== Installable app ============================== */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; renderTabs(); });
window.addEventListener('appinstalled', () => { installPrompt = null; renderTabs(); toast('Installed! Look for "HR Whiteboard" on your home screen / desktop.'); });
ACT.installApp = async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderTabs(); };
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed', err)));
}
// ask the browser not to clear this app's data under storage pressure
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

/* ============================== Go ============================== */
save();
render();

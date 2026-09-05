const STATUSES = ["To do", "In progress", "Review", "Revisions", "Done"];
const BOARD_STATUSES = ["To do", "In progress", "Review", "Revisions", "Done"];
const SPACES = ["Social", "Graphic", "Video editors", "HR", "Daily Reports", "Calendar"];
const CAIRO = "Africa/Cairo";
const LS_SESSION = "helal.session";
const LS_TASKS = "helal.tasksCache.v4";
const LS_REPORTS = "helal.reportsCache.v4";
const LS_HR = "helal.hrCache.v4";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ATTEND_WEEK = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
const ATTEND_MODES = ["Office", "Home", "Off"];
const LS_ATTEND = "helal.attendCache.v4";
const LS_SHAS = "helal.fileShas";
const BOARD_RESET = "2026-09-05T13:42:00.000Z";
const OLD_CACHE_KEYS = [
  "helal.tasksCache",
  "helal.reportsCache",
  "helal.hrCache",
  "helal.attendCache",
  "helal.attendCache.v3",
];
const DELAY_REASONS = [
  "Unclear brief",
  "Waiting on information",
  "Workload pressure",
  "Personal reason",
  "Other",
];
const REVISION_LEVELS = ["Minor", "Medium", "Major"];
const RATE_LABEL = { 5: "Excellent", 4: "Very good", 3: "Meets expectations", 2: "Needs improvement", 1: "Poor" };
const QUALITY_CRITERIA = {
  design: [
    ["color", "Color selection"],
    ["type", "Typography & fonts"],
    ["brand", "Brand alignment"],
    ["layout", "Layout & visual balance"],
    ["detail", "Attention to details"],
    ["ready", "Final output readiness"],
  ],
  video: [
    ["video", "Video quality"],
    ["edit", "Editing & transitions"],
    ["sound", "Sound quality"],
    ["pace", "Timing & pacing"],
    ["story", "Visual storytelling"],
    ["fit", "Content suitability"],
  ],
  social: [
    ["understand", "Content understanding"],
    ["caption", "Caption quality"],
    ["audience", "Audience understanding"],
    ["trend", "Trend awareness"],
    ["plan", "Content planning"],
    ["ready", "Final output readiness"],
  ],
  other: [
    ["overall", "Overall quality"],
    ["brief", "Brief understanding"],
    ["ready", "Final output readiness"],
  ],
};
const ATTITUDE_CRITERIA = [
  ["communication", "Communication"],
  ["teamwork", "Teamwork"],
  ["responsibility", "Responsibility"],
  ["respect", "Respect"],
  ["feedback", "Receiving feedback"],
  ["problems", "Problem solving"],
];
const WARNING_STATUSES = ["Note", "1st Warning", "2nd Warning", "Deduction pending"];
const WARNING_ISSUES = [
  "Absent without notice",
  "Missed work hours",
  "Late without notice",
  "Drive / file process",
  "Did not update task status",
  "Other",
];
const RESPONSE_LEVELS = ["Reliable", "Needs follow-up"];
const WORK_TYPES = ["Full-time", "Part-time"];
const WORK_MODES = ["Remote", "Office", "Hybrid"];
const TEAM_HOMES = ["social", "design", "video", "hr"];

const state = {
  view: "board",
  who: "",
  dateFilter: "all",
  team: null,
  auth: null,
  drive: null,
  projects: null,
  tasksFile: null,
  reportsFile: null,
  hrFile: null,
  attendFile: null,
  githubCfg: null,
  attendWeek: "",
  attendChange: null,
  hrTab: "scores",
  hrQuarter: "",
  hrMonth: "",
  hrPerson: "",
  evalTaskId: null,
  pendingDelay: null,
  pendingRevision: null,
  saveState: "idle",
  saveError: "",
  saveNote: "",
  loginError: "",
  connectError: "",
  shas: {},
  headSha: "",
  taskCommitSha: "",
  session: readSession(),
  openTaskId: null,
  creating: false,
  createStatus: "To do",
  dueDraft: "",
  dueMonth: "",
  draft: null,
  reportDay: "",
  calMonth: "",
  workMonth: "",
};

let cardDidDrag = false;
let lastCairoDay = "";

function readSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_SESSION) || "null");
    if (raw?.who && (raw.role === "admin" || raw.role === "member")) return raw;
  } catch (_) {}
  return null;
}

const $ = (tag, attrs = {}, kids = []) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === false || v == null) continue;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of [].concat(kids)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
};

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function cairoClock() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function cairoTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function repoInfo() {
  const cfg = state.githubCfg || {};
  return {
    owner: cfg.owner || "engamribrahemm",
    repo: cfg.repo || "helal-team",
    branch: cfg.branch || "main",
  };
}

function assembleBoardKey(cfg) {
  if (!cfg) return "";
  const direct = String(cfg.write_token || "").trim();
  if (/^(ghp_|github_pat_)/.test(direct)) return direct;
  const prefix = String(cfg.write_prefix || "").trim();
  const key = String(cfg.write_key || "").trim();
  if (prefix && key) {
    const assembled = prefix + key;
    if (/^(ghp_|github_pat_)/.test(assembled) && assembled.length >= 20) return assembled;
  }
  return "";
}

function persistBoardCfg(cfg, token) {
  const next = { ...(cfg || {}) };
  delete next.write_token;
  const clean = String(token || assembleBoardKey(cfg) || "").trim();
  if (clean.startsWith("github_pat_")) {
    next.write_prefix = "github_pat_";
    next.write_key = clean.slice("github_pat_".length);
  } else if (clean.startsWith("ghp_")) {
    next.write_prefix = "ghp_";
    next.write_key = clean.slice(4);
  }
  return next;
}

function writeToken() {
  const assembled = assembleBoardKey(state.githubCfg);
  if (/^(ghp_|github_pat_)/.test(assembled)) return assembled;
  try {
    const stored = localStorage.getItem("helal.ghToken") || "";
    if (/^(ghp_|github_pat_)/.test(stored)) return stored;
  } catch (_) {}
  return "";
}

function isBoardKey(token) {
  const value = String(token || "").trim();
  if (!/^(ghp_|github_pat_)/.test(value) || value.length < 20) return false;
  if (value === state.auth?.admin_pin || value === state.auth?.member_pin) return false;
  const pins = Object.values(state.auth?.users || {}).map((u) => u?.pin).filter(Boolean);
  if (pins.includes(value)) return false;
  return true;
}

async function connectDatabase(token) {
  const clean = String(token || "").trim();
  if (!isBoardKey(clean)) {
    state.connectError = "Paste the GitHub key that starts with ghp_. Not the Helal password.";
    render();
    return;
  }
  try {
    localStorage.setItem("helal.ghToken", clean);
  } catch (_) {}
  state.githubCfg = persistBoardCfg(state.githubCfg || {}, clean);
  state.connectError = "";
  state.saveState = "saving";
  render();
  try {
    const probe = await fetch("https://api.github.com/user", {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${clean}` },
    });
    if (!probe.ok) throw new Error("GitHub rejected that key. Generate a new one and paste it.");
    await dbPut("helal/github.json", persistBoardCfg(state.githubCfg, clean), "board: connect Helal database");
    state.saveState = "saved";
    state.connectError = "";
    render();
    pullRemoteBoard();
  } catch (err) {
    state.saveState = "error";
    state.saveError = err.message;
    state.connectError = err.message;
    render();
  }
}

function allPeople() {
  if (!state.team) return [];
  return [state.team.owner, ...(state.team.people || [])].filter(Boolean);
}

function people() {
  return allPeople().filter((p) => p.active !== false);
}

function pinFor(name) {
  const row = state.auth?.users?.[name];
  if (row?.pin) return row.pin;
  return accessFor(name) === "admin" ? state.auth?.admin_pin : state.auth?.member_pin;
}

function accessFor(name) {
  return people().find((p) => p.name === name)?.access === "admin" ? "admin" : "member";
}

function isAdmin() {
  return state.session?.role === "admin";
}

function personOf(name) {
  return people().find((p) => samePerson(p.name, name || state.who));
}

function isSocial() {
  const person = personOf(state.who);
  return person?.home === "social" || qualityTrack(person) === "social";
}

function canAssignTasks() {
  return isAdmin() || isSocial();
}

function canSeeTask(task) {
  if (!task) return false;
  if (isAdmin()) return true;
  if (samePerson(task.who, state.who)) return true;
  if (isSocial() && samePerson(task.created_by, state.who)) return true;
  return isSocial() && people().some((p) => p.home === "social" && samePerson(p.name, task.created_by));
}

function canMoveTask(task) {
  if (!task) return false;
  if (isAdmin()) return true;
  return samePerson(task.who, state.who);
}

function allTasks() {
  return (state.tasksFile?.days || []).flatMap((d) =>
    (d.tasks || []).map((t) => ({ ...t, date: d.date }))
  );
}

function samePerson(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function tasksForView() {
  let tasks = allTasks();
  if (state.view === "my") tasks = tasks.filter((t) => samePerson(t.who, state.who));
  else if (!isAdmin()) tasks = tasks.filter(canSeeTask);
  if (state.dateFilter && state.dateFilter !== "all") {
    tasks = tasks.filter((t) =>
      t.due === state.dateFilter
      || t.date === state.dateFilter
      || t.assigned_at === state.dateFilter
    );
  }
  return tasks;
}

function canEditDetails(task) {
  if (!task) return false;
  if (!task.created_by) return isAdmin();
  return task.created_by === state.who;
}

function thisMonth() {
  return today().slice(0, 7);
}

function hoursBetween(start, end) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return (b - a) / 36e5;
}

function formatHours(h) {
  if (h == null || Number.isNaN(h) || h <= 0) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function progressStart(task) {
  if (task.progress_started_at) return task.progress_started_at;
  if (task.status === "In progress") return task.updated_at || task.created_at || "";
  return "";
}

function loggedHours(task) {
  let hours = task.progress_hours || 0;
  const start = progressStart(task);
  if (task.status === "In progress" && start) hours += hoursBetween(start, new Date().toISOString());
  return hours;
}

function stampTime(task, prev, next) {
  const now = new Date().toISOString();
  if (!task.time_log) task.time_log = [];
  if (next === "In progress" && prev !== "In progress") task.progress_started_at = now;
  if (prev === "In progress" && next !== "In progress") {
    const start = progressStart(task);
    if (start) {
      const hours = hoursBetween(start, now);
      task.time_log.push({
        from: "In progress",
        to: next,
        started_at: start,
        ended_at: now,
        hours,
        by: state.who,
      });
      task.progress_hours = (task.progress_hours || 0) + hours;
    }
    task.progress_started_at = "";
  }
  if (next === "Review") {
    task.review_at = now;
    task.delivered_on = today();
  }
  if (next === "In progress" && !task.start_on) task.start_on = today();
  if (next === "Done") {
    task.done_at = now;
    task.done_on = today();
    task.done_month = thisMonth();
    task.done_by = state.who;
    if (!task.delivered_on) task.delivered_on = today();
  }
}

function projectList() {
  return state.projects?.projects || [];
}

function rootDrive() {
  return state.drive?.root_url || state.drive?.folders?.find((f) => f.id === "root")?.url || "";
}

function driveForProject(name) {
  return projectList().find((p) => p.name === name)?.url || rootDrive();
}

function folderFor(name) {
  const person = people().find((p) => p.name === name);
  return (state.drive?.folders || []).find((f) => f.id === person?.home);
}

function findTask(taskId) {
  for (const day of state.tasksFile?.days || []) {
    const task = (day.tasks || []).find((t) => t.id === taskId);
    if (task) return task;
  }
  return null;
}

function canSetStatus(next) {
  return isAdmin() || next !== "Done";
}

function doneMonthOf(task) {
  return task.done_month || (task.done_on || "").slice(0, 7) || "";
}

function loadTone(row) {
  if (row.open >= 3) return "tone-red";
  if (row.review > 0 || row.progress > 0) return "tone-orange";
  if (row.done > 0 && row.open === 0) return "tone-green";
  if (row.open === 0) return "tone-green";
  return "tone-ok";
}

function taskTone(task) {
  if (task.status === "Done") return "tone-green";
  if (task.status === "Review" || task.status === "Revisions") return "tone-orange";
  if (task.status === "In progress") return "tone-orange";
  return "";
}

function doneCard(task, { checked } = {}) {
  return $("article", { class: `card done-card ${taskTone(task)}` }, [
    $("p", { class: "title" }, task.title),
    $("div", { class: "meta" }, [
      $("span", { class: "pill tone-green" }, "Done"),
      $("span", { class: "pill" }, task.who),
      $("span", { class: "pill" }, task.done_on || task.due),
      task.progress_hours ? $("span", { class: "pill" }, formatHours(task.progress_hours)) : null,
      task.done_by ? $("span", { class: "pill" }, `Checked by ${task.done_by}`) : null,
    ]),
    checked
      ? $("label", { class: "done-check" }, [
        $("input", { type: "checkbox", checked: true, disabled: true }),
        "Done — saved in the Helal database",
      ])
      : null,
  ]);
}

function taskStamp(task) {
  return Date.parse(task.updated_at || task.done_at || task.created_at || 0) || 0;
}

function pickTask(a, b) {
  const sa = taskStamp(a);
  const sb = taskStamp(b);
  if (sb !== sa) return sb > sa ? b : a;
  const rank = { "To do": 1, "In progress": 2, Review: 3, Revisions: 4, Done: 5 };
  return (rank[b.status] || 0) >= (rank[a.status] || 0) ? b : a;
}

function fileReset(file) {
  return Date.parse(file?.reset_at || 0) || 0;
}

function boardResetAt() {
  return Date.parse(BOARD_RESET) || 0;
}

function effectiveReset(remote, local) {
  return Math.max(fileReset(remote), fileReset(local), boardResetAt());
}

function rowTime(row) {
  return Date.parse(row?.updated_at || row?.created_at || row?.saved_at || row?.done_at || 0) || 0;
}

function keptAfterReset(row, resetAt) {
  if (!row) return false;
  if (!resetAt) return true;
  return rowTime(row) >= resetAt;
}

function dropStaleCaches() {
  for (const key of OLD_CACHE_KEYS) {
    try { localStorage.removeItem(key); } catch (_) {}
  }
}

function mergeTaskFiles(remote, local) {
  const resetAt = effectiveReset(remote, local);
  const resetIso = new Date(resetAt).toISOString();
  const byId = new Map();
  for (const file of [remote, local]) {
    for (const day of file?.days || []) {
      for (const task of day.tasks || []) {
        if (!keptAfterReset(task, resetAt)) continue;
        const next = { ...task, _day: day.date };
        const prev = byId.get(task.id);
        byId.set(task.id, prev ? pickTask(prev, next) : next);
      }
    }
  }
  const daysMap = new Map();
  for (const task of byId.values()) {
    const date = task._day || task.due || today();
    if (!daysMap.has(date)) daysMap.set(date, []);
    const copy = { ...task };
    delete copy._day;
    daysMap.get(date).push(copy);
  }
  return {
    status: local?.status || remote?.status || "ready",
    note: remote?.note || local?.note || "",
    reset_at: resetIso,
    statuses: STATUSES,
    days: [...daysMap.entries()]
      .sort((x, y) => x[0].localeCompare(y[0]))
      .map(([date, tasks]) => ({ date, source: "Helal board", tasks })),
  };
}

function cairoDate(iso) {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAIRO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function currentQuarter(date) {
  const day = date || today();
  const month = Number(day.slice(5, 7));
  return `${day.slice(0, 4)}-Q${Math.ceil(month / 3)}`;
}

function inQuarter(date, quarter) {
  if (!date || !quarter) return false;
  return currentQuarter(date) === quarter;
}

function canonicalHrWeights() {
  return { delivery: 35, quality: 35, revisions: 15, creativity: 15 };
}

function emptyHr() {
  return {
    note: "HR evaluation system. Rewards and deductions come later.",
    reset_at: BOARD_RESET,
    weights: canonicalHrWeights(),
    work: {},
    reviews: [],
    attitude: [],
    warnings: [],
    rewards: [],
  };
}

function emptyAttendance() {
  return {
    note: "Each person marks Office, Home, or Off for the week that starts Friday, then saves. The whole team sees every saved row live. After save, day changes need admin approval.",
    reset_at: BOARD_RESET,
    weeks: {},
    requests: [],
  };
}

function addCairoDays(date, n) {
  const dt = new Date(`${date}T12:00:00+03:00`);
  dt.setTime(dt.getTime() + n * 86400000);
  return cairoDate(dt.toISOString());
}

function cairoWeekday(date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: CAIRO, weekday: "short" }).format(new Date(`${date}T12:00:00+03:00`));
}

function fridayStart(date) {
  const day = date || today();
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const idx = names.indexOf(cairoWeekday(day));
  const back = (idx - 5 + 7) % 7;
  return addCairoDays(day, -back);
}

function weekDates(friday) {
  return ATTEND_WEEK.map((_, i) => addCairoDays(friday, i));
}

function shiftFriday(friday, weeks) {
  return addCairoDays(friday, weeks * 7);
}

function canEditAttendWeek(friday) {
  return friday >= fridayStart(today());
}

function pickAttendPerson(remoteRow, localRow, name) {
  if (!remoteRow) return localRow;
  if (!localRow) return remoteRow;
  const me = state.who || state.session?.who;
  const rt = Date.parse(remoteRow.updated_at || 0);
  const lt = Date.parse(localRow.updated_at || 0);
  if (name === me && !localRow.saved && !remoteRow.saved) return lt >= rt ? localRow : remoteRow;
  if (remoteRow.saved && !localRow.saved) return remoteRow;
  if (localRow.saved && !remoteRow.saved) return localRow;
  return lt > rt ? localRow : remoteRow;
}

function canKeepLocalAttendRow(name, row) {
  const me = state.who || state.session?.who;
  if (!name || !row) return false;
  if (row.saved) return true;
  if (samePerson(name, me)) return true;
  return isAdmin() && samePerson(row.updated_by, me);
}

function mergeAttendance(remote, local) {
  const resetAt = effectiveReset(remote, local);
  const resetIso = new Date(resetAt).toISOString();
  const weeks = {};
  const keys = new Set([
    ...Object.keys(remote?.weeks || {}),
    ...Object.keys(local?.weeks || {}),
  ]);
  for (const key of keys) {
    const people = {};
    const names = new Set([
      ...Object.keys(remote?.weeks?.[key]?.people || {}),
      ...Object.keys(local?.weeks?.[key]?.people || {}),
    ]);
    for (const name of names) {
      const remoteRow = remote?.weeks?.[key]?.people?.[name];
      const localRow = local?.weeks?.[key]?.people?.[name];
      const keepRemote = !!(remoteRow && keptAfterReset(remoteRow, resetAt));
      const keepLocal = !!(localRow && keptAfterReset(localRow, resetAt) && canKeepLocalAttendRow(name, localRow));
      if (keepRemote && keepLocal) people[name] = pickAttendPerson(remoteRow, localRow, name);
      else if (keepRemote) people[name] = remoteRow;
      else if (keepLocal) people[name] = localRow;
    }
    if (Object.keys(people).length) weeks[key] = { start: key, people };
  }
  return {
    note: remote?.note || local?.note || emptyAttendance().note,
    reset_at: resetIso,
    weeks,
    requests: mergeById(
      (remote?.requests || []).filter((row) => keptAfterReset(row, resetAt)),
      (local?.requests || []).filter((row) => keptAfterReset(row, resetAt))
    ),
  };
}

function attendSignature(file) {
  return JSON.stringify({ weeks: file?.weeks || {}, requests: file?.requests || [] });
}

function ensureAttendance() {
  if (!state.attendFile || !state.attendFile.weeks) state.attendFile = emptyAttendance();
  return state.attendFile;
}

function attendDaysFor(name, friday) {
  return ensureAttendance().weeks[friday]?.people?.[name]?.days || {};
}

function attendDaysLive(name, friday) {
  const row = attendPerson(name, friday);
  if (!row) return {};
  if (samePerson(name, state.who) || row.saved) return row.days || {};
  return {};
}

function attendPerson(name, friday) {
  return ensureAttendance().weeks[friday]?.people?.[name] || null;
}

function attendSaved(name, friday) {
  return !!attendPerson(name, friday)?.saved;
}

function attendRequests() {
  const file = ensureAttendance();
  if (!file.requests) file.requests = [];
  return file.requests;
}

function pendingAttendRequests(friday) {
  return attendRequests().filter((r) => r.status === "Pending" && (!friday || r.friday === friday));
}

function pendingChangeFor(name, friday, date) {
  return attendRequests().find((r) => r.status === "Pending" && r.who === name && r.friday === friday && r.date === date);
}

function canDraftAttend(name, friday) {
  return name === state.who && friday >= fridayStart(today()) && !attendSaved(name, friday);
}

function setAttendDay(name, friday, date, mode) {
  const file = ensureAttendance();
  if (!file.weeks[friday]) file.weeks[friday] = { start: friday, people: {} };
  const prev = file.weeks[friday].people[name] || { days: {} };
  const days = { ...prev.days };
  if (!mode) delete days[date];
  else days[date] = mode;
  file.weeks[friday].people[name] = {
    days,
    saved: !!prev.saved,
    saved_at: prev.saved_at || "",
    updated_at: new Date().toISOString(),
    updated_by: state.who,
  };
  state.attendFile = file;
}

function lockMyAttendance(friday) {
  const dates = weekDates(friday);
  const days = attendDaysFor(state.who, friday);
  if (dates.some((date) => !ATTEND_MODES.includes(days[date]))) {
    state.saveError = "Set Office, Home, or Off for every day, then Save.";
    state.saveState = "error";
    render();
    return;
  }
  const file = ensureAttendance();
  if (!file.weeks[friday]) file.weeks[friday] = { start: friday, people: {} };
  const prev = file.weeks[friday].people[state.who] || { days };
  file.weeks[friday].people[state.who] = {
    ...prev,
    days: { ...days },
    saved: true,
    saved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: state.who,
  };
  state.attendFile = file;
  state.saveError = "";
  state.saveState = "saving";
  cacheBoard();
  saveAttendance(`attend: ${state.who} locked ${friday}`);
}

function submitAttendRequest({ friday, date, to, reason }) {
  const from = attendDaysFor(state.who, friday)[date] || "";
  if (!attendSaved(state.who, friday) || !to || to === from) return;
  if (pendingChangeFor(state.who, friday, date)) return;
  attendRequests().unshift({
    id: `ar-${Date.now().toString(36)}`,
    who: state.who,
    friday,
    date,
    from,
    to,
    reason: reason || "",
    status: "Pending",
    created_at: new Date().toISOString(),
    decided_at: "",
    decided_by: "",
  });
  state.attendChange = null;
  saveAttendance(`attend: ${state.who} requested ${date} ${from}→${to}`);
}

function decideAttendRequest(id, status) {
  if (!isAdmin()) return;
  const req = attendRequests().find((r) => r.id === id);
  if (!req || req.status !== "Pending") return;
  req.status = status;
  req.decided_at = new Date().toISOString();
  req.decided_by = state.who;
  if (status === "Approved") {
    setAttendDay(req.who, req.friday, req.date, req.to);
    const person = attendPerson(req.who, req.friday);
    if (person) person.saved = true;
  }
  saveAttendance(`attend: ${state.who} ${status.toLowerCase()} ${req.who} ${req.date}`);
}

function mergeById(remote = [], local = []) {
  const byId = new Map();
  for (const row of [...remote, ...local]) {
    if (!row?.id) continue;
    const prev = byId.get(row.id);
    if (!prev || Date.parse(row.updated_at || row.created_at || 0) >= Date.parse(prev.updated_at || prev.created_at || 0)) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}

function mergeHr(remote, local) {
  const a = remote || emptyHr();
  const b = local || emptyHr();
  const resetAt = effectiveReset(a, b);
  const resetIso = new Date(resetAt).toISOString();
  const lists = (file, key) => (file?.[key] || []).filter((row) => keptAfterReset(row, resetAt));
  const work = { ...a.work, ...b.work };
  delete work["Graphic (name unconfirmed)"];
  return {
    note: b.note || a.note,
    reset_at: resetIso,
    weights: canonicalHrWeights(),
    work,
    reviews: mergeById(lists(a, "reviews"), lists(b, "reviews")),
    attitude: mergeById(lists(a, "attitude"), lists(b, "attitude")),
    warnings: mergeById(lists(a, "warnings"), lists(b, "warnings")),
    rewards: mergeById(lists(a, "rewards"), lists(b, "rewards")),
  };
}

function qualityTrack(person) {
  const home = person?.home || "";
  if (home === "design") return "design";
  if (home === "video") return "video";
  if (home === "social") return "social";
  const role = (person?.role || "").toLowerCase();
  if (role.includes("graphic") || role.includes("design")) return "design";
  if (role.includes("video")) return "video";
  if (role.includes("social")) return "social";
  return "other";
}

function assignedDate(task) {
  return task.assigned_at || cairoDate(task.created_at) || task.date || "";
}

function startDate(task) {
  return task.start_on || cairoDate(task.progress_started_at) || "";
}

function deliveryDate(task) {
  return task.delivered_on || cairoDate(task.review_at) || task.done_on || "";
}

function isLateTask(task) {
  const delivered = deliveryDate(task) || (task.status === "Review" || task.status === "Done" ? today() : "");
  return !!(task.due && delivered && delivered > task.due);
}

function delayExcused(task) {
  return !!(task.delay_reason && task.delay_reason !== "Personal reason" && task.delay_reason !== "Other");
}

function delayDays(task) {
  const due = task.due;
  const delivered = deliveryDate(task) || ((task.status === "Review" || task.status === "Done" || task.status === "Revisions") ? today() : "");
  if (!due || !delivered || delivered <= due) return 0;
  return Math.max(1, Math.round((Date.parse(delivered) - Date.parse(due)) / 86400000));
}

function lastRevision(task) {
  const log = task.revision_log || [];
  return log[log.length - 1] || null;
}

function avg(nums) {
  const list = nums.filter((n) => Number.isFinite(n) && n > 0);
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

function scoreTone(n) {
  if (!n) return "";
  if (n >= 4) return "tone-green";
  if (n >= 3) return "tone-orange";
  return "tone-orange";
}

function formatScore(n) {
  if (!n) return "—";
  return n.toFixed(1);
}

function emptyReports() {
  return {
    note: "Evening reports from the Helal board. Amr reads every saved report on the dashboard.",
    reset_at: BOARD_RESET,
    reports: [],
  };
}

function reportsSignature(file) {
  return (file?.reports || []).map((r) => `${r.id}:${r.created_at || ""}`).sort().join("|");
}

function mergeReports(remote, local) {
  const resetAt = effectiveReset(remote, local);
  const resetIso = new Date(resetAt).toISOString();
  const usable = (file) => (file?.reports || []).filter((row) => keptAfterReset(row, resetAt));
  const byId = new Map();
  for (const report of [...usable(remote), ...usable(local)]) {
    const prev = byId.get(report.id);
    if (!prev || Date.parse(report.created_at || 0) >= Date.parse(prev.created_at || 0)) {
      byId.set(report.id, report);
    }
  }
  return {
    note: remote?.note || local?.note || "",
    reset_at: resetIso,
    reports: [...byId.values()].sort(
      (a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)
    ),
  };
}

function tasksSignature(file) {
  return (file?.days || [])
    .flatMap((d) => (d.tasks || []).map((t) => `${t.id}:${t.status}:${t.updated_at || ""}`))
    .sort()
    .join("|");
}

function flatTasks(file) {
  return (file?.days || []).flatMap((d) => (d.tasks || []).map((t) => ({ ...t, _day: d.date })));
}

function mineNewerFile(remote, local) {
  const resetAt = Math.max(fileReset(remote), boardResetAt());
  const who = state.who || state.session?.who;
  if (!who || !local?.days) return null;
  const remoteById = new Map(flatTasks(remote).map((t) => [t.id, t]));
  const keep = [];
  for (const task of flatTasks(local)) {
    if (!keptAfterReset(task, resetAt)) continue;
    if (!samePerson(task.updated_by, who) && !samePerson(task.created_by, who)) continue;
    const other = remoteById.get(task.id);
    if (!other || taskStamp(task) > taskStamp(other)) keep.push(task);
  }
  if (!keep.length) return null;
  const days = new Map();
  for (const task of keep) {
    const date = task._day || task.due || today();
    if (!days.has(date)) days.set(date, []);
    const copy = { ...task };
    delete copy._day;
    days.get(date).push(copy);
  }
  return {
    days: [...days.entries()].map(([date, tasks]) => ({ date, source: "Helal board", tasks })),
  };
}

function readCacheFiles() {
  try {
    return {
      tasks: JSON.parse(localStorage.getItem(LS_TASKS) || "null"),
      reports: JSON.parse(localStorage.getItem(LS_REPORTS) || "null"),
      hr: JSON.parse(localStorage.getItem(LS_HR) || "null"),
      attend: JSON.parse(localStorage.getItem(LS_ATTEND) || "null"),
    };
  } catch (_) {
    return { tasks: null, reports: null, hr: null, attend: null };
  }
}
function cacheBoard() {
  try {
    if (state.tasksFile) localStorage.setItem(LS_TASKS, JSON.stringify(state.tasksFile));
    if (state.reportsFile) localStorage.setItem(LS_REPORTS, JSON.stringify(state.reportsFile));
    if (state.hrFile) localStorage.setItem(LS_HR, JSON.stringify(state.hrFile));
    if (state.attendFile) localStorage.setItem(LS_ATTEND, JSON.stringify(state.attendFile));
  } catch (_) {}
}

function hydrateFromCache() {
  try {
    const tasks = JSON.parse(localStorage.getItem(LS_TASKS) || "null");
    const reports = JSON.parse(localStorage.getItem(LS_REPORTS) || "null");
    const hr = JSON.parse(localStorage.getItem(LS_HR) || "null");
    const attend = JSON.parse(localStorage.getItem(LS_ATTEND) || "null");
    if (tasks?.days) state.tasksFile = tasks;
    if (hr?.reviews || hr?.work) state.hrFile = hr;
    if (reports?.reports) state.reportsFile = reports;
    if (attend?.weeks) state.attendFile = attend;
  } catch (_) {}
}

function decodeGithubFile(json) {
  return JSON.parse(decodeURIComponent(escape(atob(json.content.replace(/\n/g, "")))));
}

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function fetchLocal(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not read ${path}`);
  return res.json();
}

function githubHeaders(extra) {
  const headers = {
    Accept: "application/json",
    ...(extra || {}),
  };
  const token = writeToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function githubReadHeaders() {
  return { Accept: "application/json" };
}

function waitMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function saveBackoff(attempt) {
  return 180 * (attempt + 1) + Math.floor(Math.random() * 120);
}

function loadShaCache() {
  try {
    const row = JSON.parse(localStorage.getItem(LS_SHAS) || "{}");
    if (row && typeof row === "object") Object.assign(state.shas, row);
  } catch (_) {}
}

function persistShaCache() {
  try {
    localStorage.setItem(LS_SHAS, JSON.stringify(state.shas || {}));
  } catch (_) {}
}

function rememberSha(path, sha) {
  if (!path || !sha) return;
  state.shas[path] = sha;
  persistShaCache();
}

function fetchErrorMessage(err) {
  const msg = String(err?.message || err || "");
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return "Could not reach GitHub from this browser. Refresh, then try again.";
  }
  if (/403|rate limit|busy/i.test(msg)) {
    return "GitHub is busy. Wait a few seconds, then try again.";
  }
  return msg;
}

function friendlySaveNote(message) {
  const text = String(message || "");
  if (text.startsWith("attend:")) return "Attendance saved. The whole team can see it now.";
  if (text.startsWith("report:")) return "Report saved. It is on the dashboard.";
  if (text.startsWith("board:")) return "Task saved. It is on the live board.";
  if (text.startsWith("hr:")) return "HR saved.";
  if (text.startsWith("team:") || text.startsWith("auth:")) return "People saved.";
  return "Saved. The team can see it now.";
}

function markSaved(message) {
  state.saveState = "saved";
  state.saveError = "";
  state.saveNote = friendlySaveNote(message);
}

async function githubGet(url, withAuth) {
  return fetch(url, { headers: withAuth ? githubHeaders() : githubReadHeaders() });
}

async function githubGetPreferAuth(url) {
  if (writeToken()) {
    const auth = await githubGet(url, true);
    if (auth.ok) return auth;
  }
  return githubGet(url, false);
}

async function fetchHeadSha() {
  const { owner, repo, branch } = repoInfo();
  const res = await githubGetPreferAuth(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}?t=${Date.now()}`
  );
  if (!res.ok) return "";
  const json = await res.json();
  return json.object?.sha || "";
}

async function dbGetRaw(path) {
  const { owner, repo, branch } = repoInfo();
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path}?t=${Date.now()}`
  );
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}

async function refreshShaTree() {
  const { owner, repo, branch } = repoInfo();
  const res = await githubGetPreferAuth(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1&t=${Date.now()}`
  );
  if (!res.ok) return false;
  const json = await res.json();
  for (const item of json.tree || []) {
    if (item.type === "blob" && item.path && item.sha) state.shas[item.path] = item.sha;
  }
  persistShaCache();
  return true;
}

async function dbGet(path, ref) {
  const { owner, repo, branch } = repoInfo();
  const at = ref || branch;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(at)}&t=${Date.now()}`;
  const res = await githubGetPreferAuth(url);
  if (!res.ok) {
    if (res.status === 403) throw new Error("GitHub is busy. Wait a few seconds, then try again.");
    throw new Error(`GitHub ${res.status}`);
  }
  const json = await res.json();
  if (!json?.sha || (json.type && json.type !== "file")) throw new Error("GitHub file was not ready.");
  const data = decodeGithubFile(json);
  rememberSha(path, json.sha);
  return data;
}

async function readRemoteForSave(path) {
  try {
    return await dbGet(path);
  } catch (_) {}
  try {
    return await dbGetRaw(path);
  } catch (_) {
    return null;
  }
}

async function ensureFileSha(path) {
  if (state.shas[path]) return state.shas[path];
  await refreshShaTree();
  if (state.shas[path]) return state.shas[path];
  try {
    await dbGet(path);
  } catch (_) {}
  return state.shas[path] || "";
}

function applyRemoteMerge(path, remote, payload) {
  if (path.endsWith("daily-tasks.json")) {
    payload = mergeTaskFiles(remote, payload);
    state.tasksFile = payload;
  } else if (path.endsWith("reports.json")) {
    payload = mergeReports(remote, payload);
    state.reportsFile = payload;
  } else if (path.endsWith("hr.json")) {
    payload = mergeHr(remote, payload);
    state.hrFile = payload;
  } else if (path.endsWith("attendance.json")) {
    payload = mergeAttendance(remote, payload);
    state.attendFile = payload;
  } else if (path.endsWith("github.json")) {
    payload = persistBoardCfg({ ...remote, ...payload }, assembleBoardKey(payload) || assembleBoardKey(remote));
    state.githubCfg = payload;
  } else if (path.endsWith("team.json")) {
    payload = pickNewerFile(remote, payload);
    state.team = payload;
  } else if (path.endsWith("auth.json")) {
    payload = mergeAuth(remote, payload);
    state.auth = payload;
  }
  return payload;
}

async function dbPut(path, data, message) {
  cacheBoard();
  loadShaCache();
  const { owner, repo, branch } = repoInfo();
  const token = writeToken();
  if (!token) {
    state.saveState = "local-only";
    return false;
  }
  let payload = data;
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const remote = await readRemoteForSave(path);
    if (!remote) {
      lastError = "GitHub did not return the file yet. Retrying…";
      await waitMs(saveBackoff(attempt));
      continue;
    }
    payload = applyRemoteMerge(path, remote, payload);
    const sha = state.shas[path] || await ensureFileSha(path);
    if (!sha) {
      lastError = "GitHub did not return the file yet. Retrying…";
      await waitMs(saveBackoff(attempt));
      continue;
    }
    let res;
    try {
      res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: "PUT",
          headers: githubHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            message,
            content: toBase64(JSON.stringify(payload, null, 2) + "\n"),
            branch,
            sha,
          }),
        }
      );
    } catch (err) {
      lastError = fetchErrorMessage(err);
      await waitMs(saveBackoff(attempt));
      continue;
    }
    if (res.ok) {
      const json = await res.json();
      rememberSha(path, json.content?.sha || sha);
      state.headSha = json.commit?.sha || state.headSha;
      if (path.endsWith("daily-tasks.json")) state.taskCommitSha = json.commit?.sha || "";
      markSaved(message);
      cacheBoard();
      return true;
    }
    const text = await res.text();
    if (res.status === 409 || res.status === 422) {
      lastError = "Someone else saved at the same time. Merging…";
      try { await dbGet(path); } catch (_) { await refreshShaTree(); }
      await waitMs(saveBackoff(attempt));
      continue;
    }
    if (res.status === 403) {
      lastError = "GitHub is busy. Retrying…";
      await waitMs(400 + saveBackoff(attempt));
      continue;
    }
    throw new Error(res.status === 401
      ? "GitHub could not save. The board database token needs a refresh."
      : `GitHub ${res.status}: ${text.slice(0, 140)}`);
  }
  throw new Error(lastError || "Could not save to GitHub. Click Refresh, then try again.");
}

async function loadAll() {
  if (state.session) state.who = state.session.who;
  dropStaleCaches();
  loadShaCache();
  const local = async () => {
    const [team, auth, drive, projects, tasksFile, reportsFile, githubCfg, hrFile, attendFile] = await Promise.all([
      fetchLocal("./helal/team.json"),
      fetchLocal("./helal/auth.json"),
      fetchLocal("./helal/drive.json"),
      fetchLocal("./helal/projects.json"),
      fetchLocal("./helal/daily-tasks.json"),
      fetchLocal("./helal/reports.json"),
      fetchLocal("./helal/github.json"),
      fetchLocal("./helal/hr.json").catch(() => emptyHr()),
      fetchLocal("./helal/attendance.json").catch(() => emptyAttendance()),
    ]);
    Object.assign(state, { team, auth, drive, projects, tasksFile, reportsFile, githubCfg, hrFile, attendFile });
  };

  try {
    await local();
  } catch (_) {
    hydrateFromCache();
  }
  const cache = readCacheFiles();
  try {
    const localCfg = state.githubCfg;
    const remoteCfg = await dbGetRaw("helal/github.json").catch(() => localCfg);
    const githubCfg = persistBoardCfg(
      { ...localCfg, ...remoteCfg },
      assembleBoardKey(remoteCfg) || assembleBoardKey(localCfg)
    );
    state.githubCfg = githubCfg;
    const [team, auth, drive, projects, tasksFile, reportsFile, hrFile, attendFile] = await Promise.all([
      dbGetRaw("helal/team.json"),
      dbGetRaw("helal/auth.json"),
      dbGetRaw("helal/drive.json"),
      dbGetRaw("helal/projects.json"),
      dbGetRaw("helal/daily-tasks.json"),
      dbGetRaw("helal/reports.json"),
      dbGetRaw("helal/hr.json").catch(() => emptyHr()),
      dbGet("helal/attendance.json").catch(() => dbGetRaw("helal/attendance.json").catch(() => emptyAttendance())),
    ]);
    Object.assign(state, { team, auth, drive, projects, githubCfg });
    const replay = mineNewerFile(tasksFile, cache.tasks);
    state.tasksFile = mergeTaskFiles(tasksFile, replay);
    state.reportsFile = mergeReports(reportsFile || emptyReports(), cache.reports);
    state.hrFile = mergeHr(hrFile || emptyHr(), cache.hr);
    state.attendFile = mergeAttendance(attendFile || emptyAttendance(), cache.attend);
    state.hrQuarter = state.hrQuarter || currentQuarter();
    state.hrMonth = state.hrMonth || today().slice(0, 7);
    state.saveState = writeToken() ? "saved" : "idle";
    if (!state.saveNote) state.saveNote = "Ready. New work will save to GitHub.";
    await refreshShaTree();
    cacheBoard();
    persistShaCache();
    if (replay && writeToken()) saveTasks(`board: ${state.who} replay unsaved moves`);
  } catch (_) {
    state.tasksFile = mergeTaskFiles(state.tasksFile, cache.tasks);
    state.reportsFile = mergeReports(state.reportsFile || emptyReports(), cache.reports);
    state.hrFile = mergeHr(state.hrFile || emptyHr(), cache.hr);
    state.attendFile = mergeAttendance(state.attendFile || emptyAttendance(), cache.attend);
  }
  if (!state.hrFile) state.hrFile = emptyHr();
  if (!state.attendFile) state.attendFile = emptyAttendance();
  if (!state.reportsFile) state.reportsFile = emptyReports();
  state.hrQuarter = state.hrQuarter || currentQuarter();
  state.hrMonth = state.hrMonth || today().slice(0, 7);
  state.hrPerson = state.hrPerson || "";
  state.attendWeek = state.attendWeek || fridayStart(today());

  state.reportDay = state.reportDay || today();
  state.calMonth = state.calMonth || today().slice(0, 7);
  state.dueDraft = state.dueDraft || today();
  state.dueMonth = state.dueMonth || today().slice(0, 7);
  state.workMonth = state.workMonth || thisMonth();
  lastCairoDay = today();
  if (state.session && !people().some((p) => p.name === state.session.who)) logout();
  else if (state.session) state.who = state.session.who;
}

let saveChain = Promise.resolve();

function enqueueSave(job) {
  state.saveState = "saving";
  const run = saveChain.then(job, job);
  saveChain = run.then(() => {}, () => {});
  return run;
}

async function saveTasks(message) {
  return enqueueSave(async () => {
    state.saveState = "saving";
    state.saveError = "";
    render();
    try {
      await dbPut("helal/daily-tasks.json", state.tasksFile, message);
      render();
    } catch (err) {
      state.saveState = "error";
      state.saveError = fetchErrorMessage(err);
      render();
    }
  });
}

async function saveReports(message) {
  return enqueueSave(async () => {
    state.saveState = "saving";
    state.saveError = "";
    render();
    try {
      await dbPut("helal/reports.json", state.reportsFile, message);
      render();
    } catch (err) {
      state.saveState = "error";
      state.saveError = fetchErrorMessage(err);
      render();
    }
  });
}

async function saveHr(message) {
  return enqueueSave(async () => {
    state.saveState = "saving";
    state.saveError = "";
    render();
    try {
      await dbPut("helal/hr.json", state.hrFile, message);
      render();
    } catch (err) {
      state.saveState = "error";
      state.saveError = fetchErrorMessage(err);
      render();
    }
  });
}

function pickNewerFile(remote, local) {
  const rt = Date.parse(remote?.updated_at || 0) || 0;
  const lt = Date.parse(local?.updated_at || 0) || 0;
  return lt >= rt ? local : (remote || local);
}

function mergeAuth(remote, local) {
  const newer = pickNewerFile(remote, local) || {};
  const older = newer === local ? remote : local;
  return {
    note: newer.note || older?.note || "",
    updated_at: newer.updated_at || older?.updated_at || "",
    users: { ...(older?.users || {}), ...(newer.users || {}) },
  };
}

function slugPersonId(name) {
  return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `p-${Date.now().toString(36)}`;
}

function makePersonPin(name) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  for (let i = 0; i < 4; i += 1) tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  const tag = String(name || "User").replace(/[^A-Za-z]/g, "") || "User";
  return `Helal-${tag}-${tail}`;
}

async function saveTeam(message) {
  return enqueueSave(async () => {
    state.saveState = "saving";
    state.saveError = "";
    render();
    try {
      if (!state.team.updated_at) state.team.updated_at = new Date().toISOString();
      await dbPut("helal/team.json", state.team, message);
      render();
    } catch (err) {
      state.saveState = "error";
      state.saveError = fetchErrorMessage(err);
      render();
    }
  });
}

async function saveAuth(message) {
  return enqueueSave(async () => {
    state.saveState = "saving";
    state.saveError = "";
    render();
    try {
      if (!state.auth) state.auth = { users: {} };
      state.auth.updated_at = new Date().toISOString();
      await dbPut("helal/auth.json", state.auth, message);
      render();
    } catch (err) {
      state.saveState = "error";
      state.saveError = fetchErrorMessage(err);
      render();
    }
  });
}

async function saveAttendance(message) {
  return enqueueSave(async () => {
    state.saveState = "saving";
    state.saveError = "";
    render();
    try {
      await dbPut("helal/attendance.json", state.attendFile, message);
      render();
    } catch (err) {
      state.saveState = "error";
      state.saveError = fetchErrorMessage(err);
      render();
    }
  });
}

let pullBusy = false;
let pullTick = 0;

async function pullRemoteBoard() {
  if (!state.session || state.saveState === "saving" || pullBusy) return;
  pullBusy = true;
  pullTick += 1;
  try {
    const live = [
      dbGetRaw("helal/daily-tasks.json").catch(() => dbGet("helal/daily-tasks.json")),
      (state.view === "attend" ? dbGet("helal/attendance.json") : dbGetRaw("helal/attendance.json"))
        .catch(() => dbGet("helal/attendance.json"))
        .catch(() => state.attendFile || emptyAttendance()),
    ];
    if (state.view === "report" || state.view === "review" || pullTick % 2 === 0) {
      live.push(dbGetRaw("helal/reports.json").catch(() => state.reportsFile));
    } else {
      live.push(Promise.resolve(state.reportsFile));
    }
    const [remoteTasks, remoteAttend, remoteReports] = await Promise.all(live);
    let remoteHr = state.hrFile || emptyHr();
    let remoteTeam = state.team;
    let remoteAuth = state.auth;
    if (pullTick % 4 === 0) await refreshShaTree();
    if (pullTick % 5 === 0) {
      [remoteHr, remoteTeam, remoteAuth] = await Promise.all([
        dbGetRaw("helal/hr.json").catch(() => state.hrFile || emptyHr()),
        dbGetRaw("helal/team.json").catch(() => state.team),
        dbGetRaw("helal/auth.json").catch(() => state.auth),
      ]);
    }
    if (state.saveState === "saving") return;
    const before = tasksSignature(state.tasksFile);
    const attendBefore = attendSignature(state.attendFile);
    const reportsBefore = reportsSignature(state.reportsFile);
    const replay = mineNewerFile(remoteTasks, state.tasksFile);
    state.tasksFile = mergeTaskFiles(
      remoteTasks || { days: [] },
      replay || state.tasksFile || { days: [] }
    );
    state.reportsFile = mergeReports(remoteReports || emptyReports(), state.reportsFile || emptyReports());
    state.hrFile = remoteHr || emptyHr();
    state.attendFile = mergeAttendance(remoteAttend || emptyAttendance(), state.attendFile || emptyAttendance());
    if (remoteTeam) state.team = pickNewerFile(remoteTeam, state.team);
    if (remoteAuth) state.auth = mergeAuth(remoteAuth, state.auth);
    if (state.session && !people().some((p) => p.name === state.session.who)) {
      logout();
      return;
    }
    cacheBoard();
    if (
      tasksSignature(state.tasksFile) !== before
      || attendSignature(state.attendFile) !== attendBefore
      || reportsSignature(state.reportsFile) !== reportsBefore
    ) render();
  } catch (_) {
  } finally {
    pullBusy = false;
  }
}

function login(who, pin) {
  const person = people().find((p) => p.name === who);
  if (!person) {
    state.loginError = "This name is not active. Ask an admin.";
    render();
    return;
  }
  const expected = pinFor(who);
  if (!pin || !expected || pin !== expected) {
    state.loginError = "Wrong password for this name.";
    render();
    return;
  }
  const role = accessFor(who);
  state.session = { who, role };
  state.who = who;
  state.loginError = "";
  state.view = "board";
  localStorage.setItem(LS_SESSION, JSON.stringify(state.session));
  state.headSha = "";
  state.taskCommitSha = "";
  render();
  pullRemoteBoard();
}

function logout() {
  state.session = null;
  state.who = "";
  localStorage.removeItem(LS_SESSION);
  render();
}

function ensureTasksFile() {
  if (!state.tasksFile || !Array.isArray(state.tasksFile.days)) {
    state.tasksFile = {
      status: "ready",
      note: "",
      statuses: STATUSES,
      days: state.tasksFile?.days || [],
      reset_at: state.tasksFile?.reset_at || BOARD_RESET,
    };
  }
  if (!state.tasksFile.days) state.tasksFile.days = [];
  return state.tasksFile;
}

function ensureDay(date) {
  ensureTasksFile();
  let day = state.tasksFile.days.find((d) => d.date === date);
  if (!day) {
    day = { date, source: "Helal board", tasks: [] };
    state.tasksFile.days.push(day);
  }
  return day;
}

function applyStatus(taskId, next, extra = {}) {
  if (!canSetStatus(next)) return;
  const current = findTask(taskId);
  if (!canMoveTask(current)) return;
  let found = null;
  for (const day of state.tasksFile.days) {
    const task = day.tasks.find((t) => t.id === taskId);
    if (task) {
      if (task.status === next && !extra.force) return;
      const prev = task.status;
      task.status = next;
      if (next === "Revisions") {
        task.revisions = (task.revisions || 0) + 1;
        if (!task.revision_log) task.revision_log = [];
        if (extra.revision_level) {
          task.revision_log.push({
            level: extra.revision_level,
            reason: extra.revision_reason || "",
            at: new Date().toISOString(),
            by: state.who,
          });
        }
      }
      if (extra.delay_reason) {
        task.delay_reason = extra.delay_reason;
        task.delay_notified = !!extra.delay_notified;
        task.delay_days = delayDays({ ...task, delivered_on: today(), due: task.due, status: next });
      }
      stampTime(task, prev, next);
      task.updated_at = new Date().toISOString();
      task.updated_by = state.who;
      found = task;
    }
  }
  if (!found) return;
  state.pendingDelay = null;
  state.pendingRevision = null;
  render();
  saveTasks(`board: ${state.who} set ${taskId} to ${next}`);
}

function setStatus(taskId, next) {
  if (!canSetStatus(next)) return;
  const task = findTask(taskId);
  if (!task || task.status === next) return;
  if (next === "Review" && task.due && task.due < today() && !task.delay_reason) {
    state.pendingDelay = { taskId, next };
    render();
    return;
  }
  if (next === "Revisions") {
    state.pendingRevision = { taskId };
    render();
    return;
  }
  applyStatus(taskId, next);
}

function assignTask({ who, space, title, due, drive, project, status, notes }) {
  if (!canAssignTasks() || !who || !title) return;
  const date = due || today();
  const day = ensureDay(date);
  const id = `t-${date.replaceAll("-", "")}-${who.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
  const driveUrl = (drive || driveForProject(project) || rootDrive() || "").trim();
  day.tasks.push({
    id,
    who,
    space,
    project: project || "",
    title,
    notes: notes || "",
    due: date,
    status: canSetStatus(status) ? (status || "To do") : "To do",
    drive: driveUrl,
    drive_missing: !driveUrl,
    assigned_at: today(),
    created_by: state.who,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: state.who,
    revisions: 0,
  });
  state.creating = false;
  state.draft = null;
  cacheBoard();
  state.saveState = "saving";
  state.saveError = "";
  render();
  saveTasks(`board: ${state.who} assigned ${who} — ${title}`).then(() => {
    if (state.saveState === "error") return;
    pullRemoteBoard();
  });
}

function submitReport(fields) {
  if (!state.reportsFile) state.reportsFile = emptyReports();
  if (!state.reportsFile.reports) state.reportsFile.reports = [];
  state.reportsFile.reports.unshift({
    id: `r-${Date.now().toString(36)}`,
    who: state.who,
    date: fields.date || today(),
    finished: fields.finished,
    unfinished: fields.unfinished,
    drive: fields.drive,
    need_review: fields.need_review,
    place: fields.place || "",
    created_at: new Date().toISOString(),
  });
  state.reportDay = fields.date || today();
  state.calMonth = state.reportDay.slice(0, 7);
  cacheBoard();
  state.saveState = "saving";
  state.saveError = "";
  render();
  saveReports(`report: ${state.who} ${state.reportDay}`);
}

function banner() {
  if (!writeToken() && state.session) return viewConnectBanner();
  if (state.saveState === "saving") return $("div", { class: "banner" }, "Saving…");
  if (state.saveState === "saved") {
    return $("div", { class: "banner ok" }, state.saveNote || "Saved. The team can see it now.");
  }
  if (state.saveState === "error") return $("div", { class: "banner err" }, state.saveError);
  if (state.saveState === "local-only") return viewConnectBanner();
  return null;
}

function viewConnectBanner() {
  if (!isAdmin()) {
    return $("div", { class: "banner warn" }, "The Helal database is not connected yet. Ask Amr or Tasneem.");
  }
  const key = $("input", {
    type: "password",
    placeholder: "ghp_…",
    autocomplete: "off",
  });
  return $("div", { class: "banner warn connect-box" }, [
    $("p", {}, "The board can read GitHub, but it cannot write yet. Connect once so Seif and the team see new tasks."),
    $("p", { class: "muted" }, [
      $("a", {
        href: "https://github.com/settings/tokens/new?scopes=public_repo&description=Helal%20board",
        target: "_blank",
        rel: "noreferrer",
      }, "Create the Helal board key"),
      " while logged in as engamribrahemm. Leave public_repo checked. Copy the value that starts with ghp_. Do not paste the Helal password.",
    ]),
    $("form", {
      class: "connect-form",
      onsubmit: (e) => {
        e.preventDefault();
        connectDatabase(key.value);
      },
    }, [
      key,
      $("button", { class: "btn primary", type: "submit" }, "Connect database"),
    ]),
    state.connectError ? $("p", { class: "banner err" }, state.connectError) : null,
  ]);
}

function kanbanCard(task) {
  return $("article", {
    class: `kcard ${taskTone(task)}`,
    draggable: canMoveTask(task) ? "true" : "false",
    ondragstart: (e) => {
      if (!canMoveTask(task)) {
        e.preventDefault();
        return;
      }
      cardDidDrag = true;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
      e.currentTarget.classList.add("dragging");
    },
    ondragend: (e) => {
      e.currentTarget.classList.remove("dragging");
      document.querySelectorAll(".kanban-col.drop").forEach((el) => el.classList.remove("drop"));
    },
    onclick: () => {
      if (cardDidDrag) {
        cardDidDrag = false;
        return;
      }
      state.openTaskId = task.id;
      render();
    },
  }, [
    $("p", { class: "title" }, task.title),
    $("div", { class: `meta ${taskTone(task)}` }, [
      $("span", { class: "pill" }, task.who),
      task.project ? $("span", { class: "pill" }, task.project) : null,
      $("span", { class: "pill" }, `Due ${task.due}`),
      loggedHours(task) > 0 ? $("span", { class: `pill ${taskTone(task)}` }, formatHours(loggedHours(task))) : null,
      task.created_by && task.created_by !== task.who ? $("span", { class: "pill" }, `From ${task.created_by}`) : null,
    ]),
  ]);
}

function viewBoard() {
  const tasks = tasksForView();
  return $("div", { class: "kanban" },
    BOARD_STATUSES.map((status) => {
      const col = tasks.filter((t) => t.status === status);
      return $("section", {
        class: "kanban-col",
        ondragover: (e) => {
          e.preventDefault();
          if (!canSetStatus(status)) {
            e.dataTransfer.dropEffect = "none";
            return;
          }
          e.dataTransfer.dropEffect = "move";
          e.currentTarget.classList.add("drop");
        },
        ondragleave: (e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          e.currentTarget.classList.remove("drop");
        },
        ondrop: (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("drop");
          const id = e.dataTransfer.getData("text/plain");
          cardDidDrag = false;
          if (id && canSetStatus(status) && canMoveTask(findTask(id))) setStatus(id, status);
        },
      }, [
        $("div", { class: "kanban-head" }, [
          $("h3", {}, status),
          $("span", {}, String(col.length)),
        ]),
        $("div", { class: "kanban-cards" },
          col.length ? col.map(kanbanCard) : $("p", { class: "empty" }, "No tasks")
        ),
        status === "Done"
          ? (isAdmin()
            ? $("p", { class: "muted" }, "Drop here to mark done. Saved to GitHub.")
            : $("p", { class: "muted" }, "Only admins can mark Done."))
          : (canAssignTasks()
            ? $("button", {
              class: "btn",
              style: "margin-top:12px",
              onclick: () => {
                state.creating = true;
                state.createStatus = status;
                state.draft = null;
                state.dueDraft = today();
                state.dueMonth = today().slice(0, 7);
                render();
              },
            }, "New task")
            : null),
      ]);
    })
  );
}

function ensureHr() {
  if (!state.hrFile) state.hrFile = emptyHr();
  if (!state.hrFile.reviews) state.hrFile.reviews = [];
  if (!state.hrFile.attitude) state.hrFile.attitude = [];
  if (!state.hrFile.warnings) state.hrFile.warnings = [];
  if (!state.hrFile.work) state.hrFile.work = {};
  state.hrFile.weights = canonicalHrWeights();
  return state.hrFile;
}

function workFor(name) {
  return ensureHr().work[name] || {
    type: "Full-time",
    days: "Sun–Thu",
    hours: "10:00–18:00",
    mode: "Remote",
    office_days: "",
    response: "Reliable",
  };
}

function inMonth(date, month) {
  if (!date || !month) return false;
  return String(date).slice(0, 7) === month;
}

function taskMonth(task) {
  return (deliveryDate(task) || task.done_on || task.due || assignedDate(task) || "").slice(0, 7);
}

function reviewMonth(row) {
  if (row?.month) return row.month;
  if (row?.created_at) return cairoDate(row.created_at).slice(0, 7) || row.created_at.slice(0, 7);
  const task = row?.task_id ? findTask(row.task_id) : null;
  if (task) return taskMonth(task);
  return "";
}

function reviewsFor(name, month) {
  return ensureHr().reviews.filter((r) => r.who === name && (!month || reviewMonth(r) === month));
}

function computedDelivery(name, month) {
  const tasks = allTasks().filter((t) => {
    if (t.who !== name) return false;
    if (!["Review", "Revisions", "Done"].includes(t.status)) return false;
    return inMonth(deliveryDate(t) || t.done_on || t.due, month);
  });
  if (!tasks.length) return 0;
  const onTime = tasks.filter((t) => !isLateTask(t) || delayExcused(t)).length;
  const rate = onTime / tasks.length;
  if (rate >= 0.95) return 5;
  if (rate >= 0.8) return 4;
  if (rate >= 0.6) return 3;
  if (rate >= 0.4) return 2;
  return 1;
}

function personScore(name, month) {
  const m = month || today().slice(0, 7);
  const rows = reviewsFor(name, m);
  const w = ensureHr().weights;
  const delivery = avg(rows.map((r) => r.delivery).filter(Boolean)) || computedDelivery(name, m);
  const quality = avg(rows.map((r) => r.quality_avg).filter(Boolean));
  const revisions = avg(rows.map((r) => r.revision_rating).filter(Boolean));
  const creativity = avg(rows.map((r) => r.creativity).filter(Boolean));
  const parts = [
    [delivery, w.delivery],
    [quality, w.quality],
    [revisions, w.revisions],
    [creativity, w.creativity],
  ].filter(([n]) => n > 0);
  const weightSum = parts.reduce((s, [, wt]) => s + wt, 0) || 1;
  const total = parts.reduce((s, [n, wt]) => s + n * wt, 0) / weightSum;
  const attitudeRows = ensureHr().attitude.filter((a) => a.who === name && a.month === m);
  const attitude = avg(attitudeRows.map((a) => avg(ATTITUDE_CRITERIA.map(([k]) => Number(a[k]) || 0))));
  return { name, month: m, delivery, quality, revisions, creativity, total, attitude, reviews: rows.length };
}

function scoreSelect(value) {
  const sel = $("select", {}, [
    $("option", { value: "" }, "—"),
    ...[5, 4, 3, 2, 1].map((n) => $("option", { value: String(n), selected: Number(value) === n }, `${n} · ${RATE_LABEL[n]}`)),
  ]);
  return sel;
}

function viewPromptModals() {
  const extra = [];
  if (state.pendingDelay) {
    const reason = $("select", {}, DELAY_REASONS.map((r) => $("option", { value: r }, r)));
    const notified = $("input", { type: "checkbox" });
    extra.push(
      $("div", { class: "modal-bg", onclick: () => { state.pendingDelay = null; render(); } }),
      $("section", { class: "modal" }, [
        $("p", { class: "muted" }, "Delay reason"),
        $("h2", {}, "This task is past the deadline"),
        $("p", { class: "muted" }, "A clear blocker is not a violation. Repeated delay without notice is escalated: feedback, then warning, then deduction later."),
        $("form", {
          class: "form",
          onsubmit: (e) => {
            e.preventDefault();
            applyStatus(state.pendingDelay.taskId, state.pendingDelay.next, {
              delay_reason: reason.value,
              delay_notified: notified.checked,
            });
          },
        }, [
          $("label", {}, ["Why is it late?", reason]),
          $("label", { class: "done-check" }, [notified, "I notified the team in advance"]),
          $("div", { style: "display:flex;gap:8px" }, [
            $("button", { class: "btn primary", type: "submit" }, "Move to Review"),
            $("button", { class: "btn ghost", type: "button", onclick: () => { state.pendingDelay = null; render(); } }, "Cancel"),
          ]),
        ]),
      ])
    );
  }
  if (state.pendingRevision) {
    const level = $("select", {}, REVISION_LEVELS.map((r) => $("option", { value: r }, r)));
    const reason = $("input", { placeholder: "Color change, reorder, full rethink…" });
    extra.push(
      $("div", { class: "modal-bg", onclick: () => { state.pendingRevision = null; render(); } }),
      $("section", { class: "modal" }, [
        $("p", { class: "muted" }, "Revision"),
        $("h2", {}, "Classify this revision"),
        $("p", { class: "muted" }, "Minor is a small tweak. Medium is a large part. Major is a full rethink."),
        $("form", {
          class: "form",
          onsubmit: (e) => {
            e.preventDefault();
            applyStatus(state.pendingRevision.taskId, "Revisions", { revision_level: level.value, revision_reason: reason.value.trim() });
          },
        }, [
          $("label", {}, ["Level", level]),
          $("label", {}, ["Reason", reason]),
          $("div", { style: "display:flex;gap:8px" }, [
            $("button", { class: "btn primary", type: "submit" }, "Send to Revisions"),
            $("button", { class: "btn ghost", type: "button", onclick: () => { state.pendingRevision = null; render(); } }, "Cancel"),
          ]),
        ]),
      ])
    );
  }
  if (state.evalTaskId && isAdmin()) extra.push(...viewEvalModal());
  return extra;
}

function viewEvalModal() {
  const task = findTask(state.evalTaskId);
  if (!task || !["Review", "Revisions", "Done"].includes(task.status)) return [];
  const person = people().find((p) => p.name === task.who);
  const track = qualityTrack(person);
  const criteria = QUALITY_CRITERIA[track] || QUALITY_CRITERIA.other;
  const existing = ensureHr().reviews.find((r) => r.task_id === task.id);
  const delivery = scoreSelect(existing?.delivery);
  const revision = scoreSelect(existing?.revision_rating);
  const creativity = scoreSelect(existing?.creativity);
  const qualityInputs = criteria.map(([key, label]) => [key, label, scoreSelect(existing?.quality?.[key])]);
  const notes = $("textarea", {}, existing?.notes || "");
  const close = () => { state.evalTaskId = null; render(); };
  return [
    $("div", { class: "modal-bg", onclick: close }),
    $("section", { class: "modal wide" }, [
      $("p", { class: "muted" }, "Quality evaluation"),
      $("h2", {}, task.title),
      $("p", { class: "muted" }, `${task.who} · ${person?.role || track} · 5 publish-ready · 4 small edits · 3 meets the brief · 2 needs heavy work · 1 redo.`),
      $("form", {
        class: "form",
        onsubmit: (e) => {
          e.preventDefault();
          const quality = {};
          qualityInputs.forEach(([key, , input]) => { quality[key] = Number(input.value) || 0; });
          const quality_avg = avg(Object.values(quality).filter(Boolean));
          const row = {
            id: existing?.id || `ev-${task.id}`,
            task_id: task.id,
            who: task.who,
            role: track,
            month: (deliveryDate(task) || today()).slice(0, 7),
            quarter: currentQuarter(deliveryDate(task) || today()),
            delivery: Number(delivery.value) || 0,
            quality,
            quality_avg,
            revision_rating: Number(revision.value) || 0,
            revision_count: task.revisions || 0,
            creativity: Number(creativity.value) || 0,
            notes: notes.value.trim(),
            by: state.who,
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const hr = ensureHr();
          hr.reviews = hr.reviews.filter((r) => r.id !== row.id);
          hr.reviews.unshift(row);
          state.evalTaskId = null;
          render();
          saveHr(`hr: ${state.who} evaluated ${task.id}`);
        },
      }, [
        $("label", {}, ["Task delivery (on time and managed)", delivery]),
        $("p", { class: "muted" }, "5 on time and self-managed · 4 small rare delay · 3 needs some follow-up · 2 often late · 1 never finishes without chasing."),
        $("p", { class: "muted" }, "Quality by role"),
        ...qualityInputs.map(([, label, input]) => $("label", {}, [label, input])),
        $("label", {}, ["Revision handling", revision]),
        $("p", { class: "muted" }, "5 few natural edits · 4 small tweaks · 3 a normal amount · 2 many edits from a missed brief · 1 full redo."),
        $("label", {}, ["Creativity & initiative", creativity]),
        $("p", { class: "muted" }, "5 proposes new ideas · 4 sometimes improves · 3 does the brief only · 2 waits for instructions · 1 no initiative."),
        $("label", {}, ["Notes", notes]),
        $("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [
          $("button", { class: "btn primary", type: "submit" }, "Save evaluation"),
          task.status !== "Done"
            ? $("button", {
              class: "btn ghost",
              type: "button",
              onclick: () => {
                close();
                applyStatus(task.id, "Done");
              },
            }, "Mark done")
            : null,
          $("button", { class: "btn ghost", type: "button", onclick: close }, "Close"),
        ]),
      ]),
    ]),
  ];
}

function hrMembers() {
  return people().filter((p) => p.name !== "Amr");
}

function profileBar(label, value) {
  const n = Number(value) || 0;
  const pct = Math.max(0, Math.min(100, Math.round((n / 5) * 100)));
  return $("div", { class: "profile-bar" }, [
    $("span", {}, label),
    $("div", { class: "load-bar" }, $("span", { style: `width:${pct}%` })),
    $("strong", { class: scoreTone(n) }, formatScore(n)),
  ]);
}

function viewHr() {
  const month = state.hrMonth || today().slice(0, 7);
  const profile = state.hrTab === "profile";
  const roster = hrMembers();
  if (!state.hrPerson || !roster.some((p) => p.name === state.hrPerson)) {
    state.hrPerson = roster[0]?.name || "";
  }
  const tabs = [
    ["profile", "Profile"],
    ["scores", "Performance"],
    ["tasks", "Task tracking"],
    ["attitude", "Attitude"],
    ["warnings", "Warnings"],
    ["rewards", "Rewards"],
  ];
  const whoSel = $("select", {
    class: "date-select",
    onchange: (e) => { state.hrPerson = e.target.value; render(); },
  }, roster.map((p) => $("option", { value: p.name, selected: p.name === state.hrPerson }, p.name)));
  return $("div", { class: "dash" }, [
    $("div", { class: "hr-tabs" }, tabs.map(([id, label]) =>
      $("button", {
        class: state.hrTab === id ? "on" : "",
        onclick: () => { state.hrTab = id; render(); },
      }, label)
    )),
    $("div", { class: "cal-nav" }, profile
      ? [
        $("h2", {}, "Member"),
        whoSel,
      ]
      : [
        $("button", { class: "btn ghost", type: "button", onclick: () => { state.hrMonth = shiftYm(month, -1); render(); } }, "Prev"),
        $("h2", {}, monthLabel(month)),
        $("button", { class: "btn ghost", type: "button", onclick: () => { state.hrMonth = shiftYm(month, 1); render(); } }, "Next"),
      ]),
    state.hrTab === "profile" ? viewHrProfile()
      : state.hrTab === "tasks" ? viewHrTasks(month)
      : state.hrTab === "attitude" ? viewHrAttitude(month)
      : state.hrTab === "warnings" ? viewHrWarnings(month)
      : state.hrTab === "rewards" ? viewHrRewards(month)
      : viewHrScores(month),
  ]);
}

function viewHrProfile() {
  const name = state.hrPerson || hrMembers()[0]?.name;
  const person = people().find((p) => p.name === name);
  if (!person) return $("p", { class: "empty" }, "Choose a teammate.");
  const month = today().slice(0, 7);
  const lastMonth = shiftYm(month, -1);
  const work = workFor(name);
  const load = loadForPerson(name, month);
  const score = personScore(name, month);
  const weights = ensureHr().weights;
  const tasks = allTasks().filter((t) => t.who === name);
  const open = tasks.filter((t) => t.status !== "Done").sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  const doneMonth = tasks.filter((t) => t.status === "Done" && doneMonthOf(t) === month);
  const doneLast = tasks.filter((t) => t.status === "Done" && doneMonthOf(t) === lastMonth);
  const delivered = tasks.filter((t) => ["Review", "Revisions", "Done"].includes(t.status) && inMonth(deliveryDate(t) || t.done_on || t.due, month));
  const onTime = delivered.filter((t) => !isLateTask(t) || delayExcused(t)).length;
  const onTimePct = delivered.length ? `${Math.round((onTime / delivered.length) * 100)}%` : "—";
  const missingDrive = open.filter((t) => t.drive_missing);
  const revisions = tasks.reduce((n, t) => n + (Number(t.revisions) || 0), 0);
  const liveHours = open.filter((t) => t.status === "In progress").reduce((n, t) => n + loggedHours(t), 0);
  const friday = fridayStart(today());
  const attend = attendDaysFor(name, friday);
  const days = weekDates(friday);
  const officeDays = days.filter((d) => attend[d] === "Office").length;
  const homeDays = days.filter((d) => attend[d] === "Home").length;
  const offDays = days.filter((d) => attend[d] === "Off").length;
  const reports = (state.reportsFile?.reports || []).filter((r) => r.who === name);
  const reportsMonth = reports.filter((r) => (r.date || "").startsWith(month)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const lastReport = [...reports].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const warningsAll = ensureHr().warnings.filter((wrow) => wrow.who === name);
  const warningsMonth = warningsAll.filter((wrow) => (wrow.date || "").startsWith(month));
  const attitudeRow = ensureHr().attitude.find((a) => a.who === name && a.month === month);
  const reviews = reviewsFor(name, month);
  const taskRow = (t) => $("tr", { class: (t.due && t.due < today() && t.status !== "Done") || (isLateTask(t) && !delayExcused(t)) ? "tone-orange" : "" }, [
    $("td", {}, [$("strong", {}, t.title), t.project ? $("span", { class: "muted" }, ` ${t.project}`) : null]),
    $("td", {}, t.status),
    $("td", {}, t.due || "—"),
    $("td", {}, loggedHours(t) > 0 ? formatHours(loggedHours(t)) : (t.progress_hours ? formatHours(t.progress_hours) : "—")),
    $("td", {}, t.delay_reason || (t.due && t.due < today() && t.status !== "Done" ? "Late" : "—")),
    $("td", { class: t.drive_missing ? "tone-orange" : "" }, t.drive_missing ? "Missing" : (t.drive ? "Yes" : "—")),
    $("td", {}, $("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, [
      $("button", { class: "btn ghost", type: "button", onclick: () => { state.openTaskId = t.id; render(); } }, "Open"),
      t.status === "Review" || t.status === "Done"
        ? $("button", { class: "btn ghost", type: "button", onclick: () => { state.evalTaskId = t.id; render(); } }, "Evaluate")
        : null,
    ])),
  ]);
  const table = (rows, empty) => rows.length
    ? $("div", { class: "load-table-wrap" }, [
      $("table", { class: "load-table" }, [
        $("thead", {}, $("tr", {}, ["Task", "Status", "Due", "Time", "Delay", "Drive", ""].map((h) => $("th", {}, h)))),
        $("tbody", {}, rows.map(taskRow)),
      ]),
    ])
    : $("p", { class: "empty" }, empty);
  return $("div", { class: "dash" }, [
    $("section", { class: "card" }, [
      $("div", { class: "profile-head" }, [
        $("div", {}, [
          $("h2", {}, person.name),
          $("p", { class: "muted" }, `${person.role || ""}${person.home ? ` · ${person.home}` : ""}${person.email ? ` · ${person.email}` : ""}`),
          $("p", { class: "muted" }, `${work.type} · ${work.days} · ${work.hours} · ${work.mode}${work.office_days ? ` · Office ${work.office_days}` : ""}`),
        ]),
        $("span", { class: `pill ${loadTone(load)}` }, load.open >= 3 ? "Overloaded" : load.open === 0 ? "Clear" : "Active"),
      ]),
    ]),
    $("div", { class: "stat-row dense" }, [
      statBox(formatScore(score.total), `${monthLabel(month)} score`, scoreTone(score.total)),
      statBox(load.open, "Open now", load.open >= 3 ? "tone-red" : ""),
      statBox(load.overdue, "Overdue", load.overdue ? "tone-red" : ""),
      statBox(load.done, `Done ${monthLabel(month)}`, load.done ? "tone-green" : ""),
      statBox(onTimePct, "On time this month", delivered.length && onTime / delivered.length < 0.8 ? "tone-orange" : ""),
      statBox(warningsMonth.length, "Warnings this month", warningsMonth.length ? "tone-orange" : ""),
    ]),
    $("div", { class: "profile-grid" }, [
      $("section", { class: "card" }, [
        $("h3", {}, "Performance"),
        $("p", { class: "muted" }, `${monthLabel(month)} · Delivery ${weights.delivery}% · Quality ${weights.quality}% · Revisions ${weights.revisions}% · Creativity ${weights.creativity}%. Attitude is this month.`),
        profileBar("Delivery", score.delivery),
        profileBar("Quality", score.quality),
        profileBar("Revisions", score.revisions),
        profileBar("Creativity", score.creativity),
        profileBar("Attitude", score.attitude),
        $("p", { class: "muted", style: "margin-top:12px" }, `${reviews.length} task evaluation${reviews.length === 1 ? "" : "s"} this month.`),
      ]),
      $("section", { class: "card" }, [
        $("h3", {}, "Analytics"),
        $("p", { class: "muted" }, "Current load, delivery, time, files, attendance, and reports."),
        $("div", { class: "stat-row dense" }, [
          statBox(load.todo, "To do"),
          statBox(load.progress, "In progress"),
          statBox(load.review, "Review"),
          statBox(doneLast.length, `Done ${monthLabel(lastMonth).split(" ")[0]}`),
          statBox(liveHours > 0 ? formatHours(liveHours) : "—", "In progress now"),
          statBox(String(revisions), "Revisions logged"),
          statBox(missingDrive.length, "Missing Drive", missingDrive.length ? "tone-orange" : ""),
          statBox(`${officeDays} / ${homeDays} / ${offDays}`, "Office / home / off this week"),
          statBox(reportsMonth.length, `Reports · ${monthLabel(month).split(" ")[0]}`),
          statBox(warningsAll.length, "Warnings all time", warningsAll.length ? "tone-orange" : ""),
        ]),
      ]),
    ]),
    $("section", { class: "card" }, [
      $("h3", {}, "Now"),
      $("p", { class: "muted" }, "Open tasks assigned to this person."),
      table(open, "Nothing open right now."),
    ]),
    $("section", { class: "card" }, [
      $("h3", {}, `Done · ${monthLabel(month)}`),
      table(doneMonth, "No done tasks this month yet."),
    ]),
    $("div", { class: "profile-grid" }, [
      $("section", { class: "card" }, [
        $("h3", {}, "Attendance this week"),
        $("p", { class: "muted" }, `${friday} → ${days[6]} · ${attendSaved(name, friday) ? "Saved" : "Not saved yet"}.`),
        $("div", { class: "chip-row" }, days.map((date) => {
          const mode = attend[date] || "";
          return $("span", { class: `attend-chip ${attendChipClass(mode)}` }, `${cairoWeekday(date)} ${date.slice(8)} · ${mode || "—"}`);
        })),
      ]),
      $("section", { class: "card" }, [
        $("h3", {}, "Daily reports"),
        $("p", { class: "muted" }, lastReport ? `Last report ${lastReport.date}${lastReport.place ? ` · ${lastReport.place}` : ""}.` : "No reports yet."),
        reportsMonth.length
          ? $("div", { class: "load-table-wrap" }, [
            $("table", { class: "load-table" }, [
              $("thead", {}, $("tr", {}, ["Date", "Place", "Need review"].map((h) => $("th", {}, h)))),
              $("tbody", {}, reportsMonth.map((r) => $("tr", {}, [
                $("td", {}, r.date),
                $("td", {}, r.place || "—"),
                $("td", {}, r.need_review ? "Yes" : "No"),
              ]))),
            ]),
          ])
          : $("p", { class: "empty" }, "No reports this month."),
        reportsMonth.length
          ? $("p", { class: "muted", style: "margin-top:10px" }, `Office ${reportsMonth.filter((r) => r.place === "Office").length} · Remote ${reportsMonth.filter((r) => r.place === "Remote").length}.`)
          : null,
      ]),
    ]),
    $("div", { class: "profile-grid" }, [
      $("section", { class: "card" }, [
        $("h3", {}, `Attitude · ${monthLabel(month)}`),
        ...(attitudeRow
          ? ATTITUDE_CRITERIA.map(([key, label]) => profileBar(label, attitudeRow[key]))
          : [$("p", { class: "empty" }, "No attitude score this month yet.")]),
      ]),
      $("section", { class: "card" }, [
        $("h3", {}, "Warnings this month"),
        warningsMonth.length
          ? $("div", { class: "load-table-wrap" }, [
            $("table", { class: "load-table" }, [
              $("thead", {}, $("tr", {}, ["Date", "Issue", "Status"].map((h) => $("th", {}, h)))),
              $("tbody", {}, warningsMonth.map((wrow) => $("tr", {}, [
                $("td", {}, wrow.date),
                $("td", {}, wrow.issue),
                $("td", { class: wrow.status === "Note" ? "" : "tone-orange" }, wrow.status),
              ]))),
            ]),
          ])
          : $("p", { class: "empty" }, "No warnings this month."),
      ]),
    ]),
    $("section", { class: "card" }, [
      $("h3", {}, `Evaluations · ${monthLabel(month)}`),
      reviews.length
        ? $("div", { class: "load-table-wrap" }, [
          $("table", { class: "load-table" }, [
            $("thead", {}, $("tr", {}, ["Task", "Delivery", "Quality", "Revisions", "Creativity", "By"].map((h) => $("th", {}, h)))),
            $("tbody", {}, reviews.map((row) => {
              const task = findTask(row.task_id);
              return $("tr", {}, [
                $("td", {}, task?.title || row.task_id),
                $("td", { class: scoreTone(row.delivery) }, formatScore(row.delivery)),
                $("td", { class: scoreTone(row.quality_avg) }, formatScore(row.quality_avg)),
                $("td", { class: scoreTone(row.revision_rating) }, formatScore(row.revision_rating)),
                $("td", { class: scoreTone(row.creativity) }, formatScore(row.creativity)),
                $("td", {}, row.by || "—"),
              ]);
            })),
          ]),
        ])
        : $("p", { class: "empty" }, "No task evaluations this month yet."),
    ]),
  ]);
}

function viewHrScores(month) {
  const w = ensureHr().weights;
  const rows = people().filter((p) => p.name !== "Amr").map((p) => ({ ...p, ...personScore(p.name, month) }));
  const best = [...rows].sort((a, b) => b.total - a.total)[0];
  const late = allTasks().filter((t) => isLateTask(t) && !delayExcused(t) && inMonth(deliveryDate(t) || t.due, month));
  const missingDrive = allTasks().filter((t) => t.drive_missing && t.status !== "To do" && inMonth(t.due || assignedDate(t), month));
  return $("div", { class: "dash" }, [
    $("p", { class: "muted" }, `${monthLabel(month)} · Delivery ${w.delivery}% · Quality ${w.quality}% · Revisions ${w.revisions}% · Creativity ${w.creativity}%. Attitude is scored separately this month.`),
    $("div", { class: "stat-row" }, [
      statBox(rows.filter((r) => r.total >= 4).length, "On track (4+)"),
      statBox(late.length, "Late without a clear blocker", late.length ? "tone-orange" : ""),
      statBox(missingDrive.length, "Missing Drive files", missingDrive.length ? "tone-orange" : ""),
      statBox(best?.total ? `${best.name} ${formatScore(best.total)}` : "—", "Highest score", "tone-green"),
    ]),
    $("section", { class: "card" }, [
      $("div", { class: "load-table-wrap" }, [
        $("table", { class: "load-table" }, [
          $("thead", {}, $("tr", {}, [
            "Name",
            `Delivery ${w.delivery}%`,
            `Quality ${w.quality}%`,
            `Revisions ${w.revisions}%`,
            `Creativity ${w.creativity}%`,
            "Score",
            "Attitude",
          ].map((h) => $("th", {}, h)))),
          $("tbody", {}, rows.map((r) =>
            $("tr", {}, [
              $("td", {}, [$("strong", {}, r.name), $("span", { class: "muted" }, ` ${r.role || ""}`)]),
              $("td", { class: scoreTone(r.delivery) }, formatScore(r.delivery)),
              $("td", { class: scoreTone(r.quality) }, formatScore(r.quality)),
              $("td", { class: scoreTone(r.revisions) }, formatScore(r.revisions)),
              $("td", { class: scoreTone(r.creativity) }, formatScore(r.creativity)),
              $("td", { class: scoreTone(r.total) }, $("strong", {}, formatScore(r.total))),
              $("td", { class: scoreTone(r.attitude) }, formatScore(r.attitude)),
            ])
          )),
        ]),
      ]),
    ]),
  ]);
}

function viewHrTasks(month) {
  const tasks = [...allTasks()]
    .filter((t) => t.status === "Review" || t.status === "Done")
    .filter((t) => taskMonth(t) === month)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  return $("section", { class: "card" }, [
    $("p", { class: "muted" }, `${monthLabel(month)} · only Review and Done this month. Score delivery and quality here.`),
    $("div", { class: "load-table-wrap" }, [
      $("table", { class: "load-table" }, [
        $("thead", {}, $("tr", {}, ["Task", "Employee", "Assigned", "Start", "Deadline", "Delivery", "Status", "Delay", "Days", "Notice", "Drive", ""].map((h) => $("th", {}, h)))),
        $("tbody", {}, tasks.length ? tasks.map((t) =>
          $("tr", { class: isLateTask(t) && !delayExcused(t) ? "tone-orange" : "" }, [
            $("td", {}, [$("strong", {}, t.title), t.project ? $("span", { class: "muted" }, ` ${t.project}`) : null]),
            $("td", {}, t.who),
            $("td", {}, assignedDate(t) || "—"),
            $("td", {}, startDate(t) || "—"),
            $("td", {}, t.due || "—"),
            $("td", {}, deliveryDate(t) || "—"),
            $("td", {}, t.status),
            $("td", {}, t.delay_reason || (isLateTask(t) ? "Late" : "—")),
            $("td", {}, delayDays(t) ? String(delayDays(t)) : "—"),
            $("td", {}, t.delay_notified ? "Yes" : (isLateTask(t) ? "No" : "—")),
            $("td", { class: t.drive_missing ? "tone-orange" : "" }, t.drive_missing ? "Missing" : (t.drive ? "Yes" : "—")),
            $("td", {}, $("button", {
              class: "btn ghost",
              type: "button",
              onclick: () => { state.evalTaskId = t.id; render(); },
            }, "Evaluate")),
          ])
        ) : $("tr", {}, $("td", { colspan: "12" }, "No Review or Done tasks this month."))),
      ]),
    ]),
  ]);
}

function viewHrAttitude(month) {
  const who = $("select", {}, people().filter((p) => p.name !== "Amr").map((p) => $("option", { value: p.name }, p.name)));
  const inputs = ATTITUDE_CRITERIA.map(([key, label]) => [key, label, scoreSelect()]);
  const notes = $("textarea", { placeholder: "Optional note" });
  const rows = ensureHr().attitude.filter((a) => a.month === month);
  return $("div", { class: "dash" }, [
    $("section", { class: "card", style: "max-width:640px" }, [
      $("h2", {}, "Attitude & collaboration"),
      $("p", { class: "muted" }, "Scored each month, separate from task scores. Communication, teamwork, responsibility, respect, feedback, problem solving."),
      $("form", {
        class: "form",
        onsubmit: (e) => {
          e.preventDefault();
          const row = {
            id: `at-${who.value}-${month}`,
            who: who.value,
            month,
            notes: notes.value.trim(),
            by: state.who,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          inputs.forEach(([key, , input]) => { row[key] = Number(input.value) || 0; });
          const hr = ensureHr();
          hr.attitude = hr.attitude.filter((a) => a.id !== row.id);
          hr.attitude.unshift(row);
          render();
          saveHr(`hr: ${state.who} scored attitude for ${who.value} ${month}`);
        },
      }, [
        $("label", {}, ["Employee", who]),
        ...inputs.map(([, label, input]) => $("label", {}, [label, input])),
        $("label", {}, ["Notes", notes]),
        $("button", { class: "btn primary", type: "submit" }, `Save · ${monthLabel(month)}`),
      ]),
    ]),
    $("section", { class: "card" }, [
      $("h2", {}, monthLabel(month)),
      rows.length
        ? $("div", { class: "load-table-wrap" }, [
          $("table", { class: "load-table" }, [
            $("thead", {}, $("tr", {}, ["Name", "Month", ...ATTITUDE_CRITERIA.map(([, l]) => l), "By"].map((h) => $("th", {}, h)))),
            $("tbody", {}, rows.map((a) =>
              $("tr", {}, [
                $("td", {}, a.who),
                $("td", {}, a.month),
                ...ATTITUDE_CRITERIA.map(([k]) => $("td", { class: scoreTone(a[k]) }, String(a[k] || "—"))),
                $("td", {}, a.by || "—"),
              ])
            )),
          ]),
        ])
        : $("p", { class: "empty" }, "No attitude scores this month yet."),
    ]),
  ]);
}

function viewHrWarnings(month) {
  const who = $("select", {}, people().filter((p) => p.name !== "Amr").map((p) => $("option", { value: p.name }, p.name)));
  const date = $("input", { type: "date", value: today().startsWith(month) ? today() : `${month}-01` });
  const issue = $("select", {}, WARNING_ISSUES.map((s) => $("option", { value: s }, s)));
  const detail = $("input", { placeholder: "Optional detail" });
  const status = $("select", {}, WARNING_STATUSES.map((s) => $("option", { value: s }, s)));
  const rows = [...(ensureHr().warnings || [])]
    .filter((w) => (w.date || "").startsWith(month))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return $("div", { class: "dash" }, [
    $("section", { class: "card", style: "max-width:640px" }, [
      $("h2", {}, "Attendance & process"),
      $("p", { class: "muted" }, "Logged each month. First time: feedback. Repeat: formal warning. After that: deduction policy (added later)."),
      $("form", {
        class: "form",
        onsubmit: (e) => {
          e.preventDefault();
          ensureHr().warnings.unshift({
            id: `w-${Date.now().toString(36)}`,
            who: who.value,
            date: date.value,
            issue: detail.value.trim() ? `${issue.value} — ${detail.value.trim()}` : issue.value,
            status: status.value,
            by: state.who,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          detail.value = "";
          render();
          saveHr(`hr: ${state.who} logged warning for ${who.value}`);
        },
      }, [
        $("label", {}, ["Employee", who]),
        $("label", {}, ["Date", date]),
        $("label", {}, ["Issue", issue]),
        $("label", {}, ["Detail", detail]),
        $("label", {}, ["Status", status]),
        $("button", { class: "btn primary", type: "submit" }, "Add record"),
      ]),
    ]),
    $("section", { class: "card" }, [
      $("h2", {}, monthLabel(month)),
      $("div", { class: "load-table-wrap" }, [
        $("table", { class: "load-table" }, [
          $("thead", {}, $("tr", {}, ["Employee", "Date", "Issue", "Status", "By"].map((h) => $("th", {}, h)))),
          $("tbody", {}, rows.length ? rows.map((w) =>
            $("tr", {}, [
              $("td", {}, w.who),
              $("td", {}, w.date),
              $("td", {}, w.issue),
              $("td", { class: w.status === "Note" ? "" : "tone-orange" }, w.status),
              $("td", {}, w.by || "—"),
            ])
          ) : $("tr", {}, $("td", { colspan: "5" }, "No warnings this month yet."))),
        ]),
      ]),
    ]),
  ]);
}

function viewHrRewards(month) {
  const m = month || today().slice(0, 7);
  const rows = people().filter((p) => p.name !== "Amr").map((p) => personScore(p.name, m)).sort((a, b) => b.total - a.total);
  const lead = rows.find((r) => r.total > 0);
  return $("section", { class: "card" }, [
    $("h2", {}, "Rewards — later"),
    $("p", { class: "muted" }, "Monthly scores will feed bonus and Best Employee later. Deductions stay off until Tasneem confirms the policy."),
    lead
      ? $("p", {}, `Current lead for ${monthLabel(m)}: ${lead.name} · ${formatScore(lead.total)}`)
      : $("p", { class: "empty" }, "No scores yet this month."),
  ]);
}

function myHrCard() {
  const score = personScore(state.who, today().slice(0, 7));
  return $("section", { class: "card" }, [
    $("h2", {}, "Your performance"),
    $("p", { class: "muted" }, `${monthLabel(score.month)} · Attitude is separate from this score.`),
    $("div", { class: "stat-row" }, [
      statBox(formatScore(score.total), "Score", scoreTone(score.total)),
      statBox(formatScore(score.quality), "Quality", scoreTone(score.quality)),
      statBox(formatScore(score.delivery), "Delivery", scoreTone(score.delivery)),
      statBox(formatScore(score.attitude), "Attitude", scoreTone(score.attitude)),
    ]),
  ]);
}

function viewMy() {
  const open = tasksForView().filter((t) => t.status !== "Done");
  const month = thisMonth();
  const finished = allTasks().filter((t) => t.who === state.who && t.status === "Done" && doneMonthOf(t) === month);
  return [
    isAdmin() ? null : myHrCard(),
    $("div", { class: "stat-row" }, [
      statBox(open.length, "Open now"),
      statBox(open.filter((t) => t.status === "Review").length, "In review", "tone-orange"),
      statBox(open.filter((t) => t.status === "Revisions").length, "Edits required", "tone-orange"),
      statBox(finished.length, "Done this month", "tone-green"),
    ]),
    $("h2", {}, "Open"),
    open.length
      ? $("div", { class: "cards", style: "margin-top:14px" }, open.map((task) =>
        $("article", { class: `card ${taskTone(task)}`, onclick: () => { state.openTaskId = task.id; render(); } }, [
          $("p", { class: "title" }, task.title),
          $("div", { class: "meta" }, [
            $("span", { class: `pill ${taskTone(task)}` }, task.status),
            $("span", { class: "pill" }, `Due ${task.due}`),
            loggedHours(task) > 0 ? $("span", { class: `pill ${taskTone(task)}` }, formatHours(loggedHours(task))) : null,
          ]),
        ])
      ))
      : $("p", { class: "empty" }, "Nothing open right now."),
    $("section", { class: "done-section" }, [
      $("h2", {}, "Done"),
      $("p", { class: "muted" }, "When Amr or Tasneem check a task done, it stays here for the month and in the GitHub database."),
      finished.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, finished.map((task) => doneCard(task, { checked: true })))
        : $("p", { class: "empty" }, "No done tasks this month yet."),
    ]),
  ];
}

function statBox(value, label, tone) {
  return $("div", { class: `stat ${tone || ""}` }, [$("strong", {}, String(value)), $("span", { class: "muted" }, label)]);
}

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: CAIRO });
}

function shiftYm(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calendarDays(ym, selected, onPick, counts) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const pad = (first.getDay() + 6) % 7;
  const last = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < pad; i += 1) cells.push($("div", { class: "due-day pad" }));
  for (let day = 1; day <= last; day += 1) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const n = counts?.[date] || 0;
    cells.push($("button", {
      type: "button",
      class: `due-day${date === selected ? " on" : ""}${n ? " has" : ""}`,
      onclick: () => onPick(date),
    }, String(day)));
  }
  return cells;
}

function dueCalendar() {
  const ym = state.dueMonth || today().slice(0, 7);
  const picker = $("input", { type: "date", value: state.dueDraft || today(), class: "date-input" });
  picker.addEventListener("change", () => {
    if (!picker.value) return;
    state.dueDraft = picker.value;
    state.dueMonth = picker.value.slice(0, 7);
    render();
  });
  return $("div", { class: "due-box" }, [
    picker,
    $("div", { class: "due-nav" }, [
      $("button", { class: "btn ghost", type: "button", onclick: () => { state.dueMonth = shiftYm(ym, -1); render(); } }, "Prev"),
      $("strong", {}, monthLabel(ym)),
      $("button", { class: "btn ghost", type: "button", onclick: () => { state.dueMonth = shiftYm(ym, 1); render(); } }, "Next"),
    ]),
    $("div", { class: "due-week cal-week" }, WEEKDAYS.map((d) => $("span", {}, d))),
    $("div", { class: "due-grid" }, calendarDays(ym, state.dueDraft, (date) => {
      state.dueDraft = date;
      state.dueMonth = date.slice(0, 7);
      render();
    })),
    $("p", { class: "muted", style: "margin:10px 0 0" }, `Selected due date: ${state.dueDraft}`),
  ]);
}

function createForm(onDone) {
  if (!state.draft) {
    state.draft = { who: canAssignTasks() ? "" : state.who, space: "Social", project: "", title: "", notes: "", drive: "" };
  }
  const d = state.draft;
  if (!canAssignTasks()) d.who = state.who;
  const assignees = canAssignTasks()
    ? people().filter((p) => p.name !== "Amr")
    : people().filter((p) => p.name === state.who);
  const who = $("select", { disabled: !canAssignTasks(), required: true }, [
    canAssignTasks() ? $("option", { value: "", selected: !d.who }, "Choose teammate") : null,
    ...assignees.map((p) => $("option", { value: p.name, selected: p.name === d.who }, p.name)),
  ]);
  const space = $("select", {}, SPACES.map((s) => $("option", { value: s, selected: s === d.space }, s)));
  const project = $("select", {}, [
    $("option", { value: "", selected: !d.project }, "No client"),
    ...projectList().map((p) => $("option", { value: p.name, selected: p.name === d.project }, p.name)),
  ]);
  const title = $("input", { required: true, placeholder: "Task title", value: d.title || "" });
  const notes = $("textarea", { placeholder: "Brief, references, what done looks like" }, d.notes || "");
  const drive = $("input", { type: "url", placeholder: "Drive folder (fills from client)", value: d.drive || "" });
  const keep = () => {
    state.draft = {
      who: who.value,
      space: space.value,
      project: project.value,
      title: title.value,
      notes: notes.value,
      drive: drive.value,
    };
  };
  who.addEventListener("change", keep);
  space.addEventListener("change", keep);
  project.addEventListener("change", () => {
    keep();
    if (!drive.value) drive.value = driveForProject(project.value);
  });
  title.addEventListener("input", keep);
  notes.addEventListener("input", keep);
  drive.addEventListener("input", keep);
  return $("form", {
    class: "form",
    onsubmit: (e) => {
      e.preventDefault();
      assignTask({
        who: who.value,
        space: space.value,
        project: project.value,
        title: title.value.trim(),
        notes: notes.value.trim(),
        due: state.dueDraft || today(),
        drive: drive.value.trim() || driveForProject(project.value),
        status: state.createStatus || "To do",
      });
      if (onDone) onDone();
    },
  }, [
    $("label", {}, ["Assign to", who]),
    $("label", {}, ["Client / folder", project]),
    $("label", {}, ["Space", space]),
    $("label", {}, ["Task", title]),
    $("label", {}, ["Notes", notes]),
    $("div", {}, [
      $("p", { class: "muted", style: "margin:0 0 6px;font-size:12px;letter-spacing:0.04em;font-weight:500" }, "Due date"),
      dueCalendar(),
    ]),
    $("label", {}, ["Drive link", drive]),
    $("div", { style: "display:flex;gap:8px" }, [
      $("button", { class: "btn primary", type: "submit" }, "Create task"),
      $("button", {
        class: "btn ghost",
        type: "button",
        onclick: () => {
          state.creating = false;
          state.draft = null;
          render();
        },
      }, "Cancel"),
    ]),
  ]);
}

function viewCreateModal() {
  if (!state.creating || !canAssignTasks()) return null;
  const close = () => { state.creating = false; state.draft = null; render(); };
  return [
    $("div", { class: "modal-bg", onclick: close }),
    $("section", { class: "modal" }, [
      $("p", { class: "muted" }, "New task"),
      $("h2", {}, "Create and assign"),
      $("p", { class: "muted" }, "Fill the full brief, pick a due date from the calendar, then create."),
      createForm(close),
    ]),
  ];
}

function viewTaskDrawer() {
  const task = findTask(state.openTaskId);
  if (!task) return null;
  const editable = canEditDetails(task);
  const who = $("select", { disabled: !editable }, people().map((p) => $("option", { value: p.name, selected: p.name === task.who }, p.name)));
  const space = $("select", { disabled: !editable }, SPACES.map((s) => $("option", { value: s, selected: s === task.space }, s)));
  const project = $("select", { disabled: !editable }, [
    $("option", { value: "" }, "No client"),
    ...projectList().map((p) => $("option", { value: p.name, selected: p.name === task.project }, p.name)),
  ]);
  const title = $("input", { value: task.title, required: true, disabled: !editable });
  const notes = $("textarea", { disabled: !editable }, task.notes || "");
  const drive = $("input", { type: "url", value: task.drive || "", disabled: !editable });
  const close = () => { state.openTaskId = null; render(); };
  const hours = loggedHours(task);
  return [
    $("div", { class: "modal-bg", onclick: close }),
    $("aside", { class: "drawer" }, [
      $("p", { class: "muted" }, "Task"),
      $("h2", {}, task.title),
      $("p", { class: "muted" }, editable
        ? `Created by ${task.created_by || "Helal"}. You can edit the brief.`
        : `Only ${task.created_by || "the creator"} can edit the brief. You can still move status.`),
      hours > 0 ? $("p", { class: "time-line" }, `Time in progress: ${formatHours(hours)}`) : null,
      $("div", { class: "track-grid" }, [
        $("span", {}, `Assigned ${assignedDate(task) || "—"}`),
        $("span", {}, `Start ${startDate(task) || "—"}`),
        $("span", {}, `Deadline ${task.due || "—"}`),
        $("span", {}, `Delivery ${deliveryDate(task) || "—"}`),
        task.delay_reason ? $("span", {}, `Delay · ${task.delay_reason}`) : null,
        (task.revisions || 0) > 0 ? $("span", {}, `Revisions ${task.revisions}${task.revision_log?.length ? ` · ${task.revision_log[task.revision_log.length - 1].level}` : ""}`) : null,
      ]),
      $("form", {
        class: "form",
        onsubmit: (e) => {
          e.preventDefault();
          if (!editable) {
            close();
            return;
          }
          task.who = who.value;
          task.space = space.value;
          task.project = project.value;
          task.title = title.value.trim();
          task.notes = notes.value.trim();
          task.drive = drive.value.trim() || driveForProject(project.value);
          task.drive_missing = !task.drive;
          task.updated_at = new Date().toISOString();
          task.updated_by = state.who;
          state.openTaskId = null;
          render();
          saveTasks(`board: ${state.who} edited ${task.id}`);
        },
      }, [
        $("label", {}, ["Title", title]),
        $("label", {}, ["Assign to", who]),
        $("label", {}, ["Client / folder", project]),
        $("label", {}, ["Space", space]),
        $("label", {}, ["Notes", notes]),
        $("label", {}, ["Drive link", drive]),
        task.drive ? $("a", { href: task.drive, target: "_blank", rel: "noreferrer" }, "Open Drive folder") : null,
        $("div", { class: "statuses" },
          BOARD_STATUSES.map((s) =>
            $("button", {
              type: "button",
              class: s === task.status ? "on" : "",
              disabled: !canSetStatus(s),
              onclick: () => { if (canSetStatus(s)) setStatus(task.id, s); },
            }, s)
          )
        ),
        isAdmin() && (task.status === "Review" || task.status === "Revisions")
          ? $("div", { style: "display:grid;gap:8px;margin-top:8px" }, [
            $("label", { class: "done-check" }, [
              $("input", {
                type: "checkbox",
                onchange: () => {
                  setStatus(task.id, "Done");
                  state.openTaskId = null;
                },
              }),
              "Mark done — stays on the board Done column and in the database",
            ]),
            $("button", {
              class: "btn ghost",
              type: "button",
              onclick: () => { state.evalTaskId = task.id; render(); },
            }, "Evaluate quality"),
          ])
          : null,
        $("div", { style: "display:flex;gap:8px" }, [
          editable ? $("button", { class: "btn primary", type: "submit" }, "Save") : null,
          $("button", { class: "btn ghost", type: "button", onclick: close }, "Close"),
        ]),
      ]),
    ]),
  ];
}

function qaBlock(question, answer) {
  return $("div", { class: "qa-pair" }, [
    $("p", { class: "qa-k" }, "Question"),
    $("p", { class: "qa-q" }, question),
    $("p", { class: "qa-k" }, "Answer"),
    $("div", { class: "qa-a" }, answer || "—"),
  ]);
}

function reportDaySummary(day) {
  const dayReports = (state.reportsFile?.reports || []).filter((r) => r.date === day);
  const submittedNames = [...new Set(dayReports.map((r) => r.who))];
  const missing = people().filter((p) => !submittedNames.includes(p.name));
  const chip = (name, tone) => $("span", { class: `name-chip ${tone}` }, name);
  const office = dayReports.filter((r) => r.place === "Office").map((r) => r.who);
  const remote = dayReports.filter((r) => r.place === "Remote").map((r) => r.who);
  return $("div", { class: "report-summary" }, [
    $("article", { class: "card" }, [
      $("h3", {}, "Submitted"),
      $("p", { class: "muted" }, `${submittedNames.length} of ${people().length}`),
      submittedNames.length
        ? $("div", { class: "chip-row" }, submittedNames.map((name) => chip(name, "tone-green")))
        : $("p", { class: "empty" }, "Nobody has submitted yet."),
      office.length || remote.length
        ? $("p", { class: "muted", style: "margin-top:10px" }, [
          office.length ? `Office: ${office.join(", ")}. ` : "",
          remote.length ? `Remote: ${remote.join(", ")}.` : "",
        ].join(""))
        : null,
    ]),
    $("article", { class: "card" }, [
      $("h3", {}, "Not yet"),
      $("p", { class: "muted" }, `${missing.length} missing`),
      missing.length
        ? $("div", { class: "chip-row" }, missing.map((p) => chip(p.name, "tone-orange")))
        : $("p", { class: "empty" }, "Everyone submitted."),
    ]),
  ]);
}

function reportCard(r) {
  return $("article", { class: "card report-card" }, [
    $("p", { class: "title" }, `${r.who} · ${r.date}`),
    qaBlock("What did you finish today?", r.finished),
    qaBlock("What is unfinished or blocking you?", r.unfinished),
    qaBlock("Drive links", r.drive
      ? $("a", { href: r.drive, target: "_blank", rel: "noreferrer" }, r.drive)
      : "—"),
    qaBlock("Were you remote or in the office today?", r.place || "—"),
    qaBlock("Do you need review?", r.need_review ? "Yes" : "No"),
  ]);
}

function viewCalendar() {
  const ym = state.calMonth || today().slice(0, 7);
  const counts = {};
  for (const r of state.reportsFile?.reports || []) counts[r.date] = (counts[r.date] || 0) + 1;
  for (const t of allTasks()) {
    if (t.status === "Done" && t.done_on) counts[t.done_on] = (counts[t.done_on] || 0) + 1;
  }
  return $("section", { class: "card cal-wrap" }, [
    $("div", { class: "cal-nav" }, [
      $("button", { class: "btn ghost", type: "button", onclick: () => { state.calMonth = shiftYm(ym, -1); render(); } }, "Prev"),
      $("h2", {}, monthLabel(ym)),
      $("button", { class: "btn ghost", type: "button", onclick: () => { state.calMonth = shiftYm(ym, 1); render(); } }, "Next"),
    ]),
    $("div", { class: "cal-week" }, WEEKDAYS.map((d) => $("span", {}, d))),
    $("div", { class: "cal-grid" }, calendarDays(ym, state.reportDay, (date) => {
      state.reportDay = date;
      render();
    }, counts).map((el) => {
      el.className = el.className.replace("due-day", "cal-day");
      return el;
    })),
  ]);
}

function viewReview() {
  const waiting = allTasks().filter((t) => t.status === "Review" || t.status === "Revisions");
  const day = state.reportDay || today();
  const month = day.slice(0, 7);
  const doneDay = allTasks().filter((t) => t.status === "Done" && t.done_on === day);
  const doneMonth = allTasks().filter((t) => t.status === "Done" && doneMonthOf(t) === month);
  const allReports = [...(state.reportsFile?.reports || [])].sort(
    (a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)
  );
  const dayReports = allReports.filter((r) => r.date === day);
  return $("div", { class: "dash" }, [
    viewCalendar(),
    $("section", {}, [
      $("h2", {}, `Reports · ${day}`),
      $("p", { class: "muted" }, "Every saved report is kept. Pick a day, or read the latest submissions below."),
      reportDaySummary(day),
      dayReports.length
        ? $("div", { class: "cards", style: "margin-top:18px" }, dayReports.map(reportCard))
        : $("p", { class: "empty" }, "No report submissions on this day yet."),
    ]),
    $("section", {}, [
      $("h2", {}, "All saved reports"),
      $("p", { class: "muted" }, allReports.length
        ? `${allReports.length} saved. Newest first. Nothing is dropped after submit.`
        : "New reports appear here as soon as someone submits."),
      allReports.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, allReports.map(reportCard))
        : $("p", { class: "empty" }, "No reports saved yet."),
    ]),
    $("section", {}, [
      $("h2", {}, "Attendance requests"),
      $("p", { class: "muted" }, "Day-change requests from the team. Approve or decline on Attendance, or here."),
      pendingAttendRequests().length
        ? $("div", { class: "cards", style: "margin-top:14px" }, pendingAttendRequests().map((req) =>
          $("article", { class: "card review-card" }, [
            $("p", { class: "title" }, `${req.who} · ${req.date}`),
            $("div", { class: "meta" }, [
              $("span", { class: "pill" }, `${req.from || "—"} → ${req.to}`),
              $("span", { class: "pill" }, `Week ${req.friday}`),
            ]),
            req.reason ? $("p", {}, req.reason) : null,
            $("div", { style: "display:flex;gap:8px" }, [
              $("button", { class: "btn primary", type: "button", onclick: () => decideAttendRequest(req.id, "Approved") }, "Approve"),
              $("button", { class: "btn ghost", type: "button", onclick: () => decideAttendRequest(req.id, "Declined") }, "Decline"),
            ]),
          ])
        ))
        : $("p", { class: "empty" }, "No pending attendance requests."),
    ]),
    $("section", {}, [
      $("h2", {}, "Waiting on review"),
      $("p", { class: "muted" }, "When a member moves a task to Review, it lands here. Check it done. It stays in Done on the board, here, and on My work."),
      waiting.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, waiting.map((t) =>
          $("article", { class: `card review-card ${taskTone(t)}` }, [
            $("p", { class: "title" }, t.title),
            $("div", { class: "meta" }, [
              $("span", { class: "pill" }, t.who),
              $("span", { class: `pill ${taskTone(t)}` }, t.status),
              $("span", { class: "pill" }, `Due ${t.due}`),
              loggedHours(t) > 0 ? $("span", { class: `pill ${taskTone(t)}` }, formatHours(loggedHours(t))) : null,
            ]),
            t.drive ? $("a", { href: t.drive, target: "_blank", rel: "noreferrer" }, "Open Drive") : null,
            $("div", { style: "display:flex;gap:8px;flex-wrap:wrap;align-items:center" }, [
              $("label", { class: "done-check" }, [
                $("input", {
                  type: "checkbox",
                  onchange: () => setStatus(t.id, "Done"),
                }),
                "Mark done",
              ]),
              $("button", {
                class: "btn ghost",
                type: "button",
                onclick: () => { state.evalTaskId = t.id; render(); },
              }, "Evaluate"),
            ]),
          ])
        ))
        : $("p", { class: "empty" }, "Nothing in Review or Revisions."),
    ]),
    $("section", { class: "done-section" }, [
      $("h2", {}, `Done · ${day}`),
      $("p", { class: "muted" }, "Checked work stays here and on the member’s Done list. It is stored in helal/daily-tasks.json on GitHub."),
      doneDay.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, doneDay.map((t) => doneCard(t, { checked: true })))
        : $("p", { class: "empty" }, "No tasks marked done on this day."),
    ]),
    $("section", { class: "done-section" }, [
      $("h2", {}, `Done this month · ${monthLabel(month)}`),
      doneMonth.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, doneMonth.map((t) => doneCard(t, { checked: true })))
        : $("p", { class: "empty" }, "No done tasks stored this month yet."),
    ]),
  ]);
}

function viewReport() {
  const finished = $("textarea", { required: true, placeholder: "Your answer" });
  const unfinished = $("textarea", { placeholder: "Your answer" });
  const drive = $("input", { type: "url", placeholder: "https://" });
  const need = $("input", { type: "checkbox" });
  const remote = $("input", { type: "radio", name: "report-place", value: "Remote", required: true });
  const office = $("input", { type: "radio", name: "report-place", value: "Office", required: true });
  return $("section", { class: "card", style: "max-width:640px" }, [
    $("h2", {}, "Daily report"),
    $("p", { class: "muted" }, `Cairo date ${today()}. Admins read this as question and answer on the dashboard.`),
    $("form", {
      class: "form",
      style: "margin-top:16px",
      onsubmit: (e) => {
        e.preventDefault();
        const place = remote.checked ? "Remote" : office.checked ? "Office" : "";
        submitReport({
          date: today(),
          finished: finished.value.trim(),
          unfinished: unfinished.value.trim(),
          drive: drive.value.trim(),
          need_review: need.checked,
          place,
        });
        finished.value = "";
        unfinished.value = "";
        drive.value = "";
        need.checked = false;
        remote.checked = false;
        office.checked = false;
      },
    }, [
      $("label", {}, [
        "Were you remote or in the office today?",
        $("div", { class: "place-picks" }, [
          $("label", { class: "place-pick" }, [remote, "Remote"]),
          $("label", { class: "place-pick" }, [office, "Office"]),
        ]),
      ]),
      $("label", {}, ["What did you finish today?", finished]),
      $("label", {}, ["What is unfinished or blocking you?", unfinished]),
      $("label", {}, ["Drive links", drive]),
      $("label", { style: "grid-template-columns: auto 1fr; align-items: center; letter-spacing: 0" }, [
        need,
        "I need review",
      ]),
      $("button", { class: "btn primary", type: "submit" }, "Submit report"),
    ]),
  ]);
}

function viewDrive() {
  const folders = (state.drive?.folders || []).filter((f) => !f.hidden && f.id !== "root");
  const clients = folders.filter((f) => f.section === "clients" || f.who === "Client");
  const helal = folders.filter((f) => f.section === "helal");
  const card = (f) =>
    $("article", { class: "card" }, [
      $("p", { class: "title" }, f.name),
      $("p", { class: "muted" }, f.who),
      f.url ? $("a", { href: f.url, target: "_blank", rel: "noreferrer" }, "Open folder") : $("p", {}, "Link missing."),
    ]);
  const root = rootDrive();
  return $("div", {}, [
    $("p", { class: "muted" }, "Upload into the matching folder. Files stay in Drive."),
    root ? $("p", {}, $("a", { href: root, target: "_blank", rel: "noreferrer" }, "Open HELAL CONTENT MARKETING")) : null,
    $("h2", { style: "margin:16px 0 10px" }, "CLINTES"),
    $("div", { class: "people" }, clients.map(card)),
    $("h2", { style: "margin:22px 0 10px" }, "HELAL"),
    $("div", { class: "people" }, helal.map(card)),
  ]);
}

function viewPeople() {
  const name = $("input", { required: true, placeholder: "Full name" });
  const role = $("input", { required: true, placeholder: "Role, e.g. Graphic designer" });
  const home = $("select", {}, TEAM_HOMES.map((h) => $("option", { value: h }, h)));
  const access = $("select", {}, [
    $("option", { value: "member", selected: true }, "Member"),
    $("option", { value: "admin" }, "Admin"),
  ]);
  const pin = $("input", { placeholder: "Leave blank to generate" });
  const roster = allPeople();
  return $("div", { class: "dash" }, [
    $("section", { class: "card", style: "max-width:640px" }, [
      $("h2", {}, "Add a person"),
      $("p", { class: "muted" }, "Creates a login with its own password. Share that password with them. Deactivate if they leave."),
      $("form", {
        class: "form",
        onsubmit: (e) => {
          e.preventDefault();
          addPerson({
            name: name.value.trim(),
            role: role.value.trim(),
            home: home.value,
            access: access.value,
            pin: pin.value.trim(),
          });
          name.value = "";
          role.value = "";
          pin.value = "";
        },
      }, [
        $("label", {}, ["Name", name]),
        $("label", {}, ["Role", role]),
        $("label", {}, ["Team", home]),
        $("label", {}, ["Access", access]),
        $("label", {}, ["Password", pin]),
        $("button", { class: "btn primary", type: "submit" }, "Create login"),
      ]),
    ]),
    $("div", { class: "people" }, roster.map((p) => {
      const isOwner = p.name === "Amr";
      const pinValue = pinFor(p.name) || "";
      const pinBox = $("input", { value: pinValue, readOnly: true });
      return $("article", { class: "card" }, [
        $("p", { class: "title" }, p.name),
        $("p", { class: "muted" }, p.role),
        p.email ? $("p", {}, p.email) : null,
        $("p", { class: "muted" }, `${workFor(p.name).type} · ${workFor(p.name).days} · ${workFor(p.name).hours} · ${workFor(p.name).mode}`),
        $("div", { class: "meta" }, [
          $("span", { class: "pill" }, p.access || "member"),
          p.active === false ? $("span", { class: "pill tone-orange" }, "Deactivated") : $("span", { class: "pill tone-green" }, "Active"),
        ]),
        $("label", {}, ["Password", pinBox]),
        $("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px" }, [
          $("button", {
            class: "btn ghost",
            type: "button",
            onclick: () => resetPersonPin(p.name),
          }, "New password"),
          isOwner
            ? null
            : $("button", {
              class: "btn ghost",
              type: "button",
              onclick: () => setPersonActive(p.name, p.active === false),
            }, p.active === false ? "Reactivate" : "Deactivate"),
        ]),
      ]);
    })),
  ]);
}

function addPerson(fields) {
  const name = fields.name;
  if (!name) return;
  if (allPeople().some((p) => samePerson(p.name, name))) {
    state.saveError = `${name} is already on the team.`;
    state.saveState = "error";
    render();
    return;
  }
  const person = {
    id: slugPersonId(name),
    name,
    role: fields.role || "Team member",
    home: fields.home || "social",
    mention: `@${name.replace(/\s+/g, "")}`,
    email: "",
    access: fields.access === "admin" ? "admin" : "member",
    active: true,
    updated_at: new Date().toISOString(),
  };
  if (!state.team.people) state.team.people = [];
  state.team.people.push(person);
  state.team.updated_at = new Date().toISOString();
  if (!state.auth) state.auth = { users: {} };
  if (!state.auth.users) state.auth.users = {};
  const password = fields.pin || makePersonPin(name);
  state.auth.users[name] = { pin: password };
  state.auth.updated_at = new Date().toISOString();
  ensureHr().work[name] = {
    type: "Full-time",
    days: "Sun–Thu",
    hours: "10:00–18:00",
    mode: "Remote",
  };
  render();
  saveTeam(`team: add ${name}`);
  saveAuth(`auth: password for ${name}`);
  saveHr(`hr: hours for ${name}`);
}

function setPersonActive(name, active) {
  if (name === "Amr") return;
  const stamp = new Date().toISOString();
  if (state.team.owner?.name === name) {
    state.team.owner.active = active;
    state.team.owner.updated_at = stamp;
  }
  const row = (state.team.people || []).find((p) => p.name === name);
  if (row) {
    row.active = active;
    row.updated_at = stamp;
  }
  state.team.updated_at = stamp;
  render();
  saveTeam(`team: ${active ? "reactivate" : "deactivate"} ${name}`);
}

function resetPersonPin(name) {
  if (!state.auth) state.auth = { users: {} };
  if (!state.auth.users) state.auth.users = {};
  const password = makePersonPin(name);
  state.auth.users[name] = { pin: password };
  state.auth.updated_at = new Date().toISOString();
  render();
  saveAuth(`auth: new password for ${name}`);
}

function loadForPerson(name, month) {
  const tasks = allTasks().filter((t) => t.who === name);
  const open = tasks.filter((t) => t.status !== "Done");
  const doneMonth = tasks.filter((t) => t.status === "Done" && doneMonthOf(t) === month);
  const overdue = open.filter((t) => t.due && t.due < today());
  const timed = [...doneMonth.map((t) => t.progress_hours || 0), ...open.filter((t) => t.status === "In progress").map(loggedHours)].filter((h) => h > 0);
  const avg = timed.length ? timed.reduce((a, b) => a + b, 0) / timed.length : 0;
  return {
    name,
    open: open.length,
    todo: open.filter((t) => t.status === "To do").length,
    progress: open.filter((t) => t.status === "In progress").length,
    review: open.filter((t) => t.status === "Review" || t.status === "Revisions").length,
    overdue: overdue.length,
    done: doneMonth.length,
    hours: avg,
    live: open.filter((t) => t.status === "In progress").reduce((n, t) => n + loggedHours(t), 0),
    finished: doneMonth,
  };
}

function viewWorkload() {
  const ym = state.workMonth || thisMonth();
  const roster = isAdmin() ? people() : people().filter((p) => p.name === state.who);
  const rows = roster.map((p) => ({ ...p, ...loadForPerson(p.name, ym) }));
  const maxOpen = Math.max(1, ...rows.map((r) => r.open));
  const finished = rows.flatMap((r) => r.finished);
  return $("div", { class: "dash" }, [
    $("div", { class: "stat-row" }, [
      statBox(rows.reduce((n, r) => n + r.open, 0), isAdmin() ? "Open across the team" : "Your open tasks"),
      statBox(rows.reduce((n, r) => n + r.review, 0), "Waiting on review", "tone-orange"),
      statBox(rows.reduce((n, r) => n + r.overdue, 0), "Overdue", "tone-red"),
      statBox(rows.reduce((n, r) => n + r.done, 0), "Done this month", "tone-green"),
    ]),
    $("section", { class: "card" }, [
      $("div", { class: "cal-nav" }, [
        $("button", { class: "btn ghost", type: "button", onclick: () => { state.workMonth = shiftYm(ym, -1); render(); } }, "Prev"),
        $("h2", {}, monthLabel(ym)),
        $("button", { class: "btn ghost", type: "button", onclick: () => { state.workMonth = shiftYm(ym, 1); render(); } }, "Next"),
      ]),
      $("p", { class: "muted" }, "Green is clear, orange needs attention, red is overload (3 or more open tasks)."),
      $("div", { class: "load-table-wrap" }, [
        $("table", { class: "load-table" }, [
          $("thead", {}, $("tr", {}, ["Name", "Open", "To do", "In progress", "Review", "Overdue", "Done", "Time"].map((h) => $("th", {}, h)))),
          $("tbody", {}, rows.map((r) =>
            $("tr", { class: loadTone(r) }, [
              $("td", {}, [
                $("strong", {}, r.name),
                $("span", { class: "muted" }, ` ${r.role || ""}`),
                $("div", { class: "load-bar" }, $("span", { style: `width:${Math.round((r.open / maxOpen) * 100)}%` })),
              ]),
              $("td", {}, String(r.open)),
              $("td", {}, String(r.todo)),
              $("td", {}, String(r.progress)),
              $("td", {}, String(r.review)),
              $("td", {}, String(r.overdue)),
              $("td", { class: r.done ? "tone-green" : "" }, String(r.done)),
              $("td", {}, r.live > 0 ? formatHours(r.live) : formatHours(r.hours)),
            ])
          )),
        ]),
      ]),
    ]),
    $("section", { class: "done-section" }, [
      $("h2", {}, `Done · ${monthLabel(ym)}`),
      finished.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, finished.map((t) => doneCard(t, { checked: true })))
        : $("p", { class: "empty" }, "No done tasks stored for this month yet."),
    ]),
  ]);
}

function attendChipClass(mode) {
  if (mode === "Office") return "office";
  if (mode === "Home") return "home";
  if (mode === "Off") return "off";
  return "unset";
}

function nextAttendMode(current) {
  const i = ATTEND_MODES.indexOf(current);
  if (i < 0) return ATTEND_MODES[0];
  return ATTEND_MODES[(i + 1) % ATTEND_MODES.length];
}

function viewAttendDashboard() {
  const friday = state.attendWeek || fridayStart(today());
  const pending = pendingAttendRequests();
  const weekPending = pendingAttendRequests(friday);
  const missing = people().filter((p) => !attendSaved(p.name, friday));
  return $("section", { class: "card" }, [
    $("h2", {}, "Attendance dashboard"),
    $("p", { class: "muted" }, "Approve or decline day-change requests. Locked weeks stay fixed until you approve."),
    $("div", { class: "stat-row" }, [
      statBox(pending.length, "Pending requests", pending.length ? "tone-orange" : ""),
      statBox(weekPending.length, "This week"),
      statBox(missing.length, "Not saved this week"),
    ]),
    missing.length
      ? $("p", { class: "muted" }, `Waiting on save: ${missing.map((p) => p.name).join(", ")}.`)
      : $("p", { class: "muted" }, "Everyone has saved this week."),
    pending.length
      ? $("div", { class: "cards", style: "margin-top:14px" }, pending.map((req) =>
        $("article", { class: "card review-card" }, [
          $("p", { class: "title" }, `${req.who} · ${cairoWeekday(req.date)} ${req.date}`),
          $("div", { class: "meta" }, [
            $("span", { class: "pill" }, req.from || "—"),
            $("span", { class: "pill" }, `→ ${req.to}`),
            $("span", { class: "pill" }, `Week ${req.friday}`),
          ]),
          req.reason ? $("p", {}, req.reason) : $("p", { class: "muted" }, "No reason given."),
          $("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [
            $("button", { class: "btn primary", type: "button", onclick: () => decideAttendRequest(req.id, "Approved") }, "Approve"),
            $("button", { class: "btn ghost", type: "button", onclick: () => decideAttendRequest(req.id, "Declined") }, "Decline"),
          ]),
        ])
      ))
      : $("p", { class: "empty" }, "No pending attendance requests."),
  ]);
}

function viewAttendChange(friday, date) {
  const from = attendDaysFor(state.who, friday)[date] || "";
  const other = nextAttendMode(from);
  const draft = state.attendChange || { friday, date, to: other, reason: "" };
  const to = $("select", {}, ATTEND_MODES.map((m) => $("option", { value: m, selected: m === (draft.to || other) }, m)));
  const reason = $("textarea", { placeholder: "Why this change?" }, draft.reason || "");
  return $("section", { class: "card attend-change" }, [
    $("h2", {}, "Request a change"),
    $("p", { class: "muted" }, `${cairoWeekday(date)} ${date} is locked as ${from || "—"}. Amr or Tasneem will approve or decline.`),
    $("form", {
      class: "form",
      onsubmit: (e) => {
        e.preventDefault();
        submitAttendRequest({ friday, date, to: to.value, reason: reason.value.trim() });
      },
    }, [
      $("label", {}, ["Change to", to]),
      $("label", {}, ["Reason", reason]),
      $("div", { style: "display:flex;gap:8px" }, [
        $("button", { class: "btn primary", type: "submit" }, "Send request"),
        $("button", { class: "btn ghost", type: "button", onclick: () => { state.attendChange = null; render(); } }, "Cancel"),
      ]),
    ]),
  ]);
}

function viewAttendance() {
  const friday = state.attendWeek || fridayStart(today());
  const dates = weekDates(friday);
  const thursday = dates[6];
  const todayDate = today();
  const thisFriday = fridayStart(todayDate);
  const roster = people();
  const mineSaved = attendSaved(state.who, friday);
  const canDraft = canDraftAttend(state.who, friday);
  const officeToday = roster.filter((p) => attendDaysLive(p.name, thisFriday)[todayDate] === "Office").length;
  const homeToday = roster.filter((p) => attendDaysLive(p.name, thisFriday)[todayDate] === "Home").length;
  const offToday = roster.filter((p) => attendDaysLive(p.name, thisFriday)[todayDate] === "Off").length;
  const unsetToday = roster.length - officeToday - homeToday - offToday;
  const change = state.attendChange;

  const pick = (name, date) => {
    if (name !== state.who) return;
    if (canDraft) {
      setAttendDay(name, friday, date, nextAttendMode(attendDaysFor(name, friday)[date] || ""));
      render();
      return;
    }
    if (mineSaved && !pendingChangeFor(name, friday, date)) {
      state.attendChange = { friday, date, to: nextAttendMode(attendDaysFor(name, friday)[date] || ""), reason: "" };
      render();
    }
  };

  return $("div", { class: "dash" }, [
    $("div", { class: "cal-nav attend-nav" }, [
      $("button", { class: "btn ghost", type: "button", onclick: () => { state.attendWeek = shiftFriday(friday, -1); render(); } }, "Prev week"),
      $("div", {}, [
        $("h2", {}, "Attendance"),
        $("p", { class: "muted" }, `Friday ${friday} → Thursday ${thursday}`),
      ]),
      $("div", { class: "attend-week-actions" }, [
        $("button", { class: "btn ghost", type: "button", onclick: () => { state.attendWeek = fridayStart(today()); render(); } }, "This week"),
        $("button", { class: "btn ghost", type: "button", onclick: () => { state.attendWeek = shiftFriday(friday, 1); render(); } }, "Next week"),
      ]),
    ]),
    isAdmin() ? viewAttendDashboard() : null,
    $("div", { class: "stat-row" }, [
      statBox(officeToday, "In office today"),
      statBox(homeToday, "Home today"),
      statBox(offToday, "Off today"),
      statBox(unsetToday, "Not set today"),
    ]),
    $("p", { class: "muted" }, canDraft
      ? "Set Office, Home, or Off on your row, then press Save. The whole team sees your week as soon as it is saved."
      : mineSaved
        ? "Your week is locked and visible to everyone. Tap one of your days to request Office, Home, or Off."
        : "This week is closed. Open This week or Next week to set days, or request a change on a locked week."),
    canDraft
      ? $("div", {}, $("button", { class: "btn primary", type: "button", onclick: () => lockMyAttendance(friday) }, "Save my week"))
      : null,
    mineSaved && !canDraft
      ? $("p", { class: "muted" }, `Saved${attendPerson(state.who, friday)?.saved_at ? ` · locked` : ""}.`)
      : null,
    change && change.friday === friday ? viewAttendChange(friday, change.date) : null,
    $("div", { class: "load-table-wrap" },
      $("table", { class: "load-table attend-table" }, [
        $("thead", {}, $("tr", {}, [
          $("th", {}, "Name"),
          ...dates.map((date) => $("th", { class: date === todayDate ? "attend-today" : "" }, `${cairoWeekday(date)} ${date.slice(8)}`)),
          $("th", {}, "Status"),
        ])),
        $("tbody", {}, roster.map((p) => {
          const mine = p.name === state.who;
          const days = attendDaysLive(p.name, friday);
          const saved = attendSaved(p.name, friday);
          return $("tr", { class: mine ? "attend-mine" : "" }, [
            $("td", {}, [$("strong", {}, p.name), $("span", { class: "muted" }, ` ${p.role || ""}`)]),
            ...dates.map((date) => {
              const mode = days[date] || "";
              const pending = pendingChangeFor(p.name, friday, date);
              const draftable = mine && canDraft;
              const requestable = mine && saved && !pending;
              return $("td", {}, [
                $("button", {
                  class: `attend-chip ${attendChipClass(mode)}${date === todayDate ? " today" : ""}`,
                  type: "button",
                  disabled: !(draftable || requestable),
                  onclick: () => pick(p.name, date),
                }, mode || "—"),
                pending ? $("span", { class: "pill" }, "Requested") : null,
              ]);
            }),
            $("td", {}, saved
              ? $("span", { class: "pill tone-green" }, "Saved")
              : Object.keys(days).length
                ? $("span", { class: "pill" }, mine ? "Editing" : "Setting")
                : $("span", { class: "pill" }, "Not set")),
          ]);
        })),
      ])
    ),
  ]);
}

function viewGuide() {
  const steps = [
    ["Log in", "Choose your name and your own password. Amr, Tasneem, or Moamen give you that password. Admins add or deactivate people on the People tab."],
    ["Your board", "Members see their own tasks. Mariam and Judi also see tasks they assigned. Admins see the team. After you save, a green Saved message appears and GitHub has the update."],
    ["Do the work", "Drag a card across columns. Time in In progress is tracked until you move it to Review. Upload files to Drive, not GitHub."],
    ["Create a task", "Only admins and social (Mariam, Judi) can add tasks. Assign the teammate, fill the brief, pick a due date, then create. It saves to the live board: the assigned person, social, and admins all see it."],
    ["Review", "Drag to Review when ready. Amr or Tasneem check it done on the Dashboard. It stays in Done for both of you and in GitHub."],
    ["Workload", "Green is clear, orange needs attention, red is overload. Time in progress is tracked until Review."],
    ["Attendance", "Everyone sees the same grid. Set Office, Home, or Off on your row and press Save. After Save, the rest of the team sees your week. To change a day, request it. Admins approve or decline."],
    ["Evening report", "Open Report, choose Remote or Office, and answer each question. Submit saves it to the live board. Admins see every saved report on the Dashboard."],
    ["HR", "Amr and Tasneem open HR. Profile shows one person. Performance, task tracking, attitude, and warnings are scored each month. Task scores are Delivery 35%, Quality 35%, Revisions 15%, Creativity 15%."],
  ];
  return $("div", { class: "sop-list" }, steps.map(([title, body]) =>
    $("article", { class: "card" }, [$("h3", {}, title), $("p", {}, body)])
  ));
}

function viewWelcome() {
  const who = $("select", {}, people().map((p) =>
    $("option", { value: p.name, selected: p.name === "Amr" }, p.name)
  ));
  const pin = $("input", {
    type: "password",
    required: true,
    placeholder: "Password",
    autocomplete: "current-password",
  });
  return $("div", { class: "login-page" }, [
    $("div", { class: "login-shell" }, [
      $("aside", { class: "login-brand" }, [
        $("p", { class: "mark" }, "Helal"),
        $("h1", {}, "Team Management"),
        $("p", { class: "lede" }, "Sign in to continue."),
      ]),
      $("section", { class: "login-card" }, [
        $("h2", {}, "Sign in"),
        $("p", { class: "lede" }, "Choose your name and enter your own password."),
        $("form", {
          class: "form",
          onsubmit: (e) => {
            e.preventDefault();
            login(who.value, pin.value);
          },
        }, [
          $("label", {}, ["Name", who]),
          $("label", {}, ["Password", pin]),
          state.loginError ? $("p", { class: "banner err" }, state.loginError) : null,
          $("button", { class: "btn primary", type: "submit" }, "Sign in"),
        ]),
        $("p", { class: "cairo" }, `${cairoClock()} · ${cairoTime()} Cairo`),
      ]),
    ]),
  ]);
}

function navItems() {
  const items = [
    ["board", "Board"],
    ["my", "My work"],
    ["load", "Workload"],
    ["attend", "Attendance"],
    ["report", "Report"],
    ["drive", "Drive"],
    ["guide", "SOP"],
  ];
  if (isAdmin()) {
    items.splice(2, 0, ["review", "Dashboard"]);
    items.push(["hr", "HR"]);
    items.push(["people", "People"]);
  }
  return items;
}

function render() {
  const root = document.getElementById("app");
  root.replaceChildren();
  if (!state.team) {
    root.className = "";
    root.append($("p", { class: "boot" }, "Could not load Helal."));
    return;
  }
  if (!state.session) {
    root.className = "login-mode";
    root.append(viewWelcome());
    return;
  }

  root.className = state.view === "board" ? "board-mode" : "";
  root.append(
    $("header", { class: "top" }, [
      $("div", { class: "brand" }, [
        $("p", {}, "Helal"),
        $("h1", {}, "Team Management"),
      ]),
      $("div", { class: "top-actions" }, [
        $("span", { class: "who-chip" }, `${state.who} · ${isAdmin() ? "Admin" : "Member"}`),
        $("span", { class: "cairo-chip" }, `${cairoClock()} · Cairo`),
        $("select", {
          class: "date-select",
          onchange: (e) => {
            state.dateFilter = e.target.value;
            render();
          },
        }, [
          $("option", { value: "all", selected: state.dateFilter === "all" }, "All dates"),
          $("option", { value: today(), selected: state.dateFilter === today() }, `Today · ${today()}`),
        ]),
        canAssignTasks()
          ? $("button", {
            class: "btn primary",
            onclick: () => {
              state.creating = true;
              state.createStatus = "To do";
              state.draft = null;
              state.dueDraft = today();
              state.dueMonth = today().slice(0, 7);
              render();
            },
          }, "New task")
          : null,
        $("button", {
          class: "btn ghost",
          onclick: () => {
            state.headSha = "";
            loadAll().then(render);
          },
        }, "Refresh"),
        $("button", { class: "btn ghost", onclick: logout }, "Log out"),
      ]),
    ]),
    $("nav", {}, navItems().map(([id, label]) =>
      $("button", {
        class: state.view === id ? "active" : "",
        onclick: () => { state.view = id; render(); },
      }, label)
    ))
  );
  const note = banner();
  if (note) root.append(note);

  const main = $("main");
  if (state.view === "my") viewMy().filter(Boolean).forEach((el) => main.append(el));
  else if (state.view === "board") main.append(viewBoard());
  else if (state.view === "load") main.append(viewWorkload());
  else if (state.view === "attend") main.append(viewAttendance());
  else if (state.view === "review" && isAdmin()) main.append(viewReview());
  else if (state.view === "report") main.append(viewReport());
  else if (state.view === "drive") main.append(viewDrive());
  else if (state.view === "people" && isAdmin()) main.append(viewPeople());
  else if (state.view === "hr" && isAdmin()) main.append(viewHr());
  else if (state.view === "guide") main.append(viewGuide());
  else main.append(viewBoard());
  root.append(main);

  const modal = viewCreateModal();
  if (modal) root.append(...modal);
  const drawer = viewTaskDrawer();
  if (drawer) root.append(...drawer);
  const prompts = viewPromptModals();
  if (prompts.length) root.append(...prompts);
}

function pullInterval() {
  const who = state.who || "";
  let n = 0;
  for (let i = 0; i < who.length; i += 1) n += who.charCodeAt(i);
  return 10000 + (n % 4000);
}

function watchCairoDay() {
  const tick = () => {
    const now = today();
    if (now !== lastCairoDay) lastCairoDay = now;
    if (state.saveState !== "saving" && state.session) pullRemoteBoard();
    else if (!state.session && state.view === "load" && allTasks().some((t) => t.status === "In progress")) render();
    setTimeout(tick, pullInterval());
  };
  setTimeout(tick, pullInterval());
}

loadAll()
  .then(() => {
    render();
    watchCairoDay();
  })
  .catch((err) => {
    document.getElementById("app").replaceChildren(
      $("p", { class: "boot" }, `Could not load the board. ${err.message}`)
    );
  });

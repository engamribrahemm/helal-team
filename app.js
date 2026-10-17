const STATUSES = ["To do", "In progress", "Review", "Revisions", "Done"];
const BOARD_STATUSES = ["To do", "In progress", "Review", "Done"];
const SPACES = ["Social", "Graphic", "Video editors", "Sales & PR", "HR", "Daily Reports", "Calendar"];
const SPACE_BRIEFS = {
  Social: "Goal, platform, caption/refs, size, publish day.",
  Graphic: "Goal, visual refs, size/format, brand notes, publish day.",
  "Video editors": "Goal, footage/refs, length, captions, delivery format.",
  "Sales & PR": "Goal, audience, talking points, assets needed, deadline.",
  HR: "What to prepare, who it is for, deadline.",
  "Daily Reports": "What to track or summarize, deadline.",
  Calendar: "Event/post, date, owner, assets needed.",
};
const BLOCKER_TAGS = [
  "Waiting client",
  "Waiting brief",
  "Tools / access",
  "Workload",
  "Personal",
  "Other",
];
const CAIRO = "Africa/Cairo";
const LS_SESSION = "helal.session.v3";
const LS_THEME = "helal.theme";
const LS_TASKS = "helal.tasksCache.v6";
const LS_REPORTS = "helal.reportsCache.v5";
const LS_HR = "helal.hrCache.v5";
const LS_REPORT_DRAFT = "helal.reportDraft";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ATTEND_WEEK = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
const ATTEND_MODES = ["Office", "Home", "Off"];
const LS_ATTEND = "helal.attendCache.v5";
const LS_SHAS = "helal.fileShas";
const LS_SEEN_TASKS = "helal.seenTasks.v1";
const BOARD_RESET = "2026-09-05T14:12:00.000Z";
const BLOCKED_TASK_IDS = ["t-20260906-seif-mtokld6v"];
const OLD_CACHE_KEYS = [
  "helal.tasksCache",
  "helal.reportsCache",
  "helal.hrCache",
  "helal.attendCache",
  "helal.attendCache.v3",
  "helal.tasksCache.v4",
  "helal.reportsCache.v4",
  "helal.hrCache.v4",
  "helal.attendCache.v4",
  "helal.tasksCache.v5",
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
/** Part-time models: days/week × hours/day (both = 24h/week). */
const PART_TIME_MODELS = {
  "3x8": { id: "3x8", label: "3 days · 8 hours", days_per_week: 3, hours_per_day: 8, days: "Sun–Tue", hours: "10:00–18:00" },
  "6x4": { id: "6x4", label: "6 days · 4 hours", days_per_week: 6, hours_per_day: 4, days: "Sun–Fri", hours: "10:00–14:00" },
};

function partTimeModel(id) {
  return PART_TIME_MODELS[id] || null;
}

function partTimeModelOptions(selected) {
  return Object.values(PART_TIME_MODELS).map((m) =>
    $("option", { value: m.id, selected: m.id === selected }, m.label)
  );
}

function partTimeModelPicker(selected, { group = "pt-model", onChange } = {}) {
  const pick = partTimeModel(selected)?.id || "3x8";
  const radios = [];
  const root = $("div", {
    class: "people-pt-picker",
    role: "radiogroup",
    "aria-label": "Part-time model",
  }, Object.values(PART_TIME_MODELS).map((m) => {
    const input = $("input", {
      type: "radio",
      name: group,
      value: m.id,
      checked: m.id === pick,
      onchange: () => {
        sync();
        if (onChange) onChange(m.id);
      },
    });
    radios.push(input);
    return $("label", {
      class: `people-choice${m.id === pick ? " on" : ""}`,
    }, [
      input,
      $("span", { class: "people-choice-mark", "aria-hidden": "true" }),
      $("span", { class: "people-choice-copy" }, [
        $("strong", {}, m.label),
        $("span", {}, `${m.days_per_week} days / week · ${m.hours_per_day} hours / day`),
        $("span", {}, `${m.days} · ${m.hours}`),
      ]),
    ]);
  }));
  function sync() {
    root.querySelectorAll(".people-choice").forEach((el) => {
      const on = !!el.querySelector("input:checked");
      el.classList.toggle("on", on);
    });
  }
  return {
    root,
    getValue: () => radios.find((r) => r.checked)?.value || "3x8",
    setValue: (id) => {
      const next = partTimeModel(id)?.id || "3x8";
      for (const r of radios) r.checked = r.value === next;
      sync();
    },
  };
}

function internChoiceToggle(checked, { onChange } = {}) {
  const input = $("input", {
    type: "checkbox",
    checked: !!checked,
    onchange: () => {
      root.classList.toggle("on", input.checked);
      if (onChange) onChange(input.checked);
    },
  });
  const root = $("label", {
    class: `people-intern-toggle${checked ? " on" : ""}`,
  }, [
    $("span", { class: "people-intern-mark", "aria-hidden": "true" }),
    input,
    $("span", { class: "people-choice-copy" }, [
      $("strong", {}, "Intern"),
      $("span", {}, "No money deductions from salary. Late work or absences extend training days instead."),
    ]),
  ]);
  return { root, input, get checked() { return !!input.checked; }, set checked(v) {
    input.checked = !!v;
    root.classList.toggle("on", !!v);
  } };
}

function monthWeekCount(ym) {
  const dates = monthDates(ym, { untilToday: false });
  return Math.max(1, Math.ceil(dates.length / 7));
}

function scheduledDaysFromPartTimeModel(modelId, month) {
  const m = partTimeModel(modelId);
  if (!m) return 0;
  return m.days_per_week * monthWeekCount(month || thisMonth());
}

const state = {
  view: "apps",
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
  payrollMonth: "",
  payrollPerson: "",
  evalTaskId: null,
  editPersonName: null,
  pendingDelay: null,
  pendingRevision: null,
  issuedPins: {},
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
  reportDraft: null,
  calMonth: "",
  workMonth: "",
  dashPerson: "",
  timePerson: "",
  timeFilter: "open",
  timeDaysOpen: false,
  boardPerson: "",
  boardClient: "",
  boardFocus: "",
  doneHistoryOpen: false,
  appsOpen: false,
  reportEditing: false,
  saveAttempt: 0,
  lastSaveJob: null,
  helpOpen: true,
  helpMessages: [],
  modalGuardUntil: 0,
};

let cardDidDrag = false;
let dragTaskId = "";
let lastCairoDay = "";
let lastBoardSig = "";

function readSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_SESSION) || "null");
    if (raw?.who && (raw.role === "admin" || raw.role === "member")) return raw;
  } catch (_) {}
  return null;
}

function readTheme() {
  try {
    const t = localStorage.getItem(LS_THEME);
    if (t === "bright" || t === "dark") return t;
  } catch (_) {}
  return "dark";
}

function applyTheme(theme) {
  const mode = theme === "bright" ? "bright" : "dark";
  document.documentElement.dataset.theme = mode;
  try { localStorage.setItem(LS_THEME, mode); } catch (_) {}
}

function toggleTheme() {
  applyTheme(readTheme() === "bright" ? "dark" : "bright");
  render();
}

function themeIcon(kind) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("theme-icon");
  const add = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  };
  if (kind === "sun") {
    add("circle", { cx: "12", cy: "12", r: "4", fill: "none", stroke: "currentColor", "stroke-width": "1.8" });
    for (const [x1, y1, x2, y2] of [
      [12, 2.5, 12, 5], [12, 19, 12, 21.5], [2.5, 12, 5, 12], [19, 12, 21.5, 12],
      [5.2, 5.2, 7, 7], [17, 17, 18.8, 18.8], [5.2, 18.8, 7, 17], [17, 7, 18.8, 5.2],
    ]) add("line", { x1, y1, x2, y2, stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round" });
  } else {
    add("path", {
      d: "M16.5 3.5a8.5 8.5 0 1 0 4 14.2A7 7 0 1 1 16.5 3.5z",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linejoin": "round",
    });
  }
  return svg;
}

function themeToggleButton(extraClass = "") {
  const bright = readTheme() === "bright";
  return $("button", {
    class: `btn ghost theme-toggle${extraClass ? ` ${extraClass}` : ""}`,
    type: "button",
    title: bright ? "Switch to dark mode" : "Switch to bright mode",
    "aria-label": bright ? "Switch to dark mode" : "Switch to bright mode",
    onclick: toggleTheme,
  }, [themeIcon(bright ? "moon" : "sun")]);
}

applyTheme(readTheme());

const $ = (tag, attrs = {}, kids = []) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
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
  } else {
    delete next.write_prefix;
    delete next.write_key;
  }
  return next;
}

function writeToken() {
  try {
    const stored = localStorage.getItem("helal.ghToken") || "";
    if (/^(ghp_|github_pat_)/.test(stored)) return stored;
  } catch (_) {}
  const assembled = assembleBoardKey(state.githubCfg);
  if (/^(ghp_|github_pat_)/.test(assembled)) return assembled;
  return "";
}

function forgetBoardKey() {
  try { localStorage.removeItem("helal.ghToken"); } catch (_) {}
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

function pinHashFor(name) {
  return state.auth?.users?.[name]?.pin_hash || "";
}

async function hashPin(name, pin) {
  const secret = String(pin || "");
  if (!secret || !window.crypto?.subtle) return "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(`helal-v1:${String(name || "").trim().toLowerCase()}`),
      iterations: 120000,
      hash: "SHA-256",
    },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pinMatches(name, pin) {
  const expected = pinHashFor(name);
  if (!expected || !pin) return false;
  const got = await hashPin(name, pin);
  return !!got && got === expected;
}

function rememberIssuedPin(name, password) {
  state.issuedPins = { ...(state.issuedPins || {}), [name]: password };
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
  // Full social leads only — Mariam and Judi. Others use manages[] for scoped lead access.
  return ["Mariam", "Judi"].some((name) => samePerson(name, state.who));
}

function managedNames() {
  const list = personOf(state.who)?.manages;
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

function isLead() {
  return managedNames().length > 0;
}

function managesPerson(name) {
  return managedNames().some((n) => samePerson(n, name));
}

function canAssignTasks() {
  return isAdmin() || isSocial() || isLead();
}

function canReviewTasks() {
  return isAdmin() || isSocial() || isLead();
}

function canSeeTeamWorkload() {
  return isAdmin() || isSocial() || isLead();
}

function workloadRoster() {
  if (isAdmin() || isSocial()) return people();
  if (isLead()) return boardPeople();
  return people().filter((p) => samePerson(p.name, state.who));
}

function syncSessionRole() {
  if (!state.session?.who) return;
  const role = accessFor(state.session.who);
  if (state.session.role === role) return;
  state.session = { ...state.session, role };
  try {
    localStorage.setItem(LS_SESSION, JSON.stringify(state.session));
  } catch (_) {}
}

function canSeeTask(task) {
  if (!task) return false;
  if (isAdmin()) return true;
  if (samePerson(task.who, state.who)) return true;
  if (managesPerson(task.who)) return true;
  if (samePerson(task.created_by, state.who)) return true;
  if (!isSocial()) return false;
  if (task.status === "Review" || task.status === "Revisions") return true;
  return people().some((p) => isSocialName(p.name) && samePerson(p.name, task.created_by));
}

function isSocialName(name) {
  return ["Mariam", "Judi"].some((n) => samePerson(n, name));
}

function canMarkDone(task) {
  // No task = column capability (drop target / help text). With a task = scoped check.
  if (!task) return isAdmin() || isSocial() || isLead();
  if (isAdmin() || isSocial()) return canSeeTask(task);
  if (!isLead()) return false;
  return managesPerson(task.who) || samePerson(task.created_by, state.who);
}

function markTaskDone(taskId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!canMarkDone(findTask(taskId))) return;
  setStatus(taskId, "Done");
  if (state.openTaskId === taskId) state.openTaskId = null;
}

function canMoveTask(task) {
  if (!task) return false;
  if (isAdmin()) return true;
  if (samePerson(task.who, state.who)) return true;
  if (managesPerson(task.who)) return true;
  return isSocial() && canSeeTask(task);
}

function allTasks() {
  return (state.tasksFile?.days || []).flatMap((d) =>
    (d.tasks || []).map((t) => ({ ...t, date: d.date }))
  );
}

function samePerson(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function canFilterBoardPerson() {
  return canSeeTeamWorkload() || isLead();
}

function boardPeople() {
  if (isAdmin() || isSocial()) return people().filter((p) => p.name !== "Amr");
  if (isLead()) {
    return people().filter((p) => managesPerson(p.name) || samePerson(p.name, state.who));
  }
  return people().filter((p) => samePerson(p.name, state.who));
}

function matchesBoardPerson(name) {
  if (!state.boardPerson) return true;
  return samePerson(name, state.boardPerson);
}

function setBoardPerson(name) {
  state.boardPerson = name || "";
  render();
}

function setBoardClient(name) {
  state.boardClient = name || "";
  render();
}

function setBoardFocus(focus) {
  state.boardFocus = state.boardFocus === focus ? "" : (focus || "");
  render();
}

function isOpenTask(task) {
  return !!task && task.status !== "Done";
}

function isMissingDrive(task) {
  return isOpenTask(task)
    && (task.status === "In progress" || task.status === "Review" || task.status === "Revisions")
    && !taskHasDrive(task);
}

function isDueToday(task) {
  return isOpenTask(task) && task.due === today();
}

function isOverdue(task) {
  return isOpenTask(task) && !!task.due && task.due < today();
}

function taskHasDrive(task) {
  return !!(String(task?.drive || "").trim());
}

function titleLooksNamed(title) {
  return /\|\s*.+/u.test(String(title || "").trim());
}

function boardClients() {
  const names = new Set();
  for (const t of allTasks()) {
    if (!isOpenTask(t)) continue;
    if (state.view === "my") {
      if (!samePerson(t.who, state.who)) continue;
    } else if (!isAdmin() && !canSeeTask(t)) {
      continue;
    }
    const name = String(t.project || "").trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function boardPersonSelect() {
  return $("select", {
    class: "date-select",
    onchange: (e) => setBoardPerson(e.target.value),
  }, [
    $("option", { value: "", selected: !state.boardPerson }, "All people"),
    ...boardPeople().map((p) => $("option", { value: p.name, selected: p.name === state.boardPerson }, p.name)),
  ]);
}

function filterChipRow(label, kids) {
  if (!kids?.length) return null;
  return $("div", { class: "filter-group" }, [
    $("span", { class: "filter-label" }, label),
    $("div", { class: "board-filter" }, kids),
  ]);
}

function viewBoardFilter() {
  if (!canFilterBoardPerson()) return null;
  const who = state.boardPerson;
  return filterChipRow("People", [
    $("button", {
      type: "button",
      class: `time-chip${!who ? " on" : ""}`,
      onclick: () => setBoardPerson(""),
    }, "All"),
    ...boardPeople().map((p) => $("button", {
      type: "button",
      class: `time-chip${who && samePerson(p.name, who) ? " on" : ""}`,
      onclick: () => setBoardPerson(p.name),
    }, p.name)),
  ]);
}

function viewBoardClientFilter() {
  const clients = boardClients();
  if (!clients.length && !state.boardClient) return null;
  const current = state.boardClient;
  return filterChipRow("Clients", [
    $("button", {
      type: "button",
      class: `time-chip${!current ? " on" : ""}`,
      onclick: () => setBoardClient(""),
    }, "All clients"),
    ...clients.map((name) => $("button", {
      type: "button",
      class: `time-chip${current === name ? " on" : ""}`,
      onclick: () => setBoardClient(name),
    }, name)),
  ]);
}

function tasksForView({ ignoreFocus = false } = {}) {
  let tasks = allTasks();
  if (state.view === "my") tasks = tasks.filter((t) => samePerson(t.who, state.who));
  else if (!isAdmin()) tasks = tasks.filter(canSeeTask);
  if (state.view === "board" && state.boardPerson) {
    tasks = tasks.filter((t) => matchesBoardPerson(t.who));
  }
  if ((state.view === "board" || state.view === "my") && state.boardClient) {
    tasks = tasks.filter((t) => String(t.project || "").trim() === state.boardClient);
  }
  if (!ignoreFocus && (state.view === "board" || state.view === "my") && state.boardFocus === "due") {
    tasks = tasks.filter(isDueToday);
  } else if (!ignoreFocus && (state.view === "board" || state.view === "my") && state.boardFocus === "overdue") {
    tasks = tasks.filter(isOverdue);
  } else if (!ignoreFocus && (state.view === "board" || state.view === "my") && state.boardFocus === "nodrive") {
    tasks = tasks.filter(isMissingDrive);
  }
  if (state.dateFilter && state.dateFilter !== "all") {
    tasks = tasks.filter((t) =>
      t.due === state.dateFilter
      || t.date === state.dateFilter
      || t.assigned_at === state.dateFilter
    );
  }
  return tasks;
}

function boardFocusLabel(focus) {
  if (focus === "due") return "Showing due today only.";
  if (focus === "overdue") return "Showing overdue only.";
  if (focus === "nodrive") return "Showing tasks missing a Drive link.";
  return "Filter on.";
}

function boardCockpit() {
  // Counts stay on the full board scope (person/client/date). Focus only filters the cards.
  const open = tasksForView({ ignoreFocus: true }).filter(isOpenTask);
  const due = open.filter(isDueToday).length;
  const overdue = open.filter(isOverdue).length;
  const review = open.filter((t) => t.status === "Review" || t.status === "Revisions").length;
  const noDrive = open.filter(isMissingDrive).length;
  return $("div", { class: "board-cockpit" }, [
    $("div", { class: "stat-row dense" }, [
      $("button", {
        type: "button",
        class: `stat cockpit-stat${due ? " tone-orange" : ""}${state.boardFocus === "due" ? " on" : ""}`,
        onclick: () => setBoardFocus("due"),
      }, [$("strong", {}, String(due)), $("span", {}, "Due today")]),
      $("button", {
        type: "button",
        class: `stat cockpit-stat${overdue ? " tone-red" : ""}${state.boardFocus === "overdue" ? " on" : ""}`,
        onclick: () => setBoardFocus("overdue"),
      }, [$("strong", {}, String(overdue)), $("span", {}, "Overdue")]),
      $("div", { class: `stat${review ? " tone-orange" : ""}` }, [
        $("strong", {}, String(review)),
        $("span", {}, "In review"),
      ]),
      $("button", {
        type: "button",
        class: `stat cockpit-stat${noDrive ? " tone-orange" : ""}${state.boardFocus === "nodrive" ? " on" : ""}`,
        onclick: () => setBoardFocus("nodrive"),
      }, [$("strong", {}, String(noDrive)), $("span", {}, "Missing Drive")]),
    ]),
    state.boardFocus
      ? $("p", { class: "muted board-filter-note" }, [
        boardFocusLabel(state.boardFocus),
        " ",
        $("button", {
          type: "button",
          class: "btn ghost compact",
          onclick: () => setBoardFocus(""),
        }, "Clear filter"),
      ])
      : null,
  ]);
}

function canEditDetails(task) {
  if (!task) return false;
  if (!task.created_by) return isAdmin();
  return task.created_by === state.who;
}

function canRemoveTask(task) {
  if (!task) return false;
  if (isAdmin()) return true;
  return canAssignTasks() && samePerson(task.created_by, state.who);
}

function removeTask(taskId) {
  const task = findTask(taskId);
  if (!canRemoveTask(task)) return;
  if (!window.confirm(`Remove “${task.title}” from the board and the Helal database?`)) return;
  const file = ensureTasksFile();
  if (!Array.isArray(file.removed_ids)) file.removed_ids = [];
  if (!file.removed_ids.includes(taskId)) file.removed_ids.push(taskId);
  for (const day of file.days || []) {
    day.tasks = (day.tasks || []).filter((t) => t.id !== taskId);
  }
  if (state.openTaskId === taskId) state.openTaskId = null;
  if (state.evalTaskId === taskId) state.evalTaskId = null;
  cacheBoard();
  render();
  saveTasks(`board: ${state.who} removed ${taskId}`);
}

function thisMonth() {
  return today().slice(0, 7);
}

function isCurrentMonth(month) {
  return (month || "") === thisMonth();
}

function setBoardMonth(ym) {
  if (!ym) return;
  state.workMonth = ym;
  state.hrMonth = ym;
  state.calMonth = ym;
  if (!state.reportDay || !String(state.reportDay).startsWith(ym)) {
    state.reportDay = isCurrentMonth(ym) ? today() : `${ym}-01`;
  }
}

function mergeMonthArchives(...maps) {
  const out = {};
  for (const map of maps) {
    for (const [ym, row] of Object.entries(map || {})) {
      if (!ym || !row) continue;
      const prev = out[ym];
      if (!prev) {
        out[ym] = { ...row };
        continue;
      }
      if (row.frozen && !prev.frozen) out[ym] = { ...row };
      else if (prev.frozen && !row.frozen) continue;
      else if ((row.updated_at || row.frozen_at || "") >= (prev.updated_at || prev.frozen_at || "")) out[ym] = { ...row };
    }
  }
  return out;
}

function monthSnapshot(month) {
  return ensureTasksFile().months?.[month] || null;
}

function tasksForMonth(month) {
  const m = month || thisMonth();
  const current = isCurrentMonth(m);
  return allTasks().filter((t) => {
    if (t.status === "Done") return doneMonthOf(t) === m;
    return current;
  });
}

function hoursBetween(start, end) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return (b - a) / 36e5;
}

function minutesBetween(start, end, live) {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  const mins = (b - a) / 60000;
  return live ? Math.max(0, Math.floor(mins)) : Math.max(0, Math.round(mins));
}

function formatMinutes(mins) {
  if (mins == null || !Number.isFinite(mins) || mins < 0) return "—";
  if (mins === 0) return "0m";
  if (mins < 60) return `${mins}m`;
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  if (days) return hours ? `${days}d ${hours}h` : `${days}d`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatHours(h) {
  if (h == null || Number.isNaN(h) || h <= 0) return "—";
  return formatMinutes(Math.round(h * 60));
}

function progressStart(task) {
  if (task.progress_started_at) return task.progress_started_at;
  if (task.status === "In progress") return task.updated_at || task.created_at || "";
  return "";
}

function loggedHours(task) {
  return (taskStageTimes(task).progressMins || 0) / 60;
}

function stampTime(task, prev, next) {
  const now = new Date().toISOString();
  if (!task.time_log) task.time_log = [];
  if (next === "In progress" && prev !== "In progress") {
    task.progress_started_at = now;
    if (!task.first_progress_at) task.first_progress_at = now;
  }
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
    if (!task.first_review_at) task.first_review_at = now;
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

function taskFirstProgressAt(task) {
  if (task.first_progress_at) return task.first_progress_at;
  const log = (task.time_log || []).find((row) => row.from === "In progress" && row.started_at);
  if (log?.started_at) return log.started_at;
  if (task.progress_started_at) return task.progress_started_at;
  return "";
}

function taskFirstReviewAt(task) {
  if (task.first_review_at) return task.first_review_at;
  if (task.review_at) return task.review_at;
  const log = (task.time_log || []).find((row) => row.to === "Review" && row.ended_at);
  return log?.ended_at || "";
}

function taskStageTimes(task) {
  const now = new Date().toISOString();
  const created = task.created_at || "";
  const progressAt = taskFirstProgressAt(task);
  const reviewAt = taskFirstReviewAt(task);
  const doneAt = task.done_at || "";
  const leftTodoAt = progressAt || reviewAt || doneAt;
  const stillTodo = task.status === "To do" && !leftTodoAt;
  const todoEnd = leftTodoAt || (task.status === "To do" ? now : "");
  const todoMins = created && todoEnd ? minutesBetween(created, todoEnd, stillTodo) : 0;
  // In progress = only time spent in the In progress column (stops at Review / Done / leave).
  const liveStart = progressStart(task);
  const stillProgress = task.status === "In progress" && !!liveStart;
  let progressMins = Math.round((task.progress_hours || 0) * 60);
  if (stillProgress) {
    progressMins += minutesBetween(liveStart, now, true);
  } else if (progressMins === 0 && progressAt) {
    if (task.status === "In progress") {
      progressMins = minutesBetween(progressAt, now, true);
    } else {
      const end = reviewAt || doneAt || "";
      if (end) progressMins = minutesBetween(progressAt, end, false);
    }
  }
  return {
    created,
    progressAt,
    reviewAt,
    doneAt,
    todoMins,
    progressMins,
    stillTodo,
    stillProgress,
    stillOpen: task.status !== "Done",
  };
}

function formatStageMinutes(mins, live) {
  const text = formatMinutes(mins);
  return live && mins >= 0 ? `${text} · live` : text;
}

function taskFactList(task) {
  const times = taskStageTimes(task);
  const waiting = task.status === "To do";
  return $("dl", { class: "task-facts" }, [
    $("div", {}, [$("dt", {}, "Client"), $("dd", {}, task.project || "—")]),
    $("div", {}, [$("dt", {}, "Assigned"), $("dd", {}, task.who || "—")]),
    $("div", {}, [$("dt", {}, "Created by"), $("dd", {}, task.created_by || "—")]),
    $("div", {}, [$("dt", {}, "Deadline"), $("dd", {}, task.due || "—")]),
    waiting
      ? $("div", {}, [$("dt", {}, "To do"), $("dd", {}, formatStageMinutes(times.todoMins, times.stillTodo))])
      : $("div", {}, [$("dt", {}, "In progress"), $("dd", {}, formatStageMinutes(times.progressMins, times.stillProgress))]),
  ]);
}

function projectList() {
  const fromProjects = state.projects?.projects || [];
  const seen = new Set(fromProjects.map((p) => String(p.name || "").trim().toLowerCase()));
  const fromDrive = (state.drive?.folders || [])
    .filter((f) => f.section === "clients" && f.who === "Client" && f.name && !seen.has(String(f.name).trim().toLowerCase()))
    .map((f) => ({ id: f.id, name: f.name, url: f.url || "" }));
  return [...fromProjects, ...fromDrive];
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

function canSetStatus(next, task) {
  if (next !== "Done") return true;
  return canMarkDone(task);
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
    taskFactList(task),
    $("div", { class: "meta" }, [
      $("span", { class: "pill tone-green" }, "Done"),
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

function removedTaskIds(remote, local) {
  return new Set([
    ...BLOCKED_TASK_IDS,
    ...(remote?.removed_ids || []),
    ...(local?.removed_ids || []),
    ...(state.tasksFile?.removed_ids || []),
  ]);
}

function mergeTaskFiles(remote, local) {
  const resetAt = effectiveReset(remote, local);
  const resetIso = new Date(resetAt).toISOString();
  const blocked = removedTaskIds(remote, local);
  const byId = new Map();
  for (const file of [remote, local]) {
    for (const day of file?.days || []) {
      for (const task of day.tasks || []) {
        if (!task?.id || blocked.has(task.id)) continue;
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
    removed_ids: [...blocked],
    statuses: STATUSES,
    months: mergeMonthArchives(remote?.months, local?.months, state.tasksFile?.months),
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
    note: "HR evaluation, salaries, and Helal penalties policy.",
    reset_at: BOARD_RESET,
    weights: canonicalHrWeights(),
    work: {},
    reviews: [],
    attitude: [],
    warnings: [],
    rewards: [],
    payroll: { base: {}, interns: [], scheduled_days: {}, manual: [], waived: [], archived: {}, sheet: null },
    months: {},
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
  const weeks = file?.weeks || {};
  const stableWeeks = {};
  for (const key of Object.keys(weeks).sort()) {
    const people = weeks[key]?.people || {};
    const row = {};
    for (const name of Object.keys(people).sort()) {
      const p = people[name] || {};
      row[name] = `${p.updated_at || ""}:${p.saved ? 1 : 0}:${JSON.stringify(p.days || {})}`;
    }
    stableWeeks[key] = row;
  }
  const reqs = (file?.requests || [])
    .map((r) => `${r.id}:${r.status || ""}:${r.updated_at || r.created_at || ""}`)
    .sort()
    .join("|");
  return `${JSON.stringify(stableWeeks)}#${reqs}`;
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

function mergePayroll(remote, local) {
  const a = remote || { base: {}, interns: [], scheduled_days: {}, manual: [], waived: [], archived: {}, sheet: null };
  const b = local || { base: {}, interns: [], scheduled_days: {}, manual: [], waived: [], archived: {}, sheet: null };
  const scheduled = { ...(a.scheduled_days || {}) };
  for (const [name, months] of Object.entries(b.scheduled_days || {})) {
    scheduled[name] = { ...(scheduled[name] || {}), ...(months || {}) };
  }
  const aSheet = Date.parse(a.sheet?.imported_at || 0) || 0;
  const bSheet = Date.parse(b.sheet?.imported_at || 0) || 0;
  return {
    base: { ...(a.base || {}), ...(b.base || {}) },
    interns: [...new Set([...(a.interns || []), ...(b.interns || [])])],
    scheduled_days: scheduled,
    manual: mergeById(a.manual || [], b.manual || []),
    waived: [...new Set([...(a.waived || []), ...(b.waived || [])])],
    archived: { ...(a.archived || {}), ...(b.archived || {}) },
    sheet: bSheet >= aSheet ? (b.sheet || a.sheet || null) : (a.sheet || b.sheet || null),
  };
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
    payroll: mergePayroll(a.payroll, b.payroll),
    months: mergeMonthArchives(a.months, b.months, state.hrFile?.months),
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

function reportFor(name, date) {
  const day = date || today();
  return (state.reportsFile?.reports || []).find((r) => samePerson(r.who, name) && r.date === day) || null;
}

function reportTyping() {
  if (state.view !== "report" || !state.session) return false;
  return state.reportEditing || !reportFor(state.who, today());
}

function reportFormOpen() {
  return reportTyping() && !!document.getElementById("report-form");
}

function formFocused() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return false;
  const tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || !!el.isContentEditable;
}

function uiOverlayOpen() {
  return !!(
    state.creating
    || state.openTaskId
    || state.pendingDelay
    || state.pendingRevision
    || state.evalTaskId
    || state.editPersonName
    || state.attendChange
    || reportFormOpen()
  );
}

function uiBusy() {
  return uiOverlayOpen() || formFocused();
}

function canSafeRender() {
  return !reportFormOpen();
}

function emptyReportDraft() {
  return {
    who: state.who,
    day: today(),
    finished: "",
    unfinished: "",
    drive: "",
    need_review: false,
    place: "",
    blockers: [],
    finished_tasks: [],
  };
}

function normalizeFinishedTasks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => ({
      id: String(row?.id || ""),
      title: String(row?.title || "").trim(),
      project: String(row?.project || "").trim(),
      status: String(row?.status || "").trim(),
      percent: Math.max(0, Math.min(100, Math.round(Number(row?.percent) || 0))),
    }))
    .filter((row) => row.id && row.percent > 0);
}

function finishedTasksSummary(rows) {
  return normalizeFinishedTasks(rows)
    .map((row) => `${row.title || row.id} · ${row.percent}%`)
    .join("\n");
}

function reportDraft() {
  const fresh = emptyReportDraft();
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(LS_REPORT_DRAFT) || "null");
  } catch (_) {
    stored = null;
  }
  const src = (state.reportDraft?.who === state.who && state.reportDraft)
    || (stored?.who === state.who ? stored : null);
  if (!src) return fresh;
  const fromNew = normalizeFinishedTasks(src.finished_tasks);
  const fromOld = Array.isArray(src.done_task_ids)
    ? src.done_task_ids.map((id) => ({ id: String(id), percent: 100, title: "", project: "", status: "" }))
    : [];
  return {
    ...fresh,
    finished: src.finished || "",
    unfinished: src.unfinished || "",
    drive: src.drive || "",
    need_review: !!src.need_review,
    place: src.place === "Office" || src.place === "Remote" ? src.place : "",
    blockers: Array.isArray(src.blockers) ? src.blockers.filter((b) => BLOCKER_TAGS.includes(b)) : [],
    finished_tasks: fromNew.length ? fromNew : fromOld,
  };
}

function keepReportDraft(fields) {
  state.reportDraft = {
    ...emptyReportDraft(),
    ...fields,
    who: state.who,
    day: today(),
  };
  try {
    localStorage.setItem(LS_REPORT_DRAFT, JSON.stringify(state.reportDraft));
  } catch (_) {}
}

function clearReportDraft() {
  state.reportDraft = null;
  try {
    localStorage.removeItem(LS_REPORT_DRAFT);
  } catch (_) {}
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
    .flatMap((d) => (d.tasks || []).map((t) =>
      `${t.id}:${t.status}:${t.updated_at || ""}:${t.who || ""}:${t.delay_reason || ""}:${t.done_at || ""}`
    ))
    .sort()
    .join("|");
}

function boardDataSignature() {
  return [
    tasksSignature(state.tasksFile),
    attendSignature(state.attendFile),
    reportsSignature(state.reportsFile),
  ].join("||");
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
  const blocked = removedTaskIds(remote, local);
  for (const task of flatTasks(local)) {
    if (!task?.id || blocked.has(task.id)) continue;
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
    removed_ids: [...blocked],
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
  state.saveAttempt = 0;
  state.saveNote = friendlySaveNote(message);
  state.lastSaveJob = null;
}

function rememberSaveJob(kind, message) {
  state.lastSaveJob = { kind, message, at: Date.now() };
}

function retryLastSave() {
  const job = state.lastSaveJob;
  if (!job) return;
  if (job.kind === "tasks") saveTasks(job.message);
  else if (job.kind === "reports") saveReports(job.message);
  else if (job.kind === "hr") saveHr(job.message);
  else if (job.kind === "attend") saveAttendance(job.message);
  else if (job.kind === "team") saveTeam(job.message);
  else if (job.kind === "auth") saveAuth(job.message);
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
    payload = mergeTeam(remote, payload);
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
  const maxAttempts = 8;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    state.saveAttempt = attempt + 1;
    if (attempt > 0) {
      state.saveState = "saving";
      state.saveNote = `Busy board — merging and retrying (${attempt + 1}/${maxAttempts})…`;
      if (canSafeRender()) render(true);
    }
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
      lastError = "Someone else saved at the same time. Merging and retrying…";
      try { await dbGet(path); } catch (_) { await refreshShaTree(); }
      await waitMs(saveBackoff(attempt));
      continue;
    }
    if (res.status === 403) {
      lastError = "GitHub is busy. Retrying…";
      await waitMs(400 + saveBackoff(attempt));
      continue;
    }
    if (res.status === 401) {
      forgetBoardKey();
      state.connectError = "The old board key was rejected. Create a new GitHub key and paste it below.";
      throw new Error("GitHub could not save. Paste a new board key to reconnect.");
    }
    throw new Error(`GitHub ${res.status}: ${text.slice(0, 140)}`);
  }
  throw new Error(lastError || "Could not save to GitHub after several tries. Tap Retry save, or Refresh then try again.");
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
    Object.assign(state, { drive, projects, githubCfg });
    state.team = mergeTeam(team, state.team);
    state.auth = mergeAuth(auth, state.auth);
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
  else if (state.session) {
    state.who = state.session.who;
    syncSessionRole();
  }
  persistClosedMonths();
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
    rememberSaveJob("tasks", message);
    state.saveState = "saving";
    state.saveError = "";
    state.saveAttempt = 0;
    state.saveNote = "Saving…";
    stampMonthArchives();
    if (!uiOverlayOpen() && canSafeRender()) render(true);
    try {
      const ok = await Promise.race([
        dbPut("helal/daily-tasks.json", state.tasksFile, message),
        waitMs(45000).then(() => {
          throw new Error("Save timed out. Tap Retry save, or Refresh then try again.");
        }),
      ]);
      if (!ok && state.saveState === "saving") {
        state.saveState = writeToken() ? "error" : "local-only";
        if (state.saveState === "error") {
          state.saveError = "Could not save to GitHub. Tap Retry save.";
        }
      }
      if (canSafeRender()) render(true);
    } catch (err) {
      state.saveState = "error";
      state.saveError = fetchErrorMessage(err);
      if (canSafeRender()) render(true);
    }
  });
}

async function saveReports(message) {
  return enqueueSave(async () => {
    rememberSaveJob("reports", message);
    state.saveState = "saving";
    state.saveError = "";
    state.saveAttempt = 0;
    state.saveNote = "Saving report…";
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
    rememberSaveJob("hr", message);
    state.saveState = "saving";
    state.saveError = "";
    state.saveAttempt = 0;
    state.saveNote = "Saving HR…";
    stampMonthArchives();
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

function mergePersonRow(a, b) {
  if (!a) return b;
  if (!b) return a;
  const at = Date.parse(a.updated_at || 0) || 0;
  const bt = Date.parse(b.updated_at || 0) || 0;
  return bt >= at ? { ...a, ...b } : { ...b, ...a };
}

function mergeTeam(remote, local) {
  const newer = pickNewerFile(remote, local) || {};
  const older = newer === local ? remote : local;
  const owner = mergePersonRow(older?.owner, newer?.owner) || newer.owner || older?.owner;
  const byName = new Map();
  for (const row of [...(older?.people || []), ...(newer?.people || [])]) {
    if (!row?.name || samePerson(row.name, owner?.name)) continue;
    const key = String(row.name).trim().toLowerCase();
    byName.set(key, mergePersonRow(byName.get(key), row));
  }
  const people = [];
  const seen = new Set();
  for (const row of [...(older?.people || []), ...(newer?.people || [])]) {
    const key = String(row?.name || "").trim().toLowerCase();
    if (!key || seen.has(key) || samePerson(row.name, owner?.name)) continue;
    seen.add(key);
    people.push(byName.get(key));
  }
  return {
    agency: newer.agency || older?.agency || "Helal",
    updated_at: newer.updated_at || older?.updated_at || "",
    owner,
    people,
  };
}

function mergeAuth(remote, local) {
  const newer = pickNewerFile(remote, local) || {};
  const older = newer === local ? remote : local;
  const users = {};
  for (const name of new Set([...Object.keys(older?.users || {}), ...Object.keys(newer?.users || {})])) {
    const row = { ...(older?.users?.[name] || {}), ...(newer?.users?.[name] || {}) };
    if (row.pin_hash) users[name] = { pin_hash: row.pin_hash };
  }
  return {
    note: "Passwords are stored as hashes. They cannot be read from the public files.",
    updated_at: newer.updated_at || older?.updated_at || "",
    users,
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
    rememberSaveJob("team", message);
    state.saveState = "saving";
    state.saveError = "";
    state.saveNote = "Saving people…";
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
    rememberSaveJob("auth", message);
    state.saveState = "saving";
    state.saveError = "";
    state.saveNote = "Saving login…";
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
    rememberSaveJob("attend", message);
    state.saveState = "saving";
    state.saveError = "";
    state.saveNote = "Saving attendance…";
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
  if (!state.session || state.saveState === "saving" || pullBusy || uiBusy()) return;
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
    if (state.saveState === "saving" || uiBusy()) return;
    const before = boardDataSignature();
    const replay = mineNewerFile(remoteTasks, state.tasksFile);
    const nextTasks = mergeTaskFiles(
      remoteTasks || { days: [] },
      replay || state.tasksFile || { days: [] }
    );
    const nextReports = mergeReports(remoteReports || emptyReports(), state.reportsFile || emptyReports());
    const nextAttend = mergeAttendance(remoteAttend || emptyAttendance(), state.attendFile || emptyAttendance());
    const nextSig = [
      tasksSignature(nextTasks),
      attendSignature(nextAttend),
      reportsSignature(nextReports),
    ].join("||");
    if (nextSig === before) {
      if (remoteTeam) state.team = mergeTeam(remoteTeam, state.team);
      if (remoteAuth) state.auth = mergeAuth(remoteAuth, state.auth);
      if (pullTick % 5 === 0) state.hrFile = remoteHr || emptyHr();
      if (state.session && !people().some((p) => p.name === state.session.who)) logout();
      else syncSessionRole();
      return;
    }
    state.tasksFile = nextTasks;
    state.reportsFile = nextReports;
    state.attendFile = nextAttend;
    state.hrFile = remoteHr || emptyHr();
    if (remoteTeam) state.team = mergeTeam(remoteTeam, state.team);
    if (remoteAuth) state.auth = mergeAuth(remoteAuth, state.auth);
    if (state.session && !people().some((p) => p.name === state.session.who)) {
      logout();
      return;
    }
    syncSessionRole();
    cacheBoard();
    lastBoardSig = nextSig;
    if (!uiBusy()) render();
  } catch (_) {
  } finally {
    pullBusy = false;
  }
}

async function login(who, pin) {
  const person = people().find((p) => p.name === who);
  if (!person) {
    state.loginError = "This name is not active. Ask an admin.";
    render();
    return;
  }
  const ok = await pinMatches(who, pin);
  if (!ok) {
    state.loginError = "Wrong password for this name.";
    render();
    return;
  }
  const role = accessFor(who);
  state.session = { who, role };
  state.who = who;
  state.loginError = "";
  state.view = "apps";
  state.appsOpen = false;
  state.helpOpen = true;
  state.helpMessages = [];
  localStorage.setItem(LS_SESSION, JSON.stringify(state.session));
  try {
    localStorage.removeItem("helal.session");
    localStorage.removeItem("helal.session.v2");
  } catch (_) {}
  state.headSha = "";
  state.taskCommitSha = "";
  render();
  persistClosedMonths();
  pullRemoteBoard();
}

function logout() {
  state.session = null;
  state.who = "";
  state.reportEditing = false;
  state.lastSaveJob = null;
  state.helpOpen = true;
  state.helpMessages = [];
  clearReportDraft();
  localStorage.removeItem(LS_SESSION);
  document.querySelectorAll("body > .help-root, body > .help-fab").forEach((el) => el.remove());
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
  if (!state.tasksFile.months) state.tasksFile.months = {};
  if (!Array.isArray(state.tasksFile.removed_ids)) state.tasksFile.removed_ids = [];
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
  const current = findTask(taskId);
  if (!current) {
    state.pendingDelay = null;
    state.pendingRevision = null;
    state.saveError = "Could not find that task. Click Refresh, then try again.";
    state.saveState = "error";
    render();
    return;
  }
  if (!canSetStatus(next, current)) return;
  if (next === "Done" ? !canMarkDone(current) : !canMoveTask(current)) {
    state.pendingDelay = null;
    state.pendingRevision = null;
    state.saveError = "You cannot move this task.";
    state.saveState = "error";
    render();
    return;
  }
  let found = null;
  for (const day of state.tasksFile.days) {
    const task = day.tasks.find((t) => t.id === taskId);
    if (task) {
      if (task.status === next && !extra.force && !extra.delay_reason) {
        state.pendingDelay = null;
        state.pendingRevision = null;
        return;
      }
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
  if (state.openTaskId === taskId && (next === "Review" || next === "Done")) {
    state.openTaskId = null;
  }
  cacheBoard();
  state.saveState = "saving";
  state.saveError = "";
  render(true);
  saveTasks(`board: ${state.who} set ${taskId} to ${next}`).then(() => {
    if (canSafeRender()) render(true);
  });
}

function setStatus(taskId, next) {
  try {
    const task = findTask(taskId);
    if (!task) {
      state.saveState = "error";
      state.saveError = "Could not find that task. Click Refresh, then try again.";
      render(true);
      return;
    }
    if (!canSetStatus(next, task)) return;
    if (task.status === next) return;
    if (next === "Review" && !taskHasDrive(task)) {
      state.saveState = "error";
      state.saveError = "Add a Drive link on the task before moving it to Review.";
      state.openTaskId = task.id;
      render(true);
      return;
    }
    // Late Review moves must not open a blocking popup — that froze members.
    // Auto-note the delay and save Review to GitHub in one step.
    if (next === "Review" && task.due && task.due < today() && !task.delay_reason) {
      applyStatus(taskId, next, {
        delay_reason: "Other",
        delay_notified: false,
      });
      return;
    }
    if (next === "Revisions") {
      state.pendingRevision = { taskId };
      state.modalGuardUntil = Date.now() + 400;
      render(true);
      return;
    }
    applyStatus(taskId, next);
  } catch (err) {
    state.pendingDelay = null;
    state.pendingRevision = null;
    state.saveState = "error";
    state.saveError = err?.message || "Could not move that task. Click Refresh, then try again.";
    render(true);
  }
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
    month: thisMonth(),
    created_by: state.who,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: state.who,
    revisions: 0,
    first_progress_at: (status || "To do") === "In progress" ? new Date().toISOString() : "",
    progress_started_at: (status || "To do") === "In progress" ? new Date().toISOString() : "",
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
  const day = fields.date || today();
  if (!state.reportsFile) state.reportsFile = emptyReports();
  if (!state.reportsFile.reports) state.reportsFile.reports = [];
  const finishedTasks = normalizeFinishedTasks(fields.finished_tasks);
  const finishedText = String(fields.finished || "").trim() || finishedTasksSummary(finishedTasks);
  const existing = reportFor(state.who, day);
  const now = new Date().toISOString();
  if (existing) {
    if (!state.reportEditing && !isAdmin()) {
      render();
      return;
    }
    existing.finished = finishedText;
    existing.unfinished = fields.unfinished || "";
    existing.drive = fields.drive || "";
    existing.need_review = !!fields.need_review;
    existing.place = fields.place || "";
    existing.blockers = Array.isArray(fields.blockers) ? fields.blockers : [];
    existing.finished_tasks = finishedTasks;
    existing.done_task_ids = finishedTasks.map((row) => row.id);
    existing.updated_at = now;
    existing.amended_at = now;
  } else {
    state.reportsFile.reports.unshift({
      id: `r-${Date.now().toString(36)}`,
      who: state.who,
      date: day,
      finished: finishedText,
      unfinished: fields.unfinished,
      drive: fields.drive,
      need_review: fields.need_review,
      place: fields.place || "",
      blockers: Array.isArray(fields.blockers) ? fields.blockers : [],
      finished_tasks: finishedTasks,
      done_task_ids: finishedTasks.map((row) => row.id),
      created_at: now,
    });
  }
  state.reportEditing = false;
  state.reportDay = day;
  state.calMonth = state.reportDay.slice(0, 7);
  clearReportDraft();
  cacheBoard();
  state.saveState = "saving";
  state.saveError = "";
  render();
  saveReports(`report: ${state.who} ${state.reportDay}${existing ? " amend" : ""}`);
}

function startReportEdit(report) {
  if (!report || report.date !== today()) return;
  if (!samePerson(report.who, state.who) && !isAdmin()) return;
  state.reportEditing = true;
  keepReportDraft({
    finished: report.finished || "",
    unfinished: "",
    drive: report.drive || "",
    need_review: !!report.need_review,
    place: report.place || "",
    blockers: Array.isArray(report.blockers) ? report.blockers : [],
    finished_tasks: normalizeFinishedTasks(report.finished_tasks),
  });
  render(true);
}

function cancelReportEdit() {
  state.reportEditing = false;
  clearReportDraft();
  render(true);
}

function banner() {
  if (!writeToken() && state.session) return viewConnectBanner();
  if (state.saveState === "saving") {
    return $("div", { class: "banner" }, state.saveNote || "Saving…");
  }
  if (state.saveState === "saved") {
    return $("div", { class: "banner ok" }, state.saveNote || "Saved. The team can see it now.");
  }
  if (state.saveState === "error") {
    return $("div", { class: "banner err banner-actions" }, [
      $("span", {}, state.saveError || "Save failed."),
      state.lastSaveJob
        ? $("button", {
          class: "btn compact",
          type: "button",
          onclick: () => retryLastSave(),
        }, "Retry save")
        : null,
    ]);
  }
  if (state.saveState === "local-only") return viewConnectBanner();
  return null;
}

function viewConnectBanner() {
  const key = $("input", {
    type: "password",
    placeholder: "ghp_…",
    autocomplete: "off",
  });
  return $("div", { class: "banner warn connect-box" }, [
    $("p", {}, "The board cannot save until you paste a new GitHub board key."),
    isAdmin()
      ? $("p", { class: "muted" }, [
        "Open ",
        $("a", {
          href: "https://github.com/settings/tokens/new?scopes=public_repo&description=Helal%20board",
          target: "_blank",
          rel: "noreferrer",
        }, "this link"),
        " while logged in as engamribrahemm. Check public_repo. Generate, copy the ghp_ value, paste it here. Do not paste your Helal login password.",
      ])
      : $("p", { class: "muted" }, "Ask Amr to reconnect the board. Do not paste your Helal login password here."),
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

function moveTaskToReview(taskId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  cardDidDrag = false;
  dragTaskId = "";
  const task = findTask(taskId);
  if (!task) {
    state.saveState = "error";
    state.saveError = "Could not find that task. Click Refresh, then try again.";
    render(true);
    return;
  }
  if (!canMoveTask(task)) {
    state.saveState = "error";
    state.saveError = "You cannot move this task.";
    render(true);
    return;
  }
  if (task.status === "Review" || task.status === "Revisions") return;
  if (!taskHasDrive(task)) {
    state.saveState = "error";
    state.saveError = "Add a Drive link on the task before sending it to Review.";
    state.openTaskId = task.id;
    render(true);
    return;
  }
  // One click to Review. Late tasks keep a default reason so the move never blocks.
  if (task.due && task.due < today() && !task.delay_reason) {
    applyStatus(taskId, "Review", {
      delay_reason: "Workload pressure",
      delay_notified: false,
    });
    return;
  }
  applyStatus(taskId, "Review");
}

function reviewActionButton(task) {
  if (!(canMoveTask(task) && task.status === "In progress")) return null;
  return $("button", {
    class: "btn primary review-btn",
    type: "button",
    draggable: "false",
    onpointerdown: (e) => e.stopPropagation(),
    onmousedown: (e) => e.stopPropagation(),
    onclick: (e) => moveTaskToReview(task.id, e),
  }, "To Review");
}

function kanbanCard(task) {
  const toReview = reviewActionButton(task);
  return $("article", {
    class: `kcard ${taskTone(task)}`,
    draggable: canMoveTask(task) ? "true" : "false",
    ondragstart: (e) => {
      if (!canMoveTask(task) || e.target.closest("button, a, input, select, textarea, .kcard-actions, .review-btn")) {
        e.preventDefault();
        cardDidDrag = false;
        return;
      }
      cardDidDrag = true;
      dragTaskId = task.id;
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.setData("text", task.id);
      } catch (_) {}
      e.currentTarget.classList.add("dragging");
    },
    ondragend: (e) => {
      e.currentTarget.classList.remove("dragging");
      document.querySelectorAll(".kanban-col.drop").forEach((el) => el.classList.remove("drop"));
      cardDidDrag = false;
      setTimeout(() => {
        if (dragTaskId === task.id) dragTaskId = "";
      }, 250);
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
    (() => {
      const tags = [
        isOverdue(task) ? $("span", { class: "pill tone-red" }, "Overdue") : null,
        isDueToday(task) ? $("span", { class: "pill tone-orange" }, "Due today") : null,
        !taskHasDrive(task) && (task.status === "In progress" || task.status === "Review")
          ? $("span", { class: "pill tone-orange" }, "Need Drive")
          : null,
        task.status === "Revisions" ? $("span", { class: "pill tone-orange" }, "Edits") : null,
      ].filter(Boolean);
      return tags.length ? $("div", { class: "meta" }, tags) : null;
    })(),
    taskFactList(task),
    toReview ? $("div", { class: "kcard-actions" }, [toReview]) : null,
    canMarkDone(task) && (task.status === "Review" || task.status === "Revisions")
      ? $("div", { class: "kcard-actions" }, [
        $("button", {
          class: "btn primary review-btn",
          type: "button",
          draggable: "false",
          onpointerdown: (e) => e.stopPropagation(),
          onmousedown: (e) => e.stopPropagation(),
          onclick: (e) => markTaskDone(task.id, e),
        }, "Mark done"),
      ])
      : null,
  ]);
}

function doneDayOf(task) {
  return task.done_on || cairoDate(task.done_at) || "";
}

function dayLabel(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || "Earlier";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CAIRO,
  });
}

function viewDoneHistory(tasks) {
  const byDay = new Map();
  for (const task of tasks) {
    const day = doneDayOf(task) || "earlier";
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(task);
  }
  const days = [...byDay.keys()].sort((a, b) => String(b).localeCompare(String(a)));
  return $("div", { class: "done-history" }, days.map((day) =>
    $("div", { class: "done-day" }, [
      $("h4", {}, dayLabel(day)),
      ...byDay.get(day).map(kanbanCard),
    ])
  ));
}

function boardColumnOf(status) {
  return status === "Revisions" ? "Review" : status;
}

function tasksInBoardColumn(tasks, column) {
  if (column === "Review") return tasks.filter((t) => t.status === "Review" || t.status === "Revisions");
  return tasks.filter((t) => t.status === column);
}

function viewBoard() {
  const tasks = tasksForView();
  const day = today();
  const who = state.boardPerson;
  const client = state.boardClient;
  const board = $("div", { class: "kanban" },
    BOARD_STATUSES.map((status) => {
      const col = tasksInBoardColumn(tasks, status);
      const todayDone = status === "Done" ? col.filter((t) => doneDayOf(t) === day) : col;
      const prevDone = status === "Done" ? col.filter((t) => doneDayOf(t) !== day) : [];
      const shown = status === "Done" ? todayDone : col;
      const emptyLabel = status === "Done"
        ? "No tasks done today — finish something and mark it Done."
        : (canAssignTasks()
          ? "No tasks here. Create one or clear filters."
          : "Nothing here right now.");
      return $("section", {
        class: "kanban-col",
        ondragover: (e) => {
          e.preventDefault();
          if (status === "Done" && !canMarkDone()) {
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
          let id = "";
          try {
            id = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text") || "";
          } catch (_) {}
          id = id || dragTaskId;
          cardDidDrag = false;
          dragTaskId = "";
          const current = findTask(id);
          if (id && canSetStatus(status, current) && (status === "Done" ? canMarkDone(current) : canMoveTask(current))) {
            setStatus(id, status);
          }
        },
      }, [
        $("div", { class: "kanban-head" }, [
          $("h3", {}, status === "Done" ? "Done · today" : status),
          $("span", {}, String(shown.length)),
        ]),
        status === "Done" && prevDone.length
          ? $("button", {
            class: "btn ghost done-history-btn",
            type: "button",
            onclick: () => { state.doneHistoryOpen = !state.doneHistoryOpen; render(); },
          }, state.doneHistoryOpen ? "Hide previous tasks" : `See previous tasks · ${prevDone.length}`)
          : null,
        $("div", { class: "kanban-cards" }, [
          ...(shown.length ? shown.map(kanbanCard) : [$("p", { class: "empty" }, emptyLabel)]),
          status === "Done" && state.doneHistoryOpen && prevDone.length ? viewDoneHistory(prevDone) : null,
        ]),
        status === "Done"
          ? (canMarkDone()
            ? $("p", { class: "muted" }, "Mariam, Judi, leads, and admins can drop here or press Mark done. It saves to GitHub.")
            : $("p", { class: "muted" }, "Ask Mariam, Judi, your lead, or an admin to mark Done."))
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
  return $("div", { class: "page-stack board-wrap" }, [
    pageShell(pageHero(
      "Board",
      who || client
        ? [who ? `Person: ${who}.` : null, client ? `Client: ${client}.` : null, "Clear filters for the full board."].filter(Boolean).join(" ")
        : "Drag cards across columns. Done shows today’s finished work.",
      { label: "Cairo date", value: day }
    )),
    boardCockpit(),
    $("div", { class: "board-toolbar" }, [
      viewBoardFilter(),
      viewBoardClientFilter(),
    ]),
    who || client
      ? $("p", { class: "muted board-filter-note" }, [
        who ? `Person: ${who}. ` : "",
        client ? `Client: ${client}. ` : "",
        "Clear the filters above for the full board.",
      ].filter(Boolean).join(""))
      : null,
    board,
  ]);
}

function ensureHr() {
  if (!state.hrFile) state.hrFile = emptyHr();
  if (!state.hrFile.reviews) state.hrFile.reviews = [];
  if (!state.hrFile.attitude) state.hrFile.attitude = [];
  if (!state.hrFile.warnings) state.hrFile.warnings = [];
  if (!state.hrFile.work) state.hrFile.work = {};
  if (!state.hrFile.months) state.hrFile.months = {};
  if (!state.hrFile.payroll) state.hrFile.payroll = { base: {}, interns: [], scheduled_days: {}, manual: [], waived: [] };
  if (!state.hrFile.payroll.base) state.hrFile.payroll.base = {};
  if (!Array.isArray(state.hrFile.payroll.interns)) state.hrFile.payroll.interns = [];
  if (!state.hrFile.payroll.scheduled_days) state.hrFile.payroll.scheduled_days = {};
  if (!Array.isArray(state.hrFile.payroll.manual)) state.hrFile.payroll.manual = [];
  if (!Array.isArray(state.hrFile.payroll.waived)) state.hrFile.payroll.waived = [];
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

function isTaskEvaluated(task) {
  if (!task?.id) return false;
  return (ensureHr().reviews || []).some((r) => r.task_id === task.id);
}

function computedDelivery(name, month) {
  const m = month || thisMonth();
  const tasks = allTasks().filter((t) => {
    if (t.who !== name) return false;
    if (!["Review", "Revisions", "Done"].includes(t.status)) return false;
    const when = deliveryDate(t) || t.done_on || (isCurrentMonth(m) && t.status !== "Done" ? today() : "");
    return inMonth(when, m);
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

function modalOverlay(onClose, children, extraClass) {
  const guardedClose = () => {
    if (Date.now() < (state.modalGuardUntil || 0)) return;
    onClose();
  };
  const shell = $("div", {
    class: "modal-bg",
    onclick: (e) => {
      if (e.target === e.currentTarget) guardedClose();
    },
  }, [
    $("section", {
      class: extraClass ? `modal ${extraClass}` : "modal",
      role: "dialog",
      "aria-modal": "true",
      onclick: (e) => e.stopPropagation(),
    }, children),
  ]);
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      guardedClose();
    }
  };
  shell.addEventListener("keydown", onKey);
  setTimeout(() => {
    try { shell.focus(); } catch (_) {}
  }, 0);
  shell.tabIndex = -1;
  return shell;
}

function viewPromptModals() {
  const extra = [];
  if (state.pendingDelay) {
    const pending = state.pendingDelay;
    const reason = $("select", {}, DELAY_REASONS.map((r) => $("option", { value: r }, r)));
    const notified = $("input", { type: "checkbox" });
    const close = () => { state.pendingDelay = null; render(); };
    extra.push(modalOverlay(close, [
      $("p", { class: "muted" }, "Delay reason"),
      $("h2", {}, "This task is past the deadline"),
      $("p", { class: "muted" }, "A clear blocker is not a violation. Repeated delay without notice is escalated: feedback, then warning, then deduction later."),
      $("form", {
        class: "form",
        onsubmit: (e) => {
          e.preventDefault();
          if (!pending?.taskId) return;
          applyStatus(pending.taskId, pending.next || "Review", {
            delay_reason: reason.value,
            delay_notified: notified.checked,
          });
        },
      }, [
        $("label", {}, ["Why is it late?", reason]),
        $("label", { class: "done-check" }, [notified, "I notified the team in advance"]),
        $("div", { style: "display:flex;gap:8px" }, [
          $("button", { class: "btn primary", type: "submit" }, "Move to Review"),
          $("button", { class: "btn ghost", type: "button", onclick: close }, "Cancel"),
        ]),
      ]),
    ]));
  }
  if (state.pendingRevision) {
    const level = $("select", {}, REVISION_LEVELS.map((r) => $("option", { value: r }, r)));
    const reason = $("input", { placeholder: "Color change, reorder, full rethink…" });
    const close = () => { state.pendingRevision = null; render(); };
    extra.push(modalOverlay(close, [
      $("p", { class: "muted" }, "Revision"),
      $("h2", {}, "Classify this revision"),
      $("p", { class: "muted" }, "Minor is a small tweak. Medium is a large part. Major is a full rethink."),
      $("form", {
        class: "form",
        onsubmit: (e) => {
          e.preventDefault();
          const note = reason.value.trim();
          if (!note) {
            state.saveState = "error";
            state.saveError = "Add a short revision reason before sending back.";
            render(true);
            return;
          }
          applyStatus(state.pendingRevision.taskId, "Revisions", { revision_level: level.value, revision_reason: note });
        },
      }, [
        $("label", {}, ["Level", level]),
        $("label", {}, ["Reason (required)", reason]),
        $("div", { style: "display:flex;gap:8px" }, [
          $("button", { class: "btn primary", type: "submit" }, "Send to Revisions"),
          $("button", { class: "btn ghost", type: "button", onclick: close }, "Cancel"),
        ]),
      ]),
    ]));
  }
  if (state.evalTaskId && isAdmin()) extra.push(...viewEvalModal());
  if (state.editPersonName && isAdmin()) extra.push(...viewEditPersonModal());
  return extra;
}

function viewEditPersonModal() {
  const person = allPeople().find((p) => samePerson(p.name, state.editPersonName));
  if (!person) return [];
  const work = workFor(person.name);
  const name = $("input", { required: true, value: person.name || "" });
  const email = $("input", { type: "email", placeholder: "name@email.com", value: person.email || "" });
  const role = $("input", { value: person.role || "" });
  const home = $("select", {}, TEAM_HOMES.map((h) => $("option", { value: h, selected: h === person.home }, h)));
  const ptPicker = partTimeModelPicker(work.part_time_model || "3x8", { group: `edit-pt-${person.id || person.name}` });
  const ptWrap = $("div", {
    class: `people-pt-block${work.type === "Part-time" ? "" : " is-hidden"}`,
  }, [
    $("p", { class: "people-field-label" }, "Part-time model"),
    $("p", { class: "muted people-field-hint" }, "Pick one schedule. Day value in Salaries uses that model."),
    ptPicker.root,
  ]);
  const workType = $("select", {
    onchange: () => {
      ptWrap.classList.toggle("is-hidden", workType.value !== "Part-time");
    },
  }, WORK_TYPES.map((t) => $("option", { value: t, selected: t === work.type }, t)));
  const workMode = $("select", {}, WORK_MODES.map((m) => $("option", { value: m, selected: m === work.mode }, m)));
  const salary = $("input", {
    type: "number",
    min: "0",
    step: "50",
    value: String(payrollBase(person.name) || ""),
    placeholder: "Base salary EGP",
  });
  const salaryWrap = $("label", { class: "people-salary-field" }, ["Base salary (EGP)", salary]);
  const syncInternUi = (on) => {
    salary.required = !on;
    if (on) {
      salary.removeAttribute("required");
      salaryWrap.classList.add("is-dimmed");
    } else {
      salaryWrap.classList.remove("is-dimmed");
    }
  };
  const intern = internChoiceToggle(isPayrollIntern(person.name), { onChange: syncInternUi });
  syncInternUi(intern.checked);
  const close = () => { state.editPersonName = null; render(); };
  return [modalOverlay(close, [
    $("div", { class: "people-edit-head" }, [
      $("div", { class: "people-avatar people-avatar-lg", "aria-hidden": "true" }, personInitials(person.name)),
      $("div", {}, [
        $("p", { class: "people-kicker" }, "Edit person"),
        $("h2", {}, person.name),
        $("p", { class: "muted" }, "Login, role, team, salary, and schedule — syncs Salaries and HR."),
      ]),
    ]),
    $("form", {
      class: "form people-employ-form people-edit-form",
      onsubmit: (e) => {
        e.preventDefault();
        updatePerson(person.name, {
          name: name.value.trim(),
          email: email.value.trim(),
          role: role.value.trim(),
          home: home.value,
          workType: workType.value,
          workMode: workMode.value,
          partTimeModel: ptPicker.getValue(),
          salary: salary.value,
          intern: intern.checked,
        });
      },
    }, [
      $("label", {}, ["Name", name]),
      $("label", {}, ["Email", email]),
      $("label", {}, ["Role", role]),
      $("label", {}, ["Team", home]),
      $("label", {}, ["Work type", workType]),
      $("label", {}, ["Work mode", workMode]),
      salaryWrap,
      ptWrap,
      intern.root,
      $("div", { class: "people-add-actions" }, [
        $("button", { class: "btn primary", type: "submit" }, "Save changes"),
        $("button", { class: "btn ghost", type: "button", onclick: close }, "Cancel"),
      ]),
    ]),
  ], "wide")];
}

function viewEvalModal() {
  const task = findTask(state.evalTaskId);
  if (!task || !["Review", "Revisions", "Done"].includes(task.status)) return [];
  const person = people().find((p) => p.name === task.who);
  const track = qualityTrack(person);
  const existing = ensureHr().reviews.find((r) => r.task_id === task.id);
  const existingQuality = existing?.quality_avg || avg(Object.values(existing?.quality || {}));
  const delivery = scoreSelect(existing?.delivery);
  const quality = scoreSelect(existingQuality);
  const revision = scoreSelect(existing?.revision_rating);
  const creativity = scoreSelect(existing?.creativity);
  const close = () => { state.evalTaskId = null; render(); };
  return [modalOverlay(close, [
    $("p", { class: "muted" }, "Evaluation"),
    $("h2", {}, task.title),
    $("p", { class: "muted" }, `${task.who} · ${person?.role || track} · 5 excellent · 4 good · 3 average · 2 weak · 1 poor.`),
    $("form", {
      class: "form",
      onsubmit: (e) => {
        e.preventDefault();
        const qualityScore = Number(quality.value) || 0;
        const row = {
          id: existing?.id || `ev-${task.id}`,
          task_id: task.id,
          who: task.who,
          role: track,
          month: (deliveryDate(task) || today()).slice(0, 7),
          quarter: currentQuarter(deliveryDate(task) || today()),
          delivery: Number(delivery.value) || 0,
          quality: { overall: qualityScore },
          quality_avg: qualityScore,
          revision_rating: Number(revision.value) || 0,
          revision_count: task.revisions || 0,
          creativity: Number(creativity.value) || 0,
          notes: existing?.notes || "",
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
      $("label", {}, ["Delivery", delivery]),
      $("label", {}, ["Quality", quality]),
      $("label", {}, ["Revisions", revision]),
      $("label", {}, ["Creativity", creativity]),
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
  ])];
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

/** Salaries & deductions start counting from October 2026 (this month). */
const PAYROLL_START_MONTH = "2026-10";

const PAYROLL_CODES = {
  late_attendance: { label: "Late attendance", days: 0.5, auto: false, penalty: true },
  late_task: { label: "Late task delivery", days: 0.5, auto: true, penalty: true },
  missing_report: { label: "Missing daily report", days: 1, auto: true, penalty: true },
  missing_schedule: { label: "Missing weekly schedule (Thu 10pm)", days: 0.5, auto: false, penalty: true },
  absence: { label: "Absence without prior leave", days: 3, unpaid: 1, penalty_days: 2, auto: false, penalty: true },
  admin_instruction: { label: "Admin instruction breach", days: 1, max_days: 3, auto: false, penalty: true },
  poor_quality: { label: "Poor work quality", days: 1, auto: false, penalty: true },
  gross: { label: "Gross misconduct (investigation)", days: 0, auto: false, penalty: false },
};

function payrollMonthActive(month) {
  return String(month || "") >= PAYROLL_START_MONTH;
}

function clampPayrollMonth(month) {
  const m = month || thisMonth();
  return m < PAYROLL_START_MONTH ? PAYROLL_START_MONTH : m;
}

function emptyPayroll() {
  return {
    base: {},
    interns: [],
    scheduled_days: {},
    manual: [],
    waived: [],
    archived: {},
    sheet: null,
  };
}

function ensurePayroll() {
  const hr = ensureHr();
  if (!hr.payroll || typeof hr.payroll !== "object") hr.payroll = emptyPayroll();
  if (!hr.payroll.base) hr.payroll.base = {};
  if (!Array.isArray(hr.payroll.interns)) hr.payroll.interns = [];
  if (!hr.payroll.scheduled_days) hr.payroll.scheduled_days = {};
  if (!Array.isArray(hr.payroll.manual)) hr.payroll.manual = [];
  if (!Array.isArray(hr.payroll.waived)) hr.payroll.waived = [];
  if (!hr.payroll.sheet || typeof hr.payroll.sheet !== "object") hr.payroll.sheet = null;
  if (!hr.payroll.archived || typeof hr.payroll.archived !== "object") hr.payroll.archived = {};
  return hr.payroll;
}

function payrollBase(name) {
  const n = Number(ensurePayroll().base[name]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isPayrollIntern(name) {
  return ensurePayroll().interns.some((n) => samePerson(n, name));
}

function payrollScheduledDays(name, month) {
  const work = workFor(name);
  if (work.type === "Part-time" && work.part_time_model && partTimeModel(work.part_time_model)) {
    return scheduledDaysFromPartTimeModel(work.part_time_model, month);
  }
  const map = ensurePayroll().scheduled_days[name];
  if (map && Number(map[month]) > 0) return Number(map[month]);
  if (work.type === "Part-time" && Number(work.scheduled_days) > 0) return Number(work.scheduled_days);
  return 30;
}

function payrollDayValue(name, month) {
  const base = payrollBase(name);
  if (!base) return 0;
  const work = workFor(name);
  if (work.type === "Part-time") {
    const days = payrollScheduledDays(name, month) || 1;
    return base / days;
  }
  return base / 30;
}

function workdayNameSet(name) {
  const raw = String(workFor(name).days || "Sun–Thu").replace(/–/g, "-");
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const bits = raw.split(/[-,/]/).map((s) => s.trim()).filter(Boolean);
  if (bits.length === 2 && names.includes(bits[0]) && names.includes(bits[1])) {
    const a = names.indexOf(bits[0]);
    const b = names.indexOf(bits[1]);
    const set = new Set();
    for (let i = a; ; i = (i + 1) % 7) {
      set.add(names[i]);
      if (i === b) break;
    }
    return set;
  }
  const set = new Set(bits.filter((p) => names.includes(p)));
  return set.size ? set : new Set(["Sun", "Mon", "Tue", "Wed", "Thu"]);
}

function isWorkdayFor(name, date) {
  return workdayNameSet(name).has(cairoWeekday(date));
}

function payrollWaivedSet() {
  return new Set(ensurePayroll().waived || []);
}

function autoPayrollViolations(name, month) {
  const out = [];
  if (!payrollMonthActive(month)) return out;
  const waived = payrollWaivedSet();
  const dates = monthDates(month, { untilToday: true }).filter((d) => d >= `${PAYROLL_START_MONTH}-01`);

  for (const task of allTasks()) {
    if (!samePerson(task.who, name)) continue;
    if (!isLateTask(task) || delayExcused(task)) continue;
    const when = deliveryDate(task) || task.done_on || today();
    if (!inMonth(when, month)) continue;
    if (when < `${PAYROLL_START_MONTH}-01`) continue;
    const id = `auto-late-task-${task.id}`;
    if (waived.has(id)) continue;
    out.push({
      id,
      who: name,
      month,
      code: "late_task",
      days: 0.5,
      penalty_days: 0.5,
      unpaid_days: 0,
      source: "auto",
      ref: task.id,
      note: `Late task: ${task.title || task.id} (due ${task.due}, delivered ${when})`,
      date: when,
    });
  }

  for (const day of dates) {
    if (!isWorkdayFor(name, day)) continue;
    if (day === today()) continue;
    const mode = attendDaysFor(name, fridayStart(day))[day];
    if (mode === "Off") continue;
    if (reportFor(name, day)) continue;
    const id = `auto-report-${name}-${day}`;
    if (waived.has(id)) continue;
    out.push({
      id,
      who: name,
      month,
      code: "missing_report",
      days: 1,
      penalty_days: 1,
      unpaid_days: 0,
      source: "auto",
      ref: day,
      note: `No daily report on ${day}`,
      date: day,
    });
  }

  return out;
}

function manualPayrollViolations(name, month) {
  if (!payrollMonthActive(month)) return [];
  const waived = payrollWaivedSet();
  return (ensurePayroll().manual || []).filter((row) => {
    if (!samePerson(row.who, name)) return false;
    if (row.month && row.month !== month) return false;
    if (!row.month && row.date && !inMonth(row.date, month)) return false;
    if (row.date && row.date < `${PAYROLL_START_MONTH}-01`) return false;
    if (waived.has(row.id)) return false;
    return true;
  }).map((row) => {
    const meta = PAYROLL_CODES[row.code] || { label: row.code, days: Number(row.days) || 0 };
    let days = Number(row.days);
    if (!Number.isFinite(days) || days <= 0) days = meta.days || 0;
    if (row.code === "admin_instruction" && meta.max_days) days = Math.min(days, meta.max_days);
    const unpaid = row.code === "absence" ? (Number(row.unpaid_days) || meta.unpaid || 1) : 0;
    const penalty = row.code === "absence"
      ? (Number(row.penalty_days) || meta.penalty_days || 2)
      : days;
    return {
      ...row,
      days: row.code === "absence" ? unpaid + penalty : days,
      penalty_days: penalty,
      unpaid_days: unpaid,
      source: "manual",
      note: row.note || meta.label,
    };
  });
}

function payrollViolationsFor(name, month) {
  return [...autoPayrollViolations(name, month), ...manualPayrollViolations(name, month)]
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

function payrollCapDays() {
  return 5;
}

function summarizePayroll(name, month) {
  const base = payrollBase(name);
  const dayValue = payrollDayValue(name, month);
  const intern = isPayrollIntern(name);
  const violations = payrollViolationsFor(name, month);
  let penaltyDays = violations.reduce((s, v) => s + (Number(v.penalty_days) || 0), 0);
  const unpaidDays = violations.reduce((s, v) => s + (Number(v.unpaid_days) || 0), 0);
  const rawPenaltyDays = penaltyDays;
  const capped = Math.min(penaltyDays, payrollCapDays());
  const dropped = Math.max(0, rawPenaltyDays - capped);
  penaltyDays = capped;
  const penaltyAmount = dayValue * penaltyDays;
  const unpaidAmount = dayValue * unpaidDays;
  const totalDeduct = penaltyAmount + unpaidAmount;
  const net = Math.max(0, base - totalDeduct);
  const score = personScore(name, month);
  const extensionDays = intern ? (penaltyDays + unpaidDays) : 0;
  return {
    name,
    month,
    base,
    dayValue,
    halfDay: dayValue / 2,
    intern,
    violations,
    rawPenaltyDays,
    penaltyDays,
    unpaidDays,
    dropped,
    capDays: payrollCapDays(),
    penaltyAmount,
    unpaidAmount,
    totalDeduct,
    net: intern ? null : net,
    extensionDays,
    score,
    work: workFor(name),
  };
}

function formatEGP(n) {
  const v = Number(n) || 0;
  return `${v.toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP`;
}

function formatDays(n) {
  const v = Number(n) || 0;
  return `${v % 1 === 0 ? v : v.toFixed(1)} day${v === 1 ? "" : "s"}`;
}

function savePayrollSettings({ name, amount, month, partTimeModel: ptId, intern }) {
  const n = Number(amount);
  if (!name || !(n > 0 || intern)) {
    state.saveState = "error";
    state.saveError = "Enter a valid base salary (EGP), or mark Intern.";
    render();
    return;
  }
  const work = workFor(name);
  const type = work.type || "Full-time";
  if (type === "Part-time" && !partTimeModel(ptId)) {
    state.saveState = "error";
    state.saveError = "Pick a part-time model: 3 days×8h or 6 days×4h.";
    render();
    return;
  }
  applyPersonEmployment(name, {
    workType: type,
    workMode: work.mode || "Remote",
    partTimeModel: ptId,
    salary: amount,
    intern,
  });
  // Keep this month’s scheduled days in sync with the model (for older overrides).
  if (type === "Part-time" && month) {
    const pay = ensurePayroll();
    const days = scheduledDaysFromPartTimeModel(ptId, month);
    if (!pay.scheduled_days[name]) pay.scheduled_days[name] = {};
    pay.scheduled_days[name][month] = days;
  }
  saveHr(`payroll: settings for ${name}`);
}

function addManualPayrollViolation({ who, month, code, days, note }) {
  if (!payrollMonthActive(month)) {
    state.saveState = "error";
    state.saveError = `Deductions start from ${monthLabel(PAYROLL_START_MONTH)}.`;
    render();
    return;
  }
  const pay = ensurePayroll();
  const meta = PAYROLL_CODES[code];
  if (!meta) return;
  let d = Number(days);
  if (!Number.isFinite(d) || d <= 0) d = meta.days || 0;
  if (code === "admin_instruction") d = Math.min(Math.max(d, 1), meta.max_days || 3);
  const row = {
    id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    who,
    month,
    code,
    days: d,
    unpaid_days: code === "absence" ? 1 : 0,
    penalty_days: code === "absence" ? 2 : d,
    note: note || meta.label,
    by: state.who,
    date: today(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  pay.manual.push(row);
  saveHr(`payroll: ${code} for ${who}`);
}

function waivePayrollViolation(id) {
  if (!id) return;
  const pay = ensurePayroll();
  if (!pay.waived.includes(id)) pay.waived.push(id);
  saveHr(`payroll: waive ${id}`);
}

function payrollMembers() {
  // Include Amr — Sheet 2026 has his base salary for deductions/net pay.
  return people();
}

function viewPayroll() {
  if (!isAdmin()) return $("p", { class: "empty" }, "Admins only.");
  const month = clampPayrollMonth(state.payrollMonth || thisMonth());
  state.payrollMonth = month;
  const canPrev = shiftYm(month, -1) >= PAYROLL_START_MONTH;
  const roster = payrollMembers();
  if (state.payrollPerson && !roster.some((p) => p.name === state.payrollPerson)) state.payrollPerson = "";
  const who = state.payrollPerson || "";
  const rows = (who ? roster.filter((p) => samePerson(p.name, who)) : roster)
    .map((p) => summarizePayroll(p.name, month));
  const sheetMeta = ensurePayroll().sheet;

  const whoSel = $("select", {
    class: "date-select",
    onchange: (e) => { state.payrollPerson = e.target.value; render(); },
  }, [
    $("option", { value: "", selected: !who }, "Everyone"),
    ...roster.map((p) => $("option", { value: p.name, selected: p.name === who }, p.name)),
  ]);

  const codeSel = $("select", {}, Object.entries(PAYROLL_CODES).filter(([, m]) => m.days > 0 || m.label.includes("investigation")).map(([code, meta]) =>
    $("option", { value: code }, meta.label)
  ));
  const daysIn = $("input", { type: "number", min: "0.5", step: "0.5", value: "1", placeholder: "Days" });
  const noteIn = $("input", { placeholder: "Note (optional)" });
  const whoManual = $("select", {}, roster.map((p) => $("option", { value: p.name, selected: p.name === (who || roster[0]?.name) }, p.name)));

  return $("div", { class: "page-stack payroll-page" }, [
    pageShell(
      pageHero(
        "Salaries & performance",
        `Bases from Sheet 2026. Counting from ${monthLabel(PAYROLL_START_MONTH)}. Auto: late tasks + missing reports. Cap: 5 penalty days/month.`,
        { label: "Month", value: monthLabel(month) }
      ),
      $("div", { class: "page-body" }, [
        $("div", { class: "cal-nav" }, [
          $("button", {
            class: "btn ghost",
            type: "button",
            disabled: canPrev ? undefined : true,
            onclick: () => {
              if (!canPrev) return;
              state.payrollMonth = clampPayrollMonth(shiftYm(month, -1));
              render();
            },
          }, "Prev"),
          $("h2", {}, monthLabel(month)),
          $("button", { class: "btn ghost", type: "button", onclick: () => { state.payrollMonth = shiftYm(month, 1); render(); } }, "Next"),
          whoSel,
        ]),
        $("p", { class: "muted" }, `Deductions start ${monthLabel(PAYROLL_START_MONTH)}. Day = base ÷ 30 (full-time). Absence = unpaid day + 2 penalty days (unpaid outside the 5-day cap).`),
        sheetMeta?.file
          ? $("p", { class: "muted" }, `Imported from ${sheetMeta.file}${sheetMeta.imported_at ? ` · ${cairoDate(sheetMeta.imported_at)}` : ""}. Not on Helal board (skipped): عبدالله، تسنيم، رامز، محمد وائل. Judi / Aya / Salma / Rahma have no row in the sheet yet — set base manually.`)
          : null,
      ].filter(Boolean))
    ),

    pageSection("Team sheet", "Net pay after capped penalties. Performance score is from HR evaluations this month.", [
      $("div", { class: "table-wrap" }, [
        $("table", { class: "load-table payroll-table" }, [
          $("thead", {}, $("tr", {}, [
            $("th", {}, "Person"),
            $("th", {}, "Base"),
            $("th", {}, "Day"),
            $("th", {}, "Violations"),
            $("th", {}, "Penalty"),
            $("th", {}, "Unpaid"),
            $("th", {}, "Net / extend"),
            $("th", {}, "Perf."),
            $("th", {}, ""),
          ])),
          $("tbody", {}, rows.length ? rows.map((row) => {
            const tone = row.totalDeduct > 0 ? "tone-orange" : "";
            return $("tr", { class: tone }, [
              $("td", {}, [
                $("strong", {}, row.name),
                $("span", { class: "muted" }, (() => {
                  const pt = partTimeModel(row.work.part_time_model);
                  const kind = pt ? `${row.work.type} · ${pt.label}` : row.work.type;
                  return ` · ${kind}${row.intern ? " · Intern" : ""}`;
                })()),
              ]),
              $("td", {}, row.base ? formatEGP(row.base) : "— set base"),
              $("td", {}, row.base ? formatEGP(row.dayValue) : "—"),
              $("td", {}, String(row.violations.length)),
              $("td", {}, row.intern
                ? formatDays(row.penaltyDays)
                : `${formatDays(row.penaltyDays)}${row.dropped ? ` (capped −${formatDays(row.dropped)})` : ""} · ${formatEGP(row.penaltyAmount)}`),
              $("td", {}, row.unpaidDays ? `${formatDays(row.unpaidDays)} · ${formatEGP(row.unpaidAmount)}` : "—"),
              $("td", {}, row.intern
                ? `+${formatDays(row.extensionDays)} training`
                : (row.base ? formatEGP(row.net) : "—")),
              $("td", {}, row.score.total ? formatScore(row.score.total) : "—"),
              $("td", {}, $("button", {
                class: "btn compact",
                type: "button",
                onclick: () => { state.payrollPerson = row.name; render(); },
              }, "Open")),
            ]);
          }) : [$("tr", {}, $("td", { colspan: "9" }, $("p", { class: "empty" }, "No people.")))]),
        ]),
      ]),
    ]),

    who ? viewPayrollPerson(who, month) : null,

    pageSection("Set base salary", "Stored in HR. Part-time day value = base ÷ model days this month (3×8 or 6×4).", [
      (() => {
        const pick = who || roster[0]?.name || "";
        const pickWork = workFor(pick);
        const nameSel = $("select", {
          onchange: () => {
            state.payrollPerson = nameSel.value;
            render();
          },
        }, roster.map((p) => $("option", { value: p.name, selected: p.name === pick }, p.name)));
        const amount = $("input", {
          type: "number",
          min: "0",
          step: "50",
          placeholder: "Base salary EGP",
          value: String(payrollBase(pick) || ""),
        });
        const isPt = pickWork.type === "Part-time";
        const ptModel = $("select", {}, partTimeModelOptions(pickWork.part_time_model || "3x8"));
        const ptDays = isPt
          ? scheduledDaysFromPartTimeModel(pickWork.part_time_model || "3x8", month)
          : 0;
        const ptWrap = $("label", {
          class: isPt ? "" : "is-hidden",
        }, [
          "Part-time model",
          ptModel,
          isPt ? $("span", { class: "muted" }, ` → ${ptDays} scheduled days in ${monthLabel(month)}`) : null,
        ].filter(Boolean));
        const internBox = $("label", { class: "payroll-check" }, [
          $("input", {
            type: "checkbox",
            checked: isPayrollIntern(pick),
          }),
          " Intern (extend training days, no money deduction)",
        ]);
        return $("form", {
          class: "form payroll-form",
          onsubmit: (e) => {
            e.preventDefault();
            savePayrollSettings({
              name: nameSel.value,
              amount: amount.value,
              month,
              partTimeModel: ptModel.value,
              intern: !!internBox.querySelector("input")?.checked,
            });
          },
        }, [
          $("label", {}, ["Person", nameSel]),
          $("label", {}, ["Base salary (EGP)", amount]),
          ptWrap,
          internBox,
          $("button", { class: "btn primary", type: "submit" }, "Save salary settings"),
        ]);
      })(),
    ]),

    pageSection("Add manual violation", "Late attendance, absence, schedule, quality, admin breach — per the Helal penalties policy.", [
      $("form", {
        class: "form payroll-form",
        onsubmit: (e) => {
          e.preventDefault();
          addManualPayrollViolation({
            who: whoManual.value,
            month,
            code: codeSel.value,
            days: daysIn.value,
            note: noteIn.value.trim(),
          });
          noteIn.value = "";
        },
      }, [
        $("label", {}, ["Person", whoManual]),
        $("label", {}, ["Violation", codeSel]),
        $("label", {}, ["Days (admin breach max 3)", daysIn]),
        $("label", {}, ["Note", noteIn]),
        $("button", { class: "btn primary", type: "submit" }, "Add violation"),
      ]),
    ]),
  ].filter(Boolean));
}

function viewPayrollPerson(name, month) {
  const row = summarizePayroll(name, month);
  return pageSection(`${name} · ${monthLabel(month)}`, row.intern
    ? "Intern: violations extend training instead of cutting pay."
    : `Day value ${formatEGP(row.dayValue)} · half day ${formatEGP(row.halfDay)} · penalty cap ${row.capDays} days (${formatEGP(row.dayValue * row.capDays)}).`, [
    $("div", { class: "payroll-stats" }, [
      statBox(row.base ? formatEGP(row.base) : "—", "Base"),
      statBox(row.base ? formatEGP(row.dayValue) : "—", "Day value"),
      statBox(formatDays(row.penaltyDays), "Penalty days"),
      statBox(row.intern ? `+${formatDays(row.extensionDays)}` : formatEGP(row.net), row.intern ? "Training extend" : "Net pay"),
      statBox(row.score.total ? formatScore(row.score.total) : "—", "Performance"),
    ]),
    row.dropped
      ? $("p", { class: "banner warn" }, `Penalty days were ${formatDays(row.rawPenaltyDays)}; monthly cap kept ${formatDays(row.penaltyDays)} (dropped ${formatDays(row.dropped)}). Absence unpaid day stays outside the cap.`)
      : null,
    $("div", { class: "table-wrap" }, [
      $("table", { class: "load-table" }, [
        $("thead", {}, $("tr", {}, [
          $("th", {}, "Date"),
          $("th", {}, "Violation"),
          $("th", {}, "Days"),
          $("th", {}, "Amount"),
          $("th", {}, "Source"),
          $("th", {}, ""),
        ])),
        $("tbody", {}, row.violations.length ? row.violations.map((v) => {
          const meta = PAYROLL_CODES[v.code] || {};
          const amount = row.intern ? "—" : formatEGP(row.dayValue * ((Number(v.penalty_days) || 0) + (Number(v.unpaid_days) || 0)));
          return $("tr", {}, [
            $("td", {}, v.date || "—"),
            $("td", {}, [
              $("strong", {}, meta.label || v.code),
              $("p", { class: "muted" }, v.note || ""),
            ]),
            $("td", {}, [
              formatDays(v.days),
              v.unpaid_days ? $("span", { class: "muted" }, ` (${formatDays(v.unpaid_days)} unpaid + ${formatDays(v.penalty_days)} penalty)`) : null,
            ]),
            $("td", {}, amount),
            $("td", {}, v.source),
            $("td", {}, $("button", {
              class: "btn ghost compact",
              type: "button",
              onclick: () => waivePayrollViolation(v.id),
            }, "Waive")),
          ]);
        }) : [$("tr", {}, $("td", { colspan: "6" }, $("p", { class: "empty" }, "No violations this month.")))]),
      ]),
    ]),
  ]);
}


function viewHr() {
  const month = state.hrMonth || today().slice(0, 7);
  const roster = hrMembers();
  const teamTabs = state.hrTab === "scores" || state.hrTab === "tasks";
  if (teamTabs) {
    if (state.hrPerson && !roster.some((p) => p.name === state.hrPerson)) state.hrPerson = "";
  } else if (!state.hrPerson || !roster.some((p) => p.name === state.hrPerson)) {
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
  }, [
    teamTabs ? $("option", { value: "", selected: !state.hrPerson }, "Everyone") : null,
    ...roster.map((p) => $("option", { value: p.name, selected: p.name === state.hrPerson }, p.name)),
  ].filter(Boolean));
  return $("div", { class: "dash" }, [
    pageShell(
      pageHero(
        "HR",
        isCurrentMonth(month)
          ? "This month only. Past months keep their own Done tasks and scores."
          : "Archived month. Open work sits in the current month.",
        { label: "Month", value: monthLabel(month) }
      ),
      $("div", { class: "page-body" }, [
        $("div", { class: "hr-tabs" }, tabs.map(([id, label]) =>
          $("button", {
            class: state.hrTab === id ? "on" : "",
            onclick: () => { state.hrTab = id; render(); },
          }, label)
        )),
        $("div", { class: "cal-nav" }, [
          $("button", { class: "btn ghost", type: "button", onclick: () => { setBoardMonth(shiftYm(month, -1)); render(); } }, "Prev"),
          $("h2", {}, monthLabel(month)),
          $("button", { class: "btn ghost", type: "button", onclick: () => { setBoardMonth(shiftYm(month, 1)); render(); } }, "Next"),
          whoSel,
        ]),
      ])
    ),
    state.hrTab === "profile" ? viewHrProfile(month)
      : state.hrTab === "tasks" ? viewHrTasks(month)
      : state.hrTab === "attitude" ? viewHrAttitude(month)
      : state.hrTab === "warnings" ? viewHrWarnings(month)
      : state.hrTab === "rewards" ? viewHrRewards(month)
      : viewHrScores(month),
  ]);
}

function viewHrProfile(month) {
  const name = state.hrPerson || hrMembers()[0]?.name;
  const person = people().find((p) => p.name === name);
  if (!person) return $("p", { class: "empty" }, "Choose a teammate.");
  const m = month || state.hrMonth || thisMonth();
  const lastMonth = shiftYm(m, -1);
  const work = workFor(name);
  const load = loadForPerson(name, m);
  const score = personScore(name, m);
  const weights = ensureHr().weights;
  const tasks = allTasks().filter((t) => t.who === name);
  const current = isCurrentMonth(m);
  const open = current ? tasks.filter((t) => t.status !== "Done").sort((a, b) => (a.due || "").localeCompare(b.due || "")) : [];
  const doneMonth = tasks.filter((t) => t.status === "Done" && doneMonthOf(t) === m);
  const doneLast = tasks.filter((t) => t.status === "Done" && doneMonthOf(t) === lastMonth);
  const delivered = tasks.filter((t) => ["Review", "Revisions", "Done"].includes(t.status) && inMonth(deliveryDate(t) || t.done_on || (current ? today() : ""), m));
  const onTime = delivered.filter((t) => !isLateTask(t) || delayExcused(t)).length;
  const onTimePct = delivered.length ? `${Math.round((onTime / delivered.length) * 100)}%` : "—";
  const missingDrive = open.filter((t) => t.drive_missing);
  const revisions = tasks.filter((t) => (doneMonthOf(t) || t.month || assignedDate(t) || "").slice(0, 7) === m)
    .reduce((n, t) => n + (Number(t.revisions) || 0), 0);
  const liveHours = open.filter((t) => t.status === "In progress").reduce((n, t) => n + loggedHours(t), 0);
  const friday = fridayStart(current ? today() : `${m}-01`);
  const attend = attendDaysFor(name, friday);
  const days = weekDates(friday);
  const officeDays = days.filter((d) => attend[d] === "Office").length;
  const homeDays = days.filter((d) => attend[d] === "Home").length;
  const offDays = days.filter((d) => attend[d] === "Off").length;
  const reports = (state.reportsFile?.reports || []).filter((r) => r.who === name);
  const reportsMonth = reports.filter((r) => (r.date || "").startsWith(m)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const lastReport = [...reportsMonth].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const warningsAll = ensureHr().warnings.filter((wrow) => wrow.who === name);
  const warningsMonth = warningsAll.filter((wrow) => (wrow.date || "").startsWith(m));
  const attitudeRow = ensureHr().attitude.find((a) => a.who === name && a.month === m);
  const reviews = reviewsFor(name, m);
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
      statBox(formatScore(score.total), `${monthLabel(m)} score`, scoreTone(score.total)),
      statBox(load.open, current ? "Open now" : "Open (stored)", load.open >= 3 ? "tone-red" : ""),
      statBox(load.overdue, "Overdue", load.overdue ? "tone-red" : ""),
      statBox(load.done, `Done ${monthLabel(m)}`, load.done ? "tone-green" : ""),
      statBox(onTimePct, "On time this month", delivered.length && onTime / delivered.length < 0.8 ? "tone-orange" : ""),
      statBox(warningsMonth.length, "Warnings this month", warningsMonth.length ? "tone-orange" : ""),
    ]),
    $("div", { class: "profile-grid" }, [
      $("section", { class: "card" }, [
        $("h3", {}, "Performance"),
        $("p", { class: "muted" }, `${monthLabel(m)} · Delivery ${weights.delivery}% · Quality ${weights.quality}% · Revisions ${weights.revisions}% · Creativity ${weights.creativity}%. Attitude is this month.`),
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
          statBox(reportsMonth.length, `Reports · ${monthLabel(m).split(" ")[0]}`),
          statBox(warningsMonth.length, "Warnings this month", warningsMonth.length ? "tone-orange" : ""),
        ]),
      ]),
    ]),
    $("section", { class: "card" }, [
      $("h3", {}, current ? "Now" : `Open · ${monthLabel(m)}`),
      $("p", { class: "muted" }, current ? "Open tasks assigned to this person." : "Stored open count for this closed month. Live tasks sit in the current month."),
      table(open, current ? "Nothing open right now." : "No open tasks stored for this month."),
    ]),
    $("section", { class: "card" }, [
      $("h3", {}, `Done · ${monthLabel(m)}`),
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
        $("h3", {}, `Attitude · ${monthLabel(m)}`),
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
      $("h3", {}, `Evaluations · ${monthLabel(m)}`),
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
  const who = state.hrPerson;
  let rows = people().filter((p) => p.name !== "Amr").map((p) => ({ ...p, ...personScore(p.name, month) }));
  if (who) rows = rows.filter((r) => samePerson(r.name, who));
  const best = [...rows].sort((a, b) => b.total - a.total)[0];
  const monthTasks = tasksForMonth(month).filter((t) => !who || samePerson(t.who, who));
  const late = monthTasks.filter((t) => isLateTask(t) && !delayExcused(t));
  const missingDrive = monthTasks.filter((t) => t.drive_missing && t.status !== "To do");
  return $("div", { class: "dash" }, [
    $("p", { class: "muted" }, `${monthLabel(month)}${who ? ` · ${who}` : ""} · Delivery ${w.delivery}% · Quality ${w.quality}% · Revisions ${w.revisions}% · Creativity ${w.creativity}%. Attitude is scored separately this month.`),
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
          $("tbody", {}, rows.length ? rows.map((r) =>
            $("tr", {}, [
              $("td", {}, [$("strong", {}, r.name), $("span", { class: "muted" }, ` ${r.role || ""}`)]),
              $("td", { class: scoreTone(r.delivery) }, formatScore(r.delivery)),
              $("td", { class: scoreTone(r.quality) }, formatScore(r.quality)),
              $("td", { class: scoreTone(r.revisions) }, formatScore(r.revisions)),
              $("td", { class: scoreTone(r.creativity) }, formatScore(r.creativity)),
              $("td", { class: scoreTone(r.total) }, $("strong", {}, formatScore(r.total))),
              $("td", { class: scoreTone(r.attitude) }, formatScore(r.attitude)),
            ])
          ) : $("tr", {}, $("td", { colspan: "7" }, "No scores for this month yet."))),
        ]),
      ]),
    ]),
  ]);
}

function viewHrTasks(month) {
  const who = state.hrPerson;
  const tasks = [...allTasks()]
    .filter((t) => {
      if (who && !samePerson(t.who, who)) return false;
      if (isTaskEvaluated(t)) return false;
      if (t.status === "Done") return doneMonthOf(t) === month;
      if (!isCurrentMonth(month)) return false;
      return t.status === "Review" || t.status === "Revisions";
    })
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  return $("section", { class: "card" }, [
    $("p", { class: "muted" }, `${monthLabel(month)}${who ? ` · ${who}` : ""} · Review and Done this month that still need a score. After you evaluate a task, it leaves this tab.`),
    $("div", { class: "load-table-wrap" }, [
      $("table", { class: "load-table" }, [
        $("thead", {}, $("tr", {}, ["Task", "Employee", "Created by", "Assigned", "Start", "Deadline", "Delivery", "Status", "Delay", "Days", "Notice", "Drive", ""].map((h) => $("th", {}, h)))),
        $("tbody", {}, tasks.length ? tasks.map((t) =>
          $("tr", { class: isLateTask(t) && !delayExcused(t) ? "tone-orange" : "" }, [
            $("td", {}, [$("strong", {}, t.title), t.project ? $("span", { class: "muted" }, ` ${t.project}`) : null]),
            $("td", {}, t.who),
            $("td", {}, t.created_by || "—"),
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
        ) : $("tr", {}, $("td", { colspan: "13" }, "No tasks waiting for evaluation this month."))),
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
    $("p", { class: "muted" }, "Monthly scores will feed bonus and Best Employee later. Deductions stay off until Amr confirms the policy."),
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

function myWorkCard(task) {
  const toReview = reviewActionButton(task);
  const needsDrive = isMissingDrive(task);
  const isNew = isNewForMe(task);
  return $("article", {
    class: `card my-work-card ${taskTone(task)}${isOverdue(task) ? " tone-red" : ""}${isNew ? " is-new" : ""}`,
    onclick: () => { state.openTaskId = task.id; render(); },
  }, [
    $("div", { class: "my-work-card-top" }, [
      $("p", { class: "title" }, task.title),
      isNew ? $("span", { class: "pill tone-orange" }, "New") : null,
    ]),
    taskFactList(task),
    $("div", { class: "meta" }, [
      $("span", { class: `pill ${taskTone(task)}` }, boardColumnOf(task.status)),
      isOverdue(task) ? $("span", { class: "pill tone-red" }, "Overdue") : null,
      isDueToday(task) ? $("span", { class: "pill tone-orange" }, "Due today") : null,
      needsDrive ? $("span", { class: "pill tone-orange" }, "Need Drive") : null,
      task.status === "Revisions" ? $("span", { class: "pill tone-orange" }, "Edits") : null,
    ]),
    $("div", {
      class: "card-actions my-work-actions",
      onclick: (e) => e.stopPropagation(),
      onpointerdown: (e) => e.stopPropagation(),
    }, [
      toReview,
      needsDrive
        ? $("button", {
          class: "btn ghost compact",
          type: "button",
          onclick: () => { state.openTaskId = task.id; render(); },
        }, "Add Drive")
        : null,
      !toReview && !needsDrive
        ? $("button", {
          class: "btn ghost compact",
          type: "button",
          onclick: () => { state.openTaskId = task.id; render(); },
        }, "Open")
        : null,
    ].filter(Boolean)),
  ]);
}

function viewMy() {
  const openAll = tasksForView({ ignoreFocus: true }).filter((t) => t.status !== "Done");
  const open = tasksForView().filter((t) => t.status !== "Done");
  const month = thisMonth();
  const finished = allTasks().filter((t) => t.who === state.who && t.status === "Done" && doneMonthOf(t) === month);
  const dueN = openAll.filter(isDueToday).length;
  const overdueN = openAll.filter(isOverdue).length;
  const newN = openAll.filter(isNewForMe).length;
  const ready = open.filter((t) => t.status === "In progress" && taskHasDrive(t));
  const needDrive = open.filter(isMissingDrive);
  const other = open.filter((t) => !ready.includes(t) && !needDrive.includes(t));
  const section = (title, hint, list) => {
    if (!list.length) return null;
    return $("section", { class: "my-work-section" }, [
      $("div", { class: "my-work-section-head" }, [
        $("h3", {}, title),
        hint ? $("p", { class: "muted" }, hint) : null,
      ]),
      $("div", { class: "cards" }, list.map(myWorkCard)),
    ]);
  };
  // Mark current open tasks as seen after this visit paints.
  setTimeout(() => markMyWorkSeen(), 0);
  return [
    pageShell(pageHero(
      "My work",
      "Add a Drive link, then press To Review. It saves to GitHub.",
      { label: "Open now", value: String(openAll.length) }
    )),
    newN
      ? $("p", { class: "banner warn my-new-banner" }, `${newN} new for you since last visit.`)
      : null,
    isAdmin() ? null : myHrCard(),
    $("div", { class: "my-work-path" }, [
      $("strong", {}, "Phone path"),
      $("p", { class: "muted" }, "1) Add Drive · 2) To Review · 3) Wait for Done. Board kanban is optional."),
    ]),
    boardCockpit(),
    $("div", { class: "board-toolbar desktop-only" }, [viewBoardClientFilter()]),
    $("div", { class: "my-work-head" }, [
      $("div", {}, [
        $("h2", {}, "Open"),
        $("p", { class: "muted" }, "Your live tasks for this month."),
      ]),
      $("div", { class: "my-work-meta" }, [
        $("span", { class: "pill" }, `${openAll.length} open`),
        newN ? $("span", { class: "pill tone-orange" }, `${newN} new`) : null,
        dueN ? $("span", { class: "pill tone-orange" }, `${dueN} due today`) : null,
        overdueN ? $("span", { class: "pill tone-red" }, `${overdueN} overdue`) : null,
        $("span", { class: "pill tone-green" }, `${finished.length} done this month`),
      ]),
    ]),
    open.length
      ? $("div", { class: "my-work-stack" }, [
        section("Ready for review", "Drive is on — send these up.", ready),
        section("Need Drive first", "Open the card, paste the Drive link, then To Review.", needDrive),
        section("Other open", "To do, Review, or Revisions still on you.", other),
      ])
      : $("p", { class: "empty" }, "Nothing open right now. You’re clear — check Attendance or submit Report this evening."),
    $("section", { class: "done-section" }, [
      $("h2", {}, "Done"),
      $("p", { class: "muted" }, "When Amr, Moamen, or your lead check a task done, it stays here for the month and in the GitHub database."),
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

function monthDates(ym, { untilToday = true } = {}) {
  const [y, m] = String(ym || thisMonth()).split("-").map(Number);
  if (!y || !m) return [];
  const last = new Date(y, m, 0).getDate();
  const dates = [];
  for (let day = 1; day <= last; day += 1) {
    dates.push(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  if (untilToday && ym === thisMonth()) return dates.filter((d) => d <= today());
  if (untilToday && ym > thisMonth()) return [];
  return dates;
}

function matchesDashPerson(name) {
  if (!state.dashPerson) return true;
  return samePerson(name, state.dashPerson);
}

function dashPersonSelect() {
  return $("select", {
    class: "date-select",
    onchange: (e) => { state.dashPerson = e.target.value; render(); },
  }, [
    $("option", { value: "", selected: !state.dashPerson }, "Everyone"),
    ...people().map((p) => $("option", { value: p.name, selected: p.name === state.dashPerson }, p.name)),
  ]);
}

function cairoMs(date, hour = 0) {
  return Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00+03:00`);
}

function progressIntervalsFor(task) {
  const out = [];
  for (const row of task.time_log || []) {
    if (row.from === "In progress" && row.started_at && row.ended_at) {
      out.push({ start: row.started_at, end: row.ended_at, task });
    }
  }
  if (task.status === "In progress") {
    const start = progressStart(task) || taskFirstProgressAt(task);
    if (start) out.push({ start, end: new Date().toISOString(), task });
  } else if (!out.length) {
    const start = taskFirstProgressAt(task);
    if (!start) return [];
    const end = taskFirstReviewAt(task) || task.done_at || "";
    if (end) out.push({ start, end, task });
  }
  return out;
}

function addProgressSlice(buckets, startIso, endIso, month, task) {
  let t = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(t) || !Number.isFinite(end) || end <= t) return;
  for (let i = 0; i < 40 && t < end; i += 1) {
    const day = cairoDate(new Date(t).toISOString());
    if (!day) break;
    const next = cairoMs(addCairoDays(day, 1));
    const sliceEnd = Math.min(end, Number.isFinite(next) && next > t ? next : end);
    if (inMonth(day, month) && sliceEnd > t) {
      if (!buckets[day]) buckets[day] = { mins: 0, tasks: [], people: [] };
      buckets[day].mins += (sliceEnd - t) / 60000;
      if (task && !buckets[day].tasks.some((row) => row.id === task.id)) buckets[day].tasks.push(task);
      if (task?.who && !buckets[day].people.some((name) => samePerson(name, task.who))) buckets[day].people.push(task.who);
    }
    if (sliceEnd <= t) break;
    t = sliceEnd;
  }
}

function progressByDay(month, name) {
  const buckets = {};
  for (const task of allTasks()) {
    if (name && !samePerson(task.who, name)) continue;
    for (const row of progressIntervalsFor(task)) addProgressSlice(buckets, row.start, row.end, month, task);
  }
  return buckets;
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
  const assignees = (() => {
    if (isAdmin() || isSocial()) return people().filter((p) => p.name !== "Amr");
    if (isLead()) return people().filter((p) => managesPerson(p.name) || samePerson(p.name, state.who));
    return people().filter((p) => samePerson(p.name, state.who));
  })();
  const who = $("select", { disabled: !canAssignTasks(), required: true }, [
    canAssignTasks() ? $("option", { value: "", selected: !d.who }, "Choose teammate") : null,
    ...assignees.map((p) => $("option", { value: p.name, selected: p.name === d.who }, p.name)),
  ]);
  const space = $("select", {}, SPACES.map((s) => $("option", { value: s, selected: s === d.space }, s)));
  const project = $("select", {}, [
    $("option", { value: "", selected: !d.project }, "No client"),
    ...projectList().map((p) => $("option", { value: p.name, selected: p.name === d.project }, p.name)),
  ]);
  const title = $("input", { required: true, placeholder: "single visual | 4th Oct", value: d.title || "" });
  const briefHint = SPACE_BRIEFS[d.space] || "Brief, references, what done looks like.";
  const notes = $("textarea", { placeholder: briefHint }, d.notes || "");
  const drive = $("input", { type: "url", placeholder: "Drive folder (fills from client)", value: d.drive || "" });
  const nameHint = $("p", {
    class: `muted name-hint${d.title && !titleLooksNamed(d.title) ? " warn" : ""}`,
  }, d.title && !titleLooksNamed(d.title)
    ? "Tip: use type | publish day — e.g. single visual | 4th Oct"
    : "Name as type | publish day — e.g. single visual | 4th Oct.");
  const briefLine = $("p", { class: "muted brief-hint" }, `Brief guide · ${briefHint}`);
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
  space.addEventListener("change", () => {
    keep();
    notes.placeholder = SPACE_BRIEFS[space.value] || briefHint;
    briefLine.textContent = `Brief guide · ${notes.placeholder}`;
  });
  project.addEventListener("change", () => {
    keep();
    if (!drive.value) drive.value = driveForProject(project.value);
  });
  title.addEventListener("input", () => {
    keep();
    const bad = title.value.trim() && !titleLooksNamed(title.value);
    nameHint.className = `muted name-hint${bad ? " warn" : ""}`;
    nameHint.textContent = bad
      ? "Tip: use type | publish day — e.g. single visual | 4th Oct"
      : "Name as type | publish day — e.g. single visual | 4th Oct.";
  });
  notes.addEventListener("input", keep);
  drive.addEventListener("input", keep);
  const close = () => {
    state.creating = false;
    state.draft = null;
    render();
  };
  return $("form", {
    class: "form modal-create-form",
    onsubmit: (e) => {
      e.preventDefault();
      keep();
      const nextWho = who.value.trim();
      const nextTitle = title.value.trim();
      if (!nextWho || !nextTitle) {
        state.saveState = "error";
        state.saveError = !nextWho ? "Choose a teammate before creating the task." : "Add a task title before creating.";
        render(true);
        return;
      }
      assignTask({
        who: nextWho,
        space: space.value,
        project: project.value,
        title: nextTitle,
        notes: notes.value.trim(),
        due: state.dueDraft || today(),
        drive: drive.value.trim() || driveForProject(project.value),
        status: state.createStatus || "To do",
      });
    },
  }, [
    $("div", { class: "modal-create-head" }, [
      $("div", {}, [
        $("p", { class: "muted", style: "margin:0 0 4px" }, "New task"),
        $("h2", {}, "Create and assign"),
      ]),
      $("button", {
        class: "modal-close",
        type: "button",
        "aria-label": "Close",
        onclick: close,
      }, "×"),
    ]),
    $("div", { class: "modal-scroll" }, [
      nameHint,
      $("label", {}, ["Assign to", who]),
      $("label", {}, ["Client / folder", project]),
      $("label", {}, ["Space", space]),
      briefLine,
      $("label", {}, ["Task", title]),
      $("label", {}, ["Notes", notes]),
      $("div", {}, [
        $("p", { class: "muted", style: "margin:0 0 6px;font-size:12px;letter-spacing:0.04em;font-weight:500" }, "Due date"),
        dueCalendar(),
      ]),
      $("label", {}, ["Drive link", drive]),
    ]),
    $("div", { class: "modal-footer" }, [
      $("button", { class: "btn primary", type: "submit" }, "Create task"),
      $("button", { class: "btn ghost", type: "button", onclick: close }, "Cancel"),
    ]),
  ]);
}

function viewCreateModal() {
  if (!state.creating || !canAssignTasks()) return null;
  const close = () => { state.creating = false; state.draft = null; render(true); };
  return [modalOverlay(close, [createForm(close)], "modal-create")];
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
      (() => {
        const times = taskStageTimes(task);
        return [
          times.progressMins > 0
            ? $("p", { class: "time-line" }, `In progress: ${formatStageMinutes(times.progressMins, times.stillProgress)}`)
            : (hours > 0 ? $("p", { class: "time-line" }, `In progress: ${formatHours(hours)}`) : null),
          $("div", { class: "track-grid" }, [
            $("span", {}, `Assigned: ${task.who || "—"}`),
            $("span", {}, `Created by: ${task.created_by || "—"}`),
            $("span", {}, `Deadline: ${task.due || "—"}`),
            $("span", {}, `To do wait: ${formatStageMinutes(times.todoMins, times.stillTodo)}`),
            $("span", {}, `In progress: ${formatStageMinutes(times.progressMins, times.stillProgress)}`),
            $("span", {}, `Start ${startDate(task) || "—"}`),
            $("span", {}, `Delivery ${deliveryDate(task) || "—"}`),
            task.delay_reason ? $("span", {}, `Delay · ${task.delay_reason}`) : null,
            (task.revisions || 0) > 0 ? $("span", {}, `Revisions ${task.revisions}${task.revision_log?.length ? ` · ${task.revision_log[task.revision_log.length - 1].level}` : ""}`) : null,
          ]),
        ];
      })(),
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
        $("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [
          editable ? $("button", { class: "btn primary", type: "submit" }, "Save") : null,
          $("button", { class: "btn ghost", type: "button", onclick: close }, "Close"),
          canRemoveTask(task)
            ? $("button", {
              class: "btn danger",
              type: "button",
              onclick: () => removeTask(task.id),
            }, "Remove task")
            : null,
        ]),
      ]),
      $("div", { class: "form", style: "margin-top:12px" }, [
        $("div", { class: "statuses" }, [
          ...BOARD_STATUSES.map((s) =>
            $("button", {
              type: "button",
              class: boardColumnOf(task.status) === s ? "on" : "",
              disabled: !canSetStatus(s, task),
              onclick: () => { if (canSetStatus(s, task)) setStatus(task.id, s === "Review" && task.status === "Revisions" ? "Revisions" : s); },
            }, s)
          ),
          canMarkDone(task) && task.status !== "Done"
            ? $("button", {
              type: "button",
              class: "on",
              onclick: (e) => markTaskDone(task.id, e),
            }, "Mark done")
            : null,
        ]),
        isAdmin() && (task.status === "Review" || task.status === "Revisions" || task.status === "Done")
          ? $("button", {
            class: "btn ghost",
            type: "button",
            style: "margin-top:8px",
            onclick: () => { state.evalTaskId = task.id; render(); },
          }, "Evaluate quality")
          : null,
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

function reportDaySummary(day, who) {
  const dayReports = (state.reportsFile?.reports || []).filter((r) => r.date === day && (!who || samePerson(r.who, who)));
  const submittedNames = [...new Set(dayReports.map((r) => r.who))];
  const roster = who ? people().filter((p) => samePerson(p.name, who)) : people();
  const missing = roster.filter((p) => !submittedNames.includes(p.name));
  const chip = (name, tone) => $("span", { class: `name-chip ${tone}` }, name);
  const office = dayReports.filter((r) => r.place === "Office").map((r) => r.who);
  const remote = dayReports.filter((r) => r.place === "Remote").map((r) => r.who);
  return $("div", { class: "report-summary" }, [
    $("article", { class: "card" }, [
      $("h3", {}, "Submitted"),
      $("p", { class: "muted" }, who ? (submittedNames.length ? `${who} submitted` : `${who} has not submitted`) : `${submittedNames.length} of ${roster.length}`),
      submittedNames.length
        ? $("div", { class: "chip-row" }, submittedNames.map((name) => chip(name, "tone-green")))
        : $("p", { class: "empty" }, who ? "No report from this person on this day." : "Nobody has submitted yet."),
      office.length || remote.length
        ? $("p", { class: "muted", style: "margin-top:10px" }, [
          office.length ? `Office: ${office.join(", ")}. ` : "",
          remote.length ? `Remote: ${remote.join(", ")}.` : "",
        ].join(""))
        : null,
    ]),
    who ? null : $("article", { class: "card" }, [
      $("h3", {}, "Not yet"),
      $("p", { class: "muted" }, `${missing.length} missing`),
      missing.length
        ? $("div", { class: "chip-row" }, missing.map((p) => chip(p.name, "tone-orange")))
        : $("p", { class: "empty" }, "Everyone submitted."),
    ]),
  ]);
}

function reportCard(r) {
  const finishedTasks = normalizeFinishedTasks(r.finished_tasks);
  return $("article", { class: "card report-card" }, [
    $("p", { class: "title" }, `${r.who} · ${r.date}`),
    finishedTasks.length
      ? qaBlock("What did you finish today?", $("div", { class: "report-progress-list" }, finishedTasks.map((row) =>
        $("div", { class: "report-progress-row" }, [
          $("div", { class: "report-progress-main" }, [
            $("strong", {}, row.title || findTask(row.id)?.title || row.id),
            $("span", { class: "muted" }, [row.project, row.status].filter(Boolean).join(" · ") || "Task"),
          ]),
          $("strong", { class: "report-progress-pct" }, `${row.percent}%`),
          $("div", { class: "report-progress-bar", "aria-hidden": "true" }, [
            $("span", { style: `width:${row.percent}%` }),
          ]),
        ])
      )))
      : qaBlock("What did you finish today?", r.finished || "—"),
    finishedTasks.length && r.finished && r.finished !== finishedTasksSummary(finishedTasks)
      ? qaBlock("Extra notes", r.finished)
      : null,
    (r.blockers || []).length
      ? qaBlock("Blockers", $("div", { class: "chip-row" }, r.blockers.map((b) => $("span", { class: "pill tone-orange" }, b))))
      : null,
    r.unfinished ? qaBlock("What is unfinished or blocking you?", r.unfinished) : null,
    qaBlock("Drive links", r.drive
      ? $("a", { href: r.drive, target: "_blank", rel: "noreferrer" }, r.drive)
      : "—"),
    qaBlock("Were you remote or in the office today?", r.place || "—"),
    qaBlock("Do you need review?", r.need_review ? "Yes" : "No"),
  ]);
}

function viewCalendar() {
  const ym = state.calMonth || today().slice(0, 7);
  const who = state.dashPerson;
  const counts = {};
  for (const r of state.reportsFile?.reports || []) {
    if (!matchesDashPerson(r.who)) continue;
    counts[r.date] = (counts[r.date] || 0) + 1;
  }
  for (const t of allTasks()) {
    if (t.status === "Done" && t.done_on && matchesDashPerson(t.who)) counts[t.done_on] = (counts[t.done_on] || 0) + 1;
  }
  return $("section", { class: "card cal-wrap" }, [
    $("div", { class: "cal-nav" }, [
      $("button", { class: "btn ghost", type: "button", onclick: () => { setBoardMonth(shiftYm(ym, -1)); render(); } }, "Prev"),
      $("h2", {}, monthLabel(ym)),
      $("button", { class: "btn ghost", type: "button", onclick: () => { setBoardMonth(shiftYm(ym, 1)); render(); } }, "Next"),
      dashPersonSelect(),
    ]),
    $("p", { class: "muted" }, who
      ? `Reports for ${who} only. Switch the name to see someone else.`
      : "Pick a person to see only their reports this month, or pick a day."),
    $("div", { class: "cal-week" }, WEEKDAYS.map((d) => $("span", {}, d))),
    $("div", { class: "cal-grid" }, calendarDays(ym, state.reportDay, (date) => {
      state.reportDay = date;
      setBoardMonth(date.slice(0, 7));
      render();
    }, counts).map((el) => {
      el.className = el.className.replace("due-day", "cal-day");
      return el;
    })),
  ]);
}

function canSeeTime() {
  return isAdmin();
}

function timeFact(label, value) {
  return $("div", { class: "time-fact" }, [
    $("span", {}, label),
    $("strong", {}, value),
  ]);
}

function timeRoster(month) {
  const avg = (rows, key) => {
    const nums = rows.map((t) => taskStageTimes(t)[key]).filter((n) => n > 0);
    if (!nums.length) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  };
  return people()
    .filter((p) => p.name !== "Amr")
    .map((person) => {
      const tasks = [...tasksForMonth(month)].filter((t) => samePerson(t.who, person.name)).sort((a, b) => {
        const as = a.status === "Done" ? 1 : 0;
        const bs = b.status === "Done" ? 1 : 0;
        if (as !== bs) return as - bs;
        return (taskStageTimes(b).progressMins || 0) - (taskStageTimes(a).progressMins || 0);
      });
      const buckets = progressByDay(month, person.name);
      const open = tasks.filter((t) => t.status !== "Done");
      const done = tasks.filter((t) => t.status === "Done");
      const liveOpen = open.filter((t) => t.status === "In progress");
      return {
        person,
        tasks,
        buckets,
        progressMins: Math.round(Object.values(buckets).reduce((n, row) => n + (row.mins || 0), 0)),
        open: open.length,
        liveMins: Math.round(liveOpen.reduce((n, t) => {
          const start = progressStart(t);
          return n + (start ? minutesBetween(start, new Date().toISOString(), true) : 0);
        }, 0)),
        done: done.length,
        avgTodo: avg(open.filter((t) => t.status === "To do"), "todoMins"),
        avgProgress: avg(done, "progressMins"),
      };
    })
    .sort((a, b) => b.progressMins - a.progressMins || b.open - a.open || a.person.name.localeCompare(b.person.name));
}

function viewTimeTaskRow(task) {
  const times = taskStageTimes(task);
  const todo = times.todoMins || 0;
  const prog = times.progressMins || 0;
  const sum = todo + prog;
  return $("button", {
    type: "button",
    class: `time-task${task.status === "Done" ? " is-done" : ""}`,
    onclick: () => { state.openTaskId = task.id; render(); },
  }, [
    $("div", { class: "time-task-main" }, [
      $("strong", {}, task.title),
      $("span", { class: "muted" }, [task.project || "No client", task.due ? ` · due ${task.due}` : ""].filter(Boolean).join("")),
    ]),
    $("span", { class: `pill ${taskTone(task)}` }, task.status),
    timeFact("To do", formatStageMinutes(times.todoMins, times.stillTodo)),
    timeFact("In progress", formatStageMinutes(times.progressMins, times.stillProgress)),
    $("div", { class: "time-bar", "aria-hidden": "true" }, sum
      ? [
        $("span", { class: "wait", style: `width:${Math.round((todo / sum) * 100)}%` }),
        $("span", { class: "work", style: `width:${Math.round((prog / sum) * 100)}%` }),
      ]
      : null),
  ]);
}

function viewTimeSummary(allRows) {
  return $("section", { class: "card" }, [
    $("h3", {}, "Team summary"),
    $("p", { class: "muted" }, "One row per person for this month. Click a name to open their tasks. Task lists stay hidden here so the page stays readable."),
    $("div", { class: "load-table-wrap" }, [
      $("table", { class: "load-table time-summary" }, [
        $("thead", {}, $("tr", {}, [
          "Name", "In progress", "Live now", "Open", "Done", "Avg wait", "Avg in progress",
        ].map((h) => $("th", {}, h)))),
        $("tbody", {}, allRows.length ? allRows.map((row) =>
          $("tr", {
            class: "time-summary-row",
            onclick: () => { state.timePerson = row.person.name; state.timeFilter = "open"; state.timeDaysOpen = false; render(); },
          }, [
            $("td", {}, [
              $("strong", {}, row.person.name),
              $("span", { class: "muted" }, ` ${row.person.role || ""}`),
            ]),
            $("td", {}, formatMinutes(row.progressMins)),
            $("td", {}, row.liveMins ? formatMinutes(row.liveMins) : "—"),
            $("td", { class: row.open >= 3 ? "tone-orange" : "" }, String(row.open)),
            $("td", {}, String(row.done)),
            $("td", {}, formatMinutes(row.avgTodo)),
            $("td", {}, formatMinutes(row.avgProgress)),
          ])
        ) : $("tr", {}, $("td", { colspan: "7" }, "No people on the roster."))),
      ]),
    ]),
  ]);
}

function viewPersonTime(row, month) {
  const { person } = row;
  const filter = state.timeFilter || "open";
  const tasks = row.tasks.filter((t) => {
    if (filter === "open") return t.status !== "Done";
    if (filter === "done") return t.status === "Done";
    return true;
  });
  const dates = monthDates(month).filter((date) => (row.buckets[date]?.mins || 0) > 0).reverse();
  const filters = [
    ["open", `Open (${row.open})`],
    ["done", `Done (${row.done})`],
    ["all", `All (${row.tasks.length})`],
  ];
  return $("article", { class: "card time-person" }, [
    $("div", { class: "time-person-head" }, [
      $("div", {}, [
        $("h3", {}, person.name),
        $("p", { class: "muted" }, [person.role, person.home].filter(Boolean).join(" · ") || "Team"),
      ]),
      $("div", { class: "time-kpis" }, [
        timeFact("In progress", formatMinutes(row.progressMins)),
        timeFact("Live now", row.liveMins ? formatMinutes(row.liveMins) : "—"),
        timeFact("Open", String(row.open)),
        timeFact("Done", String(row.done)),
        timeFact("Avg wait", formatMinutes(row.avgTodo)),
        timeFact("Avg in progress", formatMinutes(row.avgProgress)),
      ]),
    ]),
    $("div", { class: "time-filters" }, filters.map(([id, label]) =>
      $("button", {
        type: "button",
        class: `time-chip${filter === id ? " on" : ""}`,
        onclick: () => { state.timeFilter = id; render(); },
      }, label)
    )),
    tasks.length
      ? $("div", { class: "time-tasks" }, tasks.map(viewTimeTaskRow))
      : $("p", { class: "empty" }, filter === "done"
        ? "No Done tasks this month."
        : filter === "open"
          ? (isCurrentMonth(month) ? "Nothing open right now." : "No open tasks stored for this month.")
          : (isCurrentMonth(month) ? "No tasks this month." : "No tasks stored for this month.")),
    dates.length
      ? $("div", { class: "time-days-wrap" }, [
        $("button", {
          type: "button",
          class: "btn ghost",
          onclick: () => { state.timeDaysOpen = !state.timeDaysOpen; render(); },
        }, state.timeDaysOpen ? "Hide day breakdown" : "Show day breakdown"),
        state.timeDaysOpen
          ? $("div", { class: "time-days" }, [
            $("p", { class: "time-days-label" }, "In progress by day"),
            ...dates.map((date) => {
              const bucket = row.buckets[date];
              return $("div", { class: "time-day" }, [
                $("span", {}, date),
                $("strong", {}, formatMinutes(Math.round(bucket.mins))),
                $("span", { class: "muted" }, (bucket.tasks || []).map((t) => t.title).join(", ") || "—"),
              ]);
            }),
          ])
          : null,
      ])
      : null,
  ]);
}

function viewTime() {
  const month = state.calMonth || thisMonth();
  const who = state.timePerson;
  const allRows = timeRoster(month);
  const focused = who ? allRows.find((row) => samePerson(row.person.name, who)) : null;
  const teamMins = allRows.reduce((n, row) => n + row.progressMins, 0);
  const teamOpen = (focused ? [focused] : allRows).reduce((n, row) => n + row.open, 0);
  const teamLive = (focused ? [focused] : allRows).reduce((n, row) => n + row.liveMins, 0);
  const withTime = allRows.filter((row) => row.progressMins > 0).length;
  return $("div", { class: "dash time-page" }, [
    pageShell(
      pageHero(
        "Time",
        isCurrentMonth(month)
          ? "To do waits until the card leaves To do. In progress stops at Review."
          : "Archived month. Open work lives in the current month.",
        { label: "Month", value: monthLabel(month) }
      ),
      $("div", { class: "page-body" }, [
        $("div", { class: "cal-nav" }, [
          $("button", { class: "btn ghost", type: "button", onclick: () => { setBoardMonth(shiftYm(month, -1)); render(); } }, "Prev"),
          $("h2", {}, monthLabel(month)),
          $("button", { class: "btn ghost", type: "button", onclick: () => { setBoardMonth(shiftYm(month, 1)); render(); } }, "Next"),
        ]),
        $("div", { class: "stat-row" }, [
          statBox(formatMinutes(focused ? focused.progressMins : teamMins), focused ? "In progress this month" : "Team in progress", (focused ? focused.progressMins : teamMins) ? "tone-green" : ""),
          statBox(formatMinutes(teamLive), "Live now"),
          statBox(String(teamOpen), "Open tasks"),
          statBox(focused ? String(focused.done) : String(withTime), focused ? "Done this month" : "People with time"),
        ]),
        $("div", { class: "time-roster" }, [
          $("button", {
            type: "button",
            class: `time-chip${!who ? " on" : ""}`,
            onclick: () => { state.timePerson = ""; state.timeDaysOpen = false; render(); },
          }, `Everyone · ${formatMinutes(teamMins)}`),
          ...allRows.map((row) => $("button", {
            type: "button",
            class: `time-chip${who && samePerson(row.person.name, who) ? " on" : ""}`,
            onclick: () => { state.timePerson = row.person.name; state.timeFilter = "open"; state.timeDaysOpen = false; render(); },
          }, `${row.person.name} · ${row.progressMins ? formatMinutes(row.progressMins) : "0m"}`)),
        ]),
      ])
    ),
    focused ? viewPersonTime(focused, month) : viewTimeSummary(allRows),
  ]);
}

function cairoDaysBack(n) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(addCairoDays(today(), -i));
  return out;
}

function viewLeadInbox() {
  if (!(isLead() || isSocial()) || isAdmin()) return null;
  const mine = allTasks().filter((t) => canSeeTask(t) && (managesPerson(t.who) || samePerson(t.created_by, state.who) || isSocial()));
  const waiting = mine.filter((t) => t.status === "Review" || t.status === "Revisions");
  const overdue = mine.filter(isOverdue);
  const due = mine.filter(isDueToday);
  const managed = isLead() ? managedNames() : [];
  const yesterday = addCairoDays(today(), -1);
  const missingReport = managed.filter((name) => !reportFor(name, yesterday) && !reportFor(name, today()));
  return $("section", { class: "card lead-inbox" }, [
    $("h2", {}, "Lead inbox"),
    $("p", { class: "muted" }, isLead()
      ? `People you manage: ${managed.join(", ") || "—"}. Review their work here first.`
      : "Social review queue — what needs you now."),
    $("div", { class: "stat-row dense" }, [
      statBox(waiting.length, "Waiting on you", waiting.length ? "tone-orange" : ""),
      statBox(overdue.length, "Overdue under you", overdue.length ? "tone-red" : ""),
      statBox(due.length, "Due today"),
      isLead() ? statBox(missingReport.length, "No report yet", missingReport.length ? "tone-orange" : "") : null,
    ]),
    missingReport.length
      ? $("p", { class: "muted" }, `No report from: ${missingReport.join(", ")}.`)
      : null,
  ]);
}

function chaseRoster() {
  if (isAdmin() || isSocial()) return people().filter((p) => p.name !== "Amr");
  if (isLead()) return people().filter((p) => managesPerson(p.name));
  return [];
}

function chaseSnapshot() {
  const day = today();
  const yesterday = addCairoDays(day, -1);
  const roster = chaseRoster();
  const rosterNames = new Set(roster.map((p) => p.name));
  const open = allTasks().filter((t) => isOpenTask(t) && canSeeTask(t));
  const overdue = open.filter(isOverdue);
  const waiting = open.filter((t) => t.status === "Review" || t.status === "Revisions");
  const noReportToday = roster.filter((p) => !reportFor(p.name, day));
  const noReportYesterday = roster.filter((p) => !reportFor(p.name, yesterday));
  const needReview = (state.reportsFile?.reports || [])
    .filter((r) => r.date === day && r.need_review && (isAdmin() || isSocial() || rosterNames.has(r.who) || samePerson(r.who, state.who)))
    .map((r) => r.who);
  return {
    day,
    yesterday,
    noReportToday: noReportToday.map((p) => p.name),
    noReportYesterday: noReportYesterday.map((p) => p.name),
    overdue: overdue.map((t) => `${t.who}: ${t.title}`),
    waiting: waiting.map((t) => `${t.who}: ${t.title}`),
    needReview: [...new Set(needReview)],
  };
}

function chaseText(snap) {
  const lines = [
    `Helal chase · ${snap.day}`,
    "",
    `No report today (${snap.noReportToday.length}): ${snap.noReportToday.join(", ") || "—"}`,
    `No report yesterday (${snap.noReportYesterday.length}): ${snap.noReportYesterday.join(", ") || "—"}`,
    `Overdue (${snap.overdue.length}): ${snap.overdue.join(" · ") || "—"}`,
    `Waiting review (${snap.waiting.length}): ${snap.waiting.join(" · ") || "—"}`,
    `Need review flag (${snap.needReview.length}): ${snap.needReview.join(", ") || "—"}`,
  ];
  return lines.join("\n");
}

function copyChaseList() {
  const text = chaseText(chaseSnapshot());
  const done = () => {
    state.saveState = "saved";
    state.saveNote = "Chase list copied. Paste it into WhatsApp.";
    render(true);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => {
      window.prompt("Copy this chase list:", text);
      done();
    });
    return;
  }
  window.prompt("Copy this chase list:", text);
  done();
}

function readSeenTaskIds(who) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_SEEN_TASKS) || "{}");
    const row = all[who] || all[String(who || "").toLowerCase()] || {};
    return new Set(Array.isArray(row.ids) ? row.ids : Object.keys(row.ids || {}));
  } catch (_) {
    return new Set();
  }
}

function writeSeenTaskIds(who, ids) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_SEEN_TASKS) || "{}");
    all[who] = { at: Date.now(), ids: [...ids] };
    localStorage.setItem(LS_SEEN_TASKS, JSON.stringify(all));
  } catch (_) {}
}

function myOpenTasks() {
  return allTasks().filter((t) => isOpenTask(t) && samePerson(t.who, state.who));
}

function isNewForMe(task) {
  if (!task || !samePerson(task.who, state.who) || !isOpenTask(task)) return false;
  return !readSeenTaskIds(state.who).has(task.id);
}

function newForMeTasks() {
  return myOpenTasks().filter(isNewForMe);
}

function markMyWorkSeen() {
  if (!state.who) return;
  const seen = readSeenTaskIds(state.who);
  for (const t of myOpenTasks()) seen.add(t.id);
  writeSeenTaskIds(state.who, seen);
}

function triageItems() {
  if (!canReviewTasks()) return [];
  const items = [];
  const waiting = allTasks().filter((t) =>
    (t.status === "Review" || t.status === "Revisions") && canSeeTask(t) && canMarkDone(t)
  );
  for (const t of waiting.slice(0, 8)) {
    items.push({
      kind: "review",
      tone: "tone-orange",
      title: t.title,
      meta: `${t.who}${t.project ? ` · ${t.project}` : ""} · ${t.status}`,
      go: () => { state.openTaskId = t.id; render(); },
      action: canMarkDone(t)
        ? { label: "Mark done", run: (e) => markTaskDone(t.id, e) }
        : null,
    });
  }
  if (isAdmin()) {
    for (const req of pendingAttendRequests().slice(0, 5)) {
      items.push({
        kind: "attend",
        tone: "tone-orange",
        title: `${req.who} · attendance change`,
        meta: `${req.date}: ${req.from || "—"} → ${req.to}`,
        go: () => { state.view = "attend"; render(); },
        action: {
          label: "Approve",
          run: () => decideAttendRequest(req.id, "Approved"),
        },
      });
    }
  }
  const flagged = (state.reportsFile?.reports || [])
    .filter((r) => r.date === today() && r.need_review && (isAdmin() || isSocial() || managesPerson(r.who)))
    .slice(0, 5);
  for (const r of flagged) {
    items.push({
      kind: "report",
      tone: "",
      title: `${r.who} asked for review`,
      meta: `Report · ${r.date}${r.place ? ` · ${r.place}` : ""}`,
      go: () => {
        state.view = "review";
        state.dashPerson = r.who;
        state.reportDay = r.date;
        render();
      },
      action: null,
    });
  }
  return items;
}

function viewTriageInbox() {
  if (!canReviewTasks()) return null;
  const items = triageItems();
  const waitingN = allTasks().filter((t) =>
    (t.status === "Review" || t.status === "Revisions") && canSeeTask(t) && canMarkDone(t)
  ).length;
  const attendN = isAdmin() ? pendingAttendRequests().length : 0;
  const flagN = (state.reportsFile?.reports || []).filter((r) =>
    r.date === today() && r.need_review && (isAdmin() || isSocial() || managesPerson(r.who))
  ).length;
  return $("section", { class: "card triage-inbox" }, [
    $("div", { class: "triage-head" }, [
      $("div", {}, [
        $("h2", {}, "Triage inbox"),
        $("p", { class: "muted" }, "What needs you now — Review, attendance, and report flags."),
      ]),
      $("div", { class: "triage-pills" }, [
        waitingN ? $("span", { class: "pill tone-orange" }, `${waitingN} review`) : null,
        attendN ? $("span", { class: "pill tone-orange" }, `${attendN} attendance`) : null,
        flagN ? $("span", { class: "pill" }, `${flagN} report flags`) : null,
        !waitingN && !attendN && !flagN ? $("span", { class: "pill tone-green" }, "Clear") : null,
      ]),
    ]),
    items.length
      ? $("div", { class: "triage-list" }, items.map((item) =>
        $("div", { class: `triage-row ${item.tone || ""}` }, [
          $("button", {
            type: "button",
            class: "triage-main",
            onclick: item.go,
          }, [
            $("strong", {}, item.title),
            $("span", { class: "muted" }, item.meta),
          ]),
          item.action
            ? $("button", {
              type: "button",
              class: "btn primary compact",
              onclick: (e) => {
                e.stopPropagation();
                item.action.run(e);
              },
            }, item.action.label)
            : null,
        ])
      ))
      : $("p", { class: "empty" }, "Inbox is clear. Nothing waiting on you right now."),
  ]);
}

function viewChaseList() {
  if (!isAdmin() && !isSocial() && !isLead()) return null;
  const snap = chaseSnapshot();
  const line = (label, items, tone) => $("div", { class: "chase-line" }, [
    $("strong", { class: tone || "" }, `${label} · ${items.length}`),
    $("p", { class: "muted" }, items.length ? items.join(", ") : "None."),
  ]);
  return $("section", { class: "card chase-card" }, [
    $("div", { class: "chase-head" }, [
      $("div", {}, [
        $("h2", {}, "Chase list"),
        $("p", { class: "muted" }, "Today’s gaps — copy once, paste into WhatsApp."),
      ]),
      $("button", {
        class: "btn primary compact",
        type: "button",
        onclick: copyChaseList,
      }, "Copy chase list"),
    ]),
    line("No report today", snap.noReportToday, snap.noReportToday.length ? "tone-orange" : ""),
    line("No report yesterday", snap.noReportYesterday, snap.noReportYesterday.length ? "tone-orange" : ""),
    line("Overdue", snap.overdue, snap.overdue.length ? "tone-red" : ""),
    line("Waiting review", snap.waiting, snap.waiting.length ? "tone-orange" : ""),
    line("Need review flag", snap.needReview, snap.needReview.length ? "tone-orange" : ""),
  ]);
}

function viewOwnerDigest() {
  if (!isAdmin()) return null;
  const week = cairoDaysBack(7);
  const open = allTasks().filter(isOpenTask);
  const overdue = open.filter(isOverdue);
  const waiting = open.filter((t) => t.status === "Review" || t.status === "Revisions");
  const shipped = allTasks().filter((t) => t.status === "Done" && week.includes(t.done_on));
  const roster = people().filter((p) => p.name !== "Amr");
  const yesterday = addCairoDays(today(), -1);
  const noReport = roster.filter((p) => !reportFor(p.name, yesterday));
  const byClient = {};
  for (const t of open) {
    const key = String(t.project || "").trim() || "No client";
    if (!byClient[key]) byClient[key] = { open: 0, overdue: 0 };
    byClient[key].open += 1;
    if (isOverdue(t)) byClient[key].overdue += 1;
  }
  const clientRows = Object.entries(byClient)
    .sort((a, b) => b[1].overdue - a[1].overdue || b[1].open - a[1].open)
    .slice(0, 6);
  return $("section", { class: "card owner-digest" }, [
    $("h2", {}, "Weekly owner digest"),
    $("p", { class: "muted" }, "Last 7 Cairo days. Use this before chasing people on WhatsApp."),
    $("div", { class: "stat-row dense" }, [
      statBox(open.length, "Open now"),
      statBox(overdue.length, "Overdue", overdue.length ? "tone-red" : ""),
      statBox(waiting.length, "In review", waiting.length ? "tone-orange" : ""),
      statBox(shipped.length, "Shipped this week", shipped.length ? "tone-green" : ""),
      statBox(noReport.length, "No report yesterday", noReport.length ? "tone-orange" : ""),
    ]),
    noReport.length
      ? $("p", { class: "muted" }, `Missing yesterday’s report: ${noReport.map((p) => p.name).join(", ")}.`)
      : $("p", { class: "muted" }, "Everyone filed yesterday’s report (or it is still early)."),
    $("h3", { style: "margin:18px 0 8px" }, "Client health"),
    clientRows.length
      ? $("div", { class: "client-health" }, clientRows.map(([name, row]) =>
        $("button", {
          type: "button",
          class: "client-health-row",
          onclick: () => {
            state.view = "board";
            state.boardClient = name === "No client" ? "" : name;
            state.boardFocus = row.overdue ? "overdue" : "";
            render();
          },
        }, [
          $("strong", {}, name),
          $("span", {}, `${row.open} open`),
          $("span", { class: row.overdue ? "tone-red" : "muted" }, `${row.overdue} overdue`),
        ])
      ))
      : $("p", { class: "empty" }, "No open client work."),
    $("h3", { style: "margin:18px 0 8px" }, "Shipped this week"),
    shipped.length
      ? $("div", { class: "shipped-list" }, shipped.slice(0, 12).map((t) =>
        $("p", {}, [
          $("strong", {}, t.title),
          $("span", { class: "muted" }, ` · ${t.who}${t.project ? ` · ${t.project}` : ""} · ${t.done_on}`),
        ])
      ))
      : $("p", { class: "empty" }, "Nothing marked Done in the last 7 days."),
  ]);
}

function viewReview() {
  const month = state.calMonth || thisMonth();
  const current = isCurrentMonth(month);
  const day = state.reportDay && String(state.reportDay).startsWith(month)
    ? state.reportDay
    : (current ? today() : `${month}-01`);
  const who = state.dashPerson;
  const waiting = current
    ? allTasks().filter((t) => (t.status === "Review" || t.status === "Revisions") && matchesDashPerson(t.who) && canSeeTask(t))
    : [];
  const doneDay = allTasks().filter((t) => t.status === "Done" && t.done_on === day && matchesDashPerson(t.who) && canSeeTask(t));
  const doneMonth = allTasks().filter((t) => t.status === "Done" && doneMonthOf(t) === month && matchesDashPerson(t.who) && canSeeTask(t));
  const allReports = [...(state.reportsFile?.reports || [])]
    .filter((r) => matchesDashPerson(r.who))
    .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
  const monthReports = allReports.filter((r) => (r.date || "").startsWith(month));
  const dayReports = allReports.filter((r) => r.date === day);
  const adminDash = isAdmin();
  const personLabel = who ? ` · ${who}` : "";
  return $("div", { class: "dash" }, [
    pageShell(pageHero(
      adminDash ? "Dashboard" : "Review",
      adminDash
        ? "Reports, attendance requests, and work waiting on review."
        : "Check Review cards, mark Done, and follow up on your team.",
      { label: "Cairo date", value: day }
    )),
    viewTriageInbox(),
    viewChaseList(),
    viewOwnerDigest(),
    viewLeadInbox(),
    adminDash ? viewCalendar() : null,
    adminDash ? $("section", {}, [
      $("h2", {}, `Reports · ${day}${personLabel}`),
      $("p", { class: "muted" }, who
        ? `Only ${who}’s reports. Switch the name next to the calendar to see someone else.`
        : "Every saved report is kept. Pick a person next to the calendar, or pick a day. Time tracking is on the Time tab."),
      reportDaySummary(day, who),
      dayReports.length
        ? $("div", { class: "cards", style: "margin-top:18px" }, dayReports.map(reportCard))
        : $("p", { class: "empty" }, who ? `No report from ${who} on this day.` : "No report submissions on this day yet."),
    ]) : null,
    adminDash ? $("section", {}, [
      $("h2", {}, `Saved reports · ${monthLabel(month)}${personLabel}`),
      $("p", { class: "muted" }, monthReports.length
        ? `${monthReports.length} saved this month${who ? ` for ${who}` : ""}. Newest first. Older months stay stored.`
        : (who ? `No reports from ${who} this month.` : "No reports stored for this month.")),
      monthReports.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, monthReports.map(reportCard))
        : $("p", { class: "empty" }, who ? `No reports from ${who} this month.` : "No reports saved this month yet."),
    ]) : null,
    adminDash ? $("section", {}, [
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
    ]) : null,
    $("section", {}, [
      $("h2", {}, "Waiting on review"),
      $("p", { class: "muted" }, "When a member moves a task to Review, it lands here. Check it done. It stays in Done on the board, here, and on My work."),
      waiting.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, waiting.map((t) =>
          $("article", { class: `card review-card ${taskTone(t)}` }, [
            $("p", { class: "title" }, t.title),
            taskFactList(t),
            $("div", { class: "meta" }, [
              $("span", { class: `pill ${taskTone(t)}` }, t.status),
            ]),
            t.drive ? $("a", { href: t.drive, target: "_blank", rel: "noreferrer" }, "Open Drive") : null,
            $("div", { style: "display:flex;gap:8px;flex-wrap:wrap;align-items:center" }, [
              canMarkDone(t)
                ? $("button", {
                  class: "btn primary compact",
                  type: "button",
                  onclick: (e) => markTaskDone(t.id, e),
                }, "Mark done")
                : null,
              isAdmin()
                ? $("button", {
                  class: "btn ghost compact",
                  type: "button",
                  onclick: () => { state.evalTaskId = t.id; render(); },
                }, "Evaluate")
                : null,
            ]),
          ])
        ))
        : $("p", { class: "empty" }, "Nothing in Review."),
    ]),
    $("section", { class: "done-section" }, [
      $("h2", {}, `Done · ${day}${personLabel}`),
      $("p", { class: "muted" }, "Checked work stays here and on the member’s Done list. It is stored in helal/daily-tasks.json on GitHub."),
      doneDay.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, doneDay.map((t) => doneCard(t, { checked: true })))
        : $("p", { class: "empty" }, who ? `No done tasks for ${who} on this day.` : "No tasks marked done on this day."),
    ]),
    $("section", { class: "done-section" }, [
      $("h2", {}, `Done this month · ${monthLabel(month)}${personLabel}`),
      doneMonth.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, doneMonth.map((t) => doneCard(t, { checked: true })))
        : $("p", { class: "empty" }, who ? `No done tasks for ${who} this month.` : "No done tasks stored this month yet."),
    ]),
  ]);
}

function pageHero(title, subtitle, pill) {
  return $("header", { class: "page-hero" }, [
    $("div", { class: "page-hero-copy" }, [
      $("h2", {}, title),
      subtitle ? $("p", { class: "muted" }, subtitle) : null,
    ]),
    pill
      ? $("div", { class: "page-pill" }, [
        $("span", {}, pill.label || "Cairo"),
        $("strong", {}, pill.value),
      ])
      : null,
  ]);
}

function pageShell(hero, ...body) {
  const kids = body.flat().filter(Boolean);
  return $("section", { class: "page-shell" }, [hero, ...kids]);
}

function pageSection(title, hint, body) {
  return $("section", { class: "page-section" }, [
    $("div", { class: "page-section-head" }, [
      $("strong", {}, title),
      hint ? $("p", { class: "muted" }, hint) : null,
    ]),
    ...(Array.isArray(body) ? body : [body]),
  ]);
}

function bootScreen(message, isError) {
  return $("div", { class: `boot-screen${isError ? " is-error" : ""}`, role: "status", "aria-live": "polite" }, [
    $("div", { class: "boot-mark-wrap" }, [
      $("img", { class: "boot-mark", src: "./assets/helal-mark.png", alt: "", width: "88", height: "88" }),
      $("span", { class: "boot-ring", "aria-hidden": "true" }),
    ]),
    $("strong", { class: "boot-title" }, "Helal"),
    $("p", { class: "boot-copy" }, message),
  ]);
}

function reportHero(day, subtitle) {
  return pageHero("Daily report", subtitle, { label: "Cairo date", value: day });
}

function reportStep(num, title, hint, body) {
  return $("section", { class: "report-step" }, [
    $("div", { class: "report-step-head" }, [
      $("span", { class: "report-step-num", "aria-hidden": "true" }, String(num)),
      $("div", { class: "report-step-title" }, [
        $("strong", {}, title),
        hint ? $("p", { class: "muted" }, hint) : null,
      ]),
    ]),
    ...(Array.isArray(body) ? body : [body]),
  ]);
}

function viewReport() {
  const day = today();
  const mine = reportFor(state.who, day);
  if (mine && !state.reportEditing) {
    return $("div", { class: "report-page" }, [
      $("section", { class: "report-shell" }, [
        reportHero(day, "One report per day. You can amend today’s report if something changed."),
        $("div", { class: "report-step" }, [
          $("p", { class: "report-done-banner" }, "You already submitted today’s report."),
          $("div", { class: "report-amend-actions" }, [
            $("button", {
              class: "btn primary compact",
              type: "button",
              onclick: () => startReportEdit(mine),
            }, "Edit today’s report"),
          ]),
        ]),
      ]),
      reportCard(mine),
    ]);
  }
  const draft = reportDraft();
  const amending = !!(mine && state.reportEditing);
  const reportTasks = allTasks()
    .filter((t) => samePerson(t.who, state.who) && (t.status === "In progress" || t.status === "Review"))
    .sort((a, b) => {
      const rank = { "In progress": 0, Review: 1 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || String(a.title || "").localeCompare(String(b.title || ""));
    });
  const draftMap = Object.fromEntries((draft.finished_tasks || []).map((row) => [row.id, row]));
  const notes = $("textarea", { placeholder: "Meetings, extras, or anything not on the board" }, draft.finished);
  const drive = $("input", { type: "url", placeholder: "https://drive.google.com/…", value: draft.drive || "" });
  const need = $("input", {
    type: "checkbox",
    class: "report-task-input",
    checked: !!draft.need_review,
    "aria-label": "I need review",
  });
  const needMark = $("span", { class: "report-task-mark", "aria-hidden": "true" });
  const needToggle = $("label", { class: `report-toggle${draft.need_review ? " on" : ""}` }, [
    need,
    needMark,
    $("span", { class: "report-toggle-copy" }, [
      $("strong", {}, "I need review"),
      $("span", {}, "Flag this report for Amr or your lead"),
    ]),
  ]);
  const remote = $("input", { type: "radio", name: "report-place", value: "Remote", required: true, checked: draft.place === "Remote" });
  const office = $("input", { type: "radio", name: "report-place", value: "Office", required: true, checked: draft.place === "Office" });
  const remotePick = $("label", { class: `place-pick${draft.place === "Remote" ? " on" : ""}` }, [
    remote,
    $("span", { class: "place-pick-dot", "aria-hidden": "true" }),
    "Remote",
  ]);
  const officePick = $("label", { class: `place-pick${draft.place === "Office" ? " on" : ""}` }, [
    office,
    $("span", { class: "place-pick-dot", "aria-hidden": "true" }),
    "Office",
  ]);
  const syncPlace = () => {
    remotePick.classList.toggle("on", remote.checked);
    officePick.classList.toggle("on", office.checked);
  };
  remote.addEventListener("change", syncPlace);
  office.addEventListener("change", syncPlace);
  need.addEventListener("change", () => needToggle.classList.toggle("on", need.checked));
  let selectedBlockers = [...draft.blockers];
  const blockerChips = BLOCKER_TAGS.map((tag) => {
    const chip = $("button", {
      type: "button",
      class: `time-chip${selectedBlockers.includes(tag) ? " on" : ""}`,
      onclick: (e) => {
        e.preventDefault();
        if (selectedBlockers.includes(tag)) {
          selectedBlockers = selectedBlockers.filter((b) => b !== tag);
          chip.classList.remove("on");
        } else {
          selectedBlockers = [...selectedBlockers, tag];
          chip.classList.add("on");
        }
        keep();
      },
    }, tag);
    return chip;
  });
  const percentOptions = [25, 50, 75, 100];
  const footCount = $("strong", {}, "0 tasks selected");
  const footHint = $("p", { class: "muted" }, "Pick tasks and a finish % — draft saves as you go.");
  const syncFoot = (count) => {
    footCount.textContent = count === 1 ? "1 task selected" : `${count} tasks selected`;
    footHint.textContent = count
      ? "Looking good. Submit when you’re done."
      : "Pick tasks and a finish % — draft saves as you go.";
  };
  const taskRows = reportTasks.map((t) => {
    const saved = draftMap[t.id];
    let selected = !!saved;
    let percent = Number(saved?.percent) || 0;
    if (percent && !percentOptions.includes(percent)) {
      percent = percentOptions.reduce((best, n) => (Math.abs(n - percent) < Math.abs(best - percent) ? n : best), 50);
    }
    const box = $("input", {
      type: "checkbox",
      class: "report-task-input",
      checked: selected,
      "aria-label": `Select ${t.title}`,
    });
    const mark = $("span", { class: "report-task-mark", "aria-hidden": "true" });
    const pctWrap = $("div", { class: "report-task-pcts" });
    const pctChips = percentOptions.map((n) => {
      const chip = $("button", {
        type: "button",
        class: `time-chip compact${selected && percent === n ? " on" : ""}`,
        disabled: !selected,
        onclick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!selected) return;
          percent = n;
          pctChips.forEach((c) => c.classList.toggle("on", Number(c.dataset.pct) === percent));
          keep();
        },
      }, `${n}%`);
      chip.dataset.pct = String(n);
      return chip;
    });
    pctWrap.append(...pctChips);
    const statusTone = t.status === "Review" ? "tone-orange" : "tone-green";
    const row = $("div", { class: `report-task-row${selected ? " on" : ""}` }, [
      $("div", { class: "report-task-top" }, [
        $("label", { class: "report-task-check" }, [
          box,
          mark,
          $("span", { class: "report-task-copy" }, [
            $("strong", {}, t.title),
            $("span", { class: "report-task-meta" }, [
              $("span", { class: `pill ${statusTone}` }, t.status),
              t.project ? $("span", { class: "muted" }, t.project) : null,
              t.due ? $("span", { class: "muted" }, `Due ${t.due}`) : null,
            ]),
          ]),
        ]),
      ]),
      $("div", { class: `report-task-bottom${selected ? "" : " is-hidden"}` }, [
        $("div", { class: "report-task-bottom-inner" }, [
          $("div", { class: "report-task-pct-block" }, [
            $("span", { class: "filter-label" }, "How much did you finish?"),
            pctWrap,
          ]),
        ]),
      ]),
    ]);
    const sync = () => {
      selected = box.checked;
      row.classList.toggle("on", selected);
      row.querySelector(".report-task-bottom")?.classList.toggle("is-hidden", !selected);
      pctChips.forEach((c) => {
        c.disabled = !selected;
        c.classList.toggle("on", selected && Number(c.dataset.pct) === percent);
      });
      if (!selected) percent = 0;
      else if (!percent) {
        percent = 50;
        pctChips.forEach((c) => c.classList.toggle("on", Number(c.dataset.pct) === 50));
      }
      keep();
    };
    box.addEventListener("change", sync);
    return {
      task: t,
      row,
      getSelected: () => (selected && percent > 0
        ? {
          id: t.id,
          title: t.title,
          project: t.project || "",
          status: t.status || "",
          percent,
        }
        : null),
    };
  });
  const readFinishedTasks = () => taskRows.map((row) => row.getSelected()).filter(Boolean);
  const keep = () => {
    const selected = readFinishedTasks();
    syncFoot(selected.length);
    keepReportDraft({
      finished: notes.value,
      unfinished: "",
      drive: drive.value,
      need_review: need.checked,
      place: remote.checked ? "Remote" : office.checked ? "Office" : "",
      blockers: [...selectedBlockers],
      finished_tasks: selected,
    });
  };
  syncFoot(readFinishedTasks().length);
  const form = $("form", {
    class: "report-form",
    id: "report-form",
    onsubmit: (e) => {
      e.preventDefault();
      keep();
      if (reportFor(state.who, today()) && !state.reportEditing) {
        clearReportDraft();
        render(true);
        return;
      }
      const selected = readFinishedTasks();
      if (!selected.length && !notes.value.trim()) {
        state.saveState = "error";
        state.saveError = "Select at least one task and set how much you finished, or add a short note.";
        render(true);
        return;
      }
      if (selected.some((row) => !row.percent)) {
        state.saveState = "error";
        state.saveError = "Set a finish % for every selected task.";
        render(true);
        return;
      }
      const place = remote.checked ? "Remote" : office.checked ? "Office" : "";
      submitReport({
        date: today(),
        finished: notes.value.trim(),
        unfinished: "",
        drive: drive.value.trim(),
        need_review: need.checked,
        place,
        blockers: [...selectedBlockers],
        finished_tasks: selected,
      });
    },
  }, [
    amending
      ? $("p", { class: "banner warn", style: "margin:0" }, "Editing today’s report. Save to update what Amr sees.")
      : null,
    reportStep(1, "Where did you work?", "Remote or office for today.", [
      $("div", { class: "place-picks" }, [remotePick, officePick]),
    ]),
    reportStep(2, "What did you finish?", "Only In progress and Review. Select a task, then tap a finish %.", [
      $("div", { class: "report-finished" }, [
        reportTasks.length
          ? $("div", { class: "report-task-list" }, taskRows.map((row) => row.row))
          : $("p", { class: "report-empty" }, "No In progress or Review tasks right now. Add a short note below if you still worked today."),
        $("div", { class: "report-notes" }, [
          $("label", {}, ["Extra notes (optional)", notes]),
        ]),
      ]),
    ]),
    reportStep(3, "Any blockers?", "Optional tags — tap all that apply.", [
      $("div", { class: "report-blockers" }, [
        $("div", { class: "board-filter" }, blockerChips),
      ]),
    ]),
    reportStep(4, "Links & review", "Drive folder and whether someone should review.", [
      $("div", { class: "report-notes" }, [
        $("label", {}, ["Drive links", drive]),
        needToggle,
      ]),
    ]),
    $("div", { class: "report-foot" }, [
      $("div", { class: "report-foot-meta" }, [footCount, footHint]),
      $("div", { class: "report-foot-actions" }, [
        amending
          ? $("button", { class: "btn ghost", type: "button", onclick: cancelReportEdit }, "Cancel")
          : null,
        $("button", { class: "btn primary", type: "submit" }, amending ? "Save changes" : "Submit report"),
      ]),
    ]),
  ]);
  form.addEventListener("input", keep);
  form.addEventListener("change", keep);
  form.addEventListener("keyup", keep);
  form.addEventListener("compositionend", keep);
  return $("div", { class: "report-page" }, [
    $("section", { class: "report-shell" }, [
      reportHero(
        day,
        amending
          ? "Amend today’s report. This page stays still until you save."
          : "Take your time. This page stays still until you submit — your draft is saved as you type."
      ),
      form,
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
  return $("div", { class: "page-stack" }, [
    pageShell(
      pageHero("Drive", "Upload into the matching folder. Files stay in Drive — never GitHub."),
      $("div", { class: "page-body" }, [
        root
          ? $("p", {}, $("a", { href: root, target: "_blank", rel: "noreferrer" }, "Open HELAL CONTENT MARKETING"))
          : $("p", { class: "muted" }, "Root Drive link missing."),
      ])
    ),
    pageSection("Clients", "One folder per client or campaign.", [
      $("div", { class: "people" }, clients.length ? clients.map(card) : [$("p", { class: "empty" }, "No client folders yet.")]),
    ]),
    pageSection("Helal", "Internal folders for the team.", [
      $("div", { class: "people" }, helal.length ? helal.map(card) : [$("p", { class: "empty" }, "No Helal folders yet.")]),
    ]),
  ]);
}

function personInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function personCard(p) {
  const isOwner = p.name === "Amr";
  const work = workFor(p.name);
  const base = payrollBase(p.name);
  const inactive = p.active === false;
  const intern = isPayrollIntern(p.name);
  const pt = partTimeModel(work.part_time_model);
  const schedule = pt
    ? `${pt.label} · ${work.mode}`
    : `${work.type} · ${work.mode}`;
  const scheduleDetail = pt
    ? `${work.days} · ${work.hours}`
    : `${work.days || "—"} · ${work.hours || "—"}`;
  const issued = state.issuedPins?.[p.name];
  return $("article", {
    class: `people-card${inactive ? " people-card-off" : ""}${intern ? " is-intern" : ""}`,
  }, [
    $("div", { class: "people-card-top" }, [
      $("div", { class: "people-avatar", "aria-hidden": "true" }, personInitials(p.name)),
      $("div", { class: "people-card-id" }, [
        $("p", { class: "people-card-name" }, p.name),
        $("p", { class: "muted" }, p.role || "Team member"),
      ]),
      inactive
        ? $("span", { class: "pill tone-orange" }, "Off")
        : $("span", { class: "pill tone-green" }, "Active"),
    ]),
    $("div", { class: "people-card-facts" }, [
      $("div", { class: "people-fact" }, [
        $("span", { class: "people-fact-k" }, "Email"),
        $("span", { class: "people-fact-v" }, p.email || "Not set"),
      ]),
      $("div", { class: "people-fact" }, [
        $("span", { class: "people-fact-k" }, "Schedule"),
        $("span", { class: "people-fact-v" }, schedule),
        $("span", { class: "muted" }, scheduleDetail),
      ]),
      $("div", { class: "people-fact" }, [
        $("span", { class: "people-fact-k" }, "Pay"),
        $("span", { class: "people-fact-v" }, base
          ? formatEGP(base)
          : (intern ? "Intern · no base" : "Not set")),
      ]),
    ]),
    $("div", { class: "meta people-card-meta" }, [
      $("span", { class: "pill" }, p.access || "member"),
      $("span", { class: "pill" }, p.home || "—"),
      work.type === "Part-time" ? $("span", { class: "pill warn" }, pt ? pt.label : "Part-time") : null,
      intern ? $("span", { class: "pill warn" }, "Intern") : null,
    ].filter(Boolean)),
    issued
      ? $("div", { class: "people-pin-banner" }, [
        $("strong", {}, "New password — copy now"),
        $("code", {}, issued),
      ])
      : $("p", { class: "muted people-card-hint" }, "Password is hashed. New password shows once."),
    $("div", { class: "people-card-actions" }, [
      $("button", {
        class: "btn ghost",
        type: "button",
        onclick: () => { state.editPersonName = p.name; render(); },
      }, "Edit"),
      $("button", {
        class: "btn ghost",
        type: "button",
        onclick: () => resetPersonPin(p.name),
      }, "New password"),
      isOwner
        ? null
        : $("button", {
          class: `btn ghost${inactive ? "" : " people-danger"}`,
          type: "button",
          onclick: () => setPersonActive(p.name, p.active === false),
        }, inactive ? "Reactivate" : "Deactivate"),
    ].filter(Boolean)),
  ]);
}

function viewPeople() {
  const name = $("input", { required: true, placeholder: "Full name" });
  const email = $("input", { type: "email", placeholder: "name@email.com" });
  const role = $("input", { required: true, placeholder: "Role, e.g. Graphic designer" });
  const home = $("select", {}, TEAM_HOMES.map((h) => $("option", { value: h }, h)));
  const access = $("select", {}, [
    $("option", { value: "member", selected: true }, "Member"),
    $("option", { value: "admin" }, "Admin"),
  ]);
  const ptPicker = partTimeModelPicker("3x8", { group: "add-pt" });
  const ptWrap = $("div", { class: "people-pt-block is-hidden" }, [
    $("p", { class: "people-field-label" }, "Part-time model"),
    $("p", { class: "muted people-field-hint" }, "Choose one: 3 days × 8 hours, or 6 days × 4 hours."),
    ptPicker.root,
  ]);
  const workType = $("select", {
    onchange: () => {
      ptWrap.classList.toggle("is-hidden", workType.value !== "Part-time");
    },
  }, WORK_TYPES.map((t) => $("option", { value: t, selected: t === "Full-time" }, t)));
  const workMode = $("select", {}, WORK_MODES.map((m) => $("option", { value: m, selected: m === "Remote" }, m)));
  const salary = $("input", { type: "number", min: "0", step: "50", placeholder: "Base salary EGP" });
  const salaryWrap = $("label", { class: "people-salary-field" }, ["Base salary (EGP)", salary]);
  const syncInternUi = (on) => {
    salary.required = !on;
    if (on) {
      salary.removeAttribute("required");
      salaryWrap.classList.add("is-dimmed");
    } else {
      salaryWrap.classList.remove("is-dimmed");
    }
  };
  const intern = internChoiceToggle(false, { onChange: syncInternUi });
  salary.required = true;
  const pin = $("input", { placeholder: "Leave blank to generate" });
  const roster = [...allPeople()].sort((a, b) => {
    const aOff = a.active === false ? 1 : 0;
    const bOff = b.active === false ? 1 : 0;
    if (aOff !== bOff) return aOff - bOff;
    return String(a.name).localeCompare(String(b.name));
  });
  const activeN = people().length;
  const offN = roster.length - activeN;
  const internN = roster.filter((p) => p.active !== false && isPayrollIntern(p.name)).length;
  const ptN = roster.filter((p) => p.active !== false && workFor(p.name).type === "Part-time").length;

  const resetAddForm = () => {
    name.value = "";
    email.value = "";
    role.value = "";
    pin.value = "";
    salary.value = "";
    intern.checked = false;
    syncInternUi(false);
    workType.value = "Full-time";
    workMode.value = "Remote";
    access.value = "member";
    ptPicker.setValue("3x8");
    ptWrap.classList.add("is-hidden");
  };

  return $("div", { class: "page-stack people-page" }, [
    pageShell(
      pageHero(
        "People",
        "Hire into every Helal app at once — Board, My work, Report, Attendance, HR, and Salaries. Deactivate archives pay and hides them from apps.",
        { label: "Roster", value: `${activeN} active` }
      ),
      $("div", { class: "page-body" }, [
        $("div", { class: "people-stat-row" }, [
          statBox(String(activeN), "Active"),
          statBox(String(offN), "Deactivated"),
          statBox(String(ptN), "Part-time"),
          statBox(String(internN), "Interns"),
        ]),
      ])
    ),

    $("form", {
      class: "people-add-shell",
      onsubmit: (e) => {
        e.preventDefault();
        addPerson({
          name: name.value.trim(),
          email: email.value.trim(),
          role: role.value.trim(),
          home: home.value,
          access: access.value,
          pin: pin.value.trim(),
          workType: workType.value,
          workMode: workMode.value,
          partTimeModel: ptPicker.getValue(),
          salary: salary.value,
          intern: intern.checked,
        });
        resetAddForm();
      },
    }, [
      $("div", { class: "page-step people-add-head" }, [
        $("div", { class: "people-add-title" }, [
          $("p", { class: "people-kicker" }, "Hire"),
          $("h2", {}, "Add a person"),
          $("p", { class: "muted" }, "Name, role, team, work type, and base salary — or mark Intern. Part-time unlocks both schedule models."),
        ]),
      ]),
      $("div", { class: "page-step" }, [
        $("div", { class: "people-step-head" }, [
          $("strong", {}, "1 · Identity"),
          $("p", { class: "muted" }, "Login name, contact, team, and access level."),
        ]),
        $("div", { class: "people-employ-form" }, [
          $("label", {}, ["Name", name]),
          $("label", {}, ["Email", email]),
          $("label", {}, ["Role", role]),
          $("label", {}, ["Team", home]),
          $("label", {}, ["Access", access]),
          $("label", {}, ["Password", pin]),
        ]),
      ]),
      $("div", { class: "page-step" }, [
        $("div", { class: "people-step-head" }, [
          $("strong", {}, "2 · Work & pay"),
          $("p", { class: "muted" }, "Full-time or part-time model, remote/office, and salary used in Salaries."),
        ]),
        $("div", { class: "people-employ-form" }, [
          $("label", {}, ["Work type", workType]),
          $("label", {}, ["Work mode", workMode]),
          salaryWrap,
          ptWrap,
        ]),
      ]),
      $("div", { class: "page-step people-add-foot" }, [
        $("div", { class: "people-step-head" }, [
          $("strong", {}, "3 · Intern (optional)"),
          $("p", { class: "muted" }, "Interns skip money deductions — violations extend training days instead."),
        ]),
        intern.root,
        $("div", { class: "people-add-actions" }, [
          $("button", { class: "btn primary", type: "submit" }, "Create login"),
          $("p", { class: "muted" }, "They appear in Board, Report, Attendance, HR, and Salaries right away."),
        ]),
      ]),
    ]),

    pageSection(
      "Team roster",
      "Active people first. Edit to change salary or part-time model. Deactivate removes them from apps.",
      [
        $("div", { class: "people people-roster" }, roster.length
          ? roster.map(personCard)
          : [$("p", { class: "empty" }, "No people yet — add the first login above.")]),
      ]
    ),
  ]);
}

function applyPersonEmployment(name, fields = {}) {
  if (!name) return;
  const hr = ensureHr();
  if (!hr.work) hr.work = {};
  const prev = hr.work[name] || {};
  const type = WORK_TYPES.includes(fields.workType) ? fields.workType : (prev.type || "Full-time");
  const mode = WORK_MODES.includes(fields.workMode) ? fields.workMode : (prev.mode || "Remote");
  const modelId = type === "Part-time"
    ? (partTimeModel(fields.partTimeModel)?.id || prev.part_time_model || "3x8")
    : "";
  const model = partTimeModel(modelId);
  const monthDays = model ? scheduledDaysFromPartTimeModel(modelId, thisMonth()) : 0;
  hr.work[name] = {
    type,
    days: type === "Part-time" && model
      ? model.days
      : (fields.workDays || prev.days || "Sun–Thu"),
    hours: type === "Part-time" && model
      ? model.hours
      : (fields.workHours || prev.hours || "10:00–18:00"),
    mode,
    office_days: prev.office_days || "",
    response: prev.response || "Reliable",
    part_time_model: modelId || "",
    scheduled_days: type === "Part-time" ? monthDays : "",
    days_per_week: model ? model.days_per_week : "",
    hours_per_day: model ? model.hours_per_day : "",
  };
  const pay = ensurePayroll();
  const intern = !!fields.intern;
  const set = new Set(pay.interns || []);
  if (intern) set.add(name);
  else {
    for (const n of [...set]) if (samePerson(n, name)) set.delete(n);
  }
  pay.interns = [...set];
  const salary = Number(fields.salary);
  if (Number.isFinite(salary) && salary > 0) {
    pay.base[name] = Math.round(salary * 100) / 100;
  } else if (intern) {
    pay.base[name] = 0;
  }
  if (type === "Part-time" && monthDays > 0) {
    if (!pay.scheduled_days[name]) pay.scheduled_days[name] = {};
    pay.scheduled_days[name][thisMonth()] = monthDays;
  } else if (pay.scheduled_days?.[name]) {
    delete pay.scheduled_days[name];
  }
  if (pay.archived?.[name]) delete pay.archived[name];
}

function archivePersonFromApps(name) {
  if (!name || name === "Amr") return;
  const pay = ensurePayroll();
  if (!pay.archived) pay.archived = {};
  pay.archived[name] = {
    base: payrollBase(name) || 0,
    intern: isPayrollIntern(name),
    scheduled_days: pay.scheduled_days?.[name] || {},
    work: { ...(ensureHr().work?.[name] || {}) },
    archived_at: new Date().toISOString(),
  };
  delete pay.base[name];
  pay.interns = (pay.interns || []).filter((n) => !samePerson(n, name));
  if (pay.scheduled_days) delete pay.scheduled_days[name];
  // Keep HR work history for past months, but strip live assignment lists.
  for (const person of allPeople()) {
    if (!Array.isArray(person.manages)) continue;
    person.manages = person.manages.filter((n) => !samePerson(n, name));
  }
  if (samePerson(state.hrPerson, name)) state.hrPerson = "";
  if (samePerson(state.payrollPerson, name)) state.payrollPerson = "";
  if (samePerson(state.dashPerson, name)) state.dashPerson = "";
  if (samePerson(state.timePerson, name)) state.timePerson = "";
  if (samePerson(state.boardPerson, name)) state.boardPerson = "";
  if (state.issuedPins?.[name]) delete state.issuedPins[name];
}

function restorePersonToApps(name) {
  if (!name) return;
  const pay = ensurePayroll();
  const archived = pay.archived?.[name];
  if (!archived) return;
  if (archived.base > 0) pay.base[name] = archived.base;
  if (archived.intern) {
    const set = new Set(pay.interns || []);
    set.add(name);
    pay.interns = [...set];
  }
  if (archived.scheduled_days) {
    if (!pay.scheduled_days) pay.scheduled_days = {};
    pay.scheduled_days[name] = archived.scheduled_days;
  }
  if (archived.work && ensureHr().work) {
    ensureHr().work[name] = { ...archived.work };
  }
  delete pay.archived[name];
}

function renameKeyedRow(map, from, to) {
  if (!map || !from || !to || samePerson(from, to) || !(from in map)) return false;
  if (!(to in map)) map[to] = map[from];
  delete map[from];
  return true;
}

function renamePersonEverywhere(from, to) {
  if (!from || !to || samePerson(from, to)) return;
  if (!state.auth) state.auth = { users: {} };
  if (!state.auth.users) state.auth.users = {};
  renameKeyedRow(state.auth.users, from, to);
  const hr = ensureHr();
  if (!hr.work) hr.work = {};
  renameKeyedRow(hr.work, from, to);
  const pay = ensurePayroll();
  if (!pay.archived) pay.archived = {};
  renameKeyedRow(pay.base, from, to);
  renameKeyedRow(pay.scheduled_days, from, to);
  renameKeyedRow(pay.archived, from, to);
  pay.interns = (pay.interns || []).map((n) => (samePerson(n, from) ? to : n));
  for (const row of pay.manual || []) {
    if (samePerson(row.who, from)) row.who = to;
  }
  for (const key of ["reviews", "attitude", "warnings", "rewards"]) {
    for (const row of hr[key] || []) {
      if (samePerson(row.who, from)) row.who = to;
    }
  }
  if (state.issuedPins?.[from]) {
    state.issuedPins[to] = state.issuedPins[from];
    delete state.issuedPins[from];
  }
  for (const task of allTasks()) {
    if (samePerson(task.who, from)) task.who = to;
    if (samePerson(task.created_by, from)) task.created_by = to;
    if (samePerson(task.done_by, from)) task.done_by = to;
    if (samePerson(task.updated_by, from)) task.updated_by = to;
  }
  for (const report of state.reportsFile?.reports || []) {
    if (samePerson(report.who, from)) report.who = to;
  }
  const attend = ensureAttendance();
  for (const week of Object.values(attend.weeks || {})) {
    if (!week?.people) continue;
    renameKeyedRow(week.people, from, to);
    for (const row of Object.values(week.people)) {
      if (samePerson(row.updated_by, from)) row.updated_by = to;
    }
  }
  for (const req of attend.requests || []) {
    if (samePerson(req.who, from)) req.who = to;
  }
  if (samePerson(state.who, from)) state.who = to;
  if (samePerson(state.session?.who, from)) {
    state.session.who = to;
    localStorage.setItem(LS_SESSION, JSON.stringify(state.session));
  }
  if (samePerson(state.hrPerson, from)) state.hrPerson = to;
  if (samePerson(state.dashPerson, from)) state.dashPerson = to;
  if (samePerson(state.timePerson, from)) state.timePerson = to;
  if (samePerson(state.boardPerson, from)) state.boardPerson = to;
  for (const person of allPeople()) {
    if (!Array.isArray(person.manages)) continue;
    person.manages = person.manages.map((name) => (samePerson(name, from) ? to : name));
  }
}

function updatePerson(currentName, fields) {
  if (!isAdmin()) return;
  const nextName = String(fields.name || "").trim();
  const nextEmail = String(fields.email || "").trim();
  if (!nextName) {
    state.saveState = "error";
    state.saveError = "Name is required.";
    render();
    return;
  }
  const person = allPeople().find((p) => samePerson(p.name, currentName));
  if (!person) return;
  if (!samePerson(currentName, nextName) && allPeople().some((p) => samePerson(p.name, nextName))) {
    state.saveState = "error";
    state.saveError = `${nextName} is already on the team.`;
    render();
    return;
  }
  if (fields.workType === "Part-time" && !partTimeModel(fields.partTimeModel)) {
    state.saveState = "error";
    state.saveError = "Pick a part-time model: 3 days×8h or 6 days×4h.";
    render();
    return;
  }
  const renamed = !samePerson(currentName, nextName);
  if (renamed) renamePersonEverywhere(currentName, nextName);
  person.name = nextName;
  person.email = nextEmail;
  if (fields.role != null && String(fields.role).trim()) person.role = String(fields.role).trim();
  if (fields.home && TEAM_HOMES.includes(fields.home)) person.home = fields.home;
  person.mention = `@${nextName.replace(/\s+/g, "")}`;
  person.updated_at = new Date().toISOString();
  applyPersonEmployment(nextName, {
    workType: fields.workType,
    workMode: fields.workMode,
    partTimeModel: fields.partTimeModel,
    salary: fields.salary,
    intern: fields.intern,
  });
  if (state.team.owner && samePerson(state.team.owner.name, currentName)) {
    state.team.owner.name = nextName;
    state.team.owner.email = nextEmail;
    state.team.owner.mention = person.mention;
    state.team.owner.updated_at = person.updated_at;
  }
  state.team.updated_at = person.updated_at;
  state.editPersonName = null;
  state.saveState = "saving";
  state.saveError = "";
  render();
  saveTeam(`team: edit ${nextName}`);
  saveHr(`hr: employment for ${nextName}`);
  if (renamed) {
    saveHr(`hr: rename ${currentName} to ${nextName}`);
    saveTasks(`board: rename ${currentName} to ${nextName}`);
    saveReports(`report: rename ${currentName} to ${nextName}`);
    saveAttendance(`attend: rename ${currentName} to ${nextName}`);
    resetPersonPin(nextName).then(() => {
      state.saveNote = `Name updated to ${nextName}. New password issued — copy it from People.`;
      render();
    });
  }
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
  const intern = !!fields.intern;
  const salary = Number(fields.salary);
  if (!intern && !(salary > 0)) {
    state.saveError = "Enter a base salary, or mark Intern.";
    state.saveState = "error";
    render();
    return;
  }
  if (fields.workType === "Part-time" && !partTimeModel(fields.partTimeModel)) {
    state.saveError = "Pick a part-time model: 3 days×8h or 6 days×4h.";
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
    email: fields.email || "",
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
  rememberIssuedPin(name, password);
  applyPersonEmployment(name, fields);
  render();
  hashPin(name, password).then((pin_hash) => {
    if (!pin_hash) {
      state.saveState = "error";
      state.saveError = `Could not create a password for ${name}. Try New password.`;
      render();
      return;
    }
    if (!state.auth.users) state.auth.users = {};
    state.auth.users[name] = { pin_hash };
    state.auth.updated_at = new Date().toISOString();
    saveTeam(`team: add ${name}`);
    saveAuth(`auth: password for ${name}`);
    saveHr(`hr: employment + salary for ${name}`);
    render();
  });
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
  if (active) restorePersonToApps(name);
  else archivePersonFromApps(name);
  render();
  saveTeam(`team: ${active ? "reactivate" : "deactivate"} ${name}`);
  saveHr(`hr: ${active ? "restore" : "archive"} payroll for ${name}`);
}

async function resetPersonPin(name) {
  if (!state.auth) state.auth = { users: {} };
  if (!state.auth.users) state.auth.users = {};
  const password = makePersonPin(name);
  const pin_hash = await hashPin(name, password);
  if (!pin_hash) return;
  state.auth.users[name] = { pin_hash };
  state.auth.updated_at = new Date().toISOString();
  rememberIssuedPin(name, password);
  render();
  saveAuth(`auth: new password for ${name}`);
}

function monthTimeStats(month) {
  const tasks = tasksForMonth(month);
  const open = tasks.filter((t) => t.status !== "Done");
  const avgOf = (rows, key) => {
    const nums = rows.map((t) => taskStageTimes(t)[key]).filter((n) => n > 0);
    if (!nums.length) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  };
  return {
    avgTodo: avgOf(open.filter((t) => t.status === "To do"), "todoMins"),
    avgProgress: avgOf(tasks.filter((t) => t.status === "Done" || t.status === "In progress"), "progressMins"),
    open: open.length,
  };
}

function liveLoadForPerson(name, month) {
  const m = month || thisMonth();
  const current = isCurrentMonth(m);
  const mine = allTasks().filter((t) => t.who === name);
  const open = current ? mine.filter((t) => t.status !== "Done") : [];
  const doneMonth = mine.filter((t) => t.status === "Done" && doneMonthOf(t) === m);
  const overdue = open.filter((t) => t.due && t.due < today());
  const timed = [
    ...doneMonth.map((t) => t.progress_hours || 0),
    ...open.filter((t) => t.status === "In progress").map(loggedHours),
  ].filter((h) => h > 0);
  const avgHours = timed.length ? timed.reduce((a, b) => a + b, 0) / timed.length : 0;
  return {
    name,
    open: open.length,
    todo: open.filter((t) => t.status === "To do").length,
    progress: open.filter((t) => t.status === "In progress").length,
    review: open.filter((t) => t.status === "Review" || t.status === "Revisions").length,
    overdue: overdue.length,
    done: doneMonth.length,
    hours: avgHours,
    live: open.filter((t) => t.status === "In progress").reduce((n, t) => n + loggedHours(t), 0),
    finished: doneMonth,
  };
}

function captureMonthStats(month) {
  const m = month || thisMonth();
  const peopleRows = {};
  for (const person of people()) {
    const load = liveLoadForPerson(person.name, m);
    peopleRows[person.name] = {
      open: load.open,
      todo: load.todo,
      progress: load.progress,
      review: load.review,
      overdue: load.overdue,
      done: load.done,
      hours: load.hours,
      live: load.live,
    };
  }
  const hrPeople = {};
  for (const person of people().filter((p) => p.name !== "Amr")) {
    const score = personScore(person.name, m);
    hrPeople[person.name] = {
      delivery: score.delivery,
      quality: score.quality,
      revisions: score.revisions,
      creativity: score.creativity,
      total: score.total,
      attitude: score.attitude,
      reviews: score.reviews,
    };
  }
  return {
    updated_at: new Date().toISOString(),
    people: peopleRows,
    time: monthTimeStats(m),
    hr: { people: hrPeople },
  };
}

function stampMonthArchives() {
  const file = ensureTasksFile();
  if (!file.months) file.months = {};
  const hr = ensureHr();
  if (!hr.months) hr.months = {};
  const current = thisMonth();
  const prev = shiftYm(current, -1);
  const known = new Set([prev, ...Object.keys(file.months), ...Object.keys(hr.months)]);
  let froze = false;
  for (const ym of known) {
    if (!ym || ym >= current) continue;
    if (!file.months[ym]?.frozen) {
      const draft = file.months[ym]?.frozen === false ? file.months[ym] : captureMonthStats(ym);
      file.months[ym] = { ...draft, frozen: true, frozen_at: new Date().toISOString() };
      froze = true;
    }
    if (!hr.months[ym]?.frozen) {
      const draft = hr.months[ym]?.frozen === false ? hr.months[ym] : { people: captureMonthStats(ym).hr.people };
      hr.months[ym] = { ...draft, frozen: true, frozen_at: new Date().toISOString() };
    }
  }
  const live = captureMonthStats(current);
  if (!file.months[current]?.frozen) {
    file.months[current] = { ...live, frozen: false };
  }
  if (!hr.months[current]?.frozen) {
    hr.months[current] = { people: live.hr.people, updated_at: live.updated_at, frozen: false };
  }
  return froze;
}

function persistClosedMonths() {
  if (!state.session || !writeToken()) return;
  if (state.saveState === "saving") return;
  if (!stampMonthArchives()) return;
  saveTasks(`board: store closed months`);
}

function loadForPerson(name, month) {
  const m = month || thisMonth();
  const live = liveLoadForPerson(name, m);
  if (isCurrentMonth(m)) return live;
  const snap = monthSnapshot(m)?.people?.[name];
  if (!snap) return live;
  return {
    ...live,
    open: snap.open || 0,
    todo: snap.todo || 0,
    progress: snap.progress || 0,
    review: snap.review || 0,
    overdue: snap.overdue || 0,
    hours: snap.hours || 0,
    live: snap.live || 0,
    done: live.done,
    finished: live.finished,
  };
}

function viewWorkload() {
  const ym = state.workMonth || thisMonth();
  const roster = workloadRoster();
  const teamWide = isAdmin() || isSocial();
  const rows = roster.map((p) => ({ ...p, ...loadForPerson(p.name, ym) }));
  const maxOpen = Math.max(1, ...rows.map((r) => r.open));
  const finished = rows.flatMap((r) => r.finished);
  return $("div", { class: "dash" }, [
    pageShell(pageHero(
      "Workload",
      isCurrentMonth(ym)
        ? "This month is live. Closed months keep their stored numbers."
        : "Stored month. Live open work sits in the current month.",
      { label: "Month", value: monthLabel(ym) }
    )),
    $("div", { class: "stat-row" }, [
      statBox(rows.reduce((n, r) => n + r.open, 0), teamWide ? "Open across the team" : isLead() ? "Open on your team" : "Your open tasks"),
      statBox(rows.reduce((n, r) => n + r.review, 0), "Waiting on review", "tone-orange"),
      statBox(rows.reduce((n, r) => n + r.overdue, 0), "Overdue", "tone-red"),
      statBox(rows.reduce((n, r) => n + r.done, 0), "Done this month", "tone-green"),
    ]),
    $("section", { class: "card" }, [
      $("div", { class: "cal-nav" }, [
        $("button", { class: "btn ghost", type: "button", onclick: () => { setBoardMonth(shiftYm(ym, -1)); render(); } }, "Prev"),
        $("h2", {}, monthLabel(ym)),
        $("button", { class: "btn ghost", type: "button", onclick: () => { setBoardMonth(shiftYm(ym, 1)); render(); } }, "Next"),
      ]),
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
    $("p", { class: "muted" }, `${cairoWeekday(date)} ${date} is locked as ${from || "—"}. Amr or Moamen will approve or decline.`),
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
    pageShell(
      pageHero(
        "Attendance",
        canDraft
          ? "Set Office, Home, or Off on your row, then press Save."
          : mineSaved
            ? "Your week is locked. Tap a day to request a change."
            : "This week is closed. Open This week or Next week, or request a change.",
        { label: "Week", value: friday }
      ),
      $("div", { class: "page-body" }, [
        $("div", { class: "cal-nav attend-nav" }, [
          $("button", { class: "btn ghost", type: "button", onclick: () => { state.attendWeek = shiftFriday(friday, -1); render(); } }, "Prev week"),
          $("p", { class: "muted", style: "margin:0" }, `Friday ${friday} → Thursday ${thursday}`),
          $("div", { class: "attend-week-actions" }, [
            $("button", { class: "btn ghost", type: "button", onclick: () => { state.attendWeek = fridayStart(today()); render(); } }, "This week"),
            $("button", { class: "btn ghost", type: "button", onclick: () => { state.attendWeek = shiftFriday(friday, 1); render(); } }, "Next week"),
          ]),
        ]),
      ])
    ),
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

function sopTocBtn(id, label) {
  return $("button", {
    type: "button",
    class: "sop-toc-btn",
    onclick: () => {
      document.getElementById(`sop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }, label);
}

function sopBlock(id, kicker, title, kids) {
  return $("article", { class: "sop-block", id: `sop-${id}` }, [
    $("header", { class: "sop-block-head" }, [
      kicker ? $("span", { class: "sop-kicker" }, kicker) : null,
      $("h3", {}, title),
    ]),
    ...(Array.isArray(kids) ? kids : [kids]),
  ]);
}

function sopList(items, ordered) {
  return $(ordered ? "ol" : "ul", { class: "sop-list-body" }, items.map((t) => $("li", {}, t)));
}

function sopRules(dos, donts) {
  return $("div", { class: "sop-rules" }, [
    $("div", { class: "sop-rule do" }, [
      $("strong", {}, "Do"),
      sopList(dos, false),
    ]),
    $("div", { class: "sop-rule dont" }, [
      $("strong", {}, "Don't"),
      sopList(donts, false),
    ]),
  ]);
}

function viewGuide() {
  const toc = [
    ["rules", "Golden rules"],
    ["day", "Daily rhythm"],
    ["roles", "Roles"],
    ["naming", "Task naming"],
    ["flow", "Status flow"],
    ["drive", "Drive"],
    ["mywork", "My work"],
    ["review", "Review & Done"],
    ["attend", "Attendance"],
    ["report", "Evening report"],
    ["save", "Saving"],
    ["bot", "Helal bot"],
    ["check", "Checklist"],
  ];

  return $("div", { class: "page-stack sop-page" }, [
    pageShell(
      pageHero(
        "SOP · Best practice",
        "How Helal should be used every day — clear titles, Drive links, clean status, and one evening report.",
        { label: "Cairo", value: today() }
      ),
      $("div", { class: "page-body sop-intro" }, [
        $("p", {}, "Helal is the live team board. Tasks, attendance, and reports save to GitHub for everyone. Files stay in Google Drive. Use Helal bot (bottom-right) anytime you forget a step."),
        $("nav", { class: "sop-toc", "aria-label": "SOP sections" }, toc.map(([id, label]) => sopTocBtn(id, label))),
      ])
    ),

    sopBlock("rules", "01", "Golden rules", [
      sopRules(
        [
          "Name tasks: content type | publish day (example: single visual | 4th Oct).",
          "Paste the Drive link on the card before you send to Review.",
          "Move status as you work: To do → In progress → Review → Done.",
          "Submit one evening report every Cairo day you worked.",
          "Hard-refresh after Amr says the board updated.",
        ],
        [
          "Upload files into GitHub or chat instead of Drive.",
          "Leave work in In progress with no Drive link when it is ready.",
          "Mark your own work Done unless you are admin, social, or that person's lead.",
          "Mix months — always check the month control on Board / Time / HR.",
          "Use WhatsApp for the daily report — use Report in Helal.",
        ]
      ),
    ]),

    sopBlock("day", "02", "Daily rhythm", [
      $("p", { class: "sop-lead" }, "Same loop every day. Keep it short and consistent."),
      $("div", { class: "sop-flow" }, [
        $("div", { class: "sop-flow-step" }, [$("span", {}, "1"), $("strong", {}, "Open"), $("p", {}, "Apps home → My work")]),
        $("div", { class: "sop-flow-step" }, [$("span", {}, "2"), $("strong", {}, "Work"), $("p", {}, "To do → In progress")]),
        $("div", { class: "sop-flow-step" }, [$("span", {}, "3"), $("strong", {}, "Upload"), $("p", {}, "Drive + paste link")]),
        $("div", { class: "sop-flow-step" }, [$("span", {}, "4"), $("strong", {}, "Review"), $("p", {}, "Send To Review")]),
        $("div", { class: "sop-flow-step" }, [$("span", {}, "5"), $("strong", {}, "Report"), $("p", {}, "Evening Report")]),
      ]),
      sopList([
        "Morning: check My work (and Board filters if you assign work). Start with due / overdue.",
        "During the day: keep one main card In progress. Update status when you switch.",
        "Before review: open the client/Helal Drive folder, upload, paste the link on the task.",
        "Evening: Report → Remote or Office → finish the form → Submit. Amend with Edit if something changes the same Cairo day.",
      ], true),
    ]),

    sopBlock("roles", "03", "Who can do what", [
      $("div", { class: "sop-roles" }, [
        $("div", { class: "sop-role" }, [
          $("strong", {}, "Everyone"),
          $("p", {}, "My work, Board (own tasks), Attendance, Report, Drive, SOP, Helal bot."),
        ]),
        $("div", { class: "sop-role" }, [
          $("strong", {}, "Social · Mariam & Judi"),
          $("p", {}, "Add and assign tasks, open Review, mark Done like admins. Not full admin (no People / HR / admin reports)."),
        ]),
        $("div", { class: "sop-role" }, [
          $("strong", {}, "Leads"),
          $("p", {}, "Aya manages Salma. Seif manages Rahma. Leads assign to their people, review their work, and mark those Done."),
        ]),
        $("div", { class: "sop-role" }, [
          $("strong", {}, "Design & video"),
          $("p", {}, "Alaa and Rahma (design) and Ganna (video) do not create tasks. Seif can create as Rahma's lead."),
        ]),
        $("div", { class: "sop-role" }, [
          $("strong", {}, "Admins · Amr & Moamen"),
          $("p", {}, "Full board, Review dashboard, Time, Workload, HR, People, Admin guide. Create or deactivate logins."),
        ]),
      ]),
    ]),

    sopBlock("naming", "04", "Task naming & briefs", [
      $("p", { class: "sop-lead" }, "Titles must be scannable on the board. Briefs must be enough to start without chasing chat."),
      $("p", {}, [
        $("strong", {}, "Format: "),
        "content type | publish day — keep spaces around the pipe.",
      ]),
      sopList([
        "single visual | 4th Oct",
        "carousel | 12th Oct",
        "reel | 18th Oct",
        "branding | 22nd Oct",
      ], false),
      $("p", {}, "In the brief: goal, platform or size, refs, brand notes, and the publish day. Space-specific hints appear on New task — fill them."),
      sopRules(
        [
          "One clear deliverable per task when possible.",
          "Set a real due date (default today is fine only if it truly is today).",
          "Assign the owner who will upload to Drive.",
        ],
        [
          "Vague titles like \"post\" or \"design\" with no type or day.",
          "Stuffing three unrelated deliverables into one card.",
        ]
      ),
    ]),

    sopBlock("flow", "05", "Status flow", [
      $("div", { class: "sop-status-row" }, ["To do", "In progress", "Review", "Revisions", "Done"].map((s) =>
        $("span", { class: "sop-status-pill" }, s)
      )),
      sopList([
        "To do — waiting to start. To do time counts here until you leave this column.",
        "In progress — you are actively working. In progress time counts only here and freezes when you leave.",
        "Review — ready for Mariam, Judi, the lead, Amr, or Moamen. Needs a Drive link first.",
        "Revisions / Edits — feedback came back; stay visible in Review with an Edits tag until fixed.",
        "Done — only reviewers/admins/leads (for their people) mark Done. Done stays on today's Done column.",
      ], false),
      $("p", { class: "muted" }, "Timers: To do time = wait in To do. In progress time stops at Review — Review and Done do not add hours."),
    ]),

    sopBlock("drive", "06", "Drive (always)", [
      $("p", { class: "sop-lead" }, "Files live in Google Drive. Helal only stores the link on the task and in reports."),
      sopList([
        "Open the Drive app → client or Helal folder → upload there.",
        "Paste the file or folder URL on the task before To Review.",
        "One Drive subfolder per client or campaign under 05 Projects.",
        "If the Drive URL is missing on an assignment, still do the work — then flag the missing link to Amr/social.",
      ], true),
      sopRules(
        ["Upload to the matching client/Helal folder.", "Put the link on the card and in the evening report when relevant."],
        ["Upload into GitHub.", "Send finals only on WhatsApp with no Drive link on the task."]
      ),
    ]),

    sopBlock("mywork", "07", "My work path", [
      $("p", { class: "sop-lead" }, "Members should live in My work. Board is for assigning and scanning."),
      sopList([
        "Open My work from Apps.",
        "Add / confirm the Drive link on the card.",
        "Press To Review when the file is ready.",
        "Wait for Amr, Moamen, Mariam, Judi, or your lead to Mark done.",
        "On phones, Ready for review is listed first — clear that queue before starting new cards.",
      ], true),
    ]),

    sopBlock("review", "08", "Review & Done", [
      sopList([
        "Only move to Review when the Drive link is on the card and the work matches the brief.",
        "Who can Mark done: Amr, Moamen, Mariam, Judi, and the matching lead (Aya→Salma, Seif→Rahma).",
        "If edits are needed, keep it in Review with Edits — do not invent a private status in chat.",
        "Admins/social/leads: clear Review every evening so Done reflects the real day.",
      ], false),
      $("p", { class: "muted" }, "Mistake task? Open it → Remove task (admins can remove any). That deletes it from the live board."),
    ]),

    sopBlock("attend", "09", "Attendance", [
      sopList([
        "Everyone sees the same week grid (Cairo week).",
        "Set Office, Home, or Off on your row → Save my week.",
        "After save, the week locks for the team to see.",
        "Need a change on a locked day? Request it. Admins approve or decline on Attendance / Dashboard.",
      ], true),
    ]),

    sopBlock("report", "10", "Evening report", [
      $("p", { class: "sop-lead" }, "One report per person per Cairo day. Midnight Cairo starts a new day."),
      sopList([
        "Open Report → choose Remote or Office.",
        "Mark what you finished / still open, finish %, blockers if any, Drive links, need review.",
        "Submit. The form stays still while you type so text does not vanish mid-edit.",
        "Same day correction? Use Edit on today's report, then save again.",
        "Do not send the daily report on WhatsApp — Helal is the source of truth.",
      ], true),
    ]),

    sopBlock("save", "11", "Saving, refresh, errors", [
      sopList([
        "A green Saved message means GitHub has the update for the whole team.",
        "If two people save at once, Helal retries. Use Retry save on the red banner if needed.",
        "After Amr pushes a system update, hard-refresh the page (cache bust on the live board).",
        "Board key expired or save still failing? Message Amr — do not keep hammering Save.",
      ], false),
    ]),

    sopBlock("bot", "12", "Helal bot", [
      $("p", {}, "Helal bot opens when you sign in. Ask things like \"How do I submit my report?\" or \"What should I do now?\" It can open the right app. It does not replace Drive or the evening Report."),
    ]),

    sopBlock("check", "13", "End-of-day checklist", [
      $("div", { class: "sop-check" }, [
        $("label", {}, [$("input", { type: "checkbox" }), " Open work is In progress or Review — nothing forgotten in To do that you actually started."]),
        $("label", {}, [$("input", { type: "checkbox" }), " Every Review card has a Drive link."]),
        $("label", {}, [$("input", { type: "checkbox" }), " Attendance week saved (or change requested)."]),
        $("label", {}, [$("input", { type: "checkbox" }), " Evening Report submitted for today (Cairo)."]),
        $("label", {}, [$("input", { type: "checkbox" }), " Reviewers: Mark done anything that is truly finished."]),
      ]),
      $("p", { class: "muted" }, "Checkboxes are for you on this device only — they are not saved to the board."),
    ]),
  ]);
}


function viewAdminGuide() {
  const steps = [
    ["01", "Task naming", "Name every task: content type | publish day. Types: single visual, carousel, reel, branding (same idea for other formats). Day is when it goes live, short: 4th Oct, 12th Oct. Keep spaces around the pipe."],
    ["02", "Months never mix", "Board, Workload, Time, Dashboard, and HR share Prev / Next month. One month only on screen. Done stays in the month finished. Open work lives in the current month."],
    ["03", "Time · Everyone", "Open Time → Everyone for in-progress hours, live timers, open/Done counts, average wait and in-progress time. No long task lists — keep it scannable."],
    ["04", "Time · one person", "Click a name. KPIs, then Open / Done / All (default Open). Show day breakdown only when needed. Switch months to compare — Done time stays per month."],
    ["05", "Board times", "To do timer runs until the card leaves To do. In progress timer runs only in In progress and freezes at Review. Review and Done do not add hours."],
    ["06", "HR · Profile", "Person + month: score bars, open work (current month), Done for selected month, attendance, reports, attitude, warnings, evaluations."],
    ["07", "HR · Performance", "Team score table for the month. Delivery, Quality, Revisions, Creativity, total, Attitude. Late / missing Drive counts are month-scoped."],
    ["08", "HR · Task tracking", "Review and Done tasks still needing evaluation this month. After you evaluate, they leave the list."],
    ["09", "HR · Attitude & warnings", "Logged per month. Score attitude once per person per month. Do not mix September warnings into October."],
    ["10", "Dashboard", "Reports and attendance requests. Day for daily reports, month for saved list. Person filter narrows. Time detail stays on Time."],
    ["11", "Evening admin check", "1) Time → Everyone 2) Time → one person if off 3) HR → Performance 4) HR → Task tracking 5) Switch months only for history, then return to current."],
  ];
  return $("div", { class: "page-stack sop-page" }, [
    pageShell(
      pageHero(
        "Admin guide",
        "How Amr and Moamen read Time, HR, and performance. Team best practice stays on SOP.",
        { label: "Cairo", value: today() }
      ),
      $("div", { class: "page-body sop-intro" }, [
        $("p", {}, "Use this after the team SOP. Months never mix. Clear Review and evaluations the same Cairo evening when you can."),
      ])
    ),
    ...steps.map(([kicker, title, body]) =>
      sopBlock(`admin-${kicker}`, kicker, title, [$("p", {}, body)])
    ),
  ]);
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
    themeToggleButton("theme-toggle-login"),
    $("div", { class: "login-shell" }, [
      $("aside", { class: "login-brand" }, [
        $("img", {
          class: "brand-mark brand-mark-hero",
          src: "./assets/helal-mark.png",
          alt: "Helal",
          width: "168",
          height: "168",
        }),
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
    ["attend", "Attendance"],
    ["report", "Report"],
    ["drive", "Drive"],
    ["guide", "SOP"],
  ];
  if (isAdmin()) {
    items.splice(2, 0, ["review", "Dashboard"], ["time", "Time"], ["load", "Workload"]);
    items.push(["hr", "HR"]);
    items.push(["payroll", "Salaries"]);
    items.push(["people", "People"]);
    items.push(["admin-guide", "Admin guide"]);
  } else if (isSocial() || isLead()) {
    items.splice(2, 0, ["review", "Review"], ["load", "Workload"]);
  }
  return items;
}

const APP_ICONS = {
  board: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  my: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>`,
  review: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>`,
  time: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>`,
  load: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>`,
  attend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>`,
  drive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M9 4h6l4 7-4 9H9L5 11z"/><path d="M5 11h14"/></svg>`,
  hr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c1.5-3 4-4.5 6-4.5S13.5 16 15 19M14 14.5c1.2-.6 2.5-.8 3.5-.8 1.7 0 3.2.8 4.5 2.3"/></svg>`,
  people: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M4 20c1.8-4 5-6 8-6s6.2 2 8 6"/></svg>`,
  payroll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M8 14h3"/></svg>`,
  guide: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 5h9a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3z"/><path d="M8 5v15"/></svg>`,
  "admin-guide": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7z"/><path d="M9 12l2 2 4-4"/></svg>`,
};

const APP_TONES = {
  board: "tone-board",
  my: "tone-my",
  review: "tone-review",
  time: "tone-time",
  load: "tone-load",
  attend: "tone-attend",
  report: "tone-report",
  drive: "tone-drive",
  hr: "tone-hr",
  people: "tone-people",
  payroll: "tone-payroll",
  guide: "tone-guide",
  "admin-guide": "tone-admin",
};

function isAppsHome() {
  return state.view === "apps";
}

function currentAppLabel() {
  if (isAppsHome()) return "Apps";
  return navItems().find(([id]) => id === state.view)?.[1] || "Apps";
}

function goAppsHome() {
  state.view = "apps";
  state.appsOpen = false;
  render();
}

function openApp(id) {
  state.view = id;
  state.appsOpen = false;
  render();
}

function appBadgeCount(id) {
  if (id === "my") return newForMeTasks().length;
  if (id === "review" && canReviewTasks()) {
    return allTasks().filter((t) =>
      (t.status === "Review" || t.status === "Revisions") && canSeeTask(t) && canMarkDone(t)
    ).length;
  }
  if (id === "report" && !reportFor(state.who, today())) return 1;
  return 0;
}

function appTile(id, label, { large = false } = {}) {
  const badge = appBadgeCount(id);
  return $("button", {
    type: "button",
    class: `app-tile ${APP_TONES[id] || ""}${large ? " large" : ""}${state.view === id ? " on" : ""}`,
    onclick: () => openApp(id),
  }, [
    $("span", { class: "app-tile-icon-wrap" }, [
      $("span", {
        class: "app-tile-icon",
        html: APP_ICONS[id] || APP_ICONS.board,
      }),
      badge
        ? $("span", { class: "app-tile-badge", "aria-label": `${badge} new` }, badge > 9 ? "9+" : String(badge))
        : null,
    ]),
    $("span", { class: "app-tile-label" }, label),
  ]);
}

function goTodayAction(action) {
  if (action.view) state.view = action.view;
  if (action.focus != null) state.boardFocus = action.focus;
  if (action.boardPerson != null) state.boardPerson = action.boardPerson;
  render();
}

function todayActionCards() {
  const mine = allTasks().filter((t) => isOpenTask(t) && samePerson(t.who, state.who));
  const due = mine.filter(isDueToday).length;
  const overdue = mine.filter(isOverdue).length;
  const noDrive = mine.filter(isMissingDrive).length;
  const newN = mine.filter(isNewForMe).length;
  const myView = "my";
  const friday = fridayStart(today());
  const actions = [];
  if (newN) {
    actions.push({
      title: `${newN} new for you`,
      hint: "Assigned since your last visit",
      tone: "tone-orange",
      view: myView,
      focus: "",
    });
  }
  if (overdue) {
    actions.push({
      title: `${overdue} overdue`,
      hint: "Open My work filtered to overdue",
      tone: "tone-red",
      view: myView,
      focus: "overdue",
    });
  }
  if (due) {
    actions.push({
      title: `${due} due today`,
      hint: "Finish or move these before evening",
      tone: "tone-orange",
      view: myView,
      focus: "due",
    });
  }
  if (noDrive) {
    actions.push({
      title: `${noDrive} missing Drive`,
      hint: "Add the link before To Review",
      tone: "tone-orange",
      view: myView,
      focus: "nodrive",
    });
  }
  if (!reportFor(state.who, today())) {
    actions.push({
      title: "Submit today’s report",
      hint: "Evening check-in for Amr",
      tone: "",
      view: "report",
      focus: "",
    });
  } else {
    actions.push({
      title: "Report filed",
      hint: "Amend it if something changed",
      tone: "tone-green",
      view: "report",
      focus: "",
    });
  }
  if (!attendSaved(state.who, friday) && canDraftAttend(state.who, friday)) {
    actions.push({
      title: "Save attendance",
      hint: "Lock Office / Home / Off for this week",
      tone: "",
      view: "attend",
      focus: "",
    });
  }
  if (canReviewTasks()) {
    const waiting = allTasks().filter((t) =>
      (t.status === "Review" || t.status === "Revisions") && canSeeTask(t) && canMarkDone(t)
    ).length;
    if (waiting) {
      actions.push({
        title: `${waiting} waiting review`,
        hint: isAdmin() ? "Open Dashboard" : "Open Review",
        tone: "tone-orange",
        view: "review",
        focus: "",
      });
    }
  }
  if (isAdmin()) {
    const chase = chaseSnapshot();
    if (chase.noReportToday.length || chase.overdue.length) {
      actions.push({
        title: "Owner chase list",
        hint: "Copy missing reports & overdue",
        tone: "",
        view: "review",
        focus: "",
      });
    }
  }
  return actions.slice(0, 5);
}

function viewTodayStrip() {
  const actions = todayActionCards();
  if (!actions.length) return null;
  return $("section", { class: "today-strip" }, [
    $("div", { class: "today-strip-head" }, [
      $("strong", {}, "Today"),
      $("span", { class: "muted" }, "Your next moves"),
    ]),
    $("div", { class: "today-actions" }, actions.map((action) =>
      $("button", {
        type: "button",
        class: `today-action ${action.tone || ""}`,
        onclick: () => goTodayAction(action),
      }, [
        $("strong", {}, action.title),
        $("span", {}, action.hint),
      ])
    )),
  ]);
}

function viewAppsHome() {
  const role = isAdmin() ? "Admin" : isSocial() ? "Social" : isLead() ? "Lead" : "Member";
  const items = navItems();
  return $("div", { class: "apps-home" }, [
    $("header", { class: "apps-home-hero" }, [
      $("img", {
        class: "apps-home-mark",
        src: "./assets/helal-mark.png",
        alt: "Helal",
        width: "64",
        height: "64",
      }),
      $("div", { class: "apps-home-copy" }, [
        $("h2", {}, `Welcome, ${state.who}`),
        $("p", { class: "muted" }, `${role} · Choose an app to continue · ${cairoClock()} Cairo`),
      ]),
    ]),
    viewTodayStrip(),
    $("div", { class: "app-grid home" }, items.map(([id, label]) => appTile(id, label, { large: true }))),
  ]);
}

if (typeof window !== "undefined" && !window.__helalAppsEsc) {
  window.__helalAppsEsc = true;
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (!state.session || isAppsHome() || uiBusy()) return;
    goAppsHome();
  });
}

function helpStaticKnowledge() {
  return [
    {
      id: "overview",
      keys: ["overview", "everything", "system", "what is helal", "how helal works", "explain helal", "about helal"],
      title: "Helal overview",
      body: "Helal is the live team OS: Apps home → Board, My work, Attendance, Report, Drive, SOP, plus Review/Workload for social/leads and Time/HR/People for admins. Tasks/attendance/reports save to GitHub. Files stay in Google Drive. Status: To do → In progress → Review → Revisions → Done. Name tasks content type | publish day. Paste Drive before Review. One evening Report per Cairo day. Ask me about any client, teammate, app, or SOP rule.",
      go: "apps",
    },
    {
      id: "golden",
      keys: ["golden rules", "rules", "don't", "dont", "never", "must"],
      title: "Golden rules",
      body: "Do: name tasks content type | publish day; paste Drive before Review; move To do → In progress → Review → Done; submit one evening Report per Cairo day; hard-refresh after Amr updates. Don't: upload to GitHub/chat instead of Drive; leave ready work without Drive; mark your own Done (unless admin/social/lead); mix months; send daily report on WhatsApp.",
      go: "guide",
    },
    {
      id: "rhythm",
      keys: ["daily rhythm", "daily loop", "morning", "evening", "routine", "workflow", "how do i work"],
      title: "Daily rhythm",
      body: "1) Apps → My work 2) To do → In progress 3) Upload Drive + paste link 4) To Review 5) Evening Report. Morning: due/overdue. Day: one main In progress card. Night: Report → Remote/Office → Submit.",
      go: "guide",
    },
    {
      id: "roles",
      keys: ["roles", "who can", "permissions", "access"],
      title: "Roles",
      body: "Everyone: My work, Board (own), Attendance, Report, Drive, SOP, Helal bot. Social (Mariam, Judi): add/assign, Review, Mark done — not People/HR. Leads: Aya→Salma, Seif→Rahma. Design/video (Alaa, Rahma, Ganna) don't create tasks except Seif as Rahma's lead. Admins Amr & Moamen: everything including Time, HR, People.",
      go: "guide",
    },
    {
      id: "naming",
      keys: ["naming", "title", "name a task", "content type", "publish day", "single visual", "carousel", "reel", "branding", "brief"],
      title: "Task naming",
      body: "Format: content type | publish day. Examples: single visual | 4th Oct · carousel | 12th Oct · reel | 18th Oct · branding | 22nd Oct. Brief: goal, platform/size, refs, brand notes, publish day. One deliverable per task when possible.",
      go: "guide",
    },
    {
      id: "flow",
      keys: ["status", "status flow", "columns", "to do", "in progress", "revisions", "edits tag", "timer"],
      title: "Status flow",
      body: "To do → In progress → Review → Revisions/Edits → Done. To do time counts in To do. In progress time only in In progress; freezes at Review. Review needs Drive. Only admins/social/matching lead mark Done.",
      go: "board",
    },
    {
      id: "login",
      keys: ["login", "password", "sign in", "log in", "pin"],
      title: "Sign in",
      body: "Choose your name and your own password (from Amr or Moamen). Admins manage people on People.",
    },
    {
      id: "apps",
      keys: ["apps", "home", "menu", "where", "start", "launcher", "all apps"],
      title: "Apps home",
      body: "After sign-in you land on Apps. Tap an icon. All apps or Esc returns home. Today strip shows your next moves. Helal bot knows SOP, clients, team, and live board.",
      go: "apps",
    },
    {
      id: "mywork",
      keys: ["my work", "my tasks", "to review", "drive link", "need drive", "how to finish", "path"],
      title: "My work",
      body: "Members live here. 1) Open My work 2) Add Drive link 3) To Review 4) Wait for Amr/Moamen/Mariam/Judi/your lead to Mark done. Phones: clear Ready for review first.",
      go: "my",
    },
    {
      id: "board",
      keys: ["board", "kanban", "drag", "filters"],
      title: "Board",
      body: "Kanban for the team. Members mainly use My work. Admins/social/leads filter by person/client/focus (due, overdue, missing Drive). Green Saved = on GitHub for everyone.",
      go: "board",
    },
    {
      id: "create",
      keys: ["create", "new task", "assign", "add task"],
      title: "Create a task",
      body: "Admins, Mariam, Judi, and leads can New task. Name content type | publish day, pick client, due, owner. Leads only assign people they manage. Mistake → Remove task.",
    },
    {
      id: "review",
      keys: ["review", "mark done", "done", "edits", "revisions", "waiting"],
      title: "Review & Done",
      body: "Review only with Drive on the card. Done by: Amr, Moamen, Mariam, Judi, Aya (Salma), Seif (Rahma). Edits stay in Review. Clear Review each evening.",
      go: "review",
      roles: ["admin", "social", "lead"],
    },
    {
      id: "review-member",
      keys: ["review", "mark done", "done", "edits", "waiting review", "who marks"],
      title: "Review & Done",
      body: "You send to Review (needs Drive). You don't mark your own Done — Amr, Moamen, Mariam, Judi, or your lead does.",
      go: "my",
      roles: ["member"],
    },
    {
      id: "report",
      keys: ["report", "evening", "daily report", "remote", "office", "amend", "edit report", "whatsapp"],
      title: "Evening report",
      body: "One report per person per Cairo day. Report → Remote/Office → finished/open, %, blockers, Drive, need review → Submit. Edit same day if needed. Not on WhatsApp.",
      go: "report",
    },
    {
      id: "attend",
      keys: ["attendance", "office", "home", "off", "save week", "change day", "locked"],
      title: "Attendance",
      body: "Set Office/Home/Off → Save my week (locks). Change locked day via request; admins approve on Attendance/Dashboard.",
      go: "attend",
    },
    {
      id: "drive",
      keys: ["drive", "upload", "folder", "files", "google drive", "github upload", "05 projects"],
      title: "Drive",
      body: "Files only in Google Drive. Drive app → client or Helal folder → upload → paste URL on the task before Review. Ask me a client name for their folder link.",
      go: "drive",
    },
    {
      id: "clients-list",
      keys: ["clients", "client list", "projects", "which clients", "all clients", "list clients"],
      title: "Clients",
      body: "Ask me any client name for Drive + open-task counts. Or open Drive for all folders.",
      go: "drive",
    },
    {
      id: "team-list",
      keys: ["team", "roster", "who works", "people list", "everyone"],
      title: "Team",
      body: "Ask me a person's name for role and permissions. Admins manage logins on People.",
      go: "apps",
    },
    {
      id: "checklist",
      keys: ["checklist", "end of day", "eod", "before i leave", "done for today"],
      title: "End-of-day checklist",
      body: "Open work in In progress/Review; every Review has Drive; attendance saved; evening Report submitted; reviewers Mark done finished work. Full list in SOP.",
      go: "guide",
    },
    {
      id: "time",
      keys: ["time", "hours", "timer", "in progress time", "to do time"],
      title: "Time",
      body: "Admins: Time → Everyone, then a person. To do / In progress timers; freezes at Review. Months never mix.",
      go: "time",
      roles: ["admin"],
    },
    {
      id: "workload",
      keys: ["workload", "load", "busy", "open tasks count"],
      title: "Workload",
      body: "Open / review / overdue / done for the month. Admins & social: team. Leads: self + manages.",
      go: "load",
      roles: ["admin", "social", "lead"],
    },
    {
      id: "hr",
      keys: ["hr", "score", "performance", "attitude", "warning", "evaluation"],
      title: "HR",
      body: "Admins. Months never mix. Delivery 35% · Quality 35% · Revisions 15% · Creativity 15%. Attitude separate.",
      go: "hr",
      roles: ["admin"],
    },
    {
      id: "people",
      keys: ["people", "add person", "deactivate", "password reset", "new password"],
      title: "People",
      body: "Admins add login + role + team + Full-time/Part-time + base salary (or Intern). Part-time has two models: 3 days×8 hours or 6 days×4 hours. That wires Board, Report, Attendance, HR, and Salaries. Deactivate archives salary and hides them from apps; Reactivate restores.",
      go: "people",
      roles: ["admin"],
    },
    {
      id: "payroll",
      keys: ["salary", "salaries", "payroll", "deduction", "base salary", "penalties", "خصم"],
      title: "Salaries",
      body: "Admins open Salaries. Set base salary. Day = base÷30 (full-time) or base÷part-time model days this month (3×8 or 6×4). Auto: late tasks ½ day each, missing daily report 1 day. Cap 5 penalty days/month. Absence = unpaid day + 2 penalty days (unpaid outside cap). Interns extend training days instead of money cuts.",
      go: "payroll",
      roles: ["admin"],
    },
    {
      id: "admin-guide",
      keys: ["admin guide", "read time", "months never mix", "dashboard", "chase"],
      title: "Admin guide",
      body: "Evening: Time → Everyone → person if needed → HR Performance → Task tracking → Salaries. Team SOP is separate.",
      go: "admin-guide",
      roles: ["admin"],
    },
    {
      id: "save",
      keys: ["save", "retry", "github", "not saving", "error", "conflict", "hard-refresh", "refresh"],
      title: "Saving & refresh",
      body: "Green Saved = live for the team. Retry save on conflict. Hard-refresh after Amr pushes updates. Key expired → message Amr.",
    },
    {
      id: "theme",
      keys: ["theme", "dark", "bright", "light", "moon", "sun"],
      title: "Theme",
      body: "Sun/moon in the top bar switches dark/bright. Remembered on this browser.",
    },
    {
      id: "sop",
      keys: ["sop", "guide", "help", "manual", "best practice", "best practices", "full guide"],
      title: "SOP · Best practice",
      body: "Full written guide: golden rules, rhythm, roles, naming, status, Drive, My work, Review, Attendance, Report, saving, checklist. I also know live clients, team, and board.",
      go: "guide",
    },
    {
      id: "bot",
      keys: ["helal bot", "chatbot", "what can you", "what do you know"],
      title: "Helal bot",
      body: "I know the SOP, every client Drive folder, the team roster, apps, and your live tasks (overdue, missing Drive, review queue). Ask a client name, a person, or how to do any step.",
      go: "guide",
    },
  ];
}

function helpClientOpenSummary(name) {
  const tasks = allTasks().filter((t) => isOpenTask(t) && String(t.project || "").toLowerCase() === String(name || "").toLowerCase());
  if (!tasks.length) return "No open tasks on the board for this client right now.";
  const by = { "To do": 0, "In progress": 0, Review: 0, Revisions: 0 };
  for (const t of tasks) {
    if (by[t.status] != null) by[t.status] += 1;
    else by[t.status] = (by[t.status] || 0) + 1;
  }
  const parts = Object.entries(by).filter(([, n]) => n).map(([s, n]) => `${n} ${s}`);
  const visible = tasks.filter((t) => canSeeTask(t));
  const sample = visible.slice(0, 3).map((t) => `${t.title || t.id} (${t.who}, ${t.status})`).join("; ");
  return `${tasks.length} open: ${parts.join(", ")}.${sample ? ` Examples you can see: ${sample}.` : ""}`;
}

function helpLiveKnowledge() {
  const items = [];
  const clients = projectList().filter((p) => p.name && String(p.name).toLowerCase() !== "helal");
  const clientNames = clients.map((p) => p.name).join(", ");
  items.push({
    id: "live-clients",
    keys: ["clients", "client list", "projects", "which clients", "all clients", "list clients"],
    title: "Clients (live)",
    body: clients.length
      ? `Current clients: ${clientNames}. Ask any name for Drive link and open-task counts. Upload into that client's Drive folder — never GitHub.`
      : "No clients loaded yet. Check Drive / projects data.",
    go: "drive",
  });

  for (const p of projectList()) {
    const name = String(p.name || "").trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    const keys = [lower, `${lower} drive`, `${lower} folder`, `${lower} client`, `${lower} tasks`];
    if (p.id) keys.push(String(p.id).replace(/-/g, " "));
    const url = p.url || driveForProject(name) || "";
    items.push({
      id: `client-${p.id || lower}`,
      keys,
      title: `Client · ${name}`,
      body: `${name} is a Helal client. ${url ? "Drive folder is linked — upload finals there and paste the link on the task before Review. " : "Drive URL missing — flag Amr/social, still do the work. "}${helpClientOpenSummary(name)}`,
      go: "drive",
      href: url || "",
      weight: 8,
    });
  }

  const roster = people();
  items.push({
    id: "live-team",
    keys: ["team", "roster", "who works here", "people list", "teammates"],
    title: "Team (live)",
    body: roster.length
      ? `Active team: ${roster.map((p) => `${p.name} (${p.role || p.home || "member"})`).join("; ")}. Ask a name for details.`
      : "Team list not loaded.",
    go: isAdmin() ? "people" : "apps",
  });

  for (const person of roster) {
    const name = person.name;
    const lower = name.toLowerCase();
    const manages = (person.manages || []).join(", ");
    const mine = allTasks().filter((t) => isOpenTask(t) && samePerson(t.who, name));
    let roleLine = `${name} — ${person.role || "Team"}${person.home ? ` · ${person.home}` : ""}.`;
    if (person.access === "admin") roleLine += " Admin access.";
    if (manages) roleLine += ` Manages: ${manages}.`;
    if (["Mariam", "Judi"].includes(name)) roleLine += " Social: can add tasks, Review, Mark done.";
    roleLine += ` Open tasks: ${mine.length}.`;
    items.push({
      id: `person-${person.id || lower}`,
      keys: [lower, `${lower} role`, `${lower} tasks`, `who is ${lower}`, `about ${lower}`],
      title: `Teammate · ${name}`,
      body: roleLine,
      go: samePerson(name, state.who) ? "my" : (isAdmin() || isSocial() || isLead() ? "board" : "apps"),
      weight: 7,
    });
  }

  const helalFolders = (state.drive?.folders || []).filter((f) => !f.hidden && f.id !== "root" && f.name);
  for (const f of helalFolders) {
    if (f.who === "Client" || f.section === "clients") continue;
    const lower = String(f.name).toLowerCase();
    items.push({
      id: `folder-${f.id}`,
      keys: [lower, `${lower} folder`, "helal folder", "internal folder", f.id],
      title: `Drive · ${f.name}`,
      body: `Internal Drive folder "${f.name}"${f.who ? ` (${f.who})` : ""}. ${f.url ? "Open it from Drive app or ask me for the link." : "URL missing — ask Amr."}`,
      go: "drive",
      href: f.url || "",
      weight: 3,
    });
  }

  const root = rootDrive();
  items.push({
    id: "live-drive-root",
    keys: ["root drive", "helal content marketing", "main drive", "drive root"],
    title: "Drive root",
    body: root
      ? "HELAL CONTENT MARKETING is the root Drive. Client folders live under clients; internal work under HELAL. Never upload into GitHub."
      : "Root Drive URL missing — ask Amr.",
    go: "drive",
    href: root || "",
  });

  // Live board snapshot for the signed-in user
  const mine = typeof myOpenTasks === "function" ? myOpenTasks() : [];
  items.push({
    id: "live-my-snapshot",
    keys: ["my open", "my overdue", "how many tasks", "my workload", "what do i have"],
    title: "Your open work (live)",
    body: `You have ${mine.length} open task(s): ${mine.filter(isDueToday).length} due today, ${mine.filter(isOverdue).length} overdue, ${mine.filter(isMissingDrive).length} missing Drive. Open My work to act.`,
    go: "my",
    weight: 5,
  });

  return items;
}

function helpKnowledge() {
  // Live data first so client/person names win scoring ties via weight + longer keys
  return [...helpLiveKnowledge(), ...helpStaticKnowledge()];
}

function helpRoleKey() {
  if (isAdmin()) return "admin";
  if (isSocial()) return "social";
  if (isLead()) return "lead";
  return "member";
}

function helpAllowed(entry) {
  if (!entry.roles) return true;
  return entry.roles.includes(helpRoleKey());
}

function scoreHelpEntry(entry, q) {
  const text = String(q || "").toLowerCase();
  if (!text) return 0;
  let score = 0;
  for (const key of entry.keys) {
    const k = String(key || "").toLowerCase();
    if (!k) continue;
    if (text === k) score += 12;
    else if (text.includes(k)) score += k.length > 8 ? 4 : k.length > 4 ? 3 : 2;
  }
  if (text.includes(String(entry.title || "").toLowerCase())) score += 4;
  if (entry.weight) score += entry.weight;
  return score;
}

function helpContextualTip() {
  const tips = [];
  const mine = myOpenTasks();
  const noDrive = mine.filter(isMissingDrive).length;
  const overdue = mine.filter(isOverdue).length;
  if (newForMeTasks().length) {
    tips.push({
      text: `You have ${newForMeTasks().length} new task(s). Open My work.`,
      go: "my",
      label: "Open My work",
    });
  }
  if (overdue) {
    tips.push({
      text: `${overdue} overdue — finish or update status today.`,
      go: "my",
      label: "Show overdue",
      focus: "overdue",
    });
  }
  if (noDrive) {
    tips.push({
      text: `${noDrive} task(s) need a Drive link before To Review. Ask me a client name for the folder.`,
      go: "my",
      label: "Missing Drive",
      focus: "nodrive",
    });
  }
  if (!reportFor(state.who, today())) {
    tips.push({
      text: "Submit today's evening Report in Helal (not WhatsApp).",
      go: "report",
      label: "Open Report",
    });
  }
  if (canReviewTasks()) {
    const waiting = allTasks().filter((t) =>
      (t.status === "Review" || t.status === "Revisions") && canSeeTask(t) && canMarkDone(t)
    ).length;
    if (waiting) {
      tips.push({
        text: `${waiting} card(s) waiting on your review.`,
        go: "review",
        label: "Open Review",
      });
    }
  }
  if (!tips.length) {
    const clients = projectList().filter((p) => p.name).slice(0, 4).map((p) => p.name).join(", ");
    tips.push({
      text: `Ask me anything — SOP, a client${clients ? ` (${clients}…)` : ""}, a teammate, or Drive.`,
      go: "guide",
      label: "Open SOP",
    });
  }
  return tips[0];
}

function helpAnswer(question) {
  const q = String(question || "").trim();
  const lower = q.toLowerCase();
  if (!q) {
    return {
      text: "Ask me anything on Helal — SOP steps, a client name (for Drive), a teammate, Report, Review, or what you should do now.",
      actions: helpQuickActions(),
    };
  }
  if (/what (should|do) i do|what now|help me|stuck|today/.test(lower)) {
    const tip = helpContextualTip();
    return {
      text: tip.text,
      actions: tip.go
        ? [{ label: tip.label || "Open", go: tip.go, focus: tip.focus || "" }, { label: "Clients", ask: "List clients" }, { label: "Open SOP", go: "guide" }]
        : helpQuickActions(),
    };
  }
  if (/checklist|end of day|before i leave|eod/.test(lower)) {
    const entry = helpKnowledge().find((e) => e.id === "checklist");
    return { text: `${entry.title}: ${entry.body}`, actions: [{ label: "Open SOP", go: "guide" }] };
  }
  if (/golden|best practice|sop rules/.test(lower)) {
    const entry = helpKnowledge().find((e) => e.id === "golden");
    return { text: `${entry.title}: ${entry.body}`, actions: [{ label: "Open SOP", go: "guide" }] };
  }
  if (/overview|everything|what (do )?you know|what can you/.test(lower)) {
    const entry = helpKnowledge().find((e) => e.id === "overview");
    const live = helpKnowledge().find((e) => e.id === "live-clients");
    return {
      text: `${entry.body} ${live ? live.body : ""}`,
      actions: [
        { label: "List clients", ask: "List clients" },
        { label: "Team", ask: "Who is on the team?" },
        { label: "Open SOP", go: "guide" },
      ],
    };
  }

  let best = null;
  let bestScore = 0;
  for (const entry of helpKnowledge()) {
    if (!helpAllowed(entry)) continue;
    const score = scoreHelpEntry(entry, lower);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  if (!best || bestScore < 2) {
    return {
      text: "I cover SOP, every client Drive folder, the team, and your live board — but I didn't match that. Try a client name, a person, golden rules, Drive, Report, or checklist.",
      actions: [
        { label: "List clients", ask: "List clients" },
        { label: "What should I do now?", ask: "What should I do now?" },
        { label: "Open SOP", go: "guide" },
      ],
    };
  }
  const actions = [];
  if (best.href) actions.push({ label: "Open Drive folder", href: best.href });
  if (best.go) {
    actions.push({
      label: best.go === "guide" ? "Open SOP" : best.go === "drive" ? "Open Drive app" : `Open ${best.title.split("·")[0].trim()}`,
      go: best.go,
    });
  }
  if (!actions.some((a) => a.go === "guide")) actions.push({ label: "Full SOP", go: "guide" });
  return {
    text: `${best.title}: ${best.body}`,
    actions,
  };
}

function helpQuickActions() {
  const chips = [
    { label: "What should I do now?", ask: "What should I do now?" },
    { label: "List clients", ask: "List clients" },
    { label: "Golden rules", ask: "What are the golden rules?" },
    { label: "Submit report", ask: "How do I submit my report?" },
    { label: "Add Drive", ask: "How do I add a Drive link?" },
    { label: "Open SOP", go: "guide" },
  ];
  if (canReviewTasks()) chips.splice(4, 0, { label: "Mark done", ask: "How do I mark a task Done?" });
  if (isAdmin()) chips.push({ label: "Admin guide", ask: "How do I read Time and HR?" });
  return chips;
}

function pushHelpMessage(role, text, actions) {
  if (!Array.isArray(state.helpMessages)) state.helpMessages = [];
  state.helpMessages.push({
    id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    role,
    text,
    actions: actions || [],
  });
  if (state.helpMessages.length > 40) state.helpMessages = state.helpMessages.slice(-40);
}

function ensureHelpWelcome() {
  if (state.helpMessages?.length) return;
  const tip = helpContextualTip();
  const nClients = projectList().filter((p) => p.name).length;
  pushHelpMessage(
    "bot",
    `Hi ${state.who}. I'm Helal bot — I know the SOP, ${nClients} clients, the team, Drive, and your live board. ${tip.text}`,
    tip.go
      ? [{ label: tip.label || "Open", go: tip.go, focus: tip.focus || "" }, { label: "List clients", ask: "List clients" }, { label: "Open SOP", go: "guide" }]
      : [{ label: "List clients", ask: "List clients" }, { label: "Open SOP", go: "guide" }, ...helpQuickActions().slice(0, 2)]
  );
}

function runHelpAction(action) {
  if (!action) return;
  if (action.ask) {
    askHelalHelp(action.ask);
    return;
  }
  if (action.href) {
    window.open(action.href, "_blank", "noopener,noreferrer");
    return;
  }
  if (action.go === "apps") {
    state.helpOpen = false;
    goAppsHome();
    return;
  }
  if (action.go) {
    if (action.focus != null) state.boardFocus = action.focus;
    state.helpOpen = false;
    openApp(action.go);
  }
}

function helalBotLogo(className, size) {
  return $("img", {
    class: className,
    src: "./assets/helal-mark.png",
    alt: "",
    width: String(size),
    height: String(size),
    draggable: "false",
  });
}

/** Update only the bot UI — never re-render the page behind it. */
function mountHelalHelp() {
  document.querySelectorAll("body > .help-root, body > .help-fab").forEach((el) => el.remove());
  if (!state.session) return;
  const help = viewHelalHelp();
  if (help) document.body.append(help);
}

function focusHelalHelp() {
  setTimeout(() => {
    const log = document.getElementById("helal-help-log");
    if (log) log.scrollTop = log.scrollHeight;
    document.getElementById("helal-help-input")?.focus();
  }, 20);
}

function askHelalHelp(question) {
  const q = String(question || "").trim();
  if (!q) return;
  ensureHelpWelcome();
  pushHelpMessage("user", q);
  const answer = helpAnswer(q);
  pushHelpMessage("bot", answer.text, answer.actions || []);
  state.helpOpen = true;
  mountHelalHelp();
  focusHelalHelp();
}

function toggleHelalHelp(force) {
  state.helpOpen = typeof force === "boolean" ? force : !state.helpOpen;
  if (state.helpOpen) ensureHelpWelcome();
  mountHelalHelp();
  if (state.helpOpen) focusHelalHelp();
}

function viewHelalHelp() {
  if (!state.session) return null;
  ensureHelpWelcome();
  const open = !!state.helpOpen;
  const fab = $("button", {
    class: `help-fab${open ? " on" : ""}`,
    type: "button",
    "aria-label": open ? "Close Helal bot" : "Open Helal bot",
    title: "Helal bot",
    onclick: () => toggleHelalHelp(),
  }, [
    helalBotLogo("help-fab-logo", 30),
    open ? $("span", { class: "help-fab-x", "aria-hidden": "true" }, "×") : null,
  ]);

  const kids = [fab];
  if (open) {
    const input = $("input", {
      id: "helal-help-input",
      type: "text",
      placeholder: "Ask Helal bot what to do…",
      autocomplete: "off",
    });
    const form = $("form", {
      class: "help-form",
      onsubmit: (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        input.value = "";
        askHelalHelp(q);
      },
    }, [
      input,
      $("button", { class: "btn primary compact help-send", type: "submit" }, "Send"),
    ]);

    const panel = $("section", {
      class: "help-panel",
      role: "dialog",
      "aria-label": "Helal bot",
    }, [
      $("header", { class: "help-panel-head" }, [
        $("div", { class: "help-brand" }, [
          helalBotLogo("help-brand-logo", 36),
          $("div", {}, [
            $("strong", {}, "Helal bot"),
            $("p", { class: "muted" }, "What to do · how to do it"),
          ]),
        ]),
        $("button", {
          class: "btn ghost compact help-close",
          type: "button",
          onclick: () => toggleHelalHelp(false),
        }, "Close"),
      ]),
      $("div", { class: "help-quick" }, helpQuickActions().map((chip) =>
        $("button", {
          type: "button",
          class: "help-chip",
          onclick: () => runHelpAction(chip),
        }, chip.label)
      )),
      $("div", { id: "helal-help-log", class: "help-log" }, (state.helpMessages || []).map((msg) =>
        $("div", { class: `help-bubble ${msg.role}` }, [
          msg.role === "bot" ? $("span", { class: "help-bubble-label" }, "Helal bot") : null,
          $("p", {}, msg.text),
          (msg.actions || []).length
            ? $("div", { class: "help-actions" }, msg.actions.map((action) =>
              $("button", {
                type: "button",
                class: "btn compact",
                onclick: () => runHelpAction(action),
              }, action.label)
            ))
            : null,
        ])
      )),
      form,
    ]);
    kids.unshift(panel);
  }

  // Always wrap in .help-root so re-renders never leave orphan FABs.
  return $("div", { class: "help-root" }, kids);
}

function viewChrome() {
  const role = isAdmin() ? "Admin" : isSocial() ? "Social" : isLead() ? "Lead" : "Member";
  const onHome = isAppsHome();
  return [
    $("header", { class: "top" }, [
      $("div", { class: "top-left" }, [
        onHome
          ? null
          : $("button", {
            class: "btn ghost compact app-back",
            type: "button",
            title: "Back to all apps",
            "aria-label": "Back to all apps",
            onclick: goAppsHome,
          }, [
            $("span", {
              class: "app-back-icon",
              "aria-hidden": "true",
              html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
            }),
            $("span", { class: "app-back-label" }, "All apps"),
          ]),
        $("button", {
          class: "app-menu-btn",
          type: "button",
          "aria-label": onHome ? "Apps home" : `Open ${currentAppLabel()} menu`,
          onclick: goAppsHome,
        }, [
          $("span", { class: "app-menu-dots", "aria-hidden": "true" }, [
            $("i"), $("i"), $("i"),
            $("i"), $("i"), $("i"),
            $("i"), $("i"), $("i"),
          ]),
          $("span", { class: "app-menu-copy" }, [
            $("strong", {}, currentAppLabel()),
            $("span", {}, `${state.who} · ${role}`),
          ]),
        ]),
        $("span", { class: "cairo-chip top-cairo" }, `${cairoClock()} · Cairo`),
      ]),
      $("div", { class: "top-actions" }, [
        onHome
          ? null
          : $("select", {
            class: "date-select",
            onchange: (e) => {
              state.dateFilter = e.target.value;
              render();
            },
          }, [
            $("option", { value: "all", selected: state.dateFilter === "all" }, "All dates"),
            $("option", { value: today(), selected: state.dateFilter === today() }, `Today · ${today()}`),
          ]),
        !onHome && canAssignTasks()
          ? $("button", {
            class: "btn primary compact",
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
          class: "btn ghost compact",
          onclick: () => {
            state.headSha = "";
            loadAll().then(render);
          },
        }, "Refresh"),
        themeToggleButton(),
        $("button", { class: "btn ghost compact", onclick: logout }, "Log out"),
      ]),
    ]),
  ];
}

function render(force) {
  if (
    !force
    && reportFormOpen()
    && !state.creating
    && !state.openTaskId
    && !state.pendingDelay
    && !state.pendingRevision
    && !state.evalTaskId
    && !state.editPersonName
    && !state.attendChange
  ) {
    return;
  }
  const root = document.getElementById("app");
  root.replaceChildren();
  if (!state.team) {
    root.className = "boot-mode";
    root.append(bootScreen("Could not load Helal.", true));
    return;
  }
  if (!state.session) {
    root.className = "login-mode";
    root.append(viewWelcome());
    return;
  }

  root.className = state.view === "board" ? "board-mode" : (isAppsHome() ? "apps-mode" : "");
  root.append(...viewChrome().filter(Boolean));
  const note = banner();
  if (note) root.append(note);

  const main = $("main");
  if (isAppsHome()) main.append(viewAppsHome());
  else if (state.view === "my") viewMy().filter(Boolean).forEach((el) => main.append(el));
  else if (state.view === "board") main.append(viewBoard());
  else if (state.view === "load") main.append(viewWorkload());
  else if (state.view === "attend") main.append(viewAttendance());
  else if (state.view === "review" && canReviewTasks()) main.append(viewReview());
  else if (state.view === "time" && canSeeTime()) main.append(viewTime());
  else if (state.view === "report") main.append(viewReport());
  else if (state.view === "drive") main.append(viewDrive());
  else if (state.view === "people" && isAdmin()) main.append(viewPeople());
  else if (state.view === "hr" && isAdmin()) main.append(viewHr());
  else if (state.view === "payroll" && isAdmin()) main.append(viewPayroll());
  else if (state.view === "admin-guide" && isAdmin()) main.append(viewAdminGuide());
  else if (state.view === "guide") main.append(viewGuide());
  else main.append(viewAppsHome());
  root.append(main);

  // Mount overlays on body so position:fixed is always viewport-relative
  // (a transform on #app would otherwise center the create form off-screen).
  document.querySelectorAll("body > .modal-bg, body > .drawer, body > .help-root, body > .help-fab").forEach((el) => el.remove());
  const modal = viewCreateModal();
  if (modal) document.body.append(...(Array.isArray(modal) ? modal : [modal]));
  const drawer = viewTaskDrawer();
  if (drawer) document.body.append(...(Array.isArray(drawer) ? drawer : [drawer]));
  const prompts = viewPromptModals();
  if (prompts.length) document.body.append(...prompts);
  const help = viewHelalHelp();
  if (help) document.body.append(help);
}

function pullInterval() {
  const who = state.who || "";
  let n = 0;
  for (let i = 0; i < who.length; i += 1) n += who.charCodeAt(i);
  return 30000 + (n % 10000);
}

function watchCairoDay() {
  const tick = () => {
    if (document.hidden || uiBusy()) {
      setTimeout(tick, pullInterval());
      return;
    }
    const now = today();
    const rolled = !!(lastCairoDay && now !== lastCairoDay);
    if (now !== lastCairoDay) lastCairoDay = now;
    if (state.saveState !== "saving" && state.session) {
      if (rolled) {
        render();
        pullRemoteBoard();
      } else {
        pullRemoteBoard();
      }
    }
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
    const root = document.getElementById("app");
    root.className = "boot-mode";
    root.replaceChildren(bootScreen(`Could not load the board. ${err.message}`, true));
  });

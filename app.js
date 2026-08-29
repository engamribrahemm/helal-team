const STATUSES = ["To do", "In progress", "Review", "Revisions", "Done"];
const BOARD_STATUSES = ["To do", "In progress", "Review", "Revisions", "Done"];
const SPACES = ["Social", "Graphic", "Video editors", "HR", "Daily Reports", "Calendar"];
const CAIRO = "Africa/Cairo";
const LS_SESSION = "helal.session";
const LS_TASKS = "helal.tasksCache";
const LS_REPORTS = "helal.reportsCache";
const LS_HR = "helal.hrCache";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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
  githubCfg: null,
  hrTab: "scores",
  hrQuarter: "",
  evalTaskId: null,
  pendingDelay: null,
  pendingRevision: null,
  saveState: "idle",
  saveError: "",
  loginError: "",
  shas: {},
  headSha: "",
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

function writeToken() {
  const fromCfg = (state.githubCfg && state.githubCfg.write_token) || "";
  if (fromCfg) return fromCfg;
  try {
    const stored = localStorage.getItem("helal.ghToken") || "";
    if (/^(ghp_|github_pat_)/.test(stored)) return stored;
  } catch (_) {}
  return "";
}

function people() {
  if (!state.team) return [];
  return [state.team.owner, ...state.team.people];
}

function accessFor(name) {
  return people().find((p) => p.name === name)?.access === "admin" ? "admin" : "member";
}

function isAdmin() {
  return state.session?.role === "admin";
}

function allTasks() {
  return (state.tasksFile?.days || []).flatMap((d) =>
    (d.tasks || []).map((t) => ({ ...t, date: d.date }))
  );
}

function tasksForView() {
  let tasks = allTasks();
  const ownOnly = !isAdmin() || state.view === "my";
  if (ownOnly) tasks = tasks.filter((t) => t.who === state.who);
  if (state.dateFilter && state.dateFilter !== "all") {
    tasks = tasks.filter((t) => t.due === state.dateFilter || t.date === state.dateFilter);
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

function mergeTaskFiles(remote, local) {
  const byId = new Map();
  for (const file of [remote, local]) {
    for (const day of file?.days || []) {
      for (const task of day.tasks || []) {
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
    statuses: STATUSES,
    days: [...daysMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
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

function emptyHr() {
  return {
    note: "HR evaluation system. Rewards and deductions come later.",
    weights: { delivery: 25, quality: 35, revisions: 15, creativity: 15, discipline: 10 },
    work: {},
    reviews: [],
    attitude: [],
    warnings: [],
    rewards: [],
  };
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
  return {
    note: b.note || a.note,
    weights: { ...a.weights, ...b.weights },
    work: { ...a.work, ...b.work },
    reviews: mergeById(a.reviews, b.reviews),
    attitude: mergeById(a.attitude, b.attitude),
    warnings: mergeById(a.warnings, b.warnings),
    rewards: mergeById(a.rewards, b.rewards),
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

function mergeReports(remote, local) {
  const byId = new Map();
  for (const report of [...(remote?.reports || []), ...(local?.reports || [])]) {
    const prev = byId.get(report.id);
    if (!prev || Date.parse(report.created_at || 0) >= Date.parse(prev.created_at || 0)) {
      byId.set(report.id, report);
    }
  }
  return {
    note: remote?.note || local?.note || "",
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
  const who = state.who || state.session?.who;
  if (!who || !local?.days) return null;
  const remoteById = new Map(flatTasks(remote).map((t) => [t.id, t]));
  const keep = [];
  for (const task of flatTasks(local)) {
    if (task.updated_by !== who) continue;
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
    };
  } catch (_) {
    return { tasks: null, reports: null, hr: null };
  }
}
function cacheBoard() {
  try {
    if (state.tasksFile) localStorage.setItem(LS_TASKS, JSON.stringify(state.tasksFile));
    if (state.reportsFile) localStorage.setItem(LS_REPORTS, JSON.stringify(state.reportsFile));
    if (state.hrFile) localStorage.setItem(LS_HR, JSON.stringify(state.hrFile));
  } catch (_) {}
}

function hydrateFromCache() {
  try {
    const tasks = JSON.parse(localStorage.getItem(LS_TASKS) || "null");
    const reports = JSON.parse(localStorage.getItem(LS_REPORTS) || "null");
    const hr = JSON.parse(localStorage.getItem(LS_HR) || "null");
    if (tasks?.days) state.tasksFile = tasks;
    if (hr?.reviews || hr?.work) state.hrFile = hr;
    if (reports?.reports) state.reportsFile = reports;
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

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
  const token = writeToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchHeadSha() {
  const { owner, repo, branch } = repoInfo();
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { cache: "no-store", headers: githubHeaders() }
  );
  if (!res.ok) return "";
  const json = await res.json();
  return json.object?.sha || "";
}

async function dbGet(path, ref) {
  const { owner, repo, branch } = repoInfo();
  const at = ref || (await fetchHeadSha()) || branch;
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(at)}`,
    { cache: "no-store", headers: githubHeaders() }
  );
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const json = await res.json();
  state.shas[path] = json.sha;
  return decodeGithubFile(json);
}

async function dbPut(path, data, message) {
  cacheBoard();
  const { owner, repo, branch } = repoInfo();
  const token = writeToken();
  if (!token) {
    state.saveState = "local-only";
    return false;
  }
  let payload = data;
  let lastError = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const head = await fetchHeadSha();
      const remote = await dbGet(path, head);
      if (path.endsWith("daily-tasks.json")) {
        payload = mergeTaskFiles(remote, payload);
        state.tasksFile = payload;
      } else if (path.endsWith("reports.json")) {
        payload = mergeReports(remote, payload);
        state.reportsFile = payload;
      } else if (path.endsWith("hr.json")) {
        payload = mergeHr(remote, payload);
        state.hrFile = payload;
      }
    } catch (err) {
      lastError = err.message;
    }
    const sha = state.shas[path];
    if (!sha && attempt > 1) {
      lastError = "Could not read the GitHub file before saving.";
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      continue;
    }
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          message,
          content: toBase64(JSON.stringify(payload, null, 2) + "\n"),
          branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );
    if (res.ok) {
      const json = await res.json();
      state.shas[path] = json.content?.sha || sha;
      state.headSha = json.commit?.sha || state.headSha;
      state.saveState = "saved";
      state.saveError = "";
      cacheBoard();
      return true;
    }
    const text = await res.text();
    if (res.status === 409 || res.status === 422) {
      lastError = "GitHub was updated by someone else. Retrying…";
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      continue;
    }
    throw new Error(res.status === 401
      ? "GitHub could not save. The board database token needs a refresh."
      : `GitHub ${res.status}: ${text.slice(0, 140)}`);
  }
  throw new Error(lastError || "Could not save to GitHub. Click Refresh, then move the task again.");
}

async function loadAll() {
  if (state.session) state.who = state.session.who;
  const local = async () => {
    const [team, auth, drive, projects, tasksFile, reportsFile, githubCfg, hrFile] = await Promise.all([
      fetchLocal("./helal/team.json"),
      fetchLocal("./helal/auth.json"),
      fetchLocal("./helal/drive.json"),
      fetchLocal("./helal/projects.json"),
      fetchLocal("./helal/daily-tasks.json"),
      fetchLocal("./helal/reports.json"),
      fetchLocal("./helal/github.json"),
      fetchLocal("./helal/hr.json").catch(() => emptyHr()),
    ]);
    Object.assign(state, { team, auth, drive, projects, tasksFile, reportsFile, githubCfg, hrFile });
  };

  try {
    await local();
  } catch (_) {
    hydrateFromCache();
  }
  const cache = readCacheFiles();
  try {
    const githubCfg = await dbGet("helal/github.json");
    state.githubCfg = githubCfg;
    const head = await fetchHeadSha();
    state.headSha = head;
    const [team, auth, drive, projects, tasksFile, reportsFile, hrFile] = await Promise.all([
      dbGet("helal/team.json", head),
      dbGet("helal/auth.json", head),
      dbGet("helal/drive.json", head),
      dbGet("helal/projects.json", head),
      dbGet("helal/daily-tasks.json", head),
      dbGet("helal/reports.json", head),
      dbGet("helal/hr.json", head).catch(() => cache.hr || state.hrFile || emptyHr()),
    ]);
    Object.assign(state, { team, auth, drive, projects, githubCfg });
    const replay = mineNewerFile(tasksFile, cache.tasks);
    state.tasksFile = replay ? mergeTaskFiles(tasksFile, replay) : tasksFile;
    state.reportsFile = reportsFile;
    state.hrFile = hrFile?.work || hrFile?.reviews ? hrFile : emptyHr();
    state.hrQuarter = state.hrQuarter || currentQuarter();
    state.saveState = writeToken() ? "saved" : "idle";
    cacheBoard();
    if (replay && writeToken()) saveTasks(`board: ${state.who} replay unsaved moves`);
  } catch (_) {
    if (cache.tasks?.days) state.tasksFile = mergeTaskFiles(state.tasksFile, cache.tasks);
    if (cache.reports?.reports) state.reportsFile = mergeReports(state.reportsFile, cache.reports);
    if (cache.hr) state.hrFile = mergeHr(state.hrFile || emptyHr(), cache.hr);
  }
  if (!state.hrFile) state.hrFile = emptyHr();
  state.hrQuarter = state.hrQuarter || currentQuarter();

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
      state.saveError = err.message;
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
      state.saveError = err.message;
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
      state.saveError = err.message;
      render();
    }
  });
}

async function pullRemoteBoard() {
  if (!state.session || state.saveState === "saving") return;
  try {
    const head = await fetchHeadSha();
    if (head && head === state.headSha) return;
    const remoteTasks = await dbGet("helal/daily-tasks.json", head);
    const remoteReports = await dbGet("helal/reports.json", head);
    const remoteHr = await dbGet("helal/hr.json", head).catch(() => state.hrFile || emptyHr());
    if (state.saveState === "saving") return;
    const before = tasksSignature(state.tasksFile);
    const replay = state.saveState === "error" ? mineNewerFile(remoteTasks, state.tasksFile) : null;
    state.tasksFile = replay ? mergeTaskFiles(remoteTasks, replay) : remoteTasks;
    state.reportsFile = remoteReports;
    state.hrFile = remoteHr || emptyHr();
    state.headSha = head || state.headSha;
    cacheBoard();
    if (tasksSignature(state.tasksFile) !== before) render();
  } catch (_) {}
}

function login(who, pin) {
  const role = accessFor(who);
  const expected = role === "admin" ? state.auth?.admin_pin : state.auth?.member_pin;
  if (!pin || pin !== expected) {
    state.loginError = role === "admin" ? "Use the admin password." : "Use the member password.";
    render();
    return;
  }
  state.session = { who, role };
  state.who = who;
  state.loginError = "";
  state.view = "board";
  localStorage.setItem(LS_SESSION, JSON.stringify(state.session));
  state.headSha = "";
  render();
  pullRemoteBoard();
}

function logout() {
  state.session = null;
  state.who = "";
  localStorage.removeItem(LS_SESSION);
  render();
}

function ensureDay(date) {
  if (!state.tasksFile.days) state.tasksFile.days = [];
  let day = state.tasksFile.days.find((d) => d.date === date);
  if (!day) {
    day = { date, source: "Helal board", tasks: [] };
    state.tasksFile.days.push(day);
  }
  return day;
}

function applyStatus(taskId, next, extra = {}) {
  if (!canSetStatus(next)) return;
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
    revisions: 0,
  });
  state.creating = false;
  state.draft = null;
  render();
  saveTasks(`board: ${state.who} assigned ${who} — ${title}`);
}

function submitReport(fields) {
  if (!state.reportsFile) state.reportsFile = { reports: [] };
  if (!state.reportsFile.reports) state.reportsFile.reports = [];
  state.reportsFile.reports.unshift({
    id: `r-${Date.now().toString(36)}`,
    who: state.who,
    date: fields.date || today(),
    finished: fields.finished,
    unfinished: fields.unfinished,
    drive: fields.drive,
    need_review: fields.need_review,
    created_at: new Date().toISOString(),
  });
  state.reportDay = fields.date || today();
  state.calMonth = state.reportDay.slice(0, 7);
  render();
  saveReports(`report: ${state.who} ${state.reportDay}`);
}

function banner() {
  if (state.saveState === "saving") return $("div", { class: "banner" }, "Saving to GitHub…");
  if (state.saveState === "saved") {
    return $("div", { class: "banner ok" }, "Saved to the Helal GitHub database.");
  }
  if (state.saveState === "error") return $("div", { class: "banner err" }, state.saveError);
  if (state.saveState === "local-only") {
    return $("div", { class: "banner warn" }, "Saved on this computer. GitHub write access is not active yet.");
  }
  return null;
}

function kanbanCard(task) {
  return $("article", {
    class: `kcard ${taskTone(task)}`,
    draggable: "true",
    ondragstart: (e) => {
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
          if (id && canSetStatus(status)) setStatus(id, status);
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
          : $("button", {
            class: "btn",
            style: "margin-top:12px",
            onclick: () => {
              state.creating = true;
              state.createStatus = status;
              state.dueDraft = today();
              state.dueMonth = today().slice(0, 7);
              render();
            },
          }, "New task"),
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
  if (!state.hrFile.weights) state.hrFile.weights = emptyHr().weights;
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

function reviewsFor(name, quarter) {
  return ensureHr().reviews.filter((r) => r.who === name && (!quarter || r.quarter === quarter));
}

function computedDelivery(name, quarter) {
  const tasks = allTasks().filter((t) => {
    if (t.who !== name) return false;
    if (!["Review", "Revisions", "Done"].includes(t.status)) return false;
    return inQuarter(deliveryDate(t) || t.done_on || t.due, quarter);
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

function computedDiscipline(name, quarter) {
  const warns = ensureHr().warnings.filter((w) => w.who === name && inQuarter(w.date, quarter) && w.status !== "Note").length;
  const late = allTasks().filter((t) => t.who === name && isLateTask(t) && !delayExcused(t) && !t.delay_notified && inQuarter(deliveryDate(t) || t.due, quarter)).length;
  const files = allTasks().filter((t) => t.who === name && t.drive_missing && t.status !== "To do").length;
  let score = 5;
  if (warns >= 3 || late >= 5) score = 1;
  else if (warns === 2 || late >= 3 || files >= 3) score = 2;
  else if (warns === 1 || late >= 1 || files >= 1) score = 3;
  else if (late === 0 && warns === 0) score = 5;
  return score;
}

function personScore(name, quarter) {
  const q = quarter || currentQuarter();
  const rows = reviewsFor(name, q);
  const w = ensureHr().weights;
  const delivery = avg(rows.map((r) => r.delivery).filter(Boolean)) || computedDelivery(name, q);
  const quality = avg(rows.map((r) => r.quality_avg).filter(Boolean));
  const revisions = avg(rows.map((r) => r.revision_rating).filter(Boolean));
  const creativity = avg(rows.map((r) => r.creativity).filter(Boolean));
  const discipline = computedDiscipline(name, q);
  const parts = [
    [delivery, w.delivery],
    [quality, w.quality],
    [revisions, w.revisions],
    [creativity, w.creativity],
    [discipline, w.discipline],
  ].filter(([n]) => n > 0);
  const weightSum = parts.reduce((s, [, wt]) => s + wt, 0) || 1;
  const total = parts.reduce((s, [n, wt]) => s + n * wt, 0) / weightSum;
  const attitudeRows = ensureHr().attitude.filter((a) => a.who === name && currentQuarter(`${a.month}-01`) === q);
  const attitude = avg(attitudeRows.map((a) => avg(ATTITUDE_CRITERIA.map(([k]) => Number(a[k]) || 0))));
  return { name, quarter: q, delivery, quality, revisions, creativity, discipline, total, attitude, reviews: rows.length };
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
  if (!task) return [];
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

function viewHr() {
  const q = state.hrQuarter || currentQuarter();
  const tabs = [
    ["scores", "Performance"],
    ["tasks", "Task tracking"],
    ["revisions", "Revisions"],
    ["hours", "Hours"],
    ["attitude", "Attitude"],
    ["warnings", "Warnings"],
    ["rewards", "Rewards"],
  ];
  return $("div", { class: "dash" }, [
    $("div", { class: "hr-tabs" }, tabs.map(([id, label]) =>
      $("button", {
        class: state.hrTab === id ? "on" : "",
        onclick: () => { state.hrTab = id; render(); },
      }, label)
    )),
    $("div", { class: "cal-nav" }, [
      $("button", { class: "btn ghost", type: "button", onclick: () => { state.hrQuarter = shiftQuarter(q, -1); render(); } }, "Prev"),
      $("h2", {}, q),
      $("button", { class: "btn ghost", type: "button", onclick: () => { state.hrQuarter = shiftQuarter(q, 1); render(); } }, "Next"),
    ]),
    state.hrTab === "tasks" ? viewHrTasks()
      : state.hrTab === "revisions" ? viewHrRevisions()
      : state.hrTab === "hours" ? viewHrHours()
      : state.hrTab === "attitude" ? viewHrAttitude(q)
      : state.hrTab === "warnings" ? viewHrWarnings()
      : state.hrTab === "rewards" ? viewHrRewards()
      : viewHrScores(q),
  ]);
}

function shiftQuarter(q, delta) {
  const year = Number(q.slice(0, 4));
  const n = Number(q.slice(-1)) + delta;
  if (n < 1) return `${year - 1}-Q4`;
  if (n > 4) return `${year + 1}-Q1`;
  return `${year}-Q${n}`;
}

function viewHrScores(q) {
  const w = ensureHr().weights;
  const rows = people().filter((p) => p.name !== "Amr").map((p) => ({ ...p, ...personScore(p.name, q) }));
  const best = [...rows].sort((a, b) => b.total - a.total)[0];
  const late = allTasks().filter((t) => isLateTask(t) && !delayExcused(t));
  const missingDrive = allTasks().filter((t) => t.drive_missing && t.status !== "To do");
  return $("div", { class: "dash" }, [
    $("p", { class: "muted" }, `Delivery ${w.delivery}% · Quality ${w.quality}% · Revisions ${w.revisions}% · Creativity ${w.creativity}% · Discipline ${w.discipline}%. Attitude is scored separately.`),
    $("div", { class: "stat-row" }, [
      statBox(rows.filter((r) => r.total >= 4).length, "On track (4+)"),
      statBox(late.length, "Late without a clear blocker", late.length ? "tone-orange" : ""),
      statBox(missingDrive.length, "Missing Drive files", missingDrive.length ? "tone-orange" : ""),
      statBox(best?.total ? `${best.name} ${formatScore(best.total)}` : "—", "Highest score", "tone-green"),
    ]),
    $("section", { class: "card" }, [
      $("div", { class: "load-table-wrap" }, [
        $("table", { class: "load-table" }, [
          $("thead", {}, $("tr", {}, ["Name", "Delivery 25%", "Quality 35%", "Revisions 15%", "Creativity 15%", "Discipline 10%", "Score", "Attitude"].map((h) => $("th", {}, h)))),
          $("tbody", {}, rows.map((r) =>
            $("tr", {}, [
              $("td", {}, [$("strong", {}, r.name), $("span", { class: "muted" }, ` ${r.role || ""}`)]),
              $("td", { class: scoreTone(r.delivery) }, formatScore(r.delivery)),
              $("td", { class: scoreTone(r.quality) }, formatScore(r.quality)),
              $("td", { class: scoreTone(r.revisions) }, formatScore(r.revisions)),
              $("td", { class: scoreTone(r.creativity) }, formatScore(r.creativity)),
              $("td", { class: scoreTone(r.discipline) }, formatScore(r.discipline)),
              $("td", { class: scoreTone(r.total) }, $("strong", {}, formatScore(r.total))),
              $("td", { class: scoreTone(r.attitude) }, formatScore(r.attitude)),
            ])
          )),
        ]),
      ]),
    ]),
  ]);
}

function viewHrTasks() {
  const tasks = [...allTasks()].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  return $("section", { class: "card" }, [
    $("p", { class: "muted" }, "Assigned, start, deadline, delivery, delay days, notice, and Drive. Evaluate quality from here or Dashboard."),
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
        ) : $("tr", {}, $("td", { colspan: "12" }, "No tasks yet."))),
      ]),
    ]),
  ]);
}

function viewHrRevisions() {
  const rows = allTasks().flatMap((t) => {
    const log = t.revision_log || [];
    if (!log.length && (t.revisions || 0) > 0) {
      return [{ task: t, count: t.revisions, level: "—", reason: "—", at: t.updated_at, by: t.updated_by || "—" }];
    }
    return log.map((entry) => ({
      task: t,
      count: t.revisions || log.length,
      level: entry.level || "—",
      reason: entry.reason || "—",
      at: entry.at,
      by: entry.by || "—",
    }));
  });
  return $("section", { class: "card" }, [
    $("p", { class: "muted" }, "Minor is a small tweak. Medium is a large part. Major is a full rethink. Few natural edits score 5; a full redo scores 1."),
    $("div", { class: "load-table-wrap" }, [
      $("table", { class: "load-table" }, [
        $("thead", {}, $("tr", {}, ["Task", "Employee", "Revisions", "Level", "Reason", "By", "When"].map((h) => $("th", {}, h)))),
        $("tbody", {}, rows.length ? rows.map((r) =>
          $("tr", {}, [
            $("td", {}, $("strong", {}, r.task.title)),
            $("td", {}, r.task.who),
            $("td", {}, String(r.count)),
            $("td", {}, r.level),
            $("td", {}, r.reason),
            $("td", {}, r.by),
            $("td", {}, cairoDate(r.at) || "—"),
          ])
        ) : $("tr", {}, $("td", { colspan: "7" }, "No revisions logged yet."))),
      ]),
    ]),
  ]);
}

function viewHrHours() {
  const roster = people().filter((p) => p.name !== "Amr");
  return $("section", { class: "card" }, [
    $("p", { class: "muted" }, "Type, work days, hours, office days, and reply reliability during those hours. Tasneem can edit and save."),
    $("div", { class: "load-table-wrap" }, [
      $("table", { class: "load-table" }, [
        $("thead", {}, $("tr", {}, ["Employee", "Type", "Work days", "Hours", "Office days", "Office / remote", "Replies"].map((h) => $("th", {}, h)))),
        $("tbody", {}, roster.map((p) => {
          const w = workFor(p.name);
          const type = $("select", {}, WORK_TYPES.map((t) => $("option", { value: t, selected: w.type === t }, t)));
          const days = $("input", { value: w.days || "Sun–Thu" });
          const hours = $("input", { value: w.hours || "10:00–18:00" });
          const office = $("input", { value: w.office_days || "", placeholder: "Tue, Thu" });
          const mode = $("select", {}, WORK_MODES.map((t) => $("option", { value: t, selected: w.mode === t }, t)));
          const response = $("select", {}, RESPONSE_LEVELS.map((t) => $("option", { value: t, selected: (w.response || "Reliable") === t }, t)));
          const save = () => {
            ensureHr().work[p.name] = {
              type: type.value,
              days: days.value.trim(),
              hours: hours.value.trim(),
              office_days: office.value.trim(),
              mode: mode.value,
              response: response.value,
            };
            render();
            saveHr(`hr: ${state.who} updated hours for ${p.name}`);
          };
          [type, mode, response, days, hours, office].forEach((el) => el.addEventListener("change", save));
          return $("tr", {}, [
            $("td", {}, [$("strong", {}, p.name), $("span", { class: "muted" }, ` ${p.role || ""}`)]),
            $("td", {}, type),
            $("td", {}, days),
            $("td", {}, hours),
            $("td", {}, office),
            $("td", {}, mode),
            $("td", {}, response),
          ]);
        })),
      ]),
    ]),
  ]);
}

function viewHrAttitude(q) {
  const month = today().slice(0, 7);
  const who = $("select", {}, people().filter((p) => p.name !== "Amr").map((p) => $("option", { value: p.name }, p.name)));
  const inputs = ATTITUDE_CRITERIA.map(([key, label]) => [key, label, scoreSelect()]);
  const notes = $("textarea", { placeholder: "Optional note" });
  const rows = ensureHr().attitude.filter((a) => currentQuarter(`${a.month}-01`) === q);
  return $("div", { class: "dash" }, [
    $("section", { class: "card", style: "max-width:640px" }, [
      $("h2", {}, "Attitude & collaboration"),
      $("p", { class: "muted" }, "Separate from task scores. Communication, teamwork, responsibility, respect, feedback, problem solving."),
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
          saveHr(`hr: ${state.who} scored attitude for ${who.value}`);
        },
      }, [
        $("label", {}, ["Employee", who]),
        ...inputs.map(([, label, input]) => $("label", {}, [label, input])),
        $("label", {}, ["Notes", notes]),
        $("button", { class: "btn primary", type: "submit" }, `Save · ${month}`),
      ]),
    ]),
    $("section", { class: "card" }, [
      $("h2", {}, "This quarter"),
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
        : $("p", { class: "empty" }, "No attitude scores this quarter yet."),
    ]),
  ]);
}

function viewHrWarnings() {
  const who = $("select", {}, people().filter((p) => p.name !== "Amr").map((p) => $("option", { value: p.name }, p.name)));
  const date = $("input", { type: "date", value: today() });
  const issue = $("select", {}, WARNING_ISSUES.map((s) => $("option", { value: s }, s)));
  const detail = $("input", { placeholder: "Optional detail" });
  const status = $("select", {}, WARNING_STATUSES.map((s) => $("option", { value: s }, s)));
  const rows = [...(ensureHr().warnings || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return $("div", { class: "dash" }, [
    $("section", { class: "card", style: "max-width:640px" }, [
      $("h2", {}, "Attendance & process"),
      $("p", { class: "muted" }, "First time: feedback. Repeat: formal warning. After that: deduction policy (added later)."),
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
          ) : $("tr", {}, $("td", { colspan: "5" }, "No warnings yet."))),
        ]),
      ]),
    ]),
  ]);
}

function viewHrRewards() {
  const q = state.hrQuarter || currentQuarter();
  const rows = people().filter((p) => p.name !== "Amr").map((p) => personScore(p.name, q)).sort((a, b) => b.total - a.total);
  const lead = rows.find((r) => r.total > 0);
  return $("section", { class: "card" }, [
    $("h2", {}, "Rewards — later"),
    $("p", { class: "muted" }, "Quarterly bonus and Best Employee will use these scores. Deductions stay off until Tasneem confirms the policy."),
    lead
      ? $("p", {}, `Current lead for ${q}: ${lead.name} · ${formatScore(lead.total)}`)
      : $("p", { class: "empty" }, "No scores yet this quarter."),
  ]);
}

function myHrCard() {
  const score = personScore(state.who, currentQuarter());
  return $("section", { class: "card" }, [
    $("h2", {}, "Your performance"),
    $("p", { class: "muted" }, `${score.quarter} · Attitude is separate from this score.`),
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
    state.draft = { who: state.who, space: "Social", project: "", title: "", notes: "", drive: "" };
  }
  const d = state.draft;
  if (!isAdmin()) d.who = state.who;
  const assignees = isAdmin() ? people() : people().filter((p) => p.name === state.who);
  const who = $("select", { disabled: !isAdmin() }, assignees.map((p) => $("option", { value: p.name, selected: p.name === d.who }, p.name)));
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
  if (!state.creating) return null;
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
  return $("div", { class: "report-summary" }, [
    $("article", { class: "card" }, [
      $("h3", {}, "Submitted"),
      $("p", { class: "muted" }, `${submittedNames.length} of ${people().length}`),
      submittedNames.length
        ? $("div", { class: "chip-row" }, submittedNames.map((name) => chip(name, "tone-green")))
        : $("p", { class: "empty" }, "Nobody has submitted yet."),
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
  const dayReports = (state.reportsFile?.reports || []).filter((r) => r.date === day);
  return $("div", { class: "dash" }, [
    viewCalendar(),
    $("section", {}, [
      $("h2", {}, `Reports · ${day}`),
      $("p", { class: "muted" }, "Who sent a report today, who has not, then each report as question and answer."),
      reportDaySummary(day),
      dayReports.length
        ? $("div", { class: "cards", style: "margin-top:18px" }, dayReports.map(reportCard))
        : $("p", { class: "empty" }, "No report submissions on this day yet."),
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
  return $("section", { class: "card", style: "max-width:640px" }, [
    $("h2", {}, "Daily report"),
    $("p", { class: "muted" }, `Cairo date ${today()}. Admins read this as question and answer on the dashboard.`),
    $("form", {
      class: "form",
      style: "margin-top:16px",
      onsubmit: (e) => {
        e.preventDefault();
        submitReport({
          date: today(),
          finished: finished.value.trim(),
          unfinished: unfinished.value.trim(),
          drive: drive.value.trim(),
          need_review: need.checked,
        });
        finished.value = "";
        unfinished.value = "";
        drive.value = "";
        need.checked = false;
      },
    }, [
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
  const clients = (state.drive?.folders || []).filter((f) => f.who === "Client" || f.id === "content-calendars");
  const team = (state.drive?.folders || []).filter((f) => f.who !== "Client" && f.id !== "content-calendars");
  const card = (f) =>
    $("article", { class: "card" }, [
      $("p", { class: "title" }, f.name),
      $("p", { class: "muted" }, f.who),
      f.url ? $("a", { href: f.url, target: "_blank", rel: "noreferrer" }, "Open folder") : $("p", {}, "Link missing."),
    ]);
  return $("div", {}, [
    $("p", { class: "muted" }, "Upload into the matching client folder. Files stay in Drive."),
    $("h2", { style: "margin:16px 0 10px" }, "Clients"),
    $("div", { class: "people" }, clients.map(card)),
    $("h2", { style: "margin:22px 0 10px" }, "Team"),
    $("div", { class: "people" }, team.map(card)),
  ]);
}

function viewPeople() {
  return $("div", { class: "people" },
    people().map((p) =>
      $("article", { class: "card" }, [
        $("p", { class: "title" }, p.name),
        $("p", { class: "muted" }, p.role),
        isAdmin() && p.email ? $("p", {}, p.email) : null,
        $("p", { class: "muted" }, `${workFor(p.name).type} · ${workFor(p.name).days} · ${workFor(p.name).hours} · ${workFor(p.name).mode}${workFor(p.name).office_days ? ` · Office ${workFor(p.name).office_days}` : ""}`),
        $("span", { class: "pill" }, p.access || "member"),
      ])
    )
  );
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

function viewGuide() {
  const steps = [
    ["Log in", "Choose your name and password. Amr and Tasneem use the admin password."],
    ["Your board", "Members see only their tasks. Admins see the team. Columns are To do, In progress, Review, Revisions, and Done."],
    ["Do the work", "Drag a card across columns. Time in In progress is tracked until you move it to Review. Upload files to Drive, not GitHub."],
    ["Create a task", "Use New task. Fill the brief and pick the due date on the calendar. Only the creator can later edit the brief."],
    ["Review", "Drag to Review when ready. Amr or Tasneem check it done on the Dashboard. It stays in Done for both of you and in GitHub."],
    ["Workload", "Green is clear, orange needs attention, red is overload. Time in progress is tracked until Review."],
    ["Evening report", "Open Report and answer each question. Admins read it on the dashboard."],
    ["HR", "Amr and Tasneem open HR for delivery dates, delay reasons, quality by role, revision level, hours, attitude, and warnings. Rewards come later."],
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
        $("p", { class: "lede" }, "Choose your name and enter your password."),
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
        $("button", {
          class: "btn primary",
          onclick: () => {
            state.creating = true;
            state.createStatus = "To do";
            state.dueDraft = today();
            state.dueMonth = today().slice(0, 7);
            render();
          },
        }, "New task"),
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

function watchCairoDay() {
  setInterval(() => {
    const now = today();
    if (now !== lastCairoDay) lastCairoDay = now;
    if (state.saveState === "saving") return;
    if (state.session) {
      pullRemoteBoard();
      return;
    }
    if (state.view === "load" && allTasks().some((t) => t.status === "In progress")) render();
  }, 8000);
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

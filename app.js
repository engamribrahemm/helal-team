const STATUSES = ["To do", "In progress", "Review", "Revisions", "Done"];
const SPACES = ["Social", "Graphic", "Video editors", "HR", "Daily Reports", "Calendar"];
const CAIRO = "Africa/Cairo";
const LS_SESSION = "helal.session";
const LS_TASKS = "helal.tasksCache";
const LS_REPORTS = "helal.reportsCache";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  githubCfg: null,
  saveState: "idle",
  saveError: "",
  loginError: "",
  shas: {},
  session: readSession(),
  openTaskId: null,
  creating: false,
  createStatus: "To do",
  dueDraft: "",
  dueMonth: "",
  draft: null,
  reportDay: "",
  calMonth: "",
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
  return (state.githubCfg && state.githubCfg.write_token) || "";
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

function cacheBoard() {
  try {
    if (state.tasksFile) localStorage.setItem(LS_TASKS, JSON.stringify(state.tasksFile));
    if (state.reportsFile) localStorage.setItem(LS_REPORTS, JSON.stringify(state.reportsFile));
  } catch (_) {}
}

function hydrateFromCache() {
  try {
    const tasks = JSON.parse(localStorage.getItem(LS_TASKS) || "null");
    const reports = JSON.parse(localStorage.getItem(LS_REPORTS) || "null");
    if (tasks?.days) state.tasksFile = tasks;
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

async function dbGet(path) {
  const { owner, repo, branch } = repoInfo();
  const token = writeToken();
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers }
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
  if (!state.shas[path]) {
    try {
      await dbGet(path);
    } catch (_) {}
  }
  const body = {
    message,
    content: toBase64(JSON.stringify(data, null, 2) + "\n"),
    branch,
  };
  if (state.shas[path]) body.sha = state.shas[path];
  const put = () =>
    fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    });
  let res = await put();
  if (res.status === 409 || res.status === 422) {
    await dbGet(path);
    body.sha = state.shas[path];
    res = await put();
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 401
      ? "GitHub could not save. The board database token needs a refresh."
      : `GitHub ${res.status}: ${text.slice(0, 140)}`);
  }
  const json = await res.json();
  state.shas[path] = json.content?.sha || state.shas[path];
  state.saveState = "saved";
  state.saveError = "";
  cacheBoard();
  return true;
}

async function loadAll() {
  const local = async () => {
    const [team, auth, drive, projects, tasksFile, reportsFile, githubCfg] = await Promise.all([
      fetchLocal("./helal/team.json"),
      fetchLocal("./helal/auth.json"),
      fetchLocal("./helal/drive.json"),
      fetchLocal("./helal/projects.json"),
      fetchLocal("./helal/daily-tasks.json"),
      fetchLocal("./helal/reports.json"),
      fetchLocal("./helal/github.json"),
    ]);
    Object.assign(state, { team, auth, drive, projects, tasksFile, reportsFile, githubCfg });
  };

  try {
    await local();
  } catch (_) {
    hydrateFromCache();
  }
  const localHost = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  if (!localHost) {
    try {
      const [team, auth, drive, projects, tasksFile, reportsFile, githubCfg] = await Promise.all([
        dbGet("helal/team.json"),
        dbGet("helal/auth.json"),
        dbGet("helal/drive.json"),
        dbGet("helal/projects.json"),
        dbGet("helal/daily-tasks.json"),
        dbGet("helal/reports.json"),
        dbGet("helal/github.json"),
      ]);
      Object.assign(state, { team, auth, drive, projects, tasksFile, reportsFile, githubCfg });
      state.saveState = writeToken() ? "saved" : "idle";
      cacheBoard();
    } catch (_) {}
  }

  state.reportDay = state.reportDay || today();
  state.calMonth = state.calMonth || today().slice(0, 7);
  state.dueDraft = state.dueDraft || today();
  state.dueMonth = state.dueMonth || today().slice(0, 7);
  lastCairoDay = today();
  if (state.session && !people().some((p) => p.name === state.session.who)) logout();
  else if (state.session) state.who = state.session.who;
}

async function saveTasks(message) {
  try {
    await dbPut("helal/daily-tasks.json", state.tasksFile, message);
  } catch (err) {
    state.saveState = "error";
    state.saveError = err.message;
    render();
  }
}

async function saveReports(message) {
  try {
    await dbPut("helal/reports.json", state.reportsFile, message);
  } catch (err) {
    state.saveState = "error";
    state.saveError = err.message;
    render();
  }
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
  render();
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

function setStatus(taskId, next) {
  if (!canSetStatus(next)) return;
  let found = null;
  for (const day of state.tasksFile.days) {
    const task = day.tasks.find((t) => t.id === taskId);
    if (task) {
      if (task.status === next) return;
      task.status = next;
      if (next === "Revisions") task.revisions = (task.revisions || 0) + 1;
      task.updated_at = new Date().toISOString();
      task.updated_by = state.who;
      found = task;
    }
  }
  if (!found) return;
  render();
  saveTasks(`board: ${state.who} set ${taskId} to ${next}`);
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
    class: "kcard",
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
    $("div", { class: "meta" }, [
      $("span", { class: "pill" }, task.who),
      task.project ? $("span", { class: "pill" }, task.project) : null,
      $("span", { class: "pill" }, `Due ${task.due}`),
      task.created_by && task.created_by !== task.who ? $("span", { class: "pill" }, `From ${task.created_by}`) : null,
    ]),
  ]);
}

function viewBoard() {
  const tasks = tasksForView();
  return $("div", { class: "kanban" },
    STATUSES.map((status) => {
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
        canSetStatus(status)
          ? $("button", {
            class: "btn",
            style: "margin-top:12px",
            onclick: () => {
              state.creating = true;
              state.createStatus = status;
              state.dueDraft = today();
              state.dueMonth = today().slice(0, 7);
              render();
            },
          }, "New task")
          : $("p", { class: "muted" }, "Only admins can mark Done."),
      ]);
    })
  );
}

function viewMy() {
  const list = tasksForView();
  return [
    $("div", { class: "stat-row" }, [
      statBox(list.length, isAdmin() ? "All tasks" : "Assigned to you"),
      statBox(list.filter((t) => t.status === "Review").length, "In review"),
      statBox(list.filter((t) => t.status === "Revisions").length, "Edits required"),
      statBox(list.filter((t) => t.status === "Done").length, "Done"),
    ]),
    list.length
      ? $("div", { class: "cards" }, list.map((task) =>
        $("article", { class: "card", onclick: () => { state.openTaskId = task.id; render(); } }, [
          $("p", { class: "title" }, task.title),
          $("div", { class: "meta" }, [
            $("span", { class: "pill" }, task.who),
            $("span", { class: "pill" }, task.status),
            $("span", { class: "pill" }, `Due ${task.due}`),
          ]),
        ])
      ))
      : $("p", { class: "empty" }, isAdmin()
        ? "No tasks yet."
        : `Nothing assigned to ${state.who} yet.`),
  ];
}

function statBox(value, label) {
  return $("div", { class: "stat" }, [$("strong", {}, String(value)), $("span", { class: "muted" }, label)]);
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
  const who = $("select", { disabled: !isAdmin() }, people().map((p) => $("option", { value: p.name, selected: p.name === task.who }, p.name)));
  const space = $("select", {}, SPACES.map((s) => $("option", { value: s, selected: s === task.space }, s)));
  const project = $("select", {}, [
    $("option", { value: "" }, "No client"),
    ...projectList().map((p) => $("option", { value: p.name, selected: p.name === task.project }, p.name)),
  ]);
  const title = $("input", { value: task.title, required: true });
  const notes = $("textarea", {}, task.notes || "");
  const drive = $("input", { type: "url", value: task.drive || "" });
  const close = () => { state.openTaskId = null; render(); };
  return [
    $("div", { class: "modal-bg", onclick: close }),
    $("aside", { class: "drawer" }, [
      $("p", { class: "muted" }, "Task"),
      $("h2", {}, task.title),
      $("form", {
        class: "form",
        onsubmit: (e) => {
          e.preventDefault();
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
          STATUSES.map((s) =>
            $("button", {
              type: "button",
              class: s === task.status ? "on" : "",
              disabled: !canSetStatus(s),
              onclick: () => setStatus(task.id, s),
            }, s)
          )
        ),
        $("div", { style: "display:flex;gap:8px" }, [
          $("button", { class: "btn primary", type: "submit" }, "Save"),
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
  const dayReports = (state.reportsFile?.reports || []).filter((r) => r.date === day);
  return $("div", { class: "dash" }, [
    viewCalendar(),
    $("section", {}, [
      $("h2", {}, `Reports · ${day}`),
      $("p", { class: "muted" }, "Each submission is shown as the question, then the member’s answer."),
      dayReports.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, dayReports.map(reportCard))
        : $("p", { class: "empty" }, "No report submissions on this day."),
    ]),
    $("section", {}, [
      $("h2", {}, "Waiting on review"),
      waiting.length
        ? $("div", { class: "cards", style: "margin-top:14px" }, waiting.map((t) =>
          $("article", { class: "card" }, [
            $("p", { class: "title" }, t.title),
            $("div", { class: "meta" }, [
              $("span", { class: "pill" }, t.who),
              $("span", { class: "pill" }, t.status),
              $("span", { class: "pill" }, `Due ${t.due}`),
            ]),
          ])
        ))
        : $("p", { class: "empty" }, "Nothing in Review or Revisions."),
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
        $("span", { class: "pill" }, p.access || "member"),
      ])
    )
  );
}

function viewGuide() {
  const steps = [
    ["Log in", "Choose your name and password. Amr and Tasneem use the admin password."],
    ["Your board", "Members see only tasks assigned to them. Admins see the whole team."],
    ["Do the work", "Drag a card across columns. Upload files to Drive, not GitHub."],
    ["Create a task", "Use New task. Fill the brief and pick the due date on the calendar."],
    ["Review", "Drag to Review when ready. Only Amr or Tasneem can mark Done."],
    ["Evening report", "Open Report and answer each question. Admins read it on the dashboard."],
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
    ["report", "Report"],
    ["drive", "Drive"],
    ["guide", "SOP"],
  ];
  if (isAdmin()) {
    items.splice(2, 0, ["review", "Dashboard"]);
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
  if (state.view === "my") viewMy().forEach((el) => main.append(el));
  else if (state.view === "board") main.append(viewBoard());
  else if (state.view === "review" && isAdmin()) main.append(viewReview());
  else if (state.view === "report") main.append(viewReport());
  else if (state.view === "drive") main.append(viewDrive());
  else if (state.view === "people" && isAdmin()) main.append(viewPeople());
  else if (state.view === "guide") main.append(viewGuide());
  else main.append(viewBoard());
  root.append(main);

  const modal = viewCreateModal();
  if (modal) root.append(...modal);
  const drawer = viewTaskDrawer();
  if (drawer) root.append(...drawer);
}

function watchCairoDay() {
  setInterval(() => {
    const now = today();
    if (now !== lastCairoDay) {
      lastCairoDay = now;
      render();
    }
  }, 30000);
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

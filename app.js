const STATUSES = ["To do", "In progress", "Review", "Revisions", "Done"];
const STATUS_CLASS = {
  "To do": "todo",
  "In progress": "progress",
  Review: "review",
  Revisions: "revisions",
  Done: "done",
};
const SPACES = ["Social", "Graphic", "Video editors", "HR", "Daily Reports", "Calendar"];
const LS_SESSION = "helal.session";
const LS_TOKEN = "helal.ghToken";
const LS_REPO = "helal.ghRepo";

const state = {
  view: "my",
  who: "",
  date: "",
  team: null,
  auth: null,
  drive: null,
  projects: null,
  tasksFile: null,
  reportsFile: null,
  githubCfg: null,
  token: localStorage.getItem(LS_TOKEN) || "",
  repo: localStorage.getItem(LS_REPO) || "",
  saveState: "idle",
  saveError: "",
  loginError: "",
  shas: {},
  session: readSession(),
};

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

function inferRepo() {
  const host = location.hostname;
  if (host.endsWith(".github.io")) {
    const owner = host.replace(".github.io", "");
    const repo = location.pathname.split("/").filter(Boolean)[0] || `${owner}.github.io`;
    return `${owner}/${repo}`;
  }
  return "";
}

function repoParts() {
  const raw = (state.repo || inferRepo() || "").trim();
  const [owner, repo] = raw.split("/");
  return owner && repo ? { owner, repo } : null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function people() {
  if (!state.team) return [];
  return [state.team.owner, ...state.team.people];
}

function accessFor(name) {
  const person = people().find((p) => p.name === name);
  return person?.access === "admin" ? "admin" : "member";
}

function isAdmin() {
  return state.session?.role === "admin";
}

function currentDay() {
  const days = state.tasksFile?.days || [];
  return days.find((d) => d.date === state.date) || days[days.length - 1] || { date: today(), tasks: [] };
}

function allTasks() {
  return (state.tasksFile?.days || []).flatMap((d) =>
    (d.tasks || []).map((t) => ({ ...t, date: d.date }))
  );
}

function tasksForView() {
  const tasks = (currentDay().tasks || []).map((t) => ({ ...t, date: currentDay().date }));
  if (isAdmin()) return tasks;
  return tasks.filter((t) => t.who === state.who || t.created_by === state.who);
}

function folderFor(name) {
  const person = people().find((p) => p.name === name);
  return (state.drive?.folders || []).find((f) => f.id === person?.home);
}

function canSetStatus(next) {
  if (isAdmin()) return true;
  return next !== "Done";
}

async function fetchLocal(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not read ${path}`);
  return res.json();
}

async function ghGet(path) {
  const repo = repoParts();
  const res = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${path}?ref=${state.githubCfg?.branch || "main"}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${state.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 180)}`);
  }
  const json = await res.json();
  state.shas[path] = json.sha;
  const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ""))));
  return JSON.parse(decoded);
}

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function ghPut(path, data, message) {
  const repo = repoParts();
  if (!state.token || !repo) {
    state.saveState = "local-only";
    render();
    return false;
  }
  state.saveState = "saving";
  render();
  const content = toBase64(JSON.stringify(data, null, 2) + "\n");
  const putOnce = async (sha) =>
    fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${state.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message,
        content,
        sha,
        branch: state.githubCfg?.branch || "main",
      }),
    });
  let res = await putOnce(state.shas[path]);
  if (res.status === 409 || res.status === 422) {
    await ghGet(path);
    res = await putOnce(state.shas[path]);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Save failed ${res.status}: ${body.slice(0, 180)}`);
  }
  const json = await res.json();
  state.shas[path] = json.content?.sha || state.shas[path];
  state.saveState = "saved";
  state.saveError = "";
  render();
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

  await local();
  if (state.githubCfg?.owner && state.githubCfg?.repo && !state.repo) {
    state.repo = `${state.githubCfg.owner}/${state.githubCfg.repo}`;
    localStorage.setItem(LS_REPO, state.repo);
  } else if (!state.repo && inferRepo()) {
    state.repo = inferRepo();
  }

  if (state.token && repoParts()) {
    try {
      const [team, auth, drive, projects, tasksFile, reportsFile, githubCfg] = await Promise.all([
        ghGet("helal/team.json"),
        ghGet("helal/auth.json"),
        ghGet("helal/drive.json"),
        ghGet("helal/projects.json"),
        ghGet("helal/daily-tasks.json"),
        ghGet("helal/reports.json"),
        ghGet("helal/github.json"),
      ]);
      Object.assign(state, { team, auth, drive, projects, tasksFile, reportsFile, githubCfg });
      state.saveState = "saved";
    } catch (err) {
      state.saveState = "error";
      state.saveError = err.message;
    }
  }

  const days = state.tasksFile?.days || [];
  state.date = days[days.length - 1]?.date || today();
  if (state.session && !people().some((p) => p.name === state.session.who)) {
    logout();
  } else if (state.session) {
    state.who = state.session.who;
  }
}

async function saveTasks(message) {
  try {
    await ghPut("helal/daily-tasks.json", state.tasksFile, message);
  } catch (err) {
    state.saveState = "error";
    state.saveError = err.message;
    render();
  }
}

async function saveReports(message) {
  try {
    await ghPut("helal/reports.json", state.reportsFile, message);
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
    state.loginError = role === "admin"
      ? "Use the admin password."
      : "Use the member password.";
    render();
    return;
  }
  state.session = { who, role };
  state.who = who;
  state.loginError = "";
  state.view = "my";
  localStorage.setItem(LS_SESSION, JSON.stringify(state.session));
  render();
}

function logout() {
  state.session = null;
  state.who = "";
  localStorage.removeItem(LS_SESSION);
  render();
}

function setStatus(taskId, next) {
  if (!canSetStatus(next)) return;
  for (const day of state.tasksFile.days) {
    const task = day.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = next;
      task.updated_at = new Date().toISOString();
      task.updated_by = state.who;
    }
  }
  saveTasks(`board: ${state.who} set ${taskId} to ${next}`);
  render();
}

function setDriveLink(taskId, url) {
  for (const day of state.tasksFile.days) {
    const task = day.tasks.find((t) => t.id === taskId);
    if (task) {
      task.drive = url.trim();
      task.drive_missing = !task.drive;
      task.updated_at = new Date().toISOString();
    }
  }
  saveTasks(`board: ${state.who} added Drive link on ${taskId}`);
  render();
}

function ensureDay(date) {
  let day = state.tasksFile.days.find((d) => d.date === date);
  if (!day) {
    day = { date, source: "assigned on the Helal board", tasks: [] };
    state.tasksFile.days.push(day);
  }
  return day;
}

function assignTask({ who, space, title, due, drive }) {
  const date = due || today();
  const day = ensureDay(date);
  const id = `t-${date.replaceAll("-", "")}-${who.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
  day.tasks.push({
    id,
    who,
    space,
    title,
    due: date,
    status: "To do",
    drive: drive || "",
    drive_missing: !drive,
    created_by: state.who,
  });
  state.date = date;
  saveTasks(`board: ${state.who} assigned ${who} — ${title}`);
  render();
}

function submitReport(fields) {
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
  saveReports(`report: ${state.who} ${fields.date || today()}`);
  render();
}

function banner() {
  if (state.saveState === "saving") return $("div", { class: "banner" }, "Saving…");
  if (state.saveState === "saved" && state.token) {
    return $("div", { class: "banner ok" }, "Connected. Changes save for the whole team.");
  }
  if (state.saveState === "error") {
    return $("div", { class: "banner err" }, `Save failed. ${state.saveError}`);
  }
  if (!state.token) {
    return $("div", { class: "banner warn" }, isAdmin()
      ? "Connect GitHub in Setup so the team sees the same board."
      : "Work here. An admin connects GitHub so everyone stays in sync.");
  }
  return null;
}

function taskCard(task) {
  const folder = folderFor(task.who);
  const driveInput = $("input", {
    type: "url",
    value: task.drive || "",
    placeholder: folder?.url || "Paste Drive upload link",
  });
  return $("article", { class: `card ${STATUS_CLASS[task.status] || "todo"}` }, [
    $("p", { class: "title" }, task.title),
    $("div", { class: "meta" }, [
      $("span", { class: "pill" }, task.who),
      $("span", { class: "pill" }, task.space),
      $("span", { class: "pill" }, `Due ${task.due}`),
      task.created_by ? $("span", { class: "pill" }, `From ${task.created_by}`) : null,
      task.drive_missing ? $("span", { class: "pill" }, "Drive missing") : null,
    ]),
    $("div", { class: "statuses" },
      STATUSES.map((s) =>
        $("button", {
          class: s === task.status ? "on" : "",
          disabled: !canSetStatus(s),
          title: s === "Done" && !isAdmin() ? "Only Amr or HR can mark Done" : "",
          onclick: () => setStatus(task.id, s),
        }, s)
      )
    ),
    $("div", { class: "drive-row" }, [
      driveInput,
      $("button", { class: "btn", onclick: () => setDriveLink(task.id, driveInput.value) }, "Save link"),
    ]),
  ]);
}

function statBox(value, label) {
  return $("div", { class: "stat" }, [$("strong", {}, String(value)), $("span", { class: "muted" }, label)]);
}

function viewMy() {
  const list = tasksForView();
  return [
    $("div", { class: "stat-row" }, [
      statBox(list.length, isAdmin() ? "Tasks today" : "Your tasks"),
      statBox(list.filter((t) => t.status === "Review").length, "In review"),
      statBox(list.filter((t) => t.status === "Done").length, "Done"),
      statBox(list.filter((t) => t.drive_missing).length, "Missing Drive"),
    ]),
    list.length
      ? $("div", { class: "cards" }, list.map(taskCard))
      : $("p", { class: "empty" }, isAdmin()
        ? "No tasks on this date. Create one on the right."
        : `No tasks for ${state.who} on ${state.date}.`),
  ];
}

function viewBoard() {
  const tasks = tasksForView();
  return $("div", { class: "grid-5" },
    STATUSES.map((status) => {
      const col = tasks.filter((t) => t.status === status);
      return $("section", { class: "col" }, [
        $("h3", {}, [status, $("span", {}, String(col.length))]),
        ...col.map(taskCard),
      ]);
    })
  );
}

function viewReview() {
  const waiting = allTasks().filter((t) => t.status === "Review" || t.status === "Revisions");
  const reports = state.reportsFile?.reports || [];
  return $("div", { class: "two" }, [
    $("section", {}, [
      $("h2", {}, "Waiting on review"),
      waiting.length
        ? $("div", { class: "cards", style: "margin-top:12px" }, waiting.map(taskCard))
        : $("p", { class: "empty" }, "Nothing in Review or Revisions."),
    ]),
    $("section", {}, [
      $("h2", {}, "Report submissions"),
      reports.length
        ? $("div", { class: "cards", style: "margin-top:12px" }, reports.slice(0, 20).map((r) =>
            $("article", { class: "card review" }, [
              $("p", { class: "title" }, `${r.who} · ${r.date}`),
              $("p", {}, r.finished),
              r.unfinished ? $("p", { class: "muted" }, `Blockers: ${r.unfinished}`) : null,
              r.drive ? $("p", {}, $("a", { href: r.drive, target: "_blank", rel: "noreferrer" }, "Drive")) : null,
              $("span", { class: "pill" }, r.need_review ? "Needs review" : "No review flag"),
            ])
          ))
        : $("p", { class: "empty" }, "No evening reports yet."),
    ]),
  ]);
}

function viewReport() {
  const finished = $("textarea", { required: true, placeholder: "What you finished today" });
  const unfinished = $("textarea", { placeholder: "Unfinished work or blockers" });
  const drive = $("input", { type: "url", placeholder: "Drive links" });
  const date = $("input", { type: "date", value: today() });
  const need = $("input", { type: "checkbox" });
  return $("section", { class: "card", style: "max-width:640px" }, [
    $("h2", {}, "Daily report"),
    $("p", { class: "muted" }, `Submitting as ${state.who}. Do this each evening instead of WhatsApp.`),
    $("form", {
      class: "form",
      style: "margin-top:12px",
      onsubmit: (e) => {
        e.preventDefault();
        submitReport({
          date: date.value,
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
      $("label", {}, ["Date", date]),
      $("label", {}, ["What finished", finished]),
      $("label", {}, ["Unfinished / blockers", unfinished]),
      $("label", {}, ["Drive links", drive]),
      $("label", { style: "grid-template-columns: auto 1fr; align-items: center" }, [
        need,
        "Need review",
      ]),
      $("button", { class: "btn primary", type: "submit" }, "Submit report"),
    ]),
  ]);
}

function viewDrive() {
  return $("div", { class: "people" },
    (state.drive?.folders || []).map((f) =>
      $("article", { class: "card" }, [
        $("p", { class: "title" }, f.name),
        $("p", { class: "muted" }, f.who),
        f.url
          ? $("a", { href: f.url, target: "_blank", rel: "noreferrer" }, "Open folder")
          : $("p", {}, "Drive link missing. Amr pastes it in Cursor chat."),
      ])
    )
  );
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

function viewAssign() {
  const who = $("select", {}, people().map((p) => $("option", { value: p.name }, p.name)));
  const space = $("select", {}, SPACES.map((s) => $("option", { value: s }, s)));
  const title = $("input", { required: true, placeholder: "Task title" });
  const due = $("input", { type: "date", value: today() });
  const drive = $("input", { type: "url", placeholder: "Drive upload folder (optional)" });
  return $("section", { class: "card" }, [
    $("h2", {}, "Create task"),
    $("p", { class: "muted" }, "Assign to anyone on the team."),
    $("form", {
      class: "form",
      style: "margin-top:12px",
      onsubmit: (e) => {
        e.preventDefault();
        assignTask({
          who: who.value,
          space: space.value,
          title: title.value.trim(),
          due: due.value,
          drive: drive.value.trim(),
        });
        title.value = "";
        drive.value = "";
      },
    }, [
      $("label", {}, ["Assign to", who]),
      $("label", {}, ["Space", space]),
      $("label", {}, ["Task", title]),
      $("label", {}, ["Due", due]),
      $("label", {}, ["Drive link", drive]),
      $("button", { class: "btn primary", type: "submit" }, "Add as To do"),
    ]),
  ]);
}

function viewGuide() {
  return sopBlocks();
}

function sopBlocks() {
  return $("div", { class: "sop-grid" }, [
    $("article", { class: "card sop" }, [
      $("h3", {}, "1. Log in"),
      $("p", {}, "Open this board. Choose your name. Amr and Tasneem use the admin password. Everyone else uses the member password."),
    ]),
    $("article", { class: "card sop" }, [
      $("h3", {}, "2. Do the work"),
      $("p", {}, "Open My work. Move the task: To do → In progress. Paste the Drive link on the card. Files stay in Drive, never in this board."),
    ]),
    $("article", { class: "card sop" }, [
      $("h3", {}, "3. Ask for review"),
      $("p", {}, "When it is ready, set status to Review. Only Amr or Tasneem can mark Done. If it needs changes, they send it to Revisions."),
    ]),
    $("article", { class: "card sop" }, [
      $("h3", {}, "4. Create a task"),
      $("p", {}, "Anyone can create a task and assign it to someone else. Write a clear title, pick the person, and add the Drive folder if you have it."),
    ]),
    $("article", { class: "card sop" }, [
      $("h3", {}, "5. Evening report"),
      $("p", {}, "Every evening open Report. Write what finished, what is blocked, and Drive links. Do not send this on WhatsApp."),
    ]),
    $("article", { class: "card sop" }, [
      $("h3", {}, "6. Admins"),
      $("p", {}, "Amr and Tasneem see every task, every report, and can create work for anyone. They use Review to clear the queue."),
    ]),
  ]);
}

function viewSetup() {
  const repoInput = $("input", { value: state.repo, placeholder: "engamribrahemm/helal-team" });
  const tokenInput = $("input", { type: "password", value: state.token, placeholder: "GitHub token", autocomplete: "off" });
  return $("section", { class: "card", style: "max-width:720px" }, [
    $("h2", {}, "GitHub sync"),
    $("p", { class: "muted" }, "A token with Contents read/write keeps the whole team on the same board."),
    $("form", {
      class: "form",
      style: "margin-top:16px",
      onsubmit: (e) => {
        e.preventDefault();
        state.repo = repoInput.value.trim();
        state.token = tokenInput.value.trim();
        localStorage.setItem(LS_REPO, state.repo);
        localStorage.setItem(LS_TOKEN, state.token);
        loadAll().then(render);
      },
    }, [
      $("label", {}, ["Repository", repoInput]),
      $("label", {}, ["Access token", tokenInput]),
      $("div", { style: "display:flex;gap:8px" }, [
        $("button", { class: "btn primary", type: "submit" }, "Connect"),
        $("button", {
          class: "btn ghost",
          type: "button",
          onclick: () => {
            state.token = "";
            localStorage.removeItem(LS_TOKEN);
            state.saveState = "idle";
            render();
          },
        }, "Disconnect"),
      ]),
    ]),
  ]);
}

function viewWelcome() {
  const who = $("select", {}, people().map((p) => $("option", { value: p.name }, `${p.name} · ${p.access === "admin" ? "Admin" : "Member"}`)));
  const pin = $("input", { type: "password", required: true, placeholder: "Password", autocomplete: "current-password" });
  const pinLabel = $("span", {}, accessFor(who.value) === "admin" ? "Admin password" : "Member password");
  who.addEventListener("change", () => {
    pinLabel.textContent = accessFor(who.value) === "admin" ? "Admin password" : "Member password";
    if (state.loginError) {
      state.loginError = "";
      const err = document.querySelector(".login-card .banner.err");
      if (err) err.remove();
    }
  });
  return $("div", { class: "welcome" }, [
    $("div", { class: "hero" }, [
      $("p", {}, "Helal"),
      $("h1", {}, "Team Management"),
      $("p", { class: "muted" }, "Read the SOP, then log in. Admins see everything. Members see their work and can assign tasks to others."),
    ]),
    sopBlocks(),
    $("section", { class: "card login-card" }, [
      $("h2", {}, "Log in"),
      $("p", { class: "muted" }, "Amr and Tasneem use the admin password. Everyone else uses the member password."),
      $("form", {
        class: "form",
        style: "margin-top:12px",
        onsubmit: (e) => {
          e.preventDefault();
          login(who.value, pin.value);
        },
      }, [
        $("label", {}, ["You are", who]),
        $("label", {}, [pinLabel, pin]),
        state.loginError ? $("p", { class: "banner err" }, state.loginError) : null,
        $("button", { class: "btn primary", type: "submit" }, "Enter board"),
      ]),
    ]),
  ]);
}

function navItems() {
  const items = [
    ["my", "My work"],
    ["board", "Board"],
    ["assign", "Create task"],
    ["report", "Report"],
    ["drive", "Drive"],
    ["guide", "SOP"],
  ];
  if (isAdmin()) {
    items.splice(3, 0, ["review", "Review"]);
    items.push(["people", "People"], ["setup", "Setup"]);
  }
  return items;
}

function render() {
  const root = document.getElementById("app");
  root.replaceChildren();
  if (!state.team) {
    root.append($("p", { class: "boot" }, "Could not load Helal data. Serve this folder over http, not as a file."));
    return;
  }

  if (!state.session) {
    root.append(viewWelcome());
    return;
  }

  const dates = (state.tasksFile?.days || []).map((d) => d.date);
  if (!dates.includes(state.date) && dates.length) dates.push(state.date);

  root.append(
    $("header", { class: "top" }, [
      $("div", { class: "brand" }, [
        $("p", {}, "Helal"),
        $("h1", {}, "Team Management"),
      ]),
      $("div", { class: "top-actions" }, [
        $("span", { class: "pill" }, state.who),
        $("span", { class: "pill" }, isAdmin() ? "Admin" : "Member"),
        $("select", {
          class: "date-select",
          onchange: (e) => {
            state.date = e.target.value;
            render();
          },
        }, dates.map((d) => $("option", { value: d, selected: d === state.date }, d))),
        $("button", { class: "btn ghost", onclick: logout }, "Log out"),
      ]),
    ]),
    $("nav", {}, navItems().map(([id, label]) =>
      $("button", {
        class: state.view === id ? "active" : "",
        onclick: () => {
          state.view = id;
          render();
        },
      }, label)
    )),
    banner()
  );

  const main = $("main");
  if (state.view === "my") {
    const parts = viewMy();
    main.append(parts[0]);
    const wrap = $("div", { class: "two" });
    wrap.append(parts[1], viewAssign());
    main.append(wrap);
  } else if (state.view === "board") main.append(viewBoard());
  else if (state.view === "assign") main.append(viewAssign());
  else if (state.view === "review" && isAdmin()) main.append(viewReview());
  else if (state.view === "report") main.append(viewReport());
  else if (state.view === "drive") main.append(viewDrive());
  else if (state.view === "people" && isAdmin()) main.append(viewPeople());
  else if (state.view === "guide") main.append(viewGuide());
  else if (state.view === "setup" && isAdmin()) main.append(viewSetup());
  else main.append(viewMy()[1]);
  root.append(main);
}

loadAll()
  .then(render)
  .catch((err) => {
    document.getElementById("app").replaceChildren(
      $("p", { class: "boot" }, `Could not load the board. ${err.message}`)
    );
  });

const STATUSES = ["To do", "In progress", "Review", "Revisions", "Done"];
const STATUS_CLASS = {
  "To do": "todo",
  "In progress": "progress",
  Review: "review",
  Revisions: "revisions",
  Done: "done",
};
const SPACES = ["Social", "Graphic", "Video editors", "HR", "Daily Reports", "Calendar"];
const LS_WHO = "helal.who";
const LS_TOKEN = "helal.ghToken";
const LS_REPO = "helal.ghRepo";

const state = {
  view: "my",
  who: localStorage.getItem(LS_WHO) || "Amr",
  date: "",
  team: null,
  drive: null,
  projects: null,
  tasksFile: null,
  reportsFile: null,
  githubCfg: null,
  token: localStorage.getItem(LS_TOKEN) || "",
  repo: localStorage.getItem(LS_REPO) || "",
  saveState: "idle",
  saveError: "",
  shas: {},
};

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

function isAmr() {
  return state.who === "Amr";
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
  return (currentDay().tasks || []).map((t) => ({ ...t, date: currentDay().date }));
}

function folderFor(name) {
  const person = people().find((p) => p.name === name);
  const home = person?.home;
  return (state.drive?.folders || []).find((f) => f.id === home);
}

function canSetStatus(next) {
  if (isAmr()) return true;
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
    const [team, drive, projects, tasksFile, reportsFile, githubCfg] = await Promise.all([
      fetchLocal("./helal/team.json"),
      fetchLocal("./helal/drive.json"),
      fetchLocal("./helal/projects.json"),
      fetchLocal("./helal/daily-tasks.json"),
      fetchLocal("./helal/reports.json"),
      fetchLocal("./helal/github.json"),
    ]);
    Object.assign(state, { team, drive, projects, tasksFile, reportsFile, githubCfg });
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
      const [team, drive, projects, tasksFile, reportsFile, githubCfg] = await Promise.all([
        ghGet("helal/team.json"),
        ghGet("helal/drive.json"),
        ghGet("helal/projects.json"),
        ghGet("helal/daily-tasks.json"),
        ghGet("helal/reports.json"),
        ghGet("helal/github.json"),
      ]);
      Object.assign(state, { team, drive, projects, tasksFile, reportsFile, githubCfg });
      state.saveState = "saved";
    } catch (err) {
      state.saveState = "error";
      state.saveError = err.message;
    }
  }

  const days = state.tasksFile?.days || [];
  state.date = days[days.length - 1]?.date || today();
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
  });
  state.date = date;
  saveTasks(`board: Amr assigned ${who} — ${title}`);
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
  if (state.saveState === "saving") return $("div", { class: "banner" }, "Saving to GitHub…");
  if (state.saveState === "saved" && state.token) {
    return $("div", { class: "banner ok" }, `Connected to ${state.repo || "GitHub"}. Status changes save for the whole team.`);
  }
  if (state.saveState === "error") {
    return $("div", { class: "banner err" }, `GitHub save failed. ${state.saveError} You can still work on this device.`);
  }
  if (!state.token) {
    return $(
      "div",
      { class: "banner warn" },
      "This board is open. Pick your name and work. Connect GitHub in Setup so Mariam, Seif, and the rest see the same statuses."
    );
  }
  return $("div", { class: "banner" }, "GitHub token saved. Open Setup if saves fail.");
}

function taskCard(task) {
  const folder = folderFor(task.who);
  const driveInput = $("input", {
    type: "url",
    value: task.drive || "",
    placeholder: folder?.url || "Paste Drive upload link",
  });
  return $(
    "article",
    { class: `card ${STATUS_CLASS[task.status] || "todo"}` },
    [
      $("p", { class: "title" }, task.title),
      $("div", { class: "meta" }, [
        $("span", { class: "pill" }, task.who),
        $("span", { class: "pill" }, task.space),
        $("span", { class: "pill" }, `Due ${task.due}`),
        task.drive_missing ? $("span", { class: "pill" }, "Drive link missing") : null,
      ]),
      $("div", { class: "statuses" },
        STATUSES.map((s) =>
          $("button", {
            class: s === task.status ? "on" : "",
            disabled: !canSetStatus(s),
            title: s === "Done" && !isAmr() ? "Only Amr marks Done" : "",
            onclick: () => setStatus(task.id, s),
          }, s)
        )
      ),
      $("div", { class: "drive-row" }, [
        driveInput,
        $("button", {
          class: "btn",
          onclick: () => setDriveLink(task.id, driveInput.value),
        }, "Save link"),
      ]),
    ]
  );
}

function viewMy() {
  const list = isAmr()
    ? tasksForView()
    : tasksForView().filter((t) => t.who === state.who);
  return [
    $("div", { class: "stat-row" }, [
      statBox(list.length, "Your tasks today"),
      statBox(list.filter((t) => t.status === "Review").length, "Waiting on Amr"),
      statBox(list.filter((t) => t.status === "Done").length, "Done"),
      statBox(list.filter((t) => t.drive_missing).length, "Missing Drive"),
    ]),
    list.length
      ? $("div", { class: "cards" }, list.map(taskCard))
      : $("p", { class: "empty" }, isAmr()
        ? "No tasks on this date. Assign one on the right, or send the list in Cursor chat."
        : `No tasks for ${state.who} on ${state.date}.`),
  ];
}

function statBox(value, label) {
  return $("div", { class: "stat" }, [$("strong", {}, String(value)), $("span", { class: "muted" }, label)]);
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
      $("h2", {}, "Waiting on Amr"),
      waiting.length
        ? $("div", { class: "cards", style: "margin-top:12px" }, waiting.map(taskCard))
        : $("p", { class: "empty" }, "Nothing in Review or Revisions."),
    ]),
    $("section", {}, [
      $("h2", {}, "Daily reports"),
      reports.length
        ? $("div", { class: "cards", style: "margin-top:12px" }, reports.slice(0, 12).map((r) =>
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
    $("h2", {}, "Helal Daily Report"),
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
        "Need Amr to review something",
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
          : $("p", {}, "Link missing — Amr still needs to paste this Drive URL in Cursor chat."),
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
        p.email ? $("p", {}, p.email) : $("p", { class: "muted" }, "Email missing"),
        p.home ? $("span", { class: "pill" }, p.home) : $("span", { class: "pill" }, "Owner"),
      ])
    )
  );
}

function viewAssign() {
  if (!isAmr()) return null;
  const who = $("select", {}, people().filter((p) => p.name !== "Amr").map((p) => $("option", { value: p.name }, p.name)));
  const space = $("select", {}, SPACES.map((s) => $("option", { value: s }, s)));
  const title = $("input", { required: true, placeholder: "3 IG posts for Client X" });
  const due = $("input", { type: "date", value: today() });
  const drive = $("input", { type: "url", placeholder: "Drive upload folder (optional)" });
  return $("section", { class: "card" }, [
    $("h2", {}, "Assign"),
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
      $("label", {}, ["Who", who]),
      $("label", {}, ["Space", space]),
      $("label", {}, ["Task", title]),
      $("label", {}, ["Due", due]),
      $("label", {}, ["Drive link", drive]),
      $("button", { class: "btn primary", type: "submit" }, "Add as To do"),
    ]),
  ]);
}

function viewSetup() {
  const repoInput = $("input", {
    value: state.repo,
    placeholder: "your-github-user/helal-team",
  });
  const tokenInput = $("input", {
    type: "password",
    value: state.token,
    placeholder: "Fine-grained token",
    autocomplete: "off",
  });
  return $("section", { class: "card", style: "max-width:720px" }, [
    $("h2", {}, "Put this board on GitHub"),
    $("p", { class: "muted" }, "GitHub Pages hosts the site for free. The JSON in helal/ is the database. Each person needs a GitHub account and a token so status changes sync."),
    $("ol", { class: "muted" }, [
      $("li", {}, "Create a GitHub account for anyone who does not have one."),
      $("li", {}, "Amr creates a repository from this folder and enables Pages: Settings → Pages → Deploy from main / root."),
      $("li", {}, "Invite the team as collaborators (Settings → Collaborators)."),
      $("li", {}, "Each person opens the Pages URL, picks their name, then pastes a token below."),
      $("li", {}, "Token: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained. This repo only. Permission: Contents Read and write."),
    ]),
    $("p", { class: "muted" }, "GitHub Free Pages is public. Keep client secrets out of task titles. Files stay in Drive. For a private site, GitHub Pro can serve Pages from a private repo."),
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
      $("label", {}, ["Access token (stays in this browser only)", tokenInput]),
      $("div", { style: "display:flex;gap:8px" }, [
        $("button", { class: "btn primary", type: "submit" }, "Connect GitHub"),
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

function render() {
  const root = document.getElementById("app");
  root.replaceChildren();
  if (!state.team) {
    root.append($("p", { class: "boot" }, "Could not load Helal data. Serve this folder over http, not as a file."));
    return;
  }

  const dates = (state.tasksFile?.days || []).map((d) => d.date);
  if (!dates.includes(state.date) && dates.length) dates.push(state.date);

  const nav = [
    ["my", "My work"],
    ["board", "Board"],
    ["review", "Review"],
    ["report", "Report"],
    ["drive", "Drive"],
    ["people", "People"],
    ["setup", "Setup"],
  ];

  root.append(
    $("header", { class: "top" }, [
      $("div", { class: "brand" }, [
        $("p", {}, "Helal"),
        $("h1", {}, "Team Management"),
      ]),
      $("div", { class: "top-actions" }, [
        $("select", {
          class: "who-select",
          onchange: (e) => {
            state.who = e.target.value;
            localStorage.setItem(LS_WHO, state.who);
            render();
          },
        }, people().map((p) => $("option", { value: p.name, selected: p.name === state.who }, p.name))),
        $("select", {
          class: "date-select",
          onchange: (e) => {
            state.date = e.target.value;
            render();
          },
        }, dates.map((d) => $("option", { value: d, selected: d === state.date }, d))),
      ]),
    ]),
    $("nav", {}, nav.map(([id, label]) =>
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
    const wrap = $("div", { class: isAmr() ? "two" : "" });
    wrap.append(parts[1]);
    const assign = viewAssign();
    if (assign) wrap.append(assign);
    main.append(wrap);
  } else if (state.view === "board") main.append(viewBoard());
  else if (state.view === "review") main.append(viewReview());
  else if (state.view === "report") main.append(viewReport());
  else if (state.view === "drive") main.append(viewDrive());
  else if (state.view === "people") main.append(viewPeople());
  else main.append(viewSetup());
  root.append(main);
}

loadAll()
  .then(render)
  .catch((err) => {
    document.getElementById("app").replaceChildren(
      $("p", { class: "boot" }, `Could not load the board. ${err.message}`)
    );
  });

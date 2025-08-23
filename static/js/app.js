// Focus+ Pomodoro logic (vanilla JS). Data is stored in localStorage.
(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  const timeEl = $("#time");
  const startPauseBtn = $("#startPause");
  const resetBtn = $("#reset");
  const skipBtn = $("#skip");
  const modeButtons = $$(".btn-switch");
  const sessionDots = $("#sessionDots");
  const ding = $("#ding");

  // settings elements
  const settingsForm = $("#settingsForm");
  const btnSaveSettings = $("#saveSettings");
  const themeSelect = $("#themeSelect");
  const themeSwitcher = $("#themeSwitcher");
  const autoStartBreaks = $("#autoStartBreaks");
  const autoStartPomodoros = $("#autoStartPomodoros");

  const LS = {
    read(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  };

  const SETTINGS_KEY = "focusplus_settings";
  const TASKS_KEY = "focusplus_tasks";
  const STATS_KEY = "focusplus_stats";

  const defaultSettings = {
    ...window.DEFAULTS,
    theme: "theme-sunset",
    autoStartBreaks: false,
    autoStartPomodoros: false
  };

    
  function loadStats() {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || {
      sessions: 0,
      focusMinutes: 0,
      tasksDone: 0
    };
  }

  let settings = LS.read(SETTINGS_KEY, defaultSettings);
  let tasks = LS.read(TASKS_KEY, []);
  let stats = loadStats();

  let mode = "pomodoro";
  let remaining = (settings.pomodoro || 25) * 60;
  let isRunning = false;
  let ticker = null;
  let completedSessions = 0;

  // Init UI
  function init(){
    // mode buttons
    modeButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
      btn.addEventListener("click", () => switchMode(btn.dataset.mode));
    });

    // settings form sync
    Object.entries(window.DEFAULTS).forEach(([k, v]) => {
      const input = settingsForm.querySelector(`[name="${k}"]`);
      if (input) input.value = settings[k] ?? v;
    });
    themeSelect.value = settings.theme;
    autoStartBreaks.checked = !!settings.autoStartBreaks;
    autoStartPomodoros.checked = !!settings.autoStartPomodoros;

    applyTheme(settings.theme);
    renderTime();
    renderTasks();
    renderDots();
    renderStats();
  }

  function applyTheme(themeClass){
    const body = document.body;
    body.classList.remove(...window.THEMES.map(t => t.class));
    body.classList.add(themeClass);
    body.classList.add("gradient-bg");
  }

  function switchMode(nextMode){
    mode = nextMode;
    modeButtons.forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    const minutes = settings[mode] || window.DEFAULTS[mode];
    remaining = minutes * 60;
    isRunning = false;
    clearInterval(ticker);
    startPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
    renderTime();
    pulse();
  }

  function pulse(){
    timeEl.classList.add("pulse");
    setTimeout(() => timeEl.classList.remove("pulse"), 280);
  }

  function renderTime(){
    const m = Math.floor(remaining/60).toString().padStart(2,"0");
    const s = (remaining % 60).toString().padStart(2,"0");
    timeEl.textContent = `${m}:${s}`;
    document.title = `${m}:${s} • Focus+`;
  }

  function renderDots(){
    sessionDots.innerHTML = "";
    const beforeLong = settings.sessions_before_long || 4;
    for(let i=0;i<beforeLong;i++){
      const dot = document.createElement("span");
      dot.style.display = "inline-block";
      dot.style.width = "10px";
      dot.style.height = "10px";
      dot.style.margin = "0 4px";
      dot.style.borderRadius = "50%";
      dot.style.background = i < (completedSessions % beforeLong) ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.35)";
      sessionDots.appendChild(dot);
    }
  }

 function renderStats() {
    document.getElementById("statSessions").textContent = stats.sessions;
    document.getElementById("statFocus").textContent = stats.focusMinutes + "m";
    document.getElementById("statTasks").textContent = stats.tasksDone;

    // ✅ Save to localStorage every time
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }


  function tick(){
    if (remaining <= 0){
      clearInterval(ticker);
      isRunning = false;
      try { ding.currentTime = 0; ding.play(); } catch {}
      onSessionEnd();
      return;
    }
    remaining -= 1;
    renderTime();
  }

  function start(){
    if (isRunning) return;
    isRunning = true;
    ticker = setInterval(tick, 1000);
    startPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
  }
  function pause(){
    isRunning = false;
    clearInterval(ticker);
    startPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
  }
  function reset(){
    const minutes = settings[mode] || window.DEFAULTS[mode];
    remaining = minutes * 60;
    pause();
    renderTime();
    pulse();
  }

  function onSessionEnd(){
    // update stats
    if (mode === "pomodoro"){
      stats.sessions += 1;
      stats.focusMinutes += (settings.pomodoro || window.DEFAULTS.pomodoro);
      completedSessions += 1;
      LS.write(STATS_KEY, stats);
      renderStats();
    }
    renderDots();

    const beforeLong = settings.sessions_before_long || window.DEFAULTS.sessions_before_long;

    if (mode === "pomodoro"){
      if (completedSessions % beforeLong === 0){
        switchMode("long_break");
        if (settings.autoStartBreaks) start();
      } else {
        switchMode("short_break");
        if (settings.autoStartBreaks) start();
      }
    } else {
      switchMode("pomodoro");
      if (settings.autoStartPomodoros) start();
    }
  }

  // Events
  startPauseBtn.addEventListener("click", () => {
    isRunning ? pause() : start();
  });
  resetBtn.addEventListener("click", reset);
  skipBtn.addEventListener("click", () => { remaining = 0; tick(); });

  btnSaveSettings.addEventListener("click", () => {
    const fd = new FormData(settingsForm);
    const newSettings = {
      pomodoro: parseInt(fd.get("pomodoro") || "25", 10),
      short_break: parseInt(fd.get("short_break") || "5", 10),
      long_break: parseInt(fd.get("long_break") || "15", 10),
      sessions_before_long: parseInt(fd.get("sessions_before_long") || "4", 10),
      theme: themeSelect.value,
      autoStartBreaks: autoStartBreaks.checked,
      autoStartPomodoros: autoStartPomodoros.checked
    };
    settings = { ...settings, ...newSettings };
    LS.write(SETTINGS_KEY, settings);
    applyTheme(settings.theme);
    switchMode(mode); // refresh current mode time
    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    modal?.hide();
  });

  themeSwitcher.addEventListener("click", () => {
    // cycle themes quickly
    const list = window.THEMES.map(t => t.class);
    const idx = list.indexOf(settings.theme);
    const next = list[(idx + 1) % list.length];
    themeSelect.value = next;
    settings.theme = next;
    LS.write(SETTINGS_KEY, settings);
    applyTheme(next);
  });

  // TASK MANAGEMENT
  const taskInput = $("#taskInput");
  const addTaskBtn = $("#addTask");
  const taskList = $("#taskList");
  const clearCompletedBtn = $("#clearCompleted");
  const exportBtn = $("#exportTasks");
  const importFile = $("#importFile");

  function renderTasks(){
    taskList.innerHTML = "";
    tasks.forEach((t, i) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex align-items-center justify-content-between py-2";
      const left = document.createElement("div");
      left.className = "d-flex align-items-center gap-2";
      const chk = document.createElement("input");
      chk.type = "checkbox"; chk.className = "form-check-input";
      chk.checked = !!t.done;
      const title = document.createElement("span");
      title.textContent = t.title;
      title.className = "task-title" + (t.done ? " done" : "");
      chk.addEventListener("change", () => {
        t.done = chk.checked;
        if (t.done) stats.tasksDone += 1; else stats.tasksDone = Math.max(0, stats.tasksDone - 1);
        LS.write(STATS_KEY, stats); renderStats();
        LS.write(TASKS_KEY, tasks);
        title.classList.toggle("done", t.done);
      });
      left.appendChild(chk); left.appendChild(title);

      const right = document.createElement("div");
      right.className = "d-flex align-items-center gap-2";
      const play = document.createElement("button");
      play.className = "btn btn-sm btn-glass"; play.innerHTML = '<i class="bi bi-play-circle"></i>';
      play.title = "Use this task for next session";
      play.addEventListener("click", () => {
        switchMode("pomodoro");
        start();
      });
      const del = document.createElement("button");
      del.className = "btn btn-sm btn-glass"; del.innerHTML = '<i class="bi bi-trash"></i>';
      del.addEventListener("click", () => {
        tasks.splice(i,1); LS.write(TASKS_KEY, tasks); renderTasks();
      });
      right.appendChild(play); right.appendChild(del);

      li.appendChild(left); li.appendChild(right);
      taskList.appendChild(li);
    });
  }

  function addTask(){
    const title = (taskInput.value || "").trim();
    if (!title) return;
    tasks.push({ title, done: false });
    taskInput.value = "";
    LS.write(TASKS_KEY, tasks);
    renderTasks();
  }

  addTaskBtn.addEventListener("click", addTask);
  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });
  clearCompletedBtn.addEventListener("click", () => {
    tasks = tasks.filter(t => !t.done);
    LS.write(TASKS_KEY, tasks);
    renderTasks();
  });

  // Export/Import
  exportBtn.addEventListener("click", () => {
    const data = { tasks, settings, stats };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "focusplus-data.json"; a.click();
    URL.revokeObjectURL(url);
  });
  importFile.addEventListener("change", (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        tasks = Array.isArray(data.tasks) ? data.tasks : tasks;
        settings = { ...settings, ...(data.settings||{}) };
        stats = { ...stats, ...(data.stats||{}) };
        LS.write(TASKS_KEY, tasks);
        LS.write(SETTINGS_KEY, settings);
        LS.write(STATS_KEY, stats);
        applyTheme(settings.theme || "theme-sunset");
        switchMode("pomodoro");
        renderTasks(); renderStats();
      } catch (err) {
        alert("Invalid file");
      }
    };
    reader.readAsText(file);
  });

  init();
})();

document.getElementById("clearStats").addEventListener("click", () => {
  localStorage.removeItem("focusStats");
  document.getElementById("statSessions").textContent = 0;
  document.getElementById("statFocus").textContent = "0m";
  document.getElementById("statTasks").textContent = 0;
});

document.addEventListener("DOMContentLoaded", () => {
  const settingsBtn = document.getElementById("openSettings");
  const themeBtn = document.getElementById("openTheme");

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      new bootstrap.Modal(document.getElementById("settingsModal")).show();
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      new bootstrap.Modal(document.getElementById("themeModal")).show();
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("themeSwitcher");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.body.classList;
      let nextIndex = (window.currentThemeIndex || 0) + 1;
      if (nextIndex >= window.THEMES.length) nextIndex = 0;

      // remove all theme classes
      window.THEMES.forEach(t => document.body.classList.remove(t.class));
      document.body.classList.add(window.THEMES[nextIndex].class);

      window.currentThemeIndex = nextIndex;
    });
  }

  // Mobile theme button
  const mobileThemeBtn = document.getElementById("openTheme");
  if (mobileThemeBtn) {
    mobileThemeBtn.addEventListener("click", () => {
      themeBtn?.click();
    });
  }

  // Mobile settings button
  const mobileSettingsBtn = document.getElementById("openSettings");
  if (mobileSettingsBtn) {
    mobileSettingsBtn.addEventListener("click", () => {
      const modal = new bootstrap.Modal(document.getElementById("settingsModal"));
      modal.show();
    });
  }
});

// Load stats into Account page if present
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("accSessions")) {
    document.getElementById("accSessions").textContent = localStorage.getItem("statSessions") || 0;
    document.getElementById("accFocus").textContent = localStorage.getItem("statFocus") || "0m";
    document.getElementById("accTasks").textContent = localStorage.getItem("statTasks") || 0;

    document.getElementById("clearAccountStats").addEventListener("click", () => {
      localStorage.removeItem("statSessions");
      localStorage.removeItem("statFocus");
      localStorage.removeItem("statTasks");

      document.getElementById("accSessions").textContent = 0;
      document.getElementById("accFocus").textContent = "0m";
      document.getElementById("accTasks").textContent = 0;

      alert("✅ Stats cleared!");
    });
  }
});


// Clear stats button handler
document.getElementById("clearStats").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all stats?")) {
    // Reset DOM display
    document.getElementById("statSessions").textContent = "0";
    document.getElementById("statFocus").textContent = "0m";
    document.getElementById("statTasks").textContent = "0";

    // Remove from localStorage
    localStorage.removeItem("focus_stats");
    localStorage.removeItem(STATS_KEY);

    // Optionally also clear tasks if you want
    // localStorage.removeItem("tasks");

    alert("Stats cleared!");
  }
});


// Load stats from localStorage on page load
function loadStats() {
  const savedStats = JSON.parse(localStorage.getItem("focus_stats")) || {
    sessions: 0,
    focus: 0,
    tasks: 0
  };

  document.getElementById("statSessions").textContent = savedStats.sessions;
  document.getElementById("statFocus").textContent = savedStats.focus + "m";
  document.getElementById("statTasks").textContent = savedStats.tasks;
}

// // Save stats to localStorage
// function saveStats(sessions, focus, tasks) {
//   const stats = { sessions, focus, tasks };
//   localStorage.setItem("focus_stats", JSON.stringify(stats));
// }


// For the Account Page:
if (document.getElementById("accSessions")) {
  const savedStats = JSON.parse(localStorage.getItem(STATS_KEY)) || {
    sessions: 0,
    focusMinutes: 0,
    tasksDone: 0
  };
  document.getElementById("accSessions").textContent = savedStats.sessions;
  document.getElementById("accFocus").textContent = savedStats.focusMinutes + "m";
  document.getElementById("accTasks").textContent = savedStats.tasksDone;

  const clearAccBtn = document.getElementById("clearAccountStats");
  if (clearAccBtn) {
    clearAccBtn.addEventListener("click", () => {
      localStorage.setItem(STATS_KEY, JSON.stringify({
        sessions: 0,
        focusMinutes: 0,
        tasksDone: 0
      }));
      document.getElementById("accSessions").textContent = 0;
      document.getElementById("accFocus").textContent = "0m";
      document.getElementById("accTasks").textContent = 0;
      alert("✅ Stats cleared!");
    });
  }
}

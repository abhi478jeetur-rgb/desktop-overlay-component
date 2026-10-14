// Ambient Focus Overlay - Core Logic Engine
// Features: Task Manager, StopWatch/Timer, Heatmap, Accountability Reminders, Auto-Save

const MOTIVATIONAL_QUOTES = [
  "Focus is a muscle. Every time you bring your attention back, you get stronger.",
  "You don't have to be extreme, just consistent.",
  "Do it for the person you want to become tomorrow.",
  "Action cures anxiety. Take the next small step right now.",
  "Flow begins the moment you stop negotiating with distractions.",
  "Deep work creates high value. Lock in."
];

// State Store
const state = {
  tasks: [],
  activeTaskId: null,
  activeTimerInterval: null,
  elapsedSeconds: 0,
  history: {}, // date: 'YYYY-MM-DD' -> { count: number, minutes: number }
  notes: '',
  distractionCount: 0,
  reminderIntervalMinutes: 25,
  remindersEnabled: true,
  lastReminderTimestamp: Date.now(),
  reminderCheckInterval: null,
  isExpanded: true,
  pinMode: 'always-on-top' // 'always-on-top' | 'desktop'
};

// Elements
const floatingPill = document.getElementById('floatingPill');
const expandedCard = document.getElementById('expandedCard');
const pillStatusDot = document.getElementById('pillStatusDot');
const pillTaskTitle = document.getElementById('pillTaskTitle');
const pillTimerVal = document.getElementById('pillTimerVal');
const pillExpandBtn = document.getElementById('pillExpandBtn');

const btnPinTop = document.getElementById('btnPinTop');
const btnPinDesktop = document.getElementById('btnPinDesktop');
const btnCollapse = document.getElementById('btnCollapse');
const btnClose = document.getElementById('btnClose');

const activeFocusBanner = document.getElementById('activeFocusBanner');
const bannerTaskName = document.getElementById('bannerTaskName');
const bannerTimerDigits = document.getElementById('bannerTimerDigits');
const btnGlobalStop = document.getElementById('btnGlobalStop');

const navTabBtns = document.querySelectorAll('.nav-tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const newTaskInput = document.getElementById('newTaskInput');
const btnAddTask = document.getElementById('btnAddTask');
const taskList = document.getElementById('taskList');

const heatmapGrid = document.getElementById('heatmapGrid');
const statCompletedToday = document.getElementById('statCompletedToday');
const statFocusMinutes = document.getElementById('statFocusMinutes');
const statStreakDays = document.getElementById('statStreakDays');

const switchReminder = document.getElementById('switchReminder');
const selectInterval = document.getElementById('selectInterval');
const switchAutostart = document.getElementById('switchAutostart');
const statDistractionCount = document.getElementById('statDistractionCount');
const quickNotesArea = document.getElementById('quickNotesArea');

const reminderOverlay = document.getElementById('reminderOverlay');
const reminderTaskName = document.getElementById('reminderTaskName');
const btnStillOnTrack = document.getElementById('btnStillOnTrack');
const btnWasDistracted = document.getElementById('btnWasDistracted');
const modalQuoteReveal = document.getElementById('modalQuoteReveal');

const footerClock = document.getElementById('footerClock');
const footerStatus = document.getElementById('footerStatus');

// Format seconds into HH:MM:SS or MM:SS
function formatTime(totalSec) {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getTodayKey() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Local Storage Load & Save
function loadData() {
  try {
    const saved = localStorage.getItem('ambient_overlay_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.tasks) state.tasks = parsed.tasks;
      if (parsed.history) state.history = parsed.history;
      if (parsed.notes !== undefined) state.notes = parsed.notes;
      if (parsed.distractionCount !== undefined) state.distractionCount = parsed.distractionCount;
      if (parsed.reminderIntervalMinutes) state.reminderIntervalMinutes = parsed.reminderIntervalMinutes;
      if (parsed.remindersEnabled !== undefined) state.remindersEnabled = parsed.remindersEnabled;
      if (parsed.pinMode) state.pinMode = parsed.pinMode;
    }
  } catch (e) {
    console.error('Failed to load storage', e);
  }

  // Pre-fill default sample tasks if empty
  if (!state.tasks || state.tasks.length === 0) {
    state.tasks = [
      { id: '1', title: 'Plan key priority tasks', completed: true, timeSpent: 720 },
      { id: '2', title: 'Deep focus coding block', completed: false, timeSpent: 1450 },
      { id: '3', title: 'Review pull requests & notes', completed: false, timeSpent: 0 }
    ];
  }

  // Ensure today's history entry exists
  const today = getTodayKey();
  if (!state.history[today]) {
    state.history[today] = { count: 1, minutes: 12 };
  }
}

function saveData() {
  try {
    localStorage.setItem('ambient_overlay_state', JSON.stringify({
      tasks: state.tasks,
      history: state.history,
      notes: state.notes,
      distractionCount: state.distractionCount,
      reminderIntervalMinutes: state.reminderIntervalMinutes,
      remindersEnabled: state.remindersEnabled,
      pinMode: state.pinMode
    }));
  } catch (e) {
    console.error('Failed to save storage', e);
  }
}

// Render Tasks
function renderTasks() {
  taskList.innerHTML = '';
  state.tasks.forEach(task => {
    const isRunning = state.activeTaskId === task.id;
    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''} ${isRunning ? 'running' : ''}`;
    
    item.innerHTML = `
      <div class="task-left">
        <div class="tactile-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}">
          ✓
        </div>
        <div class="task-details">
          <div class="task-label" title="${task.title}">${task.title}</div>
          <div class="task-time-spent">${formatTime(task.timeSpent || 0)}</div>
        </div>
      </div>
      <div class="task-actions">
        ${!task.completed ? `
          <button class="task-btn-timer ${isRunning ? 'running' : ''}" data-id="${task.id}">
            ${isRunning ? 'Pause ⏸' : 'Start ▶'}
          </button>
        ` : ''}
        <button class="task-btn-del" data-id="${task.id}" title="Delete task">✕</button>
      </div>
    `;

    taskList.appendChild(item);
  });

  // Attach event listeners for check, start/stop, delete
  taskList.querySelectorAll('.tactile-checkbox').forEach(box => {
    box.addEventListener('click', () => {
      const id = box.getAttribute('data-id');
      toggleTaskComplete(id);
    });
  });

  taskList.querySelectorAll('.task-btn-timer').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      toggleTimer(id);
    });
  });

  taskList.querySelectorAll('.task-btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteTask(id);
    });
  });
}

function toggleTaskComplete(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  if (task.completed && state.activeTaskId === id) {
    stopActiveTimer();
  }

  // Update today's history count
  const today = getTodayKey();
  if (!state.history[today]) state.history[today] = { count: 0, minutes: 0 };
  if (task.completed) {
    state.history[today].count += 1;
  } else if (state.history[today].count > 0) {
    state.history[today].count -= 1;
  }

  saveData();
  renderTasks();
  renderStatsAndHeatmap();
}

function deleteTask(id) {
  if (state.activeTaskId === id) {
    stopActiveTimer();
  }
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveData();
  renderTasks();
}

function addNewTask() {
  const title = newTaskInput.value.trim();
  if (!title) return;
  const newTask = {
    id: Date.now().toString(),
    title: title,
    completed: false,
    timeSpent: 0
  };
  state.tasks.unshift(newTask);
  newTaskInput.value = '';
  saveData();
  renderTasks();
}

btnAddTask.addEventListener('click', addNewTask);
newTaskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addNewTask();
});

// Timer Engine
function toggleTimer(id) {
  if (state.activeTaskId === id) {
    stopActiveTimer();
  } else {
    startTimer(id);
  }
}

function startTimer(id) {
  if (state.activeTaskId) {
    stopActiveTimer();
  }

  state.activeTaskId = id;
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  state.lastReminderTimestamp = Date.now();
  updateRunningBanner(task.title, task.timeSpent || 0);

  state.activeTimerInterval = setInterval(() => {
    task.timeSpent = (task.timeSpent || 0) + 1;
    updateRunningBanner(task.title, task.timeSpent);

    // Add minutes to today's stats every 60 seconds
    if (task.timeSpent % 60 === 0) {
      const today = getTodayKey();
      if (!state.history[today]) state.history[today] = { count: 0, minutes: 0 };
      state.history[today].minutes += 1;
      saveData();
      renderStatsAndHeatmap();
    }
  }, 1000);

  pillStatusDot.classList.add('active');
  pillTaskTitle.textContent = task.title;
  footerStatus.textContent = `Running: ${task.title}`;

  renderTasks();
}

function stopActiveTimer() {
  if (state.activeTimerInterval) {
    clearInterval(state.activeTimerInterval);
    state.activeTimerInterval = null;
  }
  state.activeTaskId = null;
  activeFocusBanner.style.display = 'none';

  pillStatusDot.classList.remove('active');
  pillTaskTitle.textContent = 'No active task';
  pillTimerVal.textContent = '00:00';
  footerStatus.textContent = 'Ready to focus';

  saveData();
  renderTasks();
}

function updateRunningBanner(title, seconds) {
  activeFocusBanner.style.display = 'flex';
  bannerTaskName.textContent = title;
  const formatted = formatTime(seconds);
  bannerTimerDigits.textContent = formatted;
  pillTimerVal.textContent = formatted;
}

btnGlobalStop.addEventListener('click', stopActiveTimer);

// GitHub Contribution Heatmap Generator (Past 18 weeks = ~126 days)
function renderStatsAndHeatmap() {
  const today = getTodayKey();
  const todayData = state.history[today] || { count: 0, minutes: 0 };
  statCompletedToday.textContent = todayData.count;
  statFocusMinutes.textContent = `${todayData.minutes}m`;
  statDistractionCount.textContent = `${state.distractionCount} times`;

  // Calculate day streak
  let streak = 0;
  let curr = new Date();
  while (true) {
    const key = curr.toISOString().split('T')[0];
    if (state.history[key] && (state.history[key].count > 0 || state.history[key].minutes > 0)) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    } else {
      break;
    }
  }
  statStreakDays.textContent = `${Math.max(1, streak)}d`;

  // Generate 18 columns of 7 days (126 days total)
  heatmapGrid.innerHTML = '';
  const totalDays = 18 * 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - totalDays + 1);

  for (let i = 0; i < totalDays; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    const dateKey = cellDate.toISOString().split('T')[0];

    const data = state.history[dateKey] || { count: 0, minutes: 0 };
    const level = getActivityLevel(data.count, data.minutes);

    const cell = document.createElement('div');
    cell.className = `heatmap-cell cell-level-${level}`;

    const tooltip = document.createElement('div');
    tooltip.className = 'cell-tooltip';
    tooltip.textContent = `${dateKey}: ${data.count} tasks, ${data.minutes}m focus`;
    cell.appendChild(tooltip);

    heatmapGrid.appendChild(cell);
  }
}

function getActivityLevel(count, minutes) {
  if (count === 0 && minutes === 0) return 0;
  const score = count * 2 + Math.floor(minutes / 15);
  if (score <= 2) return 1;
  if (score <= 5) return 2;
  if (score <= 9) return 3;
  return 4;
}

// Navigation Tabs
navTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navTabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const target = btn.getAttribute('data-tab');
    document.getElementById(target).classList.add('active');

    if (target === 'tabHeatmap') {
      renderStatsAndHeatmap();
    }
  });
});

// Quick Notes Persistence
quickNotesArea.value = state.notes || '';
quickNotesArea.addEventListener('input', () => {
  state.notes = quickNotesArea.value;
  saveData();
});

// Window Pin Mode (Overlay Top vs Desktop Pin)
btnPinTop.addEventListener('click', () => {
  state.pinMode = 'always-on-top';
  btnPinTop.classList.add('active');
  btnPinDesktop.classList.remove('active');
  if (window.electronAPI) {
    window.electronAPI.togglePinMode('always-on-top');
  }
  saveData();
});

btnPinDesktop.addEventListener('click', () => {
  state.pinMode = 'desktop';
  btnPinDesktop.classList.add('active');
  btnPinTop.classList.remove('active');
  if (window.electronAPI) {
    window.electronAPI.togglePinMode('desktop');
  }
  saveData();
});

// Collapsing & Expanding
function setExpanded(expand) {
  state.isExpanded = expand;
  if (expand) {
    floatingPill.style.display = 'none';
    expandedCard.style.display = 'flex';
  } else {
    floatingPill.style.display = 'flex';
    expandedCard.style.display = 'none';
  }
  if (window.electronAPI) {
    window.electronAPI.setWindowSize(expand);
  }
}

btnCollapse.addEventListener('click', () => setExpanded(false));
floatingPill.addEventListener('click', () => setExpanded(true));
pillExpandBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setExpanded(true);
});

btnClose.addEventListener('click', () => {
  if (window.electronAPI) {
    window.electronAPI.closeApp();
  }
});

// Settings & Toggles
switchReminder.addEventListener('click', () => {
  state.remindersEnabled = !state.remindersEnabled;
  switchReminder.classList.toggle('active', state.remindersEnabled);
  saveData();
});

selectInterval.addEventListener('change', () => {
  state.reminderIntervalMinutes = parseInt(selectInterval.value, 10);
  saveData();
});

// Auto-start Windows Toggle
if (window.electronAPI) {
  window.electronAPI.getAutostartStatus().then(enabled => {
    switchAutostart.classList.toggle('active', !!enabled);
  });
}

switchAutostart.addEventListener('click', async () => {
  const isNowActive = !switchAutostart.classList.contains('active');
  switchAutostart.classList.toggle('active', isNowActive);
  if (window.electronAPI) {
    await window.electronAPI.setAutostartStatus(isNowActive);
  }
});

// Accountability Reminder Check Loop
function startAccountabilityEngine() {
  if (state.reminderCheckInterval) clearInterval(state.reminderCheckInterval);

  state.reminderCheckInterval = setInterval(() => {
    if (!state.remindersEnabled || !state.activeTaskId) return;

    const intervalMs = state.reminderIntervalMinutes * 60 * 1000;
    const now = Date.now();

    if (now - state.lastReminderTimestamp >= intervalMs) {
      triggerReminderPopup();
      state.lastReminderTimestamp = now;
    }
  }, 10000); // Check every 10 seconds
}

function triggerReminderPopup() {
  const task = state.tasks.find(t => t.id === state.activeTaskId);
  if (!task) return;

  reminderTaskName.textContent = task.title;
  modalQuoteReveal.style.display = 'none';
  reminderOverlay.style.display = 'flex';

  // If window was collapsed, expand it so user sees prompt
  if (!state.isExpanded) {
    setExpanded(true);
  }
}

btnStillOnTrack.addEventListener('click', () => {
  reminderOverlay.style.display = 'none';
  state.lastReminderTimestamp = Date.now();
});

btnWasDistracted.addEventListener('click', () => {
  state.distractionCount += 1;
  statDistractionCount.textContent = `${state.distractionCount} times`;
  saveData();

  // Show motivational quote
  const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  modalQuoteReveal.textContent = `"${randomQuote}"`;
  modalQuoteReveal.style.display = 'block';

  setTimeout(() => {
    reminderOverlay.style.display = 'none';
    state.lastReminderTimestamp = Date.now();
  }, 3500);
});

// Footer live clock
function updateFooterClock() {
  const d = new Date();
  footerClock.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateFooterClock, 1000);
updateFooterClock();

// Initialize App
loadData();
renderTasks();
renderStatsAndHeatmap();
startAccountabilityEngine();

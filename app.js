// Ambient Focus Overlay - Core Logic Engine
// Features: Multi-Date Task Manager, Overdue Red Flags, Random Interval Reminders, Browser Distraction Guard

const MOTIVATIONAL_QUOTES = [
  "Focus is a muscle. Every time you bring your attention back, you get stronger.",
  "You don't have to be extreme, just consistent.",
  "Do it for the person you want to become tomorrow.",
  "Action cures anxiety. Take the next small step right now.",
  "Flow begins the moment you stop negotiating with distractions.",
  "Deep work creates high value. Lock in."
];

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// State Store
const state = {
  selectedDate: getLocalDateString(), // Current date being viewed
  tasks: [],
  activeTaskId: null,
  activeTimerInterval: null,
  elapsedSeconds: 0,
  history: {}, // date -> { count: number, minutes: number }
  notes: '',
  distractionCount: 0,
  reminderIntervalMode: 'random', // 'random' | '5' | '15' | '25' | '45'
  reminderIntervalMinutes: 7, // Dynamic if random
  remindersEnabled: true,
  browserGuardEnabled: true,
  lastReminderTimestamp: Date.now(),
  reminderCheckInterval: null,
  browserCheckInterval: null,
  isExpanded: true,
  pinMode: 'always-on-top'
};

// UI Elements
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

// Date Navigation Elements
const btnPrevDay = document.getElementById('btnPrevDay');
const btnNextDay = document.getElementById('btnNextDay');
const dateBadgeLabel = document.getElementById('dateBadgeLabel');
const dateSubtextLabel = document.getElementById('dateSubtextLabel');
const calendarPickerInput = document.getElementById('calendarPickerInput');

const newTaskInput = document.getElementById('newTaskInput');
const newTaskDeadline = document.getElementById('newTaskDeadline');
const btnAddTask = document.getElementById('btnAddTask');
const taskList = document.getElementById('taskList');

const heatmapGrid = document.getElementById('heatmapGrid');
const statCompletedToday = document.getElementById('statCompletedToday');
const statFocusMinutes = document.getElementById('statFocusMinutes');
const statStreakDays = document.getElementById('statStreakDays');

const switchReminder = document.getElementById('switchReminder');
const selectInterval = document.getElementById('selectInterval');
const switchBrowserGuard = document.getElementById('switchBrowserGuard');
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

// Calculate random interval between 4 and 12 minutes
function calculateNextRandomIntervalMinutes() {
  return Math.floor(Math.random() * (12 - 4 + 1)) + 4;
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
      if (parsed.reminderIntervalMode) state.reminderIntervalMode = parsed.reminderIntervalMode;
      if (parsed.remindersEnabled !== undefined) state.remindersEnabled = parsed.remindersEnabled;
      if (parsed.browserGuardEnabled !== undefined) state.browserGuardEnabled = parsed.browserGuardEnabled;
      if (parsed.pinMode) state.pinMode = parsed.pinMode;
    }
  } catch (e) {
    console.error('Failed to load storage', e);
  }

  const today = getLocalDateString();
  // Ensure default tasks if empty
  if (!state.tasks || state.tasks.length === 0) {
    state.tasks = [
      { id: '1', title: 'Plan key priority tasks', date: today, deadline: '12:00', completed: true, timeSpent: 720 },
      { id: '2', title: 'Deep focus coding block', date: today, deadline: '16:00', completed: false, timeSpent: 1450 },
      { id: '3', title: 'Review pull requests & notes', date: today, deadline: '18:30', completed: false, timeSpent: 0 }
    ];
  } else {
    // Migration: ensure every task has a date field
    state.tasks.forEach(t => {
      if (!t.date) t.date = today;
    });
  }

  // Ensure today's history entry exists
  if (!state.history[today]) {
    state.history[today] = { count: 1, minutes: 12 };
  }

  // Sync settings UI
  if (selectInterval) selectInterval.value = state.reminderIntervalMode || 'random';
  if (switchReminder) switchReminder.classList.toggle('active', state.remindersEnabled);
  if (switchBrowserGuard) switchBrowserGuard.classList.toggle('active', state.browserGuardEnabled);
}

function saveData() {
  try {
    localStorage.setItem('ambient_overlay_state', JSON.stringify({
      tasks: state.tasks,
      history: state.history,
      notes: state.notes,
      distractionCount: state.distractionCount,
      reminderIntervalMode: state.reminderIntervalMode,
      remindersEnabled: state.remindersEnabled,
      browserGuardEnabled: state.browserGuardEnabled,
      pinMode: state.pinMode
    }));
  } catch (e) {
    console.error('Failed to save storage', e);
  }
}

// Date Navigation Controller
function updateDateDisplay() {
  const todayStr = getLocalDateString();
  const selected = state.selectedDate;

  // Format date readable
  const [y, m, d] = selected.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  dateSubtextLabel.textContent = dateObj.toLocaleDateString('en-US', options);

  // Badge label
  dateBadgeLabel.className = 'date-badge';
  if (selected === todayStr) {
    dateBadgeLabel.textContent = 'Today';
  } else if (selected < todayStr) {
    dateBadgeLabel.textContent = 'Past';
    dateBadgeLabel.classList.add('past');
  } else {
    dateBadgeLabel.textContent = 'Future';
    dateBadgeLabel.classList.add('future');
  }

  calendarPickerInput.value = selected;
  renderTasks();
}

function changeDateByOffset(offsetDays) {
  const [y, m, d] = state.selectedDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + offsetDays);
  state.selectedDate = getLocalDateString(dateObj);
  updateDateDisplay();
}

btnPrevDay.addEventListener('click', () => changeDateByOffset(-1));
btnNextDay.addEventListener('click', () => changeDateByOffset(1));
calendarPickerInput.addEventListener('change', (e) => {
  if (e.target.value) {
    state.selectedDate = e.target.value;
    updateDateDisplay();
  }
});

// Check if a task is overdue (past deadline and not completed)
function isTaskOverdue(task) {
  if (task.completed) return false;
  const todayStr = getLocalDateString();
  if (task.date < todayStr) return true; // Past day unfinished task

  if (task.date === todayStr && task.deadline) {
    const [deadH, deadM] = task.deadline.split(':').map(Number);
    const now = new Date();
    const currH = now.getHours();
    const currM = now.getMinutes();
    if (currH > deadH || (currH === deadH && currM > deadM)) {
      return true;
    }
  }
  return false;
}

// Render Tasks for currently selected date
function renderTasks() {
  taskList.innerHTML = '';
  const filtered = state.tasks.filter(t => t.date === state.selectedDate);

  if (filtered.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'padding: 24px 10px; text-align: center; color: var(--text-muted); font-size: 12px; font-weight: 600;';
    emptyMsg.textContent = state.selectedDate > getLocalDateString() 
      ? 'No tasks scheduled yet. Add tasks above to plan ahead!' 
      : 'No tasks recorded for this day.';
    taskList.appendChild(emptyMsg);
    return;
  }

  filtered.forEach(task => {
    const isRunning = state.activeTaskId === task.id;
    const overdue = isTaskOverdue(task);

    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''} ${isRunning ? 'running' : ''} ${overdue ? 'overdue' : ''}`;
    
    item.innerHTML = `
      <div class="task-left">
        <div class="tactile-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}">
          ✓
        </div>
        <div class="task-details">
          <div class="task-label" title="${task.title}">
            ${task.title}
            ${overdue ? '<span class="overdue-badge">🚩 Overdue</span>' : ''}
          </div>
          <div class="task-time-spent">
            ${task.deadline ? `Due: ${task.deadline} • ` : ''}${formatTime(task.timeSpent || 0)}
          </div>
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

  // Attach event listeners
  taskList.querySelectorAll('.tactile-checkbox').forEach(box => {
    box.addEventListener('click', () => {
      toggleTaskComplete(box.getAttribute('data-id'));
    });
  });

  taskList.querySelectorAll('.task-btn-timer').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleTimer(btn.getAttribute('data-id'));
    });
  });

  taskList.querySelectorAll('.task-btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteTask(btn.getAttribute('data-id'));
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

  const dateKey = task.date || getLocalDateString();
  if (!state.history[dateKey]) state.history[dateKey] = { count: 0, minutes: 0 };
  if (task.completed) {
    state.history[dateKey].count += 1;
  } else if (state.history[dateKey].count > 0) {
    state.history[dateKey].count -= 1;
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
  const deadlineVal = newTaskDeadline.value || null;

  const newTask = {
    id: Date.now().toString(),
    title: title,
    date: state.selectedDate,
    deadline: deadlineVal,
    completed: false,
    timeSpent: 0
  };

  state.tasks.unshift(newTask);
  newTaskInput.value = '';
  newTaskDeadline.value = '';
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
  if (state.reminderIntervalMode === 'random') {
    state.reminderIntervalMinutes = calculateNextRandomIntervalMinutes();
  }

  updateRunningBanner(task.title, task.timeSpent || 0);

  state.activeTimerInterval = setInterval(() => {
    task.timeSpent = (task.timeSpent || 0) + 1;
    updateRunningBanner(task.title, task.timeSpent);

    if (task.timeSpent % 60 === 0) {
      const today = getLocalDateString();
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

// GitHub Contribution Heatmap
function renderStatsAndHeatmap() {
  const today = getLocalDateString();
  const todayData = state.history[today] || { count: 0, minutes: 0 };
  statCompletedToday.textContent = todayData.count;
  statFocusMinutes.textContent = `${todayData.minutes}m`;
  statDistractionCount.textContent = `${state.distractionCount} times`;

  let streak = 0;
  let curr = new Date();
  while (true) {
    const key = getLocalDateString(curr);
    if (state.history[key] && (state.history[key].count > 0 || state.history[key].minutes > 0)) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    } else {
      break;
    }
  }
  statStreakDays.textContent = `${Math.max(1, streak)}d`;

  heatmapGrid.innerHTML = '';
  const totalDays = 18 * 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - totalDays + 1);

  for (let i = 0; i < totalDays; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    const dateKey = getLocalDateString(cellDate);

    const data = state.history[dateKey] || { count: 0, minutes: 0 };
    const level = getActivityLevel(data.count, data.minutes);

    const cell = document.createElement('div');
    cell.className = `heatmap-cell cell-level-${level}`;
    cell.title = `Click to view ${dateKey}`;

    // Clicking a heatmap cell navigates to that date!
    cell.addEventListener('click', () => {
      state.selectedDate = dateKey;
      updateDateDisplay();
      // switch to tasks tab
      document.querySelector('[data-tab="tabTasks"]').click();
    });

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

// Window Pin Mode
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
  const val = selectInterval.value;
  state.reminderIntervalMode = val;
  if (val === 'random') {
    state.reminderIntervalMinutes = calculateNextRandomIntervalMinutes();
  } else {
    state.reminderIntervalMinutes = parseInt(val, 10);
  }
  saveData();
});

switchBrowserGuard.addEventListener('click', () => {
  state.browserGuardEnabled = !state.browserGuardEnabled;
  switchBrowserGuard.classList.toggle('active', state.browserGuardEnabled);
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
      triggerReminderPopup("Time Check-in");
      state.lastReminderTimestamp = now;

      // Pick next random interval if in random mode
      if (state.reminderIntervalMode === 'random') {
        state.reminderIntervalMinutes = calculateNextRandomIntervalMinutes();
      }
    }
  }, 10000); // Check every 10 seconds
}

// Browser Window Distraction Guard Loop
let lastDistractionAlert = 0;
function startBrowserGuardEngine() {
  if (state.browserCheckInterval) clearInterval(state.browserCheckInterval);

  state.browserCheckInterval = setInterval(async () => {
    if (!state.browserGuardEnabled || !state.activeTaskId || !window.electronAPI) return;

    try {
      const winInfo = await window.electronAPI.checkActiveWindow();
      if (winInfo && winInfo.is_distracted) {
        const now = Date.now();
        // Cooldown of 45 seconds between distraction triggers
        if (now - lastDistractionAlert > 45000) {
          lastDistractionAlert = now;
          triggerReminderPopup(`⚠️ Distraction Detected (${winInfo.keyword || 'Social/Video'})`);
        }
      }
    } catch (e) {
      // ignore
    }
  }, 5000); // Check every 5 seconds
}

function triggerReminderPopup(customHeader = "Mindful Check-in") {
  const task = state.tasks.find(t => t.id === state.activeTaskId);
  if (!task) return;

  document.querySelector('.reminder-title').textContent = customHeader;
  reminderTaskName.textContent = task.title;
  modalQuoteReveal.style.display = 'none';
  reminderOverlay.style.display = 'flex';

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

// Overdue checker loop every minute
setInterval(() => {
  renderTasks();
}, 60000);

// Initialize App
loadData();
updateDateDisplay();
renderStatsAndHeatmap();
startAccountabilityEngine();
startBrowserGuardEngine();

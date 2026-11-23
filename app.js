/**
 * Perera & Sons Freezer Monitoring System (PFMS)
 * Staff Portal Application Logic (app.js)
 * Includes Staff Authentication, Account Creation, Password Reset, Multi-Theme & Daily Missed Check Notes
 */

// Application State
const AppState = {
  currentStaffUser: null,
  freezers: [],
  staff: [],
  slots: [],
  selectedDate: formatDateKey(new Date()),
  activeFilterZone: 'all',
  searchQuery: '',
  statusFilter: 'all',
  chartInstance: null,
  activeFreezerForChart: 'FRZ-01',
  historyFilters: {
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    date: '',
    freezerId: '',
    staffId: '',
    slotId: '',
    status: ''
  },
  historyPage: 1,
  historyPageSize: 15
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  // Apply initial theme
  applyStoredTheme();

  // Initialize Dexie DB & Seed Data
  await initDatabase();

  // Live Clock
  initLiveClock();

  // Check Staff Authentication Session
  checkStaffAuth();

  // Initialize UI Components & Event Listeners
  initEventListeners();
});

/**
 * Check if Staff Member is authenticated
 */
function checkStaffAuth() {
  const storedUser = sessionStorage.getItem('pfms_staff_user');
  if (storedUser) {
    try {
      AppState.currentStaffUser = JSON.parse(storedUser);
      showStaffDashboardUI();
      initStaffViews();
    } catch (e) {
      showStaffLoginScreen();
    }
  } else {
    showStaffLoginScreen();
  }
}

function showStaffLoginScreen() {
  document.getElementById('staffAuthScreen')?.classList.remove('hidden');
  document.getElementById('staffMainLayout')?.classList.add('hidden');
}

function showStaffDashboardUI() {
  document.getElementById('staffAuthScreen')?.classList.add('hidden');
  document.getElementById('staffMainLayout')?.classList.remove('hidden');

  const nameBadge = document.getElementById('staffUserNameBadge');
  const roleBadge = document.getElementById('staffUserRoleBadge');
  if (nameBadge && AppState.currentStaffUser) {
    nameBadge.textContent = AppState.currentStaffUser.fullName || AppState.currentStaffUser.username;
  }
  if (roleBadge && AppState.currentStaffUser) {
    roleBadge.textContent = (AppState.currentStaffUser.role || 'Staff').toUpperCase();
  }
}

async function initStaffViews() {
  await loadBaseData();
  resetQuickLogForm();
  await refreshDashboard();
  await refreshHistoryTable();
  await renderTemperatureTrendChart(AppState.activeFreezerForChart);
}

/**
 * Handle Staff Login
 */
async function handleStaffLogin(e) {
  if (e) e.preventDefault();

  const userField = document.getElementById('staffLoginUsername');
  const passField = document.getElementById('staffLoginPassword');
  const errorAlert = document.getElementById('staffLoginError');

  const username = userField ? userField.value.trim() : '';
  const password = passField ? passField.value.trim() : '';

  if (errorAlert) errorAlert.classList.add('hidden');

  const res = await authenticateUser(username, password);

  if (res.success) {
    AppState.currentStaffUser = res.user;
    sessionStorage.setItem('pfms_staff_user', JSON.stringify(res.user));
    showToast(`Welcome back, ${res.user.fullName || res.user.username}!`, 'success');
    showStaffDashboardUI();
    await initStaffViews();
  } else {
    if (errorAlert) {
      errorAlert.textContent = res.message || 'Invalid username or password.';
      errorAlert.classList.remove('hidden');
    }
    if (passField) passField.value = '';
  }
}

/**
 * Handle Staff Account Registration (Self-Service)
 */
async function handleStaffRegister(e) {
  if (e) e.preventDefault();

  const username = document.getElementById('regStaffUsername')?.value.trim();
  const fullName = document.getElementById('regStaffFullName')?.value.trim();
  const password = document.getElementById('regStaffPassword')?.value.trim();
  const confirmPass = document.getElementById('regStaffConfirmPassword')?.value.trim();
  const phone = document.getElementById('regStaffPhone')?.value.trim() || '';
  const errorAlert = document.getElementById('staffRegError');
  const successAlert = document.getElementById('staffRegSuccess');

  if (errorAlert) errorAlert.classList.add('hidden');
  if (successAlert) successAlert.classList.add('hidden');

  if (password !== confirmPass) {
    if (errorAlert) {
      errorAlert.textContent = 'Passwords do not match.';
      errorAlert.classList.remove('hidden');
    }
    return;
  }

  const res = await createUserAccount({ username, fullName, password, role: 'staff', phone });

  if (res.success) {
    if (successAlert) {
      successAlert.textContent = `${res.message} You can now log in.`;
      successAlert.classList.remove('hidden');
    }
    setTimeout(() => {
      switchStaffAuthTab('login');
      const uField = document.getElementById('staffLoginUsername');
      if (uField) uField.value = username;
      const pField = document.getElementById('staffLoginPassword');
      if (pField) { pField.value = ''; pField.focus(); }
    }, 1500);
  } else {
    if (errorAlert) {
      errorAlert.textContent = res.message;
      errorAlert.classList.remove('hidden');
    }
  }
}

/**
 * Handle Staff Password Reset
 */
async function handleStaffPasswordReset(e) {
  if (e) e.preventDefault();

  const username = document.getElementById('resetStaffUsername')?.value.trim();
  const newPass = document.getElementById('resetStaffNewPassword')?.value.trim();
  const confirmPass = document.getElementById('resetStaffConfirmPassword')?.value.trim();
  const errorAlert = document.getElementById('staffResetError');
  const successAlert = document.getElementById('staffResetSuccess');

  if (errorAlert) errorAlert.classList.add('hidden');
  if (successAlert) successAlert.classList.add('hidden');

  if (newPass !== confirmPass) {
    if (errorAlert) {
      errorAlert.textContent = 'New passwords do not match.';
      errorAlert.classList.remove('hidden');
    }
    return;
  }

  const res = await resetUserPassword(username, newPass);

  if (res.success) {
    if (successAlert) {
      successAlert.textContent = `${res.message} Please log in with your new password.`;
      successAlert.classList.remove('hidden');
    }
    setTimeout(() => {
      switchStaffAuthTab('login');
      const uField = document.getElementById('staffLoginUsername');
      if (uField) uField.value = username;
    }, 1500);
  } else {
    if (errorAlert) {
      errorAlert.textContent = res.message;
      errorAlert.classList.remove('hidden');
    }
  }
}

function handleStaffLogout() {
  sessionStorage.removeItem('pfms_staff_user');
  AppState.currentStaffUser = null;
  window.location.reload();
}

function switchStaffAuthTab(tab) {
  const loginForm = document.getElementById('staffLoginFormPanel');
  const registerForm = document.getElementById('staffRegisterFormPanel');
  const resetForm = document.getElementById('staffResetFormPanel');

  const tabLoginBtn = document.getElementById('tabAuthLoginBtn');
  const tabRegBtn = document.getElementById('tabAuthRegBtn');
  const tabResetBtn = document.getElementById('tabAuthResetBtn');

  loginForm?.classList.add('hidden');
  registerForm?.classList.add('hidden');
  resetForm?.classList.add('hidden');

  [tabLoginBtn, tabRegBtn, tabResetBtn].forEach(b => {
    b?.classList.remove('bg-white', 'text-slate-900', 'shadow-xs');
    b?.classList.add('text-slate-500');
  });

  if (tab === 'login') {
    loginForm?.classList.remove('hidden');
    tabLoginBtn?.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
    tabLoginBtn?.classList.remove('text-slate-500');
  } else if (tab === 'register') {
    registerForm?.classList.remove('hidden');
    tabRegBtn?.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
    tabRegBtn?.classList.remove('text-slate-500');
  } else if (tab === 'reset') {
    resetForm?.classList.remove('hidden');
    tabResetBtn?.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
    tabResetBtn?.classList.remove('text-slate-500');
  }
}

/**
 * Clock & Real-time timestamp
 */
function initLiveClock() {
  const clockEl = document.getElementById('liveClock');
  const dateEl = document.getElementById('liveDate');

  function update() {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }
  }

  update();
  setInterval(update, 1000);
}

/**
 * Load Freezers, Staff, and Slots from Dexie
 */
async function loadBaseData() {
  AppState.freezers = await db.freezers.orderBy('freezerId').toArray();
  AppState.staff = await db.staff.where('status').equals('active').toArray();
  AppState.slots = await db.timeSlots.where('status').equals('active').sortBy('sortOrder');

  populateDropdowns();
}

function populateDropdowns() {
  const logFreezerSelect = document.getElementById('logFreezerSelect');
  const logStaffSelect = document.getElementById('logStaffSelect');
  const logSlotSelect = document.getElementById('logSlotSelect');

  const filterFreezer = document.getElementById('filterFreezer');
  const filterStaff = document.getElementById('filterStaff');
  const filterSlot = document.getElementById('filterSlot');
  const chartFreezerSelect = document.getElementById('chartFreezerSelect');

  if (logFreezerSelect) {
    logFreezerSelect.innerHTML = '<option value="">-- Choose Freezer (1 of 64) --</option>' +
      AppState.freezers.map(f => `<option value="${f.freezerId}">${f.freezerId}: ${f.name} (${f.location}) [${f.targetMin}°C to ${f.targetMax}°C]</option>`).join('');
  }

  if (filterFreezer) {
    filterFreezer.innerHTML = '<option value="">All 64 Freezers</option>' +
      AppState.freezers.map(f => `<option value="${f.freezerId}">${f.freezerId} - ${f.name}</option>`).join('');
  }

  if (chartFreezerSelect) {
    chartFreezerSelect.innerHTML = AppState.freezers.map(f => `<option value="${f.freezerId}">${f.freezerId}: ${f.name} - ${f.location}</option>`).join('');
    chartFreezerSelect.value = AppState.activeFreezerForChart;
  }

  if (logStaffSelect) {
    const loggedName = AppState.currentStaffUser?.fullName || AppState.currentStaffUser?.username || 'Gayani Shalika';
    const matchedStaff = AppState.staff.find(s => s.name.toLowerCase() === loggedName.toLowerCase());
    const defaultStaffId = matchedStaff ? matchedStaff.staffId : (AppState.staff[0]?.staffId || '');

    logStaffSelect.innerHTML = '<option value="">-- Select Checking Officer --</option>' +
      AppState.staff.map(s => `<option value="${s.staffId}" ${s.staffId === defaultStaffId ? 'selected' : ''}>${s.name} (${s.staffId})</option>`).join('');
  }

  if (filterStaff) {
    filterStaff.innerHTML = '<option value="">All Staff Members</option>' +
      AppState.staff.map(s => `<option value="${s.staffId}">${s.name}</option>`).join('');
  }

  if (logSlotSelect) {
    const currentSlot = getCurrentTimeSlot(AppState.slots);
    logSlotSelect.innerHTML = AppState.slots.map(s => `<option value="${s.slotId}" ${s.slotId === currentSlot ? 'selected' : ''}>${s.name} (${s.timeWindow})</option>`).join('');
  }

  if (filterSlot) {
    filterSlot.innerHTML = '<option value="">All 4 Time Slots</option>' +
      AppState.slots.map(s => `<option value="${s.slotId}">${s.name}</option>`).join('');
  }
}

/**
 * Refresh Matrix Dashboard View & Summary Metrics
 */
async function refreshDashboard() {
  const dateInput = document.getElementById('matrixDatePicker');
  const targetDate = dateInput ? dateInput.value : AppState.selectedDate;
  AppState.selectedDate = targetDate;

  const matrixData = await getStatusMatrix(targetDate);
  renderMetricCounters(matrixData.stats);
  renderMatrixGrid(matrixData, targetDate);
}

function renderMetricCounters(stats) {
  const elTotal = document.getElementById('statTotalFreezers');
  const elCompleted = document.getElementById('statCompletedChecks');
  const elRate = document.getElementById('statCompletionRate');
  const elNormal = document.getElementById('statNormalCount');
  const elWarning = document.getElementById('statWarningCount');
  const elCritical = document.getElementById('statCriticalCount');
  const progressBar = document.getElementById('statProgressBar');

  if (elTotal) elTotal.textContent = stats.totalFreezers;
  if (elCompleted) elCompleted.textContent = `${stats.totalCompletedChecks} / ${stats.totalPossibleChecks}`;
  if (elRate) elRate.textContent = `${stats.completionRate}%`;
  if (elNormal) elNormal.textContent = stats.normalCount;
  if (elWarning) elWarning.textContent = stats.warningCount;
  if (elCritical) elCritical.textContent = stats.criticalCount;

  if (progressBar) {
    progressBar.style.width = `${stats.completionRate}%`;
  }
}

/**
 * Render 64-Freezer Matrix Table with Notes / Missed Reason Column next to Analytics
 */
function renderMatrixGrid(matrixData, targetDate) {
  const container = document.getElementById('matrixTableBody');
  if (!container) return;

  let filtered = matrixData.matrix;

  if (AppState.activeFilterZone !== 'all') {
    filtered = filtered.filter(item => item.freezer.zone.includes(AppState.activeFilterZone));
  }

  if (AppState.searchQuery.trim() !== '') {
    const q = AppState.searchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.freezer.name.toLowerCase().includes(q) ||
      item.freezer.freezerId.toLowerCase().includes(q) ||
      item.freezer.location.toLowerCase().includes(q)
    );
  }

  if (AppState.statusFilter === 'incomplete') {
    filtered = filtered.filter(item => !item.isFullCompleted);
  } else if (AppState.statusFilter === 'completed') {
    filtered = filtered.filter(item => item.isFullCompleted);
  } else if (AppState.statusFilter === 'alerts') {
    filtered = filtered.filter(item => item.slots.some(s => s.log && (s.log.status === 'warning' || s.log.status === 'critical')));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="8" class="py-12 text-center text-slate-400">
          <i class="fa-solid fa-box-open text-4xl mb-3 text-slate-300"></i>
          <p class="text-base font-semibold">No Freezers match the selected filters</p>
          <p class="text-xs text-slate-400 mt-1">Try resetting zone, search keywords, or completion status.</p>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const f = item.freezer;
    const progressPercent = Math.round((item.completedCount / item.totalSlots) * 100);

    const slotCellsHtml = item.slots.map(s => {
      if (s.isCompleted && s.log) {
        const statusBadgeClass = s.log.status === 'critical' ? 'badge-critical' : (s.log.status === 'warning' ? 'badge-warning' : 'badge-normal');
        const iconClass = s.log.status === 'critical' ? 'fa-triangle-exclamation text-red-600' : (s.log.status === 'warning' ? 'fa-circle-exclamation text-amber-600' : 'fa-circle-check text-emerald-600');
        
        return `
          <td class="px-3 py-2 text-center whitespace-nowrap">
            <button onclick="openLogModalForSlot('${f.freezerId}', '${s.slotId}', true)" title="Logged by ${s.log.staffName} at ${s.log.timestamp} (Click to edit)" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${statusBadgeClass} transition-all hover:scale-105 shadow-xs">
              <i class="fa-solid ${iconClass}"></i>
              <span class="font-mono-numbers">${s.log.temperature}°C</span>
            </button>
            <div class="text-[10px] text-slate-400 truncate max-w-[100px] mx-auto mt-0.5">${s.log.staffName.split(' ')[0]}</div>
          </td>
        `;
      } else {
        return `
          <td class="px-3 py-2 text-center whitespace-nowrap">
            <button onclick="openLogModalForSlot('${f.freezerId}', '${s.slotId}', false)" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-500 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100 transition-all">
              <i class="fa-solid fa-plus text-[10px]"></i> Log
            </button>
            <div class="text-[10px] text-slate-400 mt-0.5">Pending</div>
          </td>
        `;
      }
    }).join('');

    return `
      <tr class="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
        <!-- 1. Freezer Info -->
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl dynamic-btn-primary flex flex-col items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <i class="fa-solid fa-snowflake text-[11px] mb-0.5 opacity-80"></i>
              <span class="text-[10px] leading-none">${f.freezerId.replace('FRZ-', '#')}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-800 text-sm">${f.name}</span>
                <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${f.type === 'deep_freezer' ? 'bg-indigo-50 text-indigo-700' : (f.type === 'blast_freezer' ? 'bg-cyan-50 text-cyan-700' : 'bg-emerald-50 text-emerald-700')}">
                  ${f.type.replace('_', ' ')}
                </span>
              </div>
              <div class="text-xs text-slate-500 truncate max-w-[260px]" title="${f.location}">${f.location}</div>
              <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                <span>Target: ${f.targetMin}°C to ${f.targetMax}°C</span>
                <span>•</span>
                <span>${f.zone}</span>
              </div>
            </div>
          </div>
        </td>

        <!-- 2, 3, 4, 5: 4 Slots -->
        ${slotCellsHtml}

        <!-- 6. Daily Progress Status -->
        <td class="px-4 py-3 text-center">
          <div class="flex flex-col items-center justify-center">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold ${item.isFullCompleted ? 'text-emerald-600' : 'text-slate-700'}">${item.completedCount} / 4</span>
              <span class="text-[11px] text-slate-400">(${progressPercent}%)</span>
            </div>
            <div class="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="h-2 rounded-full transition-all duration-300 ${item.isFullCompleted ? 'bg-emerald-500' : (item.completedCount > 0 ? 'bg-amber-500' : 'bg-slate-300')}" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </td>

        <!-- 7. Analytics Chart Button -->
        <td class="px-3 py-3 text-center whitespace-nowrap">
          <button onclick="viewFreezerTrend('${f.freezerId}')" class="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="View Temperature Chart">
            <i class="fa-solid fa-chart-line text-sm"></i>
          </button>
        </td>

        <!-- 8. DAILY NOTES / REASON FOR MISSED CHECKS (Requested Feature) -->
        <td class="px-4 py-3 text-left">
          ${item.dailyNote ? `
            <div onclick="openDailyNoteModal('${f.freezerId}', '${targetDate}')" class="cursor-pointer group flex items-start gap-2 p-2 rounded-xl bg-amber-50/90 border border-amber-200 hover:bg-amber-100/90 hover:border-amber-300 transition-all max-w-[260px] shadow-2xs">
              <i class="fa-solid fa-note-sticky text-amber-600 text-xs mt-0.5 shrink-0"></i>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-semibold text-amber-950 truncate" title="${item.dailyNote.note}">
                  ${item.dailyNote.note}
                </p>
                <span class="text-[9px] text-amber-700/80 font-mono block mt-0.5">
                  By ${item.dailyNote.author || 'Staff'} • ${item.dailyNote.timestamp ? item.dailyNote.timestamp.split(' ')[1] : ''}
                </span>
              </div>
              <i class="fa-solid fa-pen-to-square text-[10px] text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
          ` : `
            <button onclick="openDailyNoteModal('${f.freezerId}', '${targetDate}')" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${item.isFullCompleted ? 'text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200' : 'text-amber-800 bg-amber-50/70 hover:bg-amber-100/80 border border-dashed border-amber-300 shadow-2xs'} transition-all">
              <i class="fa-regular fa-comment-dots text-xs"></i>
              <span>${item.isFullCompleted ? '+ Add Note' : '+ Reason for Missed'}</span>
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * ========================================================
 * DAILY NOTES & MISSED REASON MODAL HANDLERS
 * ========================================================
 */
async function openDailyNoteModal(freezerId, dateStr) {
  const modal = document.getElementById('dailyNoteModal');
  const freezer = AppState.freezers.find(f => f.freezerId === freezerId);
  const existingNote = await getDailyNote(dateStr, freezerId);

  const fieldFreezerId = document.getElementById('noteFreezerId');
  const fieldDate = document.getElementById('noteDate');
  const titleName = document.getElementById('noteFreezerName');
  const titleLoc = document.getElementById('noteFreezerLocation');
  const dateDisp = document.getElementById('noteDateDisplay');
  const textInput = document.getElementById('noteTextInput');
  const authorInput = document.getElementById('noteAuthorInput');
  const btnDelete = document.getElementById('btnDeleteDailyNote');

  if (fieldFreezerId) fieldFreezerId.value = freezerId;
  if (fieldDate) fieldDate.value = dateStr;
  if (titleName) titleName.textContent = `${freezer ? freezer.freezerId : freezerId}: ${freezer ? freezer.name : ''}`;
  if (titleLoc) titleLoc.textContent = freezer ? `${freezer.location} (${freezer.zone})` : '';
  if (dateDisp) dateDisp.textContent = `Date: ${dateStr}`;

  const currentAuthor = AppState.currentStaffUser?.fullName || AppState.currentStaffUser?.username || 'Gayani Shalika';
  if (authorInput) authorInput.value = existingNote ? existingNote.author : currentAuthor;

  if (textInput) {
    textInput.value = existingNote ? existingNote.note : '';
    textInput.focus();
  }

  if (btnDelete) {
    if (existingNote) {
      btnDelete.classList.remove('hidden');
    } else {
      btnDelete.classList.add('hidden');
    }
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDailyNoteModal() {
  const modal = document.getElementById('dailyNoteModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleDailyNoteSubmit(e) {
  if (e) e.preventDefault();

  const freezerId = document.getElementById('noteFreezerId')?.value;
  const dateStr = document.getElementById('noteDate')?.value;
  const noteText = document.getElementById('noteTextInput')?.value.trim();
  const author = document.getElementById('noteAuthorInput')?.value.trim() || 'Staff';

  if (!freezerId || !dateStr || !noteText) {
    showToast('Please enter the reason or observation note.', 'warning');
    return;
  }

  const res = await saveDailyNote(dateStr, freezerId, noteText, author);

  if (res.success) {
    showToast(`Saved note for ${freezerId} on ${dateStr}!`, 'success');
    closeDailyNoteModal();
    await refreshDashboard();
  } else {
    showToast('Failed to save note.', 'error');
  }
}

async function handleDeleteDailyNote() {
  const freezerId = document.getElementById('noteFreezerId')?.value;
  const dateStr = document.getElementById('noteDate')?.value;

  if (!freezerId || !dateStr) return;

  const confirmed = confirm(`Are you sure you want to remove the note/reason for ${freezerId} on ${dateStr}?`);
  if (!confirmed) return;

  await deleteDailyNote(dateStr, freezerId);
  showToast(`Note removed for ${freezerId}.`, 'info');
  closeDailyNoteModal();
  await refreshDashboard();
}

/**
 * Open Quick Log Modal
 */
function openLogModalForSlot(freezerId, slotId, isEditing = false) {
  const modal = document.getElementById('quickLogModal');
  const freezerSelect = document.getElementById('logFreezerSelect');
  const slotSelect = document.getElementById('logSlotSelect');
  const modalTitle = document.getElementById('modalLogTitle');

  if (freezerSelect) freezerSelect.value = freezerId;
  if (slotSelect) slotSelect.value = slotId;

  if (modalTitle) {
    modalTitle.innerHTML = isEditing
      ? `<i class="fa-solid fa-pen-to-square mr-2"></i> Update Temperature Check (${freezerId})`
      : `<i class="fa-solid fa-snowflake mr-2"></i> Record Temperature Check (${freezerId})`;
  }

  updateTemperaturePreview();

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const tempInput = document.getElementById('logTemperatureInput');
    if (tempInput) {
      tempInput.focus();
      tempInput.select();
    }
  }
}

function closeLogModal() {
  const modal = document.getElementById('quickLogModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function updateTemperaturePreview() {
  const freezerId = document.getElementById('logFreezerSelect')?.value;
  const tempInput = document.getElementById('logTemperatureInput');
  const previewBox = document.getElementById('tempStatusPreview');
  const badge = document.getElementById('tempStatusBadge');
  const desc = document.getElementById('tempStatusDesc');

  if (!tempInput || !previewBox || !badge || !desc) return;

  const tempVal = parseFloat(tempInput.value);
  if (isNaN(tempVal)) {
    previewBox.className = 'p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 flex items-center gap-3';
    badge.className = 'px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-700';
    badge.textContent = 'Waiting for input';
    desc.textContent = 'Enter temperature value in Celsius (°C).';
    return;
  }

  const freezer = AppState.freezers.find(f => f.freezerId === freezerId);
  const status = evaluateTemperatureStatus(tempVal, freezer);

  if (status === 'normal') {
    previewBox.className = 'p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-3';
    badge.className = 'px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
    badge.textContent = 'NORMAL / SAFE';
    desc.textContent = `Within safe compliance threshold (${freezer ? `${freezer.targetMin}°C to ${freezer.targetMax}°C` : '-22°C to -18°C'}). Food safety standards met.`;
  } else if (status === 'warning') {
    previewBox.className = 'p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-center gap-3';
    badge.className = 'px-2 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300';
    badge.textContent = 'WARNING / VARIANCE';
    desc.textContent = 'Temperature is deviating slightly from optimal target range. Check freezer door & gaskets.';
  } else {
    previewBox.className = 'p-3 rounded-xl border border-red-300 bg-red-50 text-red-900 flex items-center gap-3 animate-pulse-subtle';
    badge.className = 'px-2 py-0.5 rounded text-xs font-bold bg-red-200 text-red-900 border border-red-400';
    badge.textContent = 'CRITICAL ALERT';
    desc.textContent = 'Critical temperature breach! Requires immediate technician or supervisor attention!';
  }
}

async function handleQuickLogSubmit(e) {
  if (e) e.preventDefault();

  const freezerSelect = document.getElementById('logFreezerSelect');
  const staffSelect = document.getElementById('logStaffSelect');
  const slotSelect = document.getElementById('logSlotSelect');
  const tempInput = document.getElementById('logTemperatureInput');
  const notesInput = document.getElementById('logNotesInput');
  const dateInput = document.getElementById('matrixDatePicker');

  const freezerId = freezerSelect?.value;
  const staffId = staffSelect?.value;
  const slotId = slotSelect?.value;
  const tempVal = parseFloat(tempInput?.value);
  const notes = notesInput?.value.trim() || '';
  const dateStr = dateInput?.value || formatDateKey();

  if (!freezerId) {
    showToast('Please select a freezer from the 64 freezers.', 'error');
    return;
  }
  if (!staffId) {
    showToast('Please select the checking officer name.', 'error');
    return;
  }
  if (!slotId) {
    showToast('Please select the monitoring time slot.', 'error');
    return;
  }
  if (isNaN(tempVal)) {
    showToast('Please enter a valid temperature numeric value.', 'error');
    return;
  }

  if (tempVal > 50 || tempVal < -70) {
    showToast('Recorded temperature must be between -70°C and +50°C.', 'warning');
    return;
  }

  const freezer = AppState.freezers.find(f => f.freezerId === freezerId);
  const staff = AppState.staff.find(s => s.staffId === staffId);
  const slot = AppState.slots.find(s => s.slotId === slotId);

  const status = evaluateTemperatureStatus(tempVal, freezer);

  const entry = {
    date: dateStr,
    timestamp: formatTimestamp(),
    freezerId: freezer.freezerId,
    freezerName: freezer.name,
    location: freezer.location,
    staffId: staff.staffId,
    staffName: staff.name,
    slotId: slot.slotId,
    slotName: slot.name,
    temperature: tempVal,
    status: status,
    notes: notes || (status === 'critical' ? 'High temp alert noticed during check' : 'Routine check verified')
  };

  const result = await recordTemperatureCheck(entry, false);

  if (!result.success && result.isDuplicate) {
    const confirmed = confirm(`${result.message}\n\nDo you want to overwrite / update this temperature reading?`);
    if (confirmed) {
      await recordTemperatureCheck(entry, true);
      showToast(`Updated ${freezer.name} check successfully to ${tempVal}°C!`, 'success');
      closeLogModal();
      await refreshDashboard();
      await refreshHistoryTable();
      await renderTemperatureTrendChart(freezer.freezerId);
    }
    return;
  }

  playBeep(status === 'critical' ? 'warning' : 'success');
  showToast(`Recorded ${freezer.freezerId} [${slot.name}]: ${tempVal}°C by ${staff.name}`, 'success');
  closeLogModal();
  
  await refreshDashboard();
  await refreshHistoryTable();
  await renderTemperatureTrendChart(freezer.freezerId);
}

function resetQuickLogForm() {
  const tempInput = document.getElementById('logTemperatureInput');
  const notesInput = document.getElementById('logNotesInput');
  const dateInput = document.getElementById('matrixDatePicker');

  if (tempInput) tempInput.value = '-19.5';
  if (notesInput) notesInput.value = '';
  if (dateInput) dateInput.value = formatDateKey();

  updateTemperaturePreview();
}

async function refreshHistoryTable() {
  const container = document.getElementById('historyTableBody');
  const paginationInfo = document.getElementById('historyPaginationInfo');
  const paginationControls = document.getElementById('historyPaginationControls');
  if (!container) return;

  const f = AppState.historyFilters;

  let query = db.logs.orderBy('timestamp').reverse();
  let logs = await query.toArray();

  if (f.month) logs = logs.filter(l => l.date.startsWith(f.month));
  if (f.date) logs = logs.filter(l => l.date === f.date);
  if (f.freezerId) logs = logs.filter(l => l.freezerId === f.freezerId);
  if (f.staffId) logs = logs.filter(l => l.staffId === f.staffId);
  if (f.slotId) logs = logs.filter(l => l.slotId === f.slotId);
  if (f.status) logs = logs.filter(l => l.status === f.status);

  const totalRecords = logs.length;
  const totalPages = Math.ceil(totalRecords / AppState.historyPageSize) || 1;
  if (AppState.historyPage > totalPages) AppState.historyPage = 1;

  const startIndex = (AppState.historyPage - 1) * AppState.historyPageSize;
  const paginatedLogs = logs.slice(startIndex, startIndex + AppState.historyPageSize);

  if (paginatedLogs.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <i class="fa-regular fa-calendar-xmark text-4xl mb-3 text-slate-300"></i>
          <p class="text-base font-semibold">No Log Records Found</p>
          <p class="text-xs text-slate-400 mt-1">Adjust your month, date, freezer, or staff filter options.</p>
        </td>
      </tr>
    `;
    if (paginationInfo) paginationInfo.textContent = 'Showing 0 records';
    if (paginationControls) paginationControls.innerHTML = '';
    return;
  }

  container.innerHTML = paginatedLogs.map(l => {
    const badgeClass = l.status === 'critical' ? 'badge-critical' : (l.status === 'warning' ? 'badge-warning' : 'badge-normal');
    const statusIcon = l.status === 'critical' ? 'fa-triangle-exclamation text-red-600' : (l.status === 'warning' ? 'fa-circle-exclamation text-amber-600' : 'fa-circle-check text-emerald-600');

    return `
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
        <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-600">
          <div class="font-semibold text-slate-800">${l.date}</div>
          <div class="text-[11px] text-slate-400">${l.timestamp.split(' ')[1] || ''}</div>
        </td>
        <td class="px-4 py-3">
          <div class="font-bold text-slate-800 text-xs">${l.freezerName}</div>
          <div class="text-[11px] text-slate-500 truncate max-w-[200px]">${l.location || ''}</div>
          <div class="text-[10px] text-slate-400 font-mono">${l.freezerId}</div>
        </td>
        <td class="px-4 py-3 whitespace-nowrap text-xs text-slate-700">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
            <i class="fa-regular fa-clock text-[10px] text-slate-400"></i>
            ${l.slotName}
          </span>
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${badgeClass}">
            <i class="fa-solid ${statusIcon}"></i>
            <span class="font-mono-numbers text-sm">${l.temperature}°C</span>
          </span>
        </td>
        <td class="px-4 py-3 whitespace-nowrap text-xs text-slate-700">
          <div class="font-semibold text-slate-800 flex items-center gap-1.5">
            <div class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
              ${l.staffName ? l.staffName[0] : 'S'}
            </div>
            ${l.staffName}
          </div>
          <div class="text-[10px] text-slate-400 pl-6">${l.staffId}</div>
        </td>
        <td class="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title="${l.notes || ''}">
          ${l.notes || '<span class="text-slate-300 italic">None</span>'}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button onclick="openLogModalForSlot('${l.freezerId}', '${l.slotId}', true)" class="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors">
            <i class="fa-solid fa-pen-to-square mr-1"></i> Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${startIndex + 1} to ${Math.min(startIndex + AppState.historyPageSize, totalRecords)} of ${totalRecords} records`;
  }

  if (paginationControls) {
    paginationControls.innerHTML = `
      <button onclick="changeHistoryPage(-1)" ${AppState.historyPage <= 1 ? 'disabled class="px-3 py-1 rounded-lg bg-slate-100 text-slate-300 cursor-not-allowed text-xs"' : 'class="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs"'}>
        <i class="fa-solid fa-chevron-left mr-1"></i> Prev
      </button>
      <span class="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">Page ${AppState.historyPage} of ${totalPages}</span>
      <button onclick="changeHistoryPage(1)" ${AppState.historyPage >= totalPages ? 'disabled class="px-3 py-1 rounded-lg bg-slate-100 text-slate-300 cursor-not-allowed text-xs"' : 'class="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs"'}>
        Next <i class="fa-solid fa-chevron-right ml-1"></i>
      </button>
    `;
  }
}

function changeHistoryPage(delta) {
  AppState.historyPage += delta;
  refreshHistoryTable();
}

async function renderTemperatureTrendChart(freezerId) {
  AppState.activeFreezerForChart = freezerId;
  const canvas = document.getElementById('tempTrendChart');
  if (!canvas) return;

  const freezer = AppState.freezers.find(f => f.freezerId === freezerId);
  const chartTitle = document.getElementById('chartFreezerTitle');
  if (chartTitle && freezer) {
    chartTitle.textContent = `${freezer.freezerId}: ${freezer.name} (${freezer.location}) - Target: ${freezer.targetMin}°C to ${freezer.targetMax}°C`;
  }

  const logs = await db.logs
    .where('freezerId')
    .equals(freezerId)
    .sortBy('timestamp');

  const chartLogs = logs.slice(-24);
  const labels = chartLogs.map(l => `${l.date.slice(5)} ${l.slotName.split(' ')[0]}`);
  const dataPoints = chartLogs.map(l => l.temperature);
  const minTarget = freezer ? freezer.targetMin : -22;
  const maxTarget = freezer ? freezer.targetMax : -18;

  const minBoundLine = chartLogs.map(() => minTarget);
  const maxBoundLine = chartLogs.map(() => maxTarget);

  if (AppState.chartInstance) {
    AppState.chartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  AppState.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [
        {
          label: 'Recorded Temp (°C)',
          data: dataPoints.length ? dataPoints : [0],
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: chartLogs.map(l => l.status === 'critical' ? '#ef4444' : (l.status === 'warning' ? '#f59e0b' : '#10b981')),
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: `Max Limit (${maxTarget}°C)`,
          data: maxBoundLine,
          borderColor: '#f97316',
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false
        },
        {
          label: `Min Limit (${minTarget}°C)`,
          data: minBoundLine,
          borderColor: '#3b82f6',
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 14, font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}°C`
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Temperature (°C)', font: { size: 11, weight: 'bold' } },
          grid: { color: '#f1f5f9' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
}

function viewFreezerTrend(freezerId) {
  const chartSelect = document.getElementById('chartFreezerSelect');
  if (chartSelect) chartSelect.value = freezerId;
  renderTemperatureTrendChart(freezerId);

  const section = document.getElementById('analyticsSection');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

async function exportFilteredLogsToCSV() {
  const f = AppState.historyFilters;
  let logs = await db.logs.orderBy('timestamp').reverse().toArray();

  if (f.month) logs = logs.filter(l => l.date.startsWith(f.month));
  if (f.date) logs = logs.filter(l => l.date === f.date);
  if (f.freezerId) logs = logs.filter(l => l.freezerId === f.freezerId);
  if (f.staffId) logs = logs.filter(l => l.staffId === f.staffId);
  if (f.slotId) logs = logs.filter(l => l.slotId === f.slotId);
  if (f.status) logs = logs.filter(l => l.status === f.status);

  if (logs.length === 0) {
    showToast('No logs available to export.', 'warning');
    return;
  }

  const csvRows = [
    ['PFMS - Perera & Sons Freezer Temperature Monitoring Log'],
    [`Generated: ${formatTimestamp()}`],
    ['Date', 'Timestamp', 'Freezer ID', 'Freezer Name', 'Location', 'Time Slot', 'Temperature (C)', 'Status', 'Staff ID', 'Checking Officer', 'Notes']
  ];

  for (const l of logs) {
    csvRows.push([
      `"${l.date}"`,
      `"${l.timestamp}"`,
      `"${l.freezerId}"`,
      `"${(l.freezerName || '').replace(/"/g, '""')}"`,
      `"${(l.location || '').replace(/"/g, '""')}"`,
      `"${(l.slotName || '').replace(/"/g, '""')}"`,
      l.temperature,
      `"${l.status}"`,
      `"${l.staffId}"`,
      `"${(l.staffName || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `PFMS_Freezer_Logs_${f.month || formatDateKey()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported ${logs.length} temperature records to CSV!`, 'success');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-900 border-emerald-700 text-white'
    : (type === 'error' ? 'bg-red-900 border-red-700 text-white'
    : (type === 'warning' ? 'bg-amber-900 border-amber-700 text-white'
    : 'bg-slate-900 border-slate-700 text-white'));

  const icon = type === 'success' ? 'fa-circle-check text-emerald-400'
    : (type === 'error' ? 'fa-circle-xmark text-red-400'
    : (type === 'warning' ? 'fa-triangle-exclamation text-amber-400'
    : 'fa-circle-info text-blue-400'));

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${bgColor}`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-base shrink-0"></i>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-white/60 hover:text-white ml-2"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function playBeep(type = 'success') {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.setValueAtTime(200, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch (e) {}
}

/**
 * Setup Event Listeners
 */
function initEventListeners() {
  document.getElementById('staffLoginForm')?.addEventListener('submit', handleStaffLogin);
  document.getElementById('staffRegisterForm')?.addEventListener('submit', handleStaffRegister);
  document.getElementById('staffResetForm')?.addEventListener('submit', handleStaffPasswordReset);

  document.getElementById('tabAuthLoginBtn')?.addEventListener('click', () => switchStaffAuthTab('login'));
  document.getElementById('tabAuthRegBtn')?.addEventListener('click', () => switchStaffAuthTab('register'));
  document.getElementById('tabAuthResetBtn')?.addEventListener('click', () => switchStaffAuthTab('reset'));

  document.getElementById('btnStaffLogout')?.addEventListener('click', handleStaffLogout);

  // Daily Note / Missed Reason Form and Presets
  document.getElementById('dailyNoteForm')?.addEventListener('submit', handleDailyNoteSubmit);
  document.getElementById('btnDeleteDailyNote')?.addEventListener('click', handleDeleteDailyNote);

  document.querySelectorAll('[data-reason-preset]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reason = e.currentTarget.getAttribute('data-reason-preset');
      const textInput = document.getElementById('noteTextInput');
      if (textInput) {
        textInput.value = reason;
      }
    });
  });

  const staffThemeSelect = document.getElementById('staffThemeSelect');
  if (staffThemeSelect) {
    staffThemeSelect.value = getActiveTheme();
    staffThemeSelect.addEventListener('change', (e) => {
      setActiveTheme(e.target.value);
      showToast(`Theme changed to ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
  }

  window.addEventListener('pfms-theme-changed', (e) => {
    if (staffThemeSelect) staffThemeSelect.value = e.detail.theme;
  });

  const datePicker = document.getElementById('matrixDatePicker');
  if (datePicker) {
    datePicker.value = formatDateKey();
    datePicker.addEventListener('change', async (e) => {
      AppState.selectedDate = e.target.value;
      await refreshDashboard();
    });
  }

  document.getElementById('btnTodayMatrix')?.addEventListener('click', async () => {
    const today = formatDateKey();
    if (datePicker) datePicker.value = today;
    AppState.selectedDate = today;
    await refreshDashboard();
  });

  document.querySelectorAll('[data-zone-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-zone-filter]').forEach(b => {
        b.classList.remove('dynamic-btn-primary', 'shadow-sm');
        b.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-50');
      });
      const target = e.currentTarget;
      target.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-50');
      target.classList.add('dynamic-btn-primary', 'shadow-sm');

      AppState.activeFilterZone = target.getAttribute('data-zone-filter');
      refreshDashboard();
    });
  });

  document.getElementById('matrixStatusFilter')?.addEventListener('change', (e) => {
    AppState.statusFilter = e.target.value;
    refreshDashboard();
  });

  document.getElementById('matrixSearchInput')?.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value;
    refreshDashboard();
  });

  document.querySelectorAll('[data-temp-adjust]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const delta = parseFloat(e.currentTarget.getAttribute('data-temp-adjust'));
      const tempInput = document.getElementById('logTemperatureInput');
      if (tempInput) {
        const cur = parseFloat(tempInput.value) || 0;
        tempInput.value = (cur + delta).toFixed(1);
        updateTemperaturePreview();
      }
    });
  });

  document.querySelectorAll('[data-temp-preset]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const val = e.currentTarget.getAttribute('data-temp-preset');
      const tempInput = document.getElementById('logTemperatureInput');
      if (tempInput) {
        tempInput.value = val;
        updateTemperaturePreview();
      }
    });
  });

  document.querySelectorAll('[data-note-preset]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const note = e.currentTarget.getAttribute('data-note-preset');
      const notesInput = document.getElementById('logNotesInput');
      if (notesInput) {
        notesInput.value = note;
      }
    });
  });

  document.getElementById('logTemperatureInput')?.addEventListener('input', updateTemperaturePreview);
  document.getElementById('logFreezerSelect')?.addEventListener('change', updateTemperaturePreview);

  document.getElementById('quickLogForm')?.addEventListener('submit', handleQuickLogSubmit);

  // History Filters
  document.getElementById('filterMonth')?.addEventListener('change', (e) => {
    AppState.historyFilters.month = e.target.value;
    AppState.historyPage = 1;
    refreshHistoryTable();
  });

  document.getElementById('filterDate')?.addEventListener('change', (e) => {
    AppState.historyFilters.date = e.target.value;
    AppState.historyPage = 1;
    refreshHistoryTable();
  });

  document.getElementById('filterFreezer')?.addEventListener('change', (e) => {
    AppState.historyFilters.freezerId = e.target.value;
    AppState.historyPage = 1;
    refreshHistoryTable();
  });

  document.getElementById('filterStaff')?.addEventListener('change', (e) => {
    AppState.historyFilters.staffId = e.target.value;
    AppState.historyPage = 1;
    refreshHistoryTable();
  });

  document.getElementById('filterSlot')?.addEventListener('change', (e) => {
    AppState.historyFilters.slotId = e.target.value;
    AppState.historyPage = 1;
    refreshHistoryTable();
  });

  document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    AppState.historyFilters.status = e.target.value;
    AppState.historyPage = 1;
    refreshHistoryTable();
  });

  document.getElementById('btnResetFilters')?.addEventListener('click', () => {
    AppState.historyFilters = {
      month: new Date().toISOString().slice(0, 7),
      date: '',
      freezerId: '',
      staffId: '',
      slotId: '',
      status: ''
    };
    const fMonth = document.getElementById('filterMonth');
    const fDate = document.getElementById('filterDate');
    const fFreezer = document.getElementById('filterFreezer');
    const fStaff = document.getElementById('filterStaff');
    const fSlot = document.getElementById('filterSlot');
    const fStatus = document.getElementById('filterStatus');

    if (fMonth) fMonth.value = AppState.historyFilters.month;
    if (fDate) fDate.value = '';
    if (fFreezer) fFreezer.value = '';
    if (fStaff) fStaff.value = '';
    if (fSlot) fSlot.value = '';
    if (fStatus) fStatus.value = '';

    AppState.historyPage = 1;
    refreshHistoryTable();
  });

  document.getElementById('btnExportCSV')?.addEventListener('click', exportFilteredLogsToCSV);

  document.getElementById('chartFreezerSelect')?.addEventListener('change', (e) => {
    renderTemperatureTrendChart(e.target.value);
  });
}

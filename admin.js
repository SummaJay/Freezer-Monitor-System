/**
 * Perera & Sons Freezer Monitoring System (PFMS)
 * Admin Portal Management Logic (admin.js)
 * Includes User Accounts, Password Reset, Multi-Theme Customizer & Missed Check Reasons
 */

// Admin Portal State
const AdminState = {
  isAuthenticated: false,
  currentUser: null,
  activeTab: 'overview',
  freezers: [],
  staff: [],
  slots: [],
  users: [],
  missedChecksDate: formatDateKey(new Date()),
  reportFilters: {
    month: new Date().toISOString().slice(0, 7),
    date: '',
    freezerId: '',
    staffId: '',
    slotId: '',
    status: ''
  },
  reportPage: 1,
  reportPageSize: 20
};

// Target Credentials (Fallback & Primary)
const ADMIN_CREDENTIALS = {
  username: 'Admin',
  password: 'Summa@1993'
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  applyStoredTheme();
  await initDatabase();
  checkAuthSession();
  initAdminEventListeners();

  if (AdminState.isAuthenticated) {
    await loadAdminDashboard();
  }
});

function checkAuthSession() {
  const token = sessionStorage.getItem('pfms_admin_auth');
  const user = sessionStorage.getItem('pfms_admin_user');

  if (token === 'AUTHORIZED_PFMS_1902' && user) {
    AdminState.isAuthenticated = true;
    AdminState.currentUser = user;
    showAdminDashboardUI();
  } else {
    showLoginModal();
  }
}

async function handleLogin(e) {
  if (e) e.preventDefault();

  const userField = document.getElementById('adminUsername');
  const passField = document.getElementById('adminPassword');
  const errorAlert = document.getElementById('loginErrorAlert');

  const username = userField ? userField.value.trim() : '';
  const password = passField ? passField.value.trim() : '';

  if (errorAlert) errorAlert.classList.add('hidden');

  let isAuth = (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password);

  if (!isAuth) {
    const authRes = await authenticateUser(username, password, 'admin');
    if (authRes.success) {
      isAuth = true;
    }
  }

  if (isAuth) {
    sessionStorage.setItem('pfms_admin_auth', 'AUTHORIZED_PFMS_1902');
    sessionStorage.setItem('pfms_admin_user', username);

    AdminState.isAuthenticated = true;
    AdminState.currentUser = username;

    showAdminDashboardUI();
    await loadAdminDashboard();
    showToast('Welcome to Perera & Sons Admin Portal!', 'success');
  } else {
    if (errorAlert) {
      errorAlert.classList.remove('hidden');
      errorAlert.textContent = 'Invalid Admin credentials. Please check your username and password.';
    }
    if (passField) {
      passField.value = '';
      passField.focus();
    }
  }
}

function handleLogout() {
  sessionStorage.removeItem('pfms_admin_auth');
  sessionStorage.removeItem('pfms_admin_user');
  AdminState.isAuthenticated = false;
  AdminState.currentUser = null;
  window.location.reload();
}

function showLoginModal() {
  document.getElementById('loginScreen')?.classList.remove('hidden');
  document.getElementById('adminMainLayout')?.classList.add('hidden');
}

function showAdminDashboardUI() {
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('adminMainLayout')?.classList.remove('hidden');
  const userLabel = document.getElementById('adminUserBadge');
  if (userLabel) userLabel.textContent = (AdminState.currentUser || 'Admin').substring(0, 1).toUpperCase();
}

async function loadAdminDashboard() {
  AdminState.freezers = await db.freezers.orderBy('freezerId').toArray();
  AdminState.staff = await db.staff.toArray();
  AdminState.slots = await db.timeSlots.orderBy('sortOrder').toArray();
  AdminState.users = await db.users.toArray();

  syncThemeSelectorUI();
  populateAdminFilterDropdowns();
  await refreshOverviewTab();
  await refreshFreezersTable();
  await refreshStaffTable();
  await refreshSlotsTable();
  await refreshUsersTable();
  await refreshMissedChecksView();
  await refreshReportTable();
}

function syncThemeSelectorUI() {
  const currentTheme = getActiveTheme();
  const themeSelect = document.getElementById('adminThemeSelect');
  if (themeSelect) themeSelect.value = currentTheme;

  document.querySelectorAll('[data-theme-choice]').forEach(card => {
    const choice = card.getAttribute('data-theme-choice');
    if (choice === currentTheme) {
      card.classList.add('ring-2', 'ring-sky-500', 'bg-sky-50/50');
    } else {
      card.classList.remove('ring-2', 'ring-sky-500', 'bg-sky-50/50');
    }
  });
}

function populateAdminFilterDropdowns() {
  const rFreezer = document.getElementById('reportFilterFreezer');
  const rStaff = document.getElementById('reportFilterStaff');
  const rSlot = document.getElementById('reportFilterSlot');

  if (rFreezer) {
    rFreezer.innerHTML = '<option value="">All Freezers</option>' +
      AdminState.freezers.map(f => `<option value="${f.freezerId}">${f.freezerId} - ${f.name}</option>`).join('');
  }
  if (rStaff) {
    rStaff.innerHTML = '<option value="">All Staff Members</option>' +
      AdminState.staff.map(s => `<option value="${s.staffId}">${s.name}</option>`).join('');
  }
  if (rSlot) {
    rSlot.innerHTML = '<option value="">All Slots</option>' +
      AdminState.slots.map(s => `<option value="${s.slotId}">${s.name}</option>`).join('');
  }
}

function switchTab(tabName) {
  AdminState.activeTab = tabName;

  document.querySelectorAll('[data-admin-tab]').forEach(btn => {
    const isTarget = btn.getAttribute('data-admin-tab') === tabName;
    if (isTarget) {
      btn.classList.add('dynamic-btn-primary', 'shadow-xs');
      btn.classList.remove('text-slate-600', 'hover:bg-slate-100');
    } else {
      btn.classList.remove('dynamic-btn-primary', 'shadow-xs');
      btn.classList.add('text-slate-600', 'hover:bg-slate-100');
    }
  });

  document.querySelectorAll('.tab-content-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const activePanel = document.getElementById(`panel-${tabName}`);
  if (activePanel) {
    activePanel.classList.remove('hidden');
  }

  if (tabName === 'overview') refreshOverviewTab();
  if (tabName === 'freezers') refreshFreezersTable();
  if (tabName === 'staff') refreshStaffTable();
  if (tabName === 'slots') refreshSlotsTable();
  if (tabName === 'users') refreshUsersTable();
  if (tabName === 'missed') refreshMissedChecksView();
  if (tabName === 'reports') refreshReportTable();
}

async function refreshOverviewTab() {
  const totalFreezers = AdminState.freezers.length;
  const activeFreezers = AdminState.freezers.filter(f => f.status === 'active').length;
  const totalStaff = AdminState.staff.length;
  const activeStaff = AdminState.staff.filter(s => s.status === 'active').length;

  const todayStr = formatDateKey();
  const todayLogs = await db.logs.where('date').equals(todayStr).toArray();
  const totalPossibleToday = activeFreezers * AdminState.slots.filter(s => s.status === 'active').length;
  const todayRate = totalPossibleToday > 0 ? ((todayLogs.length / totalPossibleToday) * 100).toFixed(1) : 0;

  const currentMonthStr = todayStr.slice(0, 7);
  const allLogs = await db.logs.toArray();
  const monthlyLogs = allLogs.filter(l => l.date.startsWith(currentMonthStr));
  const criticalMonthly = monthlyLogs.filter(l => l.status === 'critical').length;

  const elF = document.getElementById('ovTotalFreezers');
  const elS = document.getElementById('ovTotalStaff');
  const elR = document.getElementById('ovTodayRate');
  const elC = document.getElementById('ovCriticalMonthly');
  const elL = document.getElementById('ovTotalLogs');

  if (elF) elF.textContent = `${activeFreezers} / ${totalFreezers}`;
  if (elS) elS.textContent = `${activeStaff} Active`;
  if (elR) elR.textContent = `${todayRate}%`;
  if (elC) elC.textContent = criticalMonthly;
  if (elL) elL.textContent = allLogs.length;

  const auditLogs = await db.auditLogs.orderBy('timestamp').reverse().limit(10).toArray();
  const auditContainer = document.getElementById('recentAuditList');
  if (auditContainer) {
    if (auditLogs.length === 0) {
      auditContainer.innerHTML = '<p class="text-xs text-slate-400 py-3">No system activities recorded yet.</p>';
    } else {
      auditContainer.innerHTML = auditLogs.map(a => `
        <div class="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0 text-xs">
          <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
            <i class="fa-solid fa-bolt text-sky-600"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-800">${a.action}</span>
              <span class="text-[10px] text-slate-400 font-mono">${a.timestamp}</span>
            </div>
            <p class="text-slate-600 mt-0.5">${a.details}</p>
            <span class="text-[10px] text-slate-400 font-medium">User: ${a.user || 'Admin'}</span>
          </div>
        </div>
      `).join('');
    }
  }
}

/**
 * ========================================================
 * USER ACCOUNTS & PASSWORD MANAGEMENT MODULE
 * ========================================================
 */
async function refreshUsersTable() {
  const container = document.getElementById('adminUsersTableBody');
  if (!container) return;

  const users = await db.users.toArray();
  AdminState.users = users;

  const countBadge = document.getElementById('adminUsersCountBadge');
  if (countBadge) countBadge.textContent = `${users.length} Registered Accounts`;

  if (users.length === 0) {
    container.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">No user accounts found.</td></tr>';
    return;
  }

  container.innerHTML = users.map(u => {
    const isGayani = u.username.toLowerCase().includes('gayani');
    const roleBadge = u.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-sky-100 text-sky-800 border-sky-200';

    return `
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors text-xs ${isGayani ? 'bg-amber-50/20' : ''}">
        <td class="px-4 py-3 font-mono font-bold text-slate-800">#${u.id}</td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full dynamic-btn-primary text-white font-bold flex items-center justify-center text-xs">
              ${u.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-slate-900 flex items-center gap-1.5">
                ${u.username}
                ${isGayani ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">STAFF PORTAL</span>' : ''}
              </div>
              <div class="text-[11px] text-slate-500">${u.fullName || ''}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleBadge}">
            ${u.role}
          </span>
        </td>
        <td class="px-4 py-3 font-mono text-slate-600 text-[11px]">${u.phone || '-'}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">
            ${(u.status || 'active').toUpperCase()}
          </span>
        </td>
        <td class="px-4 py-3 font-mono text-slate-500 text-[10px]">${u.lastLogin || 'Never'}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button onclick="openResetPasswordModal('${u.username}')" class="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold mr-1.5 transition-colors" title="Reset user password">
            <i class="fa-solid fa-key text-[10px] mr-1"></i> Reset Pass
          </button>
          <button onclick="deleteUserHandler(${u.id}, '${u.username}')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition-colors" ${u.username === 'Admin' ? 'disabled title="Cannot delete primary admin"' : ''}>
            <i class="fa-solid fa-trash text-[10px] mr-1"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateUserModal() {
  document.getElementById('modalUserTitle').textContent = 'Create New Account';
  document.getElementById('userFormUsername').value = '';
  document.getElementById('userFormFullName').value = '';
  document.getElementById('userFormRole').value = 'staff';
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userFormPhone').value = '';

  document.getElementById('userModal').classList.remove('hidden');
  document.getElementById('userModal').classList.add('flex');
}

function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
  document.getElementById('userModal').classList.remove('flex');
}

async function handleCreateUserSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('userFormUsername').value.trim();
  const fullName = document.getElementById('userFormFullName').value.trim();
  const role = document.getElementById('userFormRole').value;
  const password = document.getElementById('userFormPassword').value.trim();
  const phone = document.getElementById('userFormPhone').value.trim();

  const res = await createUserAccount({ username, fullName, role, password, phone });

  if (res.success) {
    showToast(res.message, 'success');
    closeUserModal();
    await refreshUsersTable();
  } else {
    showToast(res.message, 'error');
  }
}

function openResetPasswordModal(username) {
  document.getElementById('adminResetUsername').value = username;
  document.getElementById('adminResetNewPass').value = '';
  document.getElementById('adminResetModal').classList.remove('hidden');
  document.getElementById('adminResetModal').classList.add('flex');
}

function closeResetPasswordModal() {
  document.getElementById('adminResetModal').classList.add('hidden');
  document.getElementById('adminResetModal').classList.remove('flex');
}

async function handleAdminResetPasswordSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('adminResetUsername').value;
  const newPass = document.getElementById('adminResetNewPass').value.trim();

  const res = await resetUserPassword(username, newPass);

  if (res.success) {
    showToast(`Password for ${username} reset successfully!`, 'success');
    closeResetPasswordModal();
  } else {
    showToast(res.message, 'error');
  }
}

async function deleteUserHandler(id, username) {
  if (username === 'Admin') {
    showToast('Cannot delete primary Admin account!', 'warning');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete user account "${username}"?`);
  if (!confirmed) return;

  await db.users.delete(id);
  await db.auditLogs.add({
    timestamp: formatTimestamp(),
    action: 'DELETE_USER',
    details: `Deleted user account: ${username}`,
    user: 'Admin'
  });

  showToast(`Account ${username} deleted.`, 'info');
  await refreshUsersTable();
}

/**
 * ========================================================
 * FREEZER MANAGEMENT MODULE
 * ========================================================
 */
async function refreshFreezersTable() {
  const container = document.getElementById('adminFreezerTableBody');
  if (!container) return;

  const search = document.getElementById('adminFreezerSearch')?.value.toLowerCase() || '';
  let freezers = await db.freezers.orderBy('freezerId').toArray();

  if (search.trim()) {
    freezers = freezers.filter(f =>
      f.freezerId.toLowerCase().includes(search) ||
      f.name.toLowerCase().includes(search) ||
      f.location.toLowerCase().includes(search) ||
      f.zone.toLowerCase().includes(search)
    );
  }

  const countBadge = document.getElementById('adminFreezerCountBadge');
  if (countBadge) countBadge.textContent = `${freezers.length} Freezers`;

  if (freezers.length === 0) {
    container.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">No freezers found.</td></tr>';
    return;
  }

  container.innerHTML = freezers.map(f => `
    <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors text-xs">
      <td class="px-4 py-3 font-mono font-bold text-slate-800">${f.freezerId}</td>
      <td class="px-4 py-3">
        <div class="font-bold text-slate-900">${f.name}</div>
        <div class="text-[11px] text-slate-500">${f.location}</div>
      </td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">${f.zone}</span>
      </td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="font-mono font-semibold text-slate-700">${f.targetMin}°C to ${f.targetMax}°C</span>
        <span class="block text-[10px] text-slate-400 uppercase font-bold">${f.type.replace('_', ' ')}</span>
      </td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${f.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">
          ${f.status.toUpperCase()}
        </span>
      </td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button onclick="openEditFreezerModal('${f.freezerId}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold mr-1.5 transition-colors">
          <i class="fa-solid fa-pen text-[10px] mr-1"></i> Edit
        </button>
        <button onclick="deleteFreezerHandler('${f.freezerId}')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition-colors">
          <i class="fa-solid fa-trash text-[10px] mr-1"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

function openAddFreezerModal() {
  document.getElementById('modalFreezerTitle').textContent = 'Add New Freezer Unit';
  document.getElementById('freezerEditMode').value = 'add';
  document.getElementById('freezerFormId').value = '';

  const nextNum = AdminState.freezers.length + 1;
  const padNum = String(nextNum).padStart(2, '0');
  document.getElementById('freezerFormCode').value = `FRZ-${padNum}`;
  document.getElementById('freezerFormName').value = `Freezer #${padNum}`;
  document.getElementById('freezerFormLocation').value = '';
  document.getElementById('freezerFormZone').value = 'Zone A - Pastry & Bakery';
  document.getElementById('freezerFormType').value = 'deep_freezer';
  document.getElementById('freezerFormMin').value = '-22';
  document.getElementById('freezerFormMax').value = '-18';
  document.getElementById('freezerFormStatus').value = 'active';

  document.getElementById('freezerModal').classList.remove('hidden');
  document.getElementById('freezerModal').classList.add('flex');
}

async function openEditFreezerModal(freezerId) {
  const f = AdminState.freezers.find(x => x.freezerId === freezerId);
  if (!f) return;

  document.getElementById('modalFreezerTitle').textContent = `Edit Freezer: ${f.freezerId}`;
  document.getElementById('freezerEditMode').value = 'edit';
  document.getElementById('freezerFormId').value = f.id;
  document.getElementById('freezerFormCode').value = f.freezerId;
  document.getElementById('freezerFormName').value = f.name;
  document.getElementById('freezerFormLocation').value = f.location;
  document.getElementById('freezerFormZone').value = f.zone;
  document.getElementById('freezerFormType').value = f.type;
  document.getElementById('freezerFormMin').value = f.targetMin;
  document.getElementById('freezerFormMax').value = f.targetMax;
  document.getElementById('freezerFormStatus').value = f.status;

  document.getElementById('freezerModal').classList.remove('hidden');
  document.getElementById('freezerModal').classList.add('flex');
}

function closeFreezerModal() {
  document.getElementById('freezerModal').classList.add('hidden');
  document.getElementById('freezerModal').classList.remove('flex');
}

async function handleFreezerFormSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById('freezerEditMode').value;
  const id = parseInt(document.getElementById('freezerFormId').value, 10);
  const freezerId = document.getElementById('freezerFormCode').value.trim();
  const name = document.getElementById('freezerFormName').value.trim();
  const location = document.getElementById('freezerFormLocation').value.trim();
  const zone = document.getElementById('freezerFormZone').value;
  const type = document.getElementById('freezerFormType').value;
  const targetMin = parseFloat(document.getElementById('freezerFormMin').value);
  const targetMax = parseFloat(document.getElementById('freezerFormMax').value);
  const status = document.getElementById('freezerFormStatus').value;

  if (targetMin >= targetMax) {
    showToast('Target Min temperature must be lower than Max temperature.', 'warning');
    return;
  }

  const freezerData = { freezerId, name, location, zone, type, targetMin, targetMax, status };

  if (mode === 'add') {
    const exists = await db.freezers.where('freezerId').equals(freezerId).first();
    if (exists) {
      showToast(`Freezer ID ${freezerId} already exists!`, 'error');
      return;
    }
    await db.freezers.add(freezerData);
    await db.auditLogs.add({
      timestamp: formatTimestamp(),
      action: 'ADD_FREEZER',
      details: `Added new freezer ${freezerId} - ${name} (${location})`,
      user: 'Admin'
    });
    showToast(`Added freezer ${freezerId} successfully!`, 'success');
  } else {
    await db.freezers.update(id, freezerData);
    await db.auditLogs.add({
      timestamp: formatTimestamp(),
      action: 'UPDATE_FREEZER',
      details: `Updated freezer ${freezerId} details`,
      user: 'Admin'
    });
    showToast(`Updated freezer ${freezerId} successfully!`, 'success');
  }

  closeFreezerModal();
  await loadAdminDashboard();
}

async function deleteFreezerHandler(freezerId) {
  const confirmed = confirm(`Are you sure you want to delete ${freezerId}?`);
  if (!confirmed) return;

  const f = await db.freezers.where('freezerId').equals(freezerId).first();
  if (f) {
    await db.freezers.delete(f.id);
    await db.auditLogs.add({
      timestamp: formatTimestamp(),
      action: 'DELETE_FREEZER',
      details: `Deleted freezer ${freezerId} (${f.name})`,
      user: 'Admin'
    });
    showToast(`Deleted ${freezerId} from registry.`, 'info');
    await loadAdminDashboard();
  }
}

async function resetFreezersToDefault() {
  const confirmed = confirm('Reset all Freezers to default 64 Perera & Sons bakery units?');
  if (!confirmed) return;

  await db.freezers.clear();
  await db.freezers.bulkAdd(DEFAULT_FREEZERS);
  await db.auditLogs.add({
    timestamp: formatTimestamp(),
    action: 'RESET_FREEZERS_DEFAULT',
    details: 'Reset freezer registry to standard 64 units pool.',
    user: 'Admin'
  });

  showToast('Reset to default 64 freezers completed.', 'success');
  await loadAdminDashboard();
}

/**
 * ========================================================
 * STAFF MANAGEMENT MODULE
 * ========================================================
 */
async function refreshStaffTable() {
  const container = document.getElementById('adminStaffTableBody');
  if (!container) return;

  const staffList = await db.staff.toArray();
  const countBadge = document.getElementById('adminStaffCountBadge');
  if (countBadge) countBadge.textContent = `${staffList.length} Staff Members`;

  if (staffList.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400">No staff members found.</td></tr>';
    return;
  }

  container.innerHTML = staffList.map(s => `
    <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors text-xs">
      <td class="px-4 py-3 font-mono font-bold text-slate-800">${s.staffId}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full dynamic-btn-primary text-white font-bold flex items-center justify-center text-xs">
            ${s.name.charAt(0)}
          </div>
          <div>
            <div class="font-bold text-slate-900">${s.name}</div>
            <div class="text-[11px] text-slate-400">${s.phone || 'No phone'}</div>
          </div>
        </div>
      </td>
      <td class="px-4 py-3 text-slate-700">${s.role || 'Staff Member'}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">
          ${s.status.toUpperCase()}
        </span>
      </td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button onclick="openEditStaffModal('${s.staffId}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold mr-1.5 transition-colors">
          <i class="fa-solid fa-pen text-[10px] mr-1"></i> Edit
        </button>
        <button onclick="deleteStaffHandler('${s.staffId}')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition-colors">
          <i class="fa-solid fa-trash text-[10px] mr-1"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

function openAddStaffModal() {
  document.getElementById('modalStaffTitle').textContent = 'Add Checking Boy / Staff Member';
  document.getElementById('staffEditMode').value = 'add';
  document.getElementById('staffFormId').value = '';

  const nextNum = AdminState.staff.length + 1;
  const padNum = String(nextNum).padStart(2, '0');
  document.getElementById('staffFormCode').value = `STF-${padNum}`;
  document.getElementById('staffFormName').value = '';
  document.getElementById('staffFormPhone').value = '+94 77 ';
  document.getElementById('staffFormRole').value = 'Quality Checker';
  document.getElementById('staffFormStatus').value = 'active';

  document.getElementById('staffModal').classList.remove('hidden');
  document.getElementById('staffModal').classList.add('flex');
}

async function openEditStaffModal(staffId) {
  const s = AdminState.staff.find(x => x.staffId === staffId);
  if (!s) return;

  document.getElementById('modalStaffTitle').textContent = `Edit Staff: ${s.name} (${s.staffId})`;
  document.getElementById('staffEditMode').value = 'edit';
  document.getElementById('staffFormId').value = s.id;
  document.getElementById('staffFormCode').value = s.staffId;
  document.getElementById('staffFormName').value = s.name;
  document.getElementById('staffFormPhone').value = s.phone || '';
  document.getElementById('staffFormRole').value = s.role || 'Staff';
  document.getElementById('staffFormStatus').value = s.status || 'active';

  document.getElementById('staffModal').classList.remove('hidden');
  document.getElementById('staffModal').classList.add('flex');
}

function closeStaffModal() {
  document.getElementById('staffModal').classList.add('hidden');
  document.getElementById('staffModal').classList.remove('flex');
}

async function handleStaffFormSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById('staffEditMode').value;
  const id = parseInt(document.getElementById('staffFormId').value, 10);
  const staffId = document.getElementById('staffFormCode').value.trim();
  const name = document.getElementById('staffFormName').value.trim();
  const phone = document.getElementById('staffFormPhone').value.trim();
  const role = document.getElementById('staffFormRole').value.trim();
  const status = document.getElementById('staffFormStatus').value;

  const staffData = { staffId, name, phone, role, status };

  if (mode === 'add') {
    const exists = await db.staff.where('staffId').equals(staffId).first();
    if (exists) {
      showToast(`Staff ID ${staffId} already exists!`, 'error');
      return;
    }
    await db.staff.add(staffData);
    showToast(`Added staff member ${name} successfully!`, 'success');
  } else {
    await db.staff.update(id, staffData);
    showToast(`Updated staff member ${name} successfully!`, 'success');
  }

  closeStaffModal();
  await loadAdminDashboard();
}

async function deleteStaffHandler(staffId) {
  const confirmed = confirm(`Are you sure you want to remove ${staffId}?`);
  if (!confirmed) return;

  const s = await db.staff.where('staffId').equals(staffId).first();
  if (s) {
    await db.staff.delete(s.id);
    showToast(`Removed staff member ${s.name}.`, 'info');
    await loadAdminDashboard();
  }
}

async function resetStaffToDefault() {
  const confirmed = confirm('Reset staff registry to default Perera & Sons checking boys?');
  if (!confirmed) return;

  await db.staff.clear();
  await db.staff.bulkAdd(DEFAULT_STAFF);
  showToast('Reset to default staff members completed.', 'success');
  await loadAdminDashboard();
}

/**
 * ========================================================
 * TIME SLOT CONFIGURATION MODULE
 * ========================================================
 */
async function refreshSlotsTable() {
  const container = document.getElementById('adminSlotsTableBody');
  if (!container) return;

  const slots = await db.timeSlots.orderBy('sortOrder').toArray();

  container.innerHTML = slots.map(s => `
    <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors text-xs">
      <td class="px-4 py-3 font-mono font-bold text-slate-800">${s.slotId}</td>
      <td class="px-4 py-3 font-bold text-slate-900">${s.name}</td>
      <td class="px-4 py-3 font-mono text-slate-700">${s.timeWindow}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">
          ${s.status.toUpperCase()}
        </span>
      </td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button onclick="openEditSlotModal('${s.slotId}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors">
          <i class="fa-solid fa-pen text-[10px] mr-1"></i> Configure
        </button>
      </td>
    </tr>
  `).join('');
}

async function openEditSlotModal(slotId) {
  const s = AdminState.slots.find(x => x.slotId === slotId);
  if (!s) return;

  document.getElementById('slotFormId').value = s.id;
  document.getElementById('slotFormCode').value = s.slotId;
  document.getElementById('slotFormName').value = s.name;
  document.getElementById('slotFormWindow').value = s.timeWindow;
  document.getElementById('slotFormStart').value = s.startHour || 6;
  document.getElementById('slotFormEnd').value = s.endHour || 8;
  document.getElementById('slotFormStatus').value = s.status || 'active';

  document.getElementById('slotModal').classList.remove('hidden');
  document.getElementById('slotModal').classList.add('flex');
}

function closeSlotModal() {
  document.getElementById('slotModal').classList.add('hidden');
  document.getElementById('slotModal').classList.remove('flex');
}

async function handleSlotFormSubmit(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('slotFormId').value, 10);
  const name = document.getElementById('slotFormName').value.trim();
  const timeWindow = document.getElementById('slotFormWindow').value.trim();
  const startHour = parseInt(document.getElementById('slotFormStart').value, 10);
  const endHour = parseInt(document.getElementById('slotFormEnd').value, 10);
  const status = document.getElementById('slotFormStatus').value;

  await db.timeSlots.update(id, { name, timeWindow, startHour, endHour, status });
  showToast(`Updated slot ${name} successfully!`, 'success');
  closeSlotModal();
  await loadAdminDashboard();
}

/**
 * ========================================================
 * MISSED CHECKS MONITORING MODULE (With Reasons Support)
 * ========================================================
 */
async function refreshMissedChecksView() {
  const container = document.getElementById('missedChecksTableBody');
  const countBadge = document.getElementById('missedCountBadge');
  if (!container) return;

  const datePicker = document.getElementById('missedDatePicker');
  const targetDate = datePicker ? datePicker.value : AdminState.missedChecksDate;
  AdminState.missedChecksDate = targetDate;

  const missedList = await getMissedChecks(targetDate);

  if (countBadge) {
    countBadge.textContent = `${missedList.length} Pending / Missed Checks`;
    countBadge.className = missedList.length > 0
      ? 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800'
      : 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
  }

  if (missedList.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-emerald-600 bg-emerald-50/20">
          <i class="fa-solid fa-circle-check text-4xl mb-2 text-emerald-500"></i>
          <p class="text-base font-bold text-slate-800">100% Complete! No Missed Checks.</p>
          <p class="text-xs text-slate-500 mt-1">All 64 Freezers were checked for all 4 time slots on ${targetDate}.</p>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = missedList.map(m => `
    <tr class="hover:bg-red-50/30 border-b border-slate-100 transition-colors text-xs">
      <td class="px-4 py-3 font-mono font-bold text-slate-800">${m.freezerId}</td>
      <td class="px-4 py-3">
        <div class="font-bold text-slate-900">${m.freezerName}</div>
        <div class="text-[11px] text-slate-500">${m.location}</div>
      </td>
      <td class="px-4 py-3 text-slate-600">${m.zone}</td>
      <td class="px-4 py-3">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800">
          <i class="fa-regular fa-clock text-amber-600"></i> ${m.slotName} (${m.timeWindow})
        </span>
      </td>
      
      <!-- Reason / Observation Column -->
      <td class="px-4 py-3">
        ${m.reasonNote ? `
          <div class="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div class="font-semibold flex items-center gap-1">
              <i class="fa-solid fa-note-sticky text-amber-600 text-[10px]"></i> ${m.reasonNote.note}
            </div>
            <span class="text-[9px] text-amber-700/80 font-mono block mt-0.5">By ${m.reasonNote.author} • ${m.reasonNote.timestamp ? m.reasonNote.timestamp.split(' ')[1] : ''}</span>
          </div>
        ` : `
          <button onclick="promptAddReasonFromAdmin('${m.freezerId}', '${targetDate}')" class="text-xs text-amber-700 hover:text-amber-900 font-semibold px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200">
            <i class="fa-regular fa-comment-dots mr-1"></i> + Add Reason
          </button>
        `}
      </td>

      <td class="px-4 py-3 text-right">
        <button onclick="quickLogFromAdmin('${m.freezerId}', '${m.slotId}', '${targetDate}')" class="px-3 py-1 rounded-lg dynamic-btn-primary font-bold text-xs shadow-xs transition-colors">
          <i class="fa-solid fa-plus mr-1"></i> Log Now
        </button>
      </td>
    </tr>
  `).join('');
}

async function promptAddReasonFromAdmin(freezerId, dateStr) {
  const reason = prompt(`Enter reason why ${freezerId} was not monitored on ${dateStr}:`, 'Routine Defrost Cycle Active');
  if (!reason || !reason.trim()) return;

  await saveDailyNote(dateStr, freezerId, reason.trim(), AdminState.currentUser || 'Admin');
  showToast(`Reason saved for ${freezerId}!`, 'success');
  await refreshMissedChecksView();
}

async function quickLogFromAdmin(freezerId, slotId, dateStr) {
  const staff = AdminState.staff[0];
  const f = AdminState.freezers.find(x => x.freezerId === freezerId);
  const slot = AdminState.slots.find(x => x.slotId === slotId);

  const defaultTemp = f.type === 'chiller' ? 2.5 : -19.5;
  const tempInput = prompt(`Enter temperature (°C) for ${freezerId} [${slot.name}] on ${dateStr}:`, defaultTemp);

  if (tempInput === null) return;
  const temp = parseFloat(tempInput);
  if (isNaN(temp)) {
    alert('Invalid temperature value entered.');
    return;
  }

  const status = evaluateTemperatureStatus(temp, f);

  await recordTemperatureCheck({
    date: dateStr,
    timestamp: `${dateStr} 12:00:00`,
    freezerId: f.freezerId,
    freezerName: f.name,
    location: f.location,
    staffId: staff.staffId,
    staffName: staff.name,
    slotId: slot.slotId,
    slotName: slot.name,
    temperature: temp,
    status: status,
    notes: 'Logged via Admin Missed Checks Resolver'
  }, true);

  showToast(`Recorded ${freezerId} check (${temp}°C) successfully!`, 'success');
  await refreshMissedChecksView();
  await refreshOverviewTab();
}

/**
 * ========================================================
 * MASTER REPORT & EXPORT AUDIT LOGS MODULE
 * ========================================================
 */
async function refreshReportTable() {
  const container = document.getElementById('reportTableBody');
  const paginationInfo = document.getElementById('reportPaginationInfo');
  const paginationControls = document.getElementById('reportPaginationControls');
  if (!container) return;

  const f = AdminState.reportFilters;
  let logs = await db.logs.orderBy('timestamp').reverse().toArray();

  if (f.month) logs = logs.filter(l => l.date.startsWith(f.month));
  if (f.date) logs = logs.filter(l => l.date === f.date);
  if (f.freezerId) logs = logs.filter(l => l.freezerId === f.freezerId);
  if (f.staffId) logs = logs.filter(l => l.staffId === f.staffId);
  if (f.slotId) logs = logs.filter(l => l.slotId === f.slotId);
  if (f.status) logs = logs.filter(l => l.status === f.status);

  const totalRecords = logs.length;
  const totalPages = Math.ceil(totalRecords / AdminState.reportPageSize) || 1;
  if (AdminState.reportPage > totalPages) AdminState.reportPage = 1;

  const startIndex = (AdminState.reportPage - 1) * AdminState.reportPageSize;
  const pageLogs = logs.slice(startIndex, startIndex + AdminState.reportPageSize);

  if (pageLogs.length === 0) {
    container.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-slate-400">No log records found matching filters.</td></tr>';
    if (paginationInfo) paginationInfo.textContent = 'Showing 0 records';
    if (paginationControls) paginationControls.innerHTML = '';
    return;
  }

  container.innerHTML = pageLogs.map(l => {
    const badgeClass = l.status === 'critical' ? 'badge-critical' : (l.status === 'warning' ? 'badge-warning' : 'badge-normal');
    return `
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors text-xs">
        <td class="px-4 py-2.5 font-mono text-slate-700">${l.timestamp}</td>
        <td class="px-4 py-2.5 font-bold text-slate-800">${l.freezerId}: ${l.freezerName}</td>
        <td class="px-4 py-2.5 text-slate-600">${l.slotName}</td>
        <td class="px-4 py-2.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold ${badgeClass}">
            ${l.temperature}°C
          </span>
        </td>
        <td class="px-4 py-2.5 text-slate-800 font-semibold">${l.staffName}</td>
        <td class="px-4 py-2.5 text-slate-500 truncate max-w-xs">${l.notes || 'Routine check'}</td>
        <td class="px-4 py-2.5 text-right whitespace-nowrap">
          <button onclick="deleteLogEntry(${l.id})" class="text-red-600 hover:text-red-800 font-medium text-xs">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${startIndex + 1} to ${Math.min(startIndex + AdminState.reportPageSize, totalRecords)} of ${totalRecords} records`;
  }

  if (paginationControls) {
    paginationControls.innerHTML = `
      <button onclick="changeReportPage(-1)" ${AdminState.reportPage <= 1 ? 'disabled class="px-2.5 py-1 rounded bg-slate-100 text-slate-300 text-xs"' : 'class="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"'}>
        Prev
      </button>
      <span class="px-2.5 py-1 text-xs font-bold text-slate-600">Page ${AdminState.reportPage} / ${totalPages}</span>
      <button onclick="changeReportPage(1)" ${AdminState.reportPage >= totalPages ? 'disabled class="px-2.5 py-1 rounded bg-slate-100 text-slate-300 text-xs"' : 'class="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"'}>
        Next
      </button>
    `;
  }
}

function changeReportPage(delta) {
  AdminState.reportPage += delta;
  refreshReportTable();
}

async function deleteLogEntry(id) {
  const confirmed = confirm('Are you sure you want to delete this log entry?');
  if (!confirmed) return;

  await db.logs.delete(id);
  showToast('Log entry removed.', 'info');
  await refreshReportTable();
  await refreshOverviewTab();
}

async function printOfficialAuditReport() {
  const f = AdminState.reportFilters;
  let logs = await db.logs.orderBy('timestamp').toArray();

  if (f.month) logs = logs.filter(l => l.date.startsWith(f.month));
  if (f.date) logs = logs.filter(l => l.date === f.date);
  if (f.freezerId) logs = logs.filter(l => l.freezerId === f.freezerId);
  if (f.staffId) logs = logs.filter(l => l.staffId === f.staffId);
  if (f.slotId) logs = logs.filter(l => l.slotId === f.slotId);
  if (f.status) logs = logs.filter(l => l.status === f.status);

  const printArea = document.getElementById('printableAuditSheet');
  if (!printArea) return;

  const totalLogs = logs.length;
  const normalCount = logs.filter(l => l.status === 'normal').length;
  const warningCount = logs.filter(l => l.status === 'warning').length;
  const criticalCount = logs.filter(l => l.status === 'critical').length;
  const complianceRate = totalLogs > 0 ? ((normalCount / totalLogs) * 100).toFixed(1) : 100;

  printArea.innerHTML = `
    <div class="p-8 max-w-4xl mx-auto font-sans text-slate-900 bg-white">
      <div class="border-b-2 border-slate-800 pb-4 mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight uppercase">Perera & Sons Confectioners (Pvt) Ltd</h1>
          <h2 class="text-sm font-bold text-slate-700 tracking-wide uppercase mt-0.5">Bakery Cold Chain Compliance & Freezer Temperature Audit Report</h2>
          <p class="text-xs text-slate-500 mt-1">Quality Assurance & Food Hygiene Department • ISO 22000 / HACCP Standard</p>
        </div>
        <div class="text-right text-xs">
          <div class="font-bold text-slate-800">Generated: ${formatTimestamp()}</div>
          <div class="text-slate-500">Period: ${f.month || f.date || 'Historical'}</div>
          <div class="text-slate-500">Auditor: Admin Authorized</div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <div>
          <div class="text-[10px] uppercase font-bold text-slate-500">Total Checks Logged</div>
          <div class="text-xl font-bold text-slate-900 font-mono">${totalLogs}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase font-bold text-slate-500">Compliance Rate</div>
          <div class="text-xl font-bold text-emerald-700 font-mono">${complianceRate}%</div>
        </div>
        <div>
          <div class="text-[10px] uppercase font-bold text-slate-500">Warning Variances</div>
          <div class="text-xl font-bold text-amber-600 font-mono">${warningCount}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase font-bold text-slate-500">Critical Alerts</div>
          <div class="text-xl font-bold text-red-700 font-mono">${criticalCount}</div>
        </div>
      </div>

      <table class="w-full text-left border-collapse border border-slate-300 text-xs mb-8">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-300 font-bold text-[10px] uppercase text-slate-700">
            <th class="p-2 border border-slate-300">Timestamp</th>
            <th class="p-2 border border-slate-300">Freezer ID & Location</th>
            <th class="p-2 border border-slate-300">Slot</th>
            <th class="p-2 border border-slate-300 text-center">Temp (°C)</th>
            <th class="p-2 border border-slate-300 text-center">Status</th>
            <th class="p-2 border border-slate-300">Checking Officer</th>
            <th class="p-2 border border-slate-300">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${logs.slice(0, 100).map(l => `
            <tr class="border-b border-slate-200">
              <td class="p-2 border border-slate-300 font-mono text-[10px]">${l.timestamp}</td>
              <td class="p-2 border border-slate-300 font-semibold">${l.freezerId} - ${l.freezerName}</td>
              <td class="p-2 border border-slate-300">${l.slotName}</td>
              <td class="p-2 border border-slate-300 font-mono font-bold text-center">${l.temperature}°C</td>
              <td class="p-2 border border-slate-300 font-bold text-center uppercase text-[10px] ${l.status === 'critical' ? 'text-red-700' : (l.status === 'warning' ? 'text-amber-600' : 'text-emerald-700')}">
                ${l.status}
              </td>
              <td class="p-2 border border-slate-300">${l.staffName}</td>
              <td class="p-2 border border-slate-300 text-slate-500">${l.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-slate-300 text-xs">
        <div>
          <div class="border-b border-dashed border-slate-400 w-48 h-8 mb-2"></div>
          <div class="font-bold text-slate-800">Quality Assurance Officer</div>
          <div class="text-[11px] text-slate-500">Perera & Sons QA & Food Safety</div>
          <div class="text-[10px] text-slate-400 mt-1">Date: ________________________</div>
        </div>
        <div class="text-right flex flex-col items-end">
          <div class="border-b border-dashed border-slate-400 w-48 h-8 mb-2"></div>
          <div class="font-bold text-slate-800">Head Baker / Production Manager</div>
          <div class="text-[11px] text-slate-500">Bakery Operations Directorate</div>
          <div class="text-[10px] text-slate-400 mt-1">Date: ________________________</div>
        </div>
      </div>
    </div>
  `;

  window.print();
}

/**
 * ========================================================
 * DATABASE BACKUP & RESTORE MODULE
 * ========================================================
 */
async function downloadDatabaseBackup() {
  const jsonStr = await exportDatabaseJSON();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PFMS_Database_Backup_${formatDateKey()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Database backup downloaded successfully!', 'success');
}

async function triggerDatabaseRestore(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target.result;
    const result = await importDatabaseJSON(content);
    if (result.success) {
      showToast('Database restored successfully from backup file!', 'success');
      await loadAdminDashboard();
    } else {
      showToast(`Restore failed: ${result.error}`, 'error');
    }
  };
  reader.readAsText(file);
}

async function generateDemoData() {
  const confirmed = confirm('Generate fresh demonstration historical logs for all 64 freezers across past days?');
  if (!confirmed) return;

  await seedSampleLogs();
  showToast('Generated realistic demo data successfully!', 'success');
  await loadAdminDashboard();
}

function showToast(message, type = 'info') {
  const container = document.getElementById('adminToastContainer');
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

  setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Setup Event Listeners for Admin UI
 */
function initAdminEventListeners() {
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('btnLogoutAdmin')?.addEventListener('click', handleLogout);

  document.querySelectorAll('[data-admin-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-admin-tab');
      switchTab(tab);
    });
  });

  const adminThemeSelect = document.getElementById('adminThemeSelect');
  if (adminThemeSelect) {
    adminThemeSelect.value = getActiveTheme();
    adminThemeSelect.addEventListener('change', (e) => {
      const selected = setActiveTheme(e.target.value);
      syncThemeSelectorUI();
      showToast(`System theme updated to "${e.target.options[e.target.selectedIndex].text}"!`, 'success');
    });
  }

  document.querySelectorAll('[data-theme-choice]').forEach(card => {
    card.addEventListener('click', (e) => {
      const choice = e.currentTarget.getAttribute('data-theme-choice');
      setActiveTheme(choice);
      syncThemeSelectorUI();
      showToast(`Applied theme: ${choice}`, 'success');
    });
  });

  document.getElementById('userForm')?.addEventListener('submit', handleCreateUserSubmit);
  document.getElementById('adminResetForm')?.addEventListener('submit', handleAdminResetPasswordSubmit);

  document.getElementById('adminFreezerSearch')?.addEventListener('input', refreshFreezersTable);
  document.getElementById('freezerForm')?.addEventListener('submit', handleFreezerFormSubmit);

  document.getElementById('staffForm')?.addEventListener('submit', handleStaffFormSubmit);
  document.getElementById('slotForm')?.addEventListener('submit', handleSlotFormSubmit);

  const missedDate = document.getElementById('missedDatePicker');
  if (missedDate) {
    missedDate.value = formatDateKey();
    missedDate.addEventListener('change', refreshMissedChecksView);
  }

  document.getElementById('reportFilterMonth')?.addEventListener('change', (e) => {
    AdminState.reportFilters.month = e.target.value;
    AdminState.reportPage = 1;
    refreshReportTable();
  });

  document.getElementById('reportFilterDate')?.addEventListener('change', (e) => {
    AdminState.reportFilters.date = e.target.value;
    AdminState.reportPage = 1;
    refreshReportTable();
  });

  document.getElementById('reportFilterFreezer')?.addEventListener('change', (e) => {
    AdminState.reportFilters.freezerId = e.target.value;
    AdminState.reportPage = 1;
    refreshReportTable();
  });

  document.getElementById('reportFilterStaff')?.addEventListener('change', (e) => {
    AdminState.reportFilters.staffId = e.target.value;
    AdminState.reportPage = 1;
    refreshReportTable();
  });

  document.getElementById('reportFilterSlot')?.addEventListener('change', (e) => {
    AdminState.reportFilters.slotId = e.target.value;
    AdminState.reportPage = 1;
    refreshReportTable();
  });

  document.getElementById('reportFilterStatus')?.addEventListener('change', (e) => {
    AdminState.reportFilters.status = e.target.value;
    AdminState.reportPage = 1;
    refreshReportTable();
  });

  document.getElementById('btnResetReportFilters')?.addEventListener('click', () => {
    AdminState.reportFilters = {
      month: new Date().toISOString().slice(0, 7),
      date: '',
      freezerId: '',
      staffId: '',
      slotId: '',
      status: ''
    };
    document.getElementById('reportFilterMonth').value = AdminState.reportFilters.month;
    document.getElementById('reportFilterDate').value = '';
    document.getElementById('reportFilterFreezer').value = '';
    document.getElementById('reportFilterStaff').value = '';
    document.getElementById('reportFilterSlot').value = '';
    document.getElementById('reportFilterStatus').value = '';
    AdminState.reportPage = 1;
    refreshReportTable();
  });

  document.getElementById('btnPrintAuditReport')?.addEventListener('click', printOfficialAuditReport);
  document.getElementById('btnDownloadBackup')?.addEventListener('click', downloadDatabaseBackup);
  document.getElementById('btnRestoreBackupFile')?.addEventListener('change', (e) => triggerDatabaseRestore(e.target));
  document.getElementById('btnGenerateDemoData')?.addEventListener('click', generateDemoData);
  document.getElementById('btnFactoryReset')?.addEventListener('click', async () => {
    const confirmed = confirm('DANGER: This will wipe all current records and restore factory initial defaults!\nAre you sure you want to proceed?');
    if (confirmed) {
      await resetSystemDefaults();
      showToast('System reset to initial factory state.', 'success');
      await loadAdminDashboard();
    }
  });
}

// ===== APP ROUTER & NAVIGATION =====
const App = {
  currentUser: null,
  currentPage: 'dashboard',

  async init() {
    // Load data from server (falls back to localStorage/seed if offline)
    await DataStore.init();
    this.renderLoginUsers();
    // Check if already logged in (session persistence)
    const savedUserId = sessionStorage.getItem('goalSyncUser');
    if (savedUserId) {
      const user = DataStore.getUser(savedUserId);
      if (user) {
        this.loginAs(user);
        return;
      }
    }
    // Show login page
    this.showLogin();
  },

  // ===== LOGIN =====
  renderLoginUsers() {
    const users = DataStore.getUsers();
    const container = document.getElementById('login-users');
    if (!container) return;
    const roleColors = { employee: 'role-employee', manager: 'role-manager', admin: 'role-admin' };
    const roleLabels = { employee: 'Employee', manager: 'Manager', admin: 'Admin / HR' };
    container.innerHTML = users.map(u => `
      <div class="login-user-card" onclick="App.quickLogin('${u.id}')" id="login-card-${u.id}">
        <div class="avatar">${getInitials(u.name)}</div>
        <div class="user-info">
          <div class="name">${u.name}</div>
          <div class="meta">${u.email} · ${u.department}</div>
        </div>
        <span class="role-badge ${roleColors[u.role]}">${roleLabels[u.role]}</span>
      </div>
    `).join('');
  },

  handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');

    if (!email) {
      errorText.textContent = 'Please enter your email';
      errorEl.classList.add('show');
      return false;
    }

    const user = DataStore.getUsers().find(u => u.email.toLowerCase() === email);
    if (!user) {
      errorText.textContent = 'No account found with this email';
      errorEl.classList.add('show');
      return false;
    }

    // For demo, accept any password
    errorEl.classList.remove('show');
    this.loginAs(user);
    return false;
  },

  quickLogin(userId) {
    const user = DataStore.getUser(userId);
    if (user) this.loginAs(user);
  },

  loginAs(user) {
    this.currentUser = user;
    sessionStorage.setItem('goalSyncUser', user.id);
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    this.renderSidebar();
    this.renderTopbar();
    this.navigate('dashboard');
    showToast(`Welcome, ${user.name}!`, 'success');
  },

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('goalSyncUser');
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    // Clear form
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.classList.remove('show');
    showToast('Logged out successfully', 'info');
  },

  showLogin() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
  },

  // ===== SIDEBAR =====
  renderSidebar() {
    const role = this.currentUser.role;
    const items = [];
    items.push({ id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' });

    if (role === 'employee') {
      items.push({ id: 'my-goals', label: 'My Goals', icon: 'target' });
      items.push({ id: 'achievements', label: 'Achievement Tracking', icon: 'trending-up' });
    }
    if (role === 'manager') {
      items.push({ id: 'team-goals', label: 'Team Goals', icon: 'users' });
      items.push({ id: 'check-ins', label: 'Check-ins', icon: 'message-circle' });
    }
    if (role === 'admin') {
      items.push({ id: 'cycle-mgmt', label: 'Cycle Management', icon: 'calendar' });
      items.push({ id: 'org-hierarchy', label: 'Org Hierarchy', icon: 'git-branch' });
      items.push({ id: 'goal-unlock', label: 'Goal Unlock', icon: 'unlock' });
      items.push({ id: 'audit-logs', label: 'Audit Trail', icon: 'shield' });
    }
    items.push({ section: 'Reports' });
    items.push({ id: 'reports', label: 'Achievement Report', icon: 'file-text' });
    items.push({ id: 'completion', label: 'Completion Dashboard', icon: 'bar-chart-3' });
    items.push({ id: 'analytics', label: 'Analytics', icon: 'pie-chart' });

    const nav = document.getElementById('sidebar-nav');
    let html = '';
    const roleLabel = role === 'employee' ? 'Employee' : role === 'manager' ? 'Manager' : 'Admin / HR';
    html += `<div class="nav-section"><div class="nav-section-title">${roleLabel} Menu</div>`;
    items.forEach(item => {
      if (item.section) { html += `</div><div class="nav-section"><div class="nav-section-title">${item.section}</div>`; return; }
      html += `<div class="nav-item ${this.currentPage === item.id ? 'active' : ''}" data-page="${item.id}" onclick="App.navigate('${item.id}')">${icon(item.icon)} <span>${item.label}</span></div>`;
    });
    html += '</div>';
    nav.innerHTML = html;
    refreshIcons();
  },

  // ===== TOPBAR (with logout instead of role switcher) =====
  renderTopbar() {
    const user = this.currentUser;
    document.getElementById('topbar-title').textContent = this.getPageTitle(this.currentPage);
    const roleLabels = { employee: 'Employee', manager: 'Manager', admin: 'Admin / HR' };
    const roleColors = { employee: 'role-employee', manager: 'role-manager', admin: 'role-admin' };
    document.getElementById('topbar-user').innerHTML = `
      <span class="role-badge ${roleColors[user.role]}" style="padding:5px 12px;font-size:0.72rem">${roleLabels[user.role]}</span>
      <div class="flex gap-8" style="margin-left:4px">
        <div class="avatar">${getInitials(user.name)}</div>
        <div><div class="fs-sm fw-600">${user.name}</div><div class="fs-sm text-muted">${user.department}</div></div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="App.logout()" title="Sign Out" style="margin-left:8px">${icon('log-out', 16)} Sign Out</button>
    `;
    refreshIcons();
  },

  getPageTitle(page) {
    const titles = {
      'dashboard': 'Dashboard', 'my-goals': 'My Goals', 'achievements': 'Achievement Tracking',
      'team-goals': 'Team Goals', 'check-ins': 'Quarterly Check-ins',
      'cycle-mgmt': 'Cycle Management', 'org-hierarchy': 'Organization Hierarchy',
      'goal-unlock': 'Goal Unlock', 'audit-logs': 'Audit Trail',
      'reports': 'Achievement Report', 'completion': 'Completion Dashboard', 'analytics': 'Analytics'
    };
    return titles[page] || 'Dashboard';
  },

  // ===== NAVIGATION =====
  navigate(page) {
    this.currentPage = page;
    document.getElementById('topbar-title').textContent = this.getPageTitle(page);
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    // Reset content with animation
    const content = document.getElementById('content');
    content.style.animation = 'none';
    content.offsetHeight; // reflow
    content.style.animation = 'fadeIn 0.3s ease';

    const role = this.currentUser.role;
    switch (page) {
      case 'dashboard':
        if (role === 'employee') renderEmployeeDashboard();
        else if (role === 'manager') renderManagerDashboard();
        else renderAdminDashboard();
        break;
      case 'my-goals': renderMyGoals(); break;
      case 'achievements': renderAchievementTracking(); break;
      case 'team-goals': renderTeamGoals(); break;
      case 'check-ins': renderCheckIns(); break;
      case 'cycle-mgmt': renderCycleManagement(); break;
      case 'org-hierarchy': renderOrgHierarchy(); break;
      case 'goal-unlock': renderGoalUnlock(); break;
      case 'audit-logs': renderAuditLogs(); break;
      case 'reports': renderReports(); break;
      case 'completion': renderCompletionDashboard(); break;
      case 'analytics': renderAnalytics(); break;
      default:
        if (role === 'employee') renderEmployeeDashboard();
        else if (role === 'manager') renderManagerDashboard();
        else renderAdminDashboard();
    }
    this.renderSidebar();
  },

  handleRoute() {
    const hash = window.location.hash.slice(1);
    if (hash) this.navigate(hash);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

// ===== ADMIN MODULE =====
function renderAdminDashboard() {
  const users = DataStore.getUsers();
  const goals = DataStore.getGoals();
  const cycle = DataStore.getCycle();
  const emps = users.filter(u => u.role === 'employee');
  const submitted = emps.filter(e => DataStore.getGoalsByEmployee(e.id).some(g => g.status === 'submitted' || g.status === 'approved' || g.status === 'locked'));
  const approved = goals.filter(g => g.status === 'approved' || g.status === 'locked');

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Admin Dashboard</h3></div>
    <div class="grid grid-4 mb-24">
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.15)">${icon('users', 24)}</div><div class="stat-value">${emps.length}</div><div class="stat-label">Employees</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.15)">${icon('user-check', 24)}</div><div class="stat-value">${submitted.length}/${emps.length}</div><div class="stat-label">Goals Submitted</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.15)">${icon('target', 24)}</div><div class="stat-value">${approved.length}</div><div class="stat-label">Approved Goals</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(139,92,246,0.15)">${icon('activity', 24)}</div><div class="stat-value">${DataStore.getAuditLogs().length}</div><div class="stat-label">Audit Events</div></div>
    </div>
    <div class="grid grid-2">
      <div class="card"><div class="card-header"><span class="card-title">${icon('calendar')} Cycle Phases</span></div>
        ${cycle.phases.map(p => `<div class="flex-between mb-8" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div><div class="fw-600">${p.name}</div><div class="fs-sm text-muted">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</div></div>
          <span class="badge badge-${p.status === 'active' ? 'approved' : 'draft'}">${p.status === 'active' ? '● Active' : p.status}</span>
        </div>`).join('')}
      </div>
      <div class="card"><div class="card-header"><span class="card-title">${icon('shield')} Completion Status</span></div>
        ${emps.map(e => {
          const eGoals = DataStore.getGoalsByEmployee(e.id);
          const hasGoals = eGoals.length > 0;
          const allApproved = eGoals.length > 0 && eGoals.every(g => g.status === 'approved' || g.status === 'locked');
          return `<div class="flex-between mb-8" style="padding:6px 0"><div class="flex gap-8"><div class="avatar" style="width:28px;height:28px;font-size:0.7rem">${getInitials(e.name)}</div><span class="fs-sm">${e.name}</span></div>
          <span class="badge badge-${allApproved ? 'approved' : hasGoals ? 'submitted' : 'draft'}">${allApproved ? 'Complete' : hasGoals ? 'In Progress' : 'Not Started'}</span></div>`;
        }).join('')}
      </div>
    </div>
  `;
  refreshIcons();
}

function renderCycleManagement() {
  const cycle = DataStore.getCycle();
  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Cycle Management</h3><button class="btn btn-primary btn-sm" onclick="saveCycleConfig()">${icon('save', 14)} Save Changes</button></div>
    <div class="card mb-24">
      <div class="form-row mb-16"><div class="form-group"><label class="form-label">Cycle Name</label><input class="form-input" id="cycleName" value="${cycle.name}"></div>
      <div class="form-group"><label class="form-label">Year</label><input class="form-input" type="number" id="cycleYear" value="${cycle.year}"></div></div>
    </div>
    <div class="section-header"><h3>Phases</h3></div>
    ${cycle.phases.map((p, i) => `
      <div class="card mb-16"><div class="flex-between">
        <div class="fw-600">${p.name}</div>
        <div class="flex gap-8">
          <select class="form-select" style="width:120px" id="phaseStatus${i}" value="${p.status}">
            <option value="upcoming" ${p.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
            <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="closed" ${p.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div></div>
        <div class="form-row mt-8">
          <div class="form-group"><label class="form-label">Start Date</label><input type="date" class="form-input" id="phaseStart${i}" value="${p.startDate}"></div>
          <div class="form-group"><label class="form-label">End Date</label><input type="date" class="form-input" id="phaseEnd${i}" value="${p.endDate}"></div>
        </div>
      </div>`).join('')}
  `;
  refreshIcons();
}

function saveCycleConfig() {
  const cycle = DataStore.getCycle();
  cycle.name = document.getElementById('cycleName').value;
  cycle.year = Number(document.getElementById('cycleYear').value);
  cycle.phases.forEach((p, i) => {
    p.startDate = document.getElementById(`phaseStart${i}`).value;
    p.endDate = document.getElementById(`phaseEnd${i}`).value;
    p.status = document.getElementById(`phaseStatus${i}`).value;
  });
  DataStore.saveCycle(cycle);
  showToast('Cycle configuration saved', 'success');
}

function renderOrgHierarchy() {
  const users = DataStore.getUsers();
  const admins = users.filter(u => u.role === 'admin');
  const managers = users.filter(u => u.role === 'manager');
  
  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Organization Hierarchy</h3></div>
    <div class="card">
      ${admins.map(a => `
        <div class="org-node" style="border-left-color:var(--danger)"><div class="flex gap-8"><div class="avatar" style="width:28px;height:28px;font-size:0.7rem;background:linear-gradient(135deg,var(--danger),#f87171)">${getInitials(a.name)}</div><div><span class="fw-600">${a.name}</span><span class="badge badge-returned" style="margin-left:8px">Admin</span><div class="fs-sm text-muted">${a.department}</div></div></div></div>
        <div class="org-tree">
          ${managers.map(m => {
            const team = DataStore.getUsersByManager(m.id);
            return `<div class="org-node" style="border-left-color:var(--accent)"><div class="flex gap-8"><div class="avatar" style="width:28px;height:28px;font-size:0.7rem">${getInitials(m.name)}</div><div><span class="fw-600">${m.name}</span><span class="badge badge-submitted" style="margin-left:8px">Manager</span><div class="fs-sm text-muted">${m.department} · ${team.length} reports</div></div></div></div>
            <div class="org-tree">${team.map(e => `<div class="org-node"><div class="flex gap-8"><div class="avatar" style="width:28px;height:28px;font-size:0.7rem;background:var(--bg-card-hover);color:var(--text-secondary)">${getInitials(e.name)}</div><div><span>${e.name}</span><div class="fs-sm text-muted">${e.email}</div></div></div></div>`).join('')}</div>`;
          }).join('')}
        </div>`).join('')}
    </div>
  `;
  refreshIcons();
}

function renderAuditLogs() {
  const logs = DataStore.getAuditLogs();
  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Audit Trail</h3><span class="badge badge-draft">${logs.length} events</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>Field</th><th>Old Value</th><th>New Value</th><th>Changed By</th><th>Reason</th></tr></thead>
      <tbody>${logs.map(l => {
        const changer = DataStore.getUser(l.changedBy);
        const goal = DataStore.getGoal(l.entityId);
        return `<tr><td class="fs-sm">${formatDate(l.timestamp)}</td><td><span class="badge badge-${l.action === 'approved' ? 'approved' : l.action === 'returned' ? 'returned' : 'submitted'}">${l.action}</span></td><td class="fw-600">${goal?.title || l.entityId}</td><td>${l.field || '-'}</td><td class="text-muted">${l.oldValue || '-'}</td><td>${l.newValue || '-'}</td><td>${changer?.name || l.changedBy}</td><td class="fs-sm text-muted">${l.reason || '-'}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    ${!logs.length ? '<div class="empty-state mt-24"><h3>No audit events yet</h3></div>' : ''}
  `;
  refreshIcons();
}

function renderGoalUnlock() {
  const goals = DataStore.getGoals().filter(g => g.status === 'approved' || g.status === 'locked');
  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Goal Unlock</h3></div>
    <p class="text-muted mb-16">Unlock approved/locked goals for re-editing. All changes are logged in the audit trail.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Goal</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${goals.map(g => {
        const emp = DataStore.getUser(g.employeeId);
        return `<tr><td><div class="flex gap-8"><div class="avatar" style="width:28px;height:28px;font-size:0.7rem">${getInitials(emp?.name || '?')}</div><span>${emp?.name || 'Unknown'}</span></div></td><td class="fw-600">${g.title}</td><td>${getStatusBadge(g.status)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="unlockGoalForm('${g.id}')">${icon('unlock', 14)} Unlock</button></td></tr>`;
      }).join('')}</tbody>
    </table></div>
  `;
  refreshIcons();
}

function unlockGoalForm(goalId) {
  showModal('Unlock Goal', `<p class="mb-16">This will revert the goal to "draft" status, allowing the employee to edit it.</p><div class="form-group"><label class="form-label">Reason for Unlock</label><textarea class="form-textarea" id="unlockReason" placeholder="Provide justification..."></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="unlockGoalAction('${goalId}')">Unlock Goal</button>`);
}

function unlockGoalAction(goalId) {
  const reason = document.getElementById('unlockReason').value.trim();
  if (!reason) return showToast('Reason is required', 'error');
  const goal = DataStore.getGoal(goalId);
  const old = goal.status;
  goal.status = 'draft';
  DataStore.saveGoal(goal);
  DataStore.addAuditLog({ entityType: 'goal', entityId: goalId, action: 'unlocked', changedBy: App.currentUser.id, field: 'status', oldValue: old, newValue: 'draft', reason });
  closeModal();
  showToast('Goal unlocked', 'success');
  renderGoalUnlock();
}

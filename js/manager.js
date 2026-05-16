// ===== MANAGER MODULE =====
function renderManagerDashboard() {
  const user = App.currentUser;
  const teamMembers = DataStore.getUsersByManager(user.id);
  const allGoals = teamMembers.flatMap(m => DataStore.getGoalsByEmployee(m.id));
  const pending = allGoals.filter(g => g.status === 'submitted').length;
  const approved = allGoals.filter(g => g.status === 'approved' || g.status === 'locked').length;
  const q = getActiveQuarter();

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Team Overview</h3></div>
    <div class="grid grid-4 mb-24">
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(59,130,246,0.15)">${icon('users', 24)}</div><div class="stat-value">${teamMembers.length}</div><div class="stat-label">Team Members</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.15)">${icon('clock', 24)}</div><div class="stat-value">${pending}</div><div class="stat-label">Pending Approval</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.15)">${icon('check-circle', 24)}</div><div class="stat-value">${approved}</div><div class="stat-label">Approved Goals</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(139,92,246,0.15)">${icon('target', 24)}</div><div class="stat-value">${allGoals.length}</div><div class="stat-label">Total Goals</div></div>
    </div>
    ${pending > 0 ? `<div class="card mb-24 checkin-card" style="border-left-color:var(--warning);cursor:pointer" onclick="App.navigate('team-goals')"><div class="flex-between"><div><div class="fw-600 text-warning">${icon('alert-circle')} ${pending} goals awaiting your approval</div><div class="fs-sm text-muted mt-8">Click to review and approve team goals</div></div>${icon('chevron-right')}</div></div>` : ''}
    <div class="section-header"><h3>Team Members</h3></div>
    <div class="grid grid-2">${teamMembers.map(m => {
      const mGoals = DataStore.getGoalsByEmployee(m.id);
      const mScore = calcWeightedScore(mGoals.filter(g => g.status === 'approved' || g.status === 'locked'), q);
      const mPending = mGoals.filter(g => g.status === 'submitted').length;
      return `<div class="card" style="cursor:pointer" onclick="viewEmployeeGoals('${m.id}')">
        <div class="flex gap-12"><div class="avatar">${getInitials(m.name)}</div><div class="flex-1">
          <div class="fw-600">${m.name}</div><div class="fs-sm text-muted">${m.department} · ${m.email}</div>
          <div class="flex gap-8 mt-8">${mGoals.length ? `<span class="badge badge-approved">${mGoals.length} goals</span>` : '<span class="badge badge-draft">No goals</span>'}${mPending ? `<span class="badge badge-submitted">${mPending} pending</span>` : ''}${mScore !== null ? `<span class="badge badge-locked">Score: ${mScore}%</span>` : ''}</div>
        </div></div>
      </div>`;
    }).join('')}</div>
  `;
  refreshIcons();
}

function renderTeamGoals() {
  const user = App.currentUser;
  const teamMembers = DataStore.getUsersByManager(user.id);
  
  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Team Goals — Review & Approve</h3>
      <button class="btn btn-primary btn-sm" onclick="openSharedGoalForm()">${icon('share-2', 14)} Push Shared Goal</button>
    </div>
    ${teamMembers.map(m => {
      const goals = DataStore.getGoalsByEmployee(m.id);
      if (!goals.length) return '';
      const totalW = goals.reduce((s, g) => s + g.weightage, 0);
      return `
        <div class="card mb-16">
          <div class="flex-between mb-16">
            <div class="flex gap-12"><div class="avatar">${getInitials(m.name)}</div><div><div class="fw-600">${m.name}</div><div class="fs-sm text-muted">${m.department} · Weightage: ${totalW}%</div></div></div>
            <div class="flex gap-8">
              ${goals.some(g => g.status === 'submitted') ? `<button class="btn btn-success btn-sm" onclick="approveAllGoals('${m.id}')">${icon('check', 14)} Approve All</button>` : ''}
            </div>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Goal</th><th>Thrust Area</th><th>UoM</th><th>Target</th><th>Weight</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${goals.map(g => `<tr>
              <td><div class="fw-600">${g.title}</div><div class="fs-sm text-muted">${g.description?.slice(0, 60) || ''}${g.description?.length > 60 ? '...' : ''}</div></td>
              <td><span class="badge badge-draft">${g.thrustArea}</span></td>
              <td>${getUOMLabel(g.uom)}</td>
              <td>${g.status === 'submitted' ? `<input class="inline-edit" style="width:80px" value="${g.uom === 'timeline' ? g.target : g.target}" onchange="inlineEditGoal('${g.id}','target',this.value)">` : (g.uom === 'timeline' ? formatDate(g.target) : g.target)}</td>
              <td>${g.status === 'submitted' ? `<input class="inline-edit" type="number" style="width:60px" value="${g.weightage}" min="10" max="100" step="5" onchange="inlineEditGoal('${g.id}','weightage',this.value)">` : g.weightage + '%'}</td>
              <td>${getStatusBadge(g.status)}</td>
              <td><div class="flex gap-8">
                ${g.status === 'submitted' ? `<button class="btn btn-success btn-sm" onclick="approveGoal('${g.id}')" title="Approve">${icon('check', 14)}</button><button class="btn btn-danger btn-sm" onclick="returnGoalForm('${g.id}')" title="Return">${icon('undo', 14)}</button>` : ''}
              </div></td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>`;
    }).join('') || '<div class="empty-state"><h3>No team goals</h3></div>'}
  `;
  refreshIcons();
}

function viewEmployeeGoals(empId) {
  const emp = DataStore.getUser(empId);
  const goals = DataStore.getGoalsByEmployee(empId);
  const q = getActiveQuarter();
  showModal(`${emp.name}'s Goals`, `
    <div class="grid" style="gap:12px">${goals.map(g => {
      const sc = calcProgressScore(g, q);
      return `<div class="card" style="padding:14px"><div class="flex-between"><div><div class="fw-600">${g.title}</div><div class="fs-sm text-muted mt-8">${g.thrustArea} · ${getUOMLabel(g.uom)} · Target: ${g.uom === 'timeline' ? formatDate(g.target) : g.target}</div></div><div style="text-align:right"><div class="fw-600">${g.weightage}%</div>${getStatusBadge(g.status)}${sc !== null ? `<div class="fs-sm ${getScoreColor(sc)} mt-8">${Math.round(sc)}%</div>` : ''}</div></div></div>`;
    }).join('')}</div>`, '<button class="btn btn-secondary" onclick="closeModal()">Close</button>');
  refreshIcons();
}

function inlineEditGoal(goalId, field, value) {
  const goal = DataStore.getGoal(goalId);
  const oldVal = goal[field];
  goal[field] = field === 'weightage' ? Number(value) : value;
  DataStore.saveGoal(goal);
  DataStore.addAuditLog({ entityType: 'goal', entityId: goalId, action: 'inline_edit', changedBy: App.currentUser.id, field, oldValue: String(oldVal), newValue: String(value), reason: 'Manager inline edit during review' });
  showToast(`${field} updated`, 'info');
}

function approveGoal(goalId) {
  const goal = DataStore.getGoal(goalId);
  goal.status = 'approved';
  DataStore.saveGoal(goal);
  DataStore.addAuditLog({ entityType: 'goal', entityId: goalId, action: 'approved', changedBy: App.currentUser.id, field: 'status', oldValue: 'submitted', newValue: 'approved', reason: 'Manager approved' });
  showToast('Goal approved', 'success');
  renderTeamGoals();
}

function approveAllGoals(empId) {
  const goals = DataStore.getGoalsByEmployee(empId).filter(g => g.status === 'submitted');
  const errs = validateGoals(DataStore.getGoalsByEmployee(empId));
  if (errs.length) return showToast(errs[0], 'error');
  goals.forEach(g => { g.status = 'approved'; DataStore.saveGoal(g); DataStore.addAuditLog({ entityType: 'goal', entityId: g.id, action: 'approved', changedBy: App.currentUser.id, field: 'status', oldValue: 'submitted', newValue: 'approved', reason: 'Bulk approval' }); });
  showToast(`${goals.length} goals approved`, 'success');
  renderTeamGoals();
}

function returnGoalForm(goalId) {
  const goal = DataStore.getGoal(goalId);
  showModal('Return for Rework', `<p class="mb-16">Return "<strong>${goal.title}</strong>" to ${DataStore.getUser(goal.employeeId)?.name} for rework.</p><div class="form-group"><label class="form-label">Comment / Reason</label><textarea class="form-textarea" id="returnComment" placeholder="Explain what needs to change..."></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="returnGoalAction('${goalId}')">Return for Rework</button>`);
}

function returnGoalAction(goalId) {
  const comment = document.getElementById('returnComment').value.trim();
  if (!comment) return showToast('Please provide a reason', 'error');
  const goal = DataStore.getGoal(goalId);
  goal.status = 'returned';
  goal.returnComment = comment;
  DataStore.saveGoal(goal);
  DataStore.addAuditLog({ entityType: 'goal', entityId: goalId, action: 'returned', changedBy: App.currentUser.id, field: 'status', oldValue: 'submitted', newValue: 'returned', reason: comment });
  closeModal();
  showToast('Goal returned for rework', 'warning');
  renderTeamGoals();
}

// Check-ins
function renderCheckIns() {
  const teamMembers = DataStore.getUsersByManager(App.currentUser.id);
  const q = getActiveQuarter();

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Quarterly Check-ins</h3></div>
    <div class="tabs">${QUARTERS.map(qr => `<button class="tab ${qr === q ? 'active' : ''}" onclick="switchCheckInQuarter('${qr}')">${QUARTER_LABELS[qr]}</button>`).join('')}</div>
    <div id="checkin-content">${renderCheckInContent(teamMembers, q)}</div>
  `;
  refreshIcons();
}

function switchCheckInQuarter(q) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', QUARTERS[i] === q));
  const teamMembers = DataStore.getUsersByManager(App.currentUser.id);
  document.getElementById('checkin-content').innerHTML = renderCheckInContent(teamMembers, q);
  refreshIcons();
}

function renderCheckInContent(members, quarter) {
  return members.map(m => {
    const goals = DataStore.getGoalsByEmployee(m.id).filter(g => g.status === 'approved' || g.status === 'locked');
    if (!goals.length) return '';
    const score = calcWeightedScore(goals, quarter);
    const existingCI = DataStore.getCheckIns().filter(c => c.employeeId === m.id && c.quarter === quarter);
    return `
      <div class="card mb-16 checkin-card">
        <div class="flex-between mb-16">
          <div class="flex gap-12"><div class="avatar">${getInitials(m.name)}</div><div><div class="fw-600">${m.name}</div><div class="fs-sm text-muted">${m.department}</div></div></div>
          <div style="text-align:right">${score !== null ? `<div class="stat-value" style="font-size:1.5rem">${score}%</div><div class="fs-sm text-muted">Weighted Score</div>` : '<span class="text-muted">No data</span>'}</div>
        </div>
        <div class="table-wrap mb-16"><table>
          <thead><tr><th>Goal</th><th>Weight</th><th>Target</th><th>Actual</th><th>Status</th><th>Score</th></tr></thead>
          <tbody>${goals.map(g => {
            const ach = g.achievements?.[quarter] || {};
            const sc = calcProgressScore(g, quarter);
            return `<tr><td class="fw-600">${g.title}</td><td>${g.weightage}%</td><td>${g.uom === 'timeline' ? formatDate(g.target) : g.target}</td><td>${ach.actual || '—'}</td><td>${getStatusBadge(ach.status || 'not_started')}</td><td class="${getScoreColor(sc)} fw-600">${sc !== null ? Math.round(sc) + '%' : '—'}</td></tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="form-group"><label class="form-label">Check-in Comment</label>
          <textarea class="form-textarea" id="ci-comment-${m.id}" placeholder="Document your discussion...">${existingCI.length ? existingCI[existingCI.length - 1].managerComment : ''}</textarea>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveCheckIn('${m.id}','${quarter}')">${icon('save', 14)} Save Check-in</button>
      </div>`;
  }).join('') || '<div class="empty-state"><h3>No team members with approved goals</h3></div>';
}

function saveCheckIn(empId, quarter) {
  const comment = document.getElementById(`ci-comment-${empId}`).value.trim();
  if (!comment) return showToast('Please add a comment', 'error');
  DataStore.saveCheckIn({ id: generateId(), employeeId: empId, quarter, managerComment: comment, managerId: App.currentUser.id, date: new Date().toISOString() });
  showToast('Check-in saved', 'success');
}

// Shared Goals
function openSharedGoalForm() {
  const teamMembers = DataStore.getUsersByManager(App.currentUser.id);
  showModal('Push Shared Goal', `
    <div class="form-group"><label class="form-label">Goal Title</label><input class="form-input" id="sharedTitle" placeholder="Departmental KPI title"></div>
    <div class="form-group"><label class="form-label">Thrust Area</label><select class="form-select" id="sharedThrust">${THRUST_AREAS.map(t => `<option>${t}</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">UoM</label><select class="form-select" id="sharedUOM">${UOM_TYPES.map(u => `<option value="${u.id}">${u.label}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Target</label><input class="form-input" id="sharedTarget" placeholder="Target value"></div>
    </div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="sharedDesc" placeholder="Goal description"></textarea></div>
    <div class="form-group"><label class="form-label">Assign To</label>
      <div class="grid" style="gap:8px">${teamMembers.map(m => `<label class="flex gap-8" style="cursor:pointer"><input type="checkbox" value="${m.id}" class="shared-emp-cb"> <span>${m.name}</span></label>`).join('')}</div>
    </div>
    <div class="form-group"><label class="form-label">Default Weightage (%)</label><input type="number" class="form-input" id="sharedWeight" value="20" min="10" max="100" step="5"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="pushSharedGoal()">Push Goal</button>`);
}

function pushSharedGoal() {
  const title = document.getElementById('sharedTitle').value.trim();
  const thrust = document.getElementById('sharedThrust').value;
  const uom = document.getElementById('sharedUOM').value;
  const target = document.getElementById('sharedTarget').value;
  const desc = document.getElementById('sharedDesc').value.trim();
  const weight = Number(document.getElementById('sharedWeight').value);
  const empIds = [...document.querySelectorAll('.shared-emp-cb:checked')].map(cb => cb.value);

  if (!title || !target) return showToast('Fill in all fields', 'error');
  if (!empIds.length) return showToast('Select at least one employee', 'error');

  const primaryId = generateId();
  empIds.forEach(empId => {
    DataStore.saveGoal({
      id: generateId(), employeeId: empId, thrustArea: thrust, title, description: desc, uom, target, weightage: weight,
      status: 'approved', sharedFromGoalId: primaryId, sharedFromUserId: App.currentUser.id,
      achievements: { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }
    });
  });
  closeModal();
  showToast(`Shared goal pushed to ${empIds.length} employee(s)`, 'success');
  renderTeamGoals();
}

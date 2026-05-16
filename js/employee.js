// ===== EMPLOYEE MODULE =====
function renderEmployeeDashboard() {
  const user = App.currentUser;
  const goals = DataStore.getGoalsByEmployee(user.id);
  const totalWeight = goals.reduce((s, g) => s + g.weightage, 0);
  const approved = goals.filter(g => g.status === 'approved' || g.status === 'locked').length;
  const q = getActiveQuarter();
  const score = calcWeightedScore(goals.filter(g => g.status === 'approved' || g.status === 'locked'), q);
  const cycle = DataStore.getCycle();
  const activePhase = cycle?.phases.find(p => p.status === 'active');

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Welcome back, ${user.name.split(' ')[0]} 👋</h3></div>
    <div class="grid grid-4 mb-24">
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.15)">${icon('target', 24)}</div><div class="stat-value">${goals.length}</div><div class="stat-label">Total Goals</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.15)">${icon('check-circle', 24)}</div><div class="stat-value">${approved}</div><div class="stat-label">Approved</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.15)">${icon('percent', 24)}</div><div class="stat-value">${totalWeight}%</div><div class="stat-label">Weightage Used</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(139,92,246,0.15)">${icon('trending-up', 24)}</div><div class="stat-value">${score !== null ? score + '%' : '—'}</div><div class="stat-label">Progress Score</div></div>
    </div>
    ${activePhase ? `<div class="card mb-24 checkin-card"><div class="flex-between"><div><div class="fw-600">${icon('calendar')} Current Phase: ${activePhase.name}</div><div class="fs-sm text-muted mt-8">${formatDate(activePhase.startDate)} — ${formatDate(activePhase.endDate)}</div></div><span class="badge badge-on-track pulse">Active</span></div></div>` : ''}
    <div class="section-header"><h3>My Goals</h3><button class="btn btn-primary btn-sm" onclick="openGoalForm()">${icon('plus', 16)} Add Goal</button></div>
    <div class="grid grid-2">${goals.length ? goals.map(g => renderGoalCard(g)).join('') : '<div class="empty-state" style="grid-column:1/-1"><h3>No goals yet</h3><p class="text-muted">Click "Add Goal" to create your first goal</p></div>'}</div>
  `;
  refreshIcons();
}

function renderGoalCard(goal, showActions = true) {
  const score = calcProgressScore(goal, getActiveQuarter());
  const isShared = goal.sharedFromGoalId;
  const canEdit = goal.status === 'draft' || goal.status === 'returned';
  return `
    <div class="card goal-card">
      <div class="flex-between mb-8">
        <div class="flex gap-8">${getStatusBadge(goal.status)}${isShared ? '<span class="badge badge-shared">Shared</span>' : ''}</div>
        <div class="goal-weight">${goal.weightage}%</div>
      </div>
      <h4 style="margin-bottom:4px">${goal.title}</h4>
      <p class="fs-sm text-muted" style="margin-bottom:8px">${goal.description || ''}</p>
      <div class="goal-meta">
        <span class="badge badge-draft">${goal.thrustArea}</span>
        <span class="badge badge-submitted">${getUOMLabel(goal.uom)}</span>
        <span class="fs-sm text-muted">Target: ${goal.uom === 'timeline' ? formatDate(goal.target) : goal.target}</span>
      </div>
      ${score !== null ? `<div class="mt-8"><div class="flex-between fs-sm mb-8"><span class="text-muted">Progress</span><span class="${getScoreColor(score)}">${Math.round(score)}%</span></div><div class="progress-bar"><div class="progress-fill ${getProgressBarColor(score)}" style="width:${Math.min(score, 100)}%"></div></div></div>` : ''}
      ${goal.returnComment ? `<div class="mt-8" style="padding:8px 12px;background:rgba(245,158,11,0.08);border-radius:8px;border-left:3px solid var(--warning)"><div class="fs-sm text-warning fw-600">Returned for rework:</div><div class="fs-sm text-muted">${goal.returnComment}</div></div>` : ''}
      ${showActions && App.currentUser.role === 'employee' ? `<div class="goal-actions">${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="openGoalForm('${goal.id}')">${icon('edit-2', 14)} Edit</button><button class="btn btn-danger btn-sm" onclick="deleteGoalConfirm('${goal.id}')">${icon('trash-2', 14)} Delete</button>` : ''}${goal.status === 'draft' || goal.status === 'returned' ? '' : ''}</div>` : ''}
    </div>`;
}

function renderMyGoals() {
  const user = App.currentUser;
  const goals = DataStore.getGoalsByEmployee(user.id);
  const totalWeight = goals.reduce((s, g) => s + g.weightage, 0);
  const errors = goals.length > 0 ? validateGoals(goals) : [];
  const canSubmit = goals.length > 0 && errors.length === 0 && goals.some(g => g.status === 'draft' || g.status === 'returned');

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>My Goal Sheet</h3>
      <div class="flex gap-8">
        ${canSubmit ? `<button class="btn btn-success btn-sm" onclick="submitGoals()">${icon('send', 14)} Submit for Approval</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="openGoalForm()">${icon('plus', 16)} Add Goal</button>
      </div>
    </div>
    <div class="weightage-gauge">
      <span class="gauge-label">${icon('pie-chart', 16)} Total Weightage</span>
      <div class="gauge-bar"><div class="progress-bar" style="height:10px"><div class="progress-fill ${totalWeight === 100 ? 'green' : totalWeight > 100 ? 'red' : 'yellow'}" style="width:${Math.min(totalWeight, 100)}%"></div></div></div>
      <span class="gauge-value ${totalWeight === 100 ? 'gauge-valid' : 'gauge-invalid'}">${totalWeight}%</span>
    </div>
    <div class="flex gap-8 mb-16 flex-wrap">
      <span class="badge ${goals.length <= 8 ? 'badge-approved' : 'badge-returned'}">${icon('list', 12)} ${goals.length}/8 Goals</span>
      <span class="badge ${totalWeight === 100 ? 'badge-approved' : 'badge-returned'}">${icon('percent', 12)} Weightage ${totalWeight === 100 ? '✓' : '✕'}</span>
      <span class="badge ${goals.every(g => g.weightage >= 10) ? 'badge-approved' : 'badge-returned'}">${icon('shield', 12)} Min 10% each ${goals.every(g => g.weightage >= 10) ? '✓' : '✕'}</span>
    </div>
    ${errors.length ? `<div class="card mb-16" style="border-color:rgba(239,68,68,0.3)"><div class="fs-sm text-danger fw-600 mb-8">⚠ Validation Issues:</div>${errors.map(e => `<div class="fs-sm text-muted">• ${e}</div>`).join('')}</div>` : ''}
    <div class="grid grid-2">${goals.length ? goals.map(g => renderGoalCard(g)).join('') : '<div class="empty-state" style="grid-column:1/-1"><h3>No goals created yet</h3><p class="text-muted">Start by adding your first goal</p></div>'}</div>
    ${goals.length < 8 ? `<button class="fab" onclick="openGoalForm()" title="Add Goal">+</button>` : ''}
  `;
  refreshIcons();
}

function openGoalForm(goalId = null) {
  const goal = goalId ? DataStore.getGoal(goalId) : null;
  const isShared = goal?.sharedFromGoalId;
  const body = `
    <div class="form-group"><label class="form-label">Thrust Area</label>
      <select class="form-select" id="goalThrust" ${isShared ? 'disabled' : ''}>${THRUST_AREAS.map(t => `<option value="${t}" ${goal?.thrustArea === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Goal Title</label>
      <input class="form-input" id="goalTitle" placeholder="Enter goal title" value="${goal?.title || ''}" ${isShared ? 'readonly' : ''} maxlength="100"></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea class="form-textarea" id="goalDesc" placeholder="Describe the goal in detail">${goal?.description || ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Unit of Measurement</label>
        <select class="form-select" id="goalUOM" onchange="updateTargetInput()" ${isShared ? 'disabled' : ''}>${UOM_TYPES.map(u => `<option value="${u.id}" ${goal?.uom === u.id ? 'selected' : ''}>${u.icon} ${u.label}</option>`).join('')}</select>
        <div class="form-hint" id="uomHint">${UOM_TYPES[0].desc}</div></div>
      <div class="form-group"><label class="form-label">Target</label>
        <div id="targetWrap">${goal?.uom === 'timeline' ? `<input type="date" class="form-input" id="goalTarget" value="${goal?.target || ''}">` : `<input type="${goal?.uom === 'zero' ? 'text' : 'number'}" class="form-input" id="goalTarget" placeholder="${goal?.uom === 'zero' ? 'Auto: 0' : 'Enter target value'}" value="${goal?.target || ''}" ${goal?.uom === 'zero' || isShared ? 'readonly' : ''}>`}</div></div>
    </div>
    <div class="form-group"><label class="form-label">Weightage (%)</label>
      <input type="range" id="goalWeight" min="10" max="100" step="5" value="${goal?.weightage || 25}" oninput="document.getElementById('weightVal').textContent=this.value+'%'" style="width:100%;accent-color:var(--accent)">
      <div class="flex-between fs-sm"><span class="text-muted">Min: 10%</span><span class="fw-600 text-accent" id="weightVal">${goal?.weightage || 25}%</span></div></div>
  `;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveGoalForm('${goalId || ''}')">${icon('save', 14)} ${goalId ? 'Update' : 'Create'} Goal</button>`;
  showModal(goalId ? 'Edit Goal' : 'Create New Goal', body, footer);
  refreshIcons();
}

function updateTargetInput() {
  const uom = document.getElementById('goalUOM').value;
  const hint = UOM_TYPES.find(u => u.id === uom);
  document.getElementById('uomHint').textContent = hint?.desc || '';
  const wrap = document.getElementById('targetWrap');
  if (uom === 'timeline') wrap.innerHTML = `<input type="date" class="form-input" id="goalTarget">`;
  else if (uom === 'zero') wrap.innerHTML = `<input type="text" class="form-input" id="goalTarget" value="0" readonly>`;
  else wrap.innerHTML = `<input type="number" class="form-input" id="goalTarget" placeholder="Enter target value">`;
}

function saveGoalForm(goalId) {
  const thrust = document.getElementById('goalThrust').value;
  const title = document.getElementById('goalTitle').value.trim();
  const desc = document.getElementById('goalDesc').value.trim();
  const uom = document.getElementById('goalUOM').value;
  let target = document.getElementById('goalTarget').value;
  const weightage = Number(document.getElementById('goalWeight').value);

  if (!title) return showToast('Please enter a goal title', 'error');
  if (uom === 'zero') target = '0';
  if (!target && uom !== 'zero') return showToast('Please set a target', 'error');

  const goals = DataStore.getGoalsByEmployee(App.currentUser.id);
  if (!goalId && goals.length >= 8) return showToast('Maximum 8 goals allowed', 'error');

  const goalData = {
    id: goalId || generateId(), employeeId: App.currentUser.id,
    thrustArea: thrust, title, description: desc, uom, target: target.toString(), weightage,
    status: goalId ? DataStore.getGoal(goalId).status : 'draft',
    achievements: goalId ? DataStore.getGoal(goalId).achievements : { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } },
    sharedFromGoalId: goalId ? DataStore.getGoal(goalId).sharedFromGoalId : null
  };
  if (goalData.status === 'returned') goalData.status = 'draft';

  DataStore.saveGoal(goalData);
  closeModal();
  showToast(goalId ? 'Goal updated' : 'Goal created', 'success');
  App.navigate(App.currentPage);
}

function deleteGoalConfirm(goalId) {
  const goal = DataStore.getGoal(goalId);
  showModal('Delete Goal', `<p>Are you sure you want to delete "<strong>${goal.title}</strong>"?</p><p class="fs-sm text-muted mt-8">This action cannot be undone.</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="deleteGoalAction('${goalId}')">Delete</button>`);
}

function deleteGoalAction(goalId) {
  DataStore.deleteGoal(goalId);
  closeModal();
  showToast('Goal deleted', 'info');
  App.navigate(App.currentPage);
}

function submitGoals() {
  const goals = DataStore.getGoalsByEmployee(App.currentUser.id);
  const drafts = goals.filter(g => g.status === 'draft' || g.status === 'returned');
  const errs = validateGoals(goals);
  if (errs.length) return showToast(errs[0], 'error');

  drafts.forEach(g => {
    g.status = 'submitted';
    DataStore.saveGoal(g);
    DataStore.addAuditLog({ entityType: 'goal', entityId: g.id, action: 'submitted', changedBy: App.currentUser.id, field: 'status', oldValue: 'draft', newValue: 'submitted', reason: 'Employee submitted for approval' });
  });
  showToast(`${drafts.length} goal(s) submitted for approval`, 'success');
  App.navigate(App.currentPage);
}

// Achievement Tracking
function renderAchievementTracking() {
  const user = App.currentUser;
  const goals = DataStore.getGoalsByEmployee(user.id).filter(g => g.status === 'approved' || g.status === 'locked');
  const activeQ = getActiveQuarter();

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Achievement Tracking</h3></div>
    <div class="tabs">${QUARTERS.map((q, i) => `<button class="tab ${q === activeQ ? 'active' : ''}" onclick="switchQuarter('${q}')">${QUARTER_LABELS[q]}</button>`).join('')}</div>
    <div id="quarter-content">${renderQuarterGoals(goals, activeQ)}</div>
  `;
  refreshIcons();
}

function switchQuarter(q) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', QUARTERS[i] === q));
  const goals = DataStore.getGoalsByEmployee(App.currentUser.id).filter(g => g.status === 'approved' || g.status === 'locked');
  document.getElementById('quarter-content').innerHTML = renderQuarterGoals(goals, q);
  refreshIcons();
}

function renderQuarterGoals(goals, quarter) {
  if (!goals.length) return '<div class="empty-state"><h3>No approved goals</h3><p class="text-muted">Your goals need to be approved before you can track achievements</p></div>';
  const score = calcWeightedScore(goals, quarter);
  return `
    ${score !== null ? `<div class="card mb-24"><div class="flex-between"><div><div class="fw-600">Overall Weighted Score</div><div class="fs-sm text-muted mt-8">${QUARTER_LABELS[quarter]}</div></div><div class="stat-value">${score}%</div></div><div class="progress-bar mt-8" style="height:8px"><div class="progress-fill ${getProgressBarColor(score)}" style="width:${Math.min(score, 100)}%"></div></div></div>` : ''}
    <div class="table-wrap"><table>
      <thead><tr><th>Goal</th><th>UoM</th><th>Target</th><th>Actual</th><th>Status</th><th>Score</th><th></th></tr></thead>
      <tbody>${goals.map(g => {
        const ach = g.achievements?.[quarter] || {};
        const sc = calcProgressScore(g, quarter);
        return `<tr>
          <td><div class="fw-600">${g.title}</div><div class="fs-sm text-muted">${g.thrustArea} · ${g.weightage}%</div></td>
          <td>${getUOMLabel(g.uom)}</td>
          <td>${g.uom === 'timeline' ? formatDate(g.target) : g.target}</td>
          <td><input class="inline-edit" style="width:100px" type="${g.uom === 'timeline' ? 'date' : 'text'}" value="${ach.actual || ''}" onchange="updateAchievement('${g.id}','${quarter}',this.value)" placeholder="—"></td>
          <td><div class="pill-group">
            ${PROGRESS_STATUSES.map(s => `<button class="pill ${ach.status === s ? 'active' : ''}" onclick="updateAchStatus('${g.id}','${quarter}','${s}')">${formatStatus(s)}</button>`).join('')}
          </div></td>
          <td><span class="${getScoreColor(sc)} fw-600">${sc !== null ? Math.round(sc) + '%' : '—'}</span></td>
          <td><button class="btn btn-ghost btn-sm" onclick="saveAchievementData('${g.id}','${quarter}')">${icon('save', 14)}</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function updateAchievement(goalId, quarter, value) {
  const goal = DataStore.getGoal(goalId);
  if (!goal.achievements) goal.achievements = {};
  if (!goal.achievements[quarter]) goal.achievements[quarter] = { actual: '', status: 'not_started' };
  goal.achievements[quarter].actual = value;
  DataStore.saveGoal(goal);
}

function updateAchStatus(goalId, quarter, status) {
  const goal = DataStore.getGoal(goalId);
  if (!goal.achievements) goal.achievements = {};
  if (!goal.achievements[quarter]) goal.achievements[quarter] = { actual: '', status: 'not_started' };
  goal.achievements[quarter].status = status;
  DataStore.saveGoal(goal);
  const goals = DataStore.getGoalsByEmployee(App.currentUser.id).filter(g => g.status === 'approved' || g.status === 'locked');
  document.getElementById('quarter-content').innerHTML = renderQuarterGoals(goals, quarter);
  refreshIcons();
}

function saveAchievementData(goalId, quarter) {
  showToast('Achievement saved', 'success');
}

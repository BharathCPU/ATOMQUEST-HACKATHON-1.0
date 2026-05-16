// ===== REPORTS & ANALYTICS =====
function renderReports() {
  const users = DataStore.getUsers().filter(u => u.role === 'employee');
  const q = getActiveQuarter();

  const reportData = users.map(u => {
    const goals = DataStore.getGoalsByEmployee(u.id);
    const mgr = DataStore.getUser(u.managerId);
    const score = calcWeightedScore(goals.filter(g => g.status === 'approved' || g.status === 'locked'), q);
    return { ...u, goals, managerName: mgr?.name || '-', score, goalCount: goals.length, approvedCount: goals.filter(g => g.status === 'approved' || g.status === 'locked').length };
  });

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Achievement Report</h3>
      <div class="flex gap-8">
        <select class="form-select" id="reportQuarter" style="width:140px" onchange="renderReports()">${QUARTERS.map(qr => `<option value="${qr}" ${qr === q ? 'selected' : ''}>${QUARTER_LABELS[qr]}</option>`).join('')}</select>
        <button class="btn btn-secondary btn-sm" onclick="exportReport()">${icon('download', 14)} Export CSV</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Department</th><th>Manager</th><th>Goals</th><th>Approved</th><th>Weighted Score</th><th>Status</th></tr></thead>
      <tbody>${reportData.map(r => `<tr>
        <td><div class="flex gap-8"><div class="avatar" style="width:28px;height:28px;font-size:0.7rem">${getInitials(r.name)}</div><span class="fw-600">${r.name}</span></div></td>
        <td>${r.department}</td><td>${r.managerName}</td><td>${r.goalCount}</td><td>${r.approvedCount}</td>
        <td><span class="${getScoreColor(r.score)} fw-600">${r.score !== null ? r.score + '%' : '—'}</span></td>
        <td>${r.approvedCount === r.goalCount && r.goalCount > 0 ? '<span class="badge badge-approved">Complete</span>' : '<span class="badge badge-submitted">In Progress</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  `;
  refreshIcons();
}

function exportReport() {
  const users = DataStore.getUsers().filter(u => u.role === 'employee');
  const q = document.getElementById('reportQuarter')?.value || getActiveQuarter();
  const data = [];

  users.forEach(u => {
    const goals = DataStore.getGoalsByEmployee(u.id).filter(g => g.status === 'approved' || g.status === 'locked');
    const mgr = DataStore.getUser(u.managerId);
    goals.forEach(g => {
      const ach = g.achievements?.[q] || {};
      const sc = calcProgressScore(g, q);
      data.push({
        Employee: u.name, Department: u.department, Manager: mgr?.name || '-',
        Goal: g.title, ThrustArea: g.thrustArea, UoM: getUOMLabel(g.uom),
        Target: g.target, Actual: ach.actual || '', Status: formatStatus(ach.status || 'not_started'),
        Weightage: g.weightage + '%', Score: sc !== null ? Math.round(sc) + '%' : '-'
      });
    });
  });
  exportToCSV(data, `achievement_report_${q}.csv`);
}

function renderCompletionDashboard() {
  const users = DataStore.getUsers().filter(u => u.role === 'employee');
  const managers = DataStore.getUsers().filter(u => u.role === 'manager');
  const cycle = DataStore.getCycle();

  const empCompletion = users.map(u => {
    const goals = DataStore.getGoalsByEmployee(u.id);
    const hasSubmitted = goals.some(g => g.status !== 'draft');
    const allApproved = goals.length > 0 && goals.every(g => g.status === 'approved' || g.status === 'locked');
    const checkIns = DataStore.getCheckIns().filter(c => c.employeeId === u.id);
    return { ...u, hasSubmitted, allApproved, checkInCount: checkIns.length };
  });

  const mgrCompletion = managers.map(m => {
    const team = DataStore.getUsersByManager(m.id);
    const teamGoals = team.flatMap(t => DataStore.getGoalsByEmployee(t.id));
    const reviewed = teamGoals.filter(g => g.status === 'approved' || g.status === 'locked' || g.status === 'returned').length;
    const checkIns = DataStore.getCheckIns().filter(c => c.managerId === m.id);
    return { ...m, teamSize: team.length, totalGoals: teamGoals.length, reviewed, checkInsCompleted: checkIns.length };
  });

  const goalSubmitRate = users.length ? Math.round((empCompletion.filter(e => e.hasSubmitted).length / users.length) * 100) : 0;
  const goalApproveRate = users.length ? Math.round((empCompletion.filter(e => e.allApproved).length / users.length) * 100) : 0;

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Completion Dashboard</h3></div>
    <div class="grid grid-3 mb-24">
      <div class="card"><div class="flex-between mb-8"><span class="card-subtitle">Goal Submission Rate</span><span class="fw-600">${goalSubmitRate}%</span></div><div class="progress-bar" style="height:8px"><div class="progress-fill ${getProgressBarColor(goalSubmitRate)}" style="width:${goalSubmitRate}%"></div></div></div>
      <div class="card"><div class="flex-between mb-8"><span class="card-subtitle">Goal Approval Rate</span><span class="fw-600">${goalApproveRate}%</span></div><div class="progress-bar" style="height:8px"><div class="progress-fill ${getProgressBarColor(goalApproveRate)}" style="width:${goalApproveRate}%"></div></div></div>
      <div class="card"><div class="flex-between mb-8"><span class="card-subtitle">Active Phase</span></div><div class="fw-600 text-accent">${cycle.phases.find(p => p.status === 'active')?.name || 'None'}</div></div>
    </div>
    <div class="grid grid-2">
      <div class="card"><div class="card-header"><span class="card-title">Employee Status</span></div>
        ${empCompletion.map(e => `<div class="flex-between mb-8" style="padding:6px 0;border-bottom:1px solid var(--glass-border)"><div class="flex gap-8"><div class="avatar" style="width:24px;height:24px;font-size:0.65rem">${getInitials(e.name)}</div><span class="fs-sm">${e.name}</span></div>
        <div class="flex gap-8">${e.allApproved ? '<span class="status-dot green"></span>' : e.hasSubmitted ? '<span class="status-dot yellow"></span>' : '<span class="status-dot red"></span>'}<span class="fs-sm text-muted">${e.allApproved ? 'Complete' : e.hasSubmitted ? 'Pending' : 'Not Started'}</span></div></div>`).join('')}
      </div>
      <div class="card"><div class="card-header"><span class="card-title">Manager Review Status</span></div>
        ${mgrCompletion.map(m => `<div class="mb-16"><div class="flex-between mb-8"><div class="flex gap-8"><div class="avatar" style="width:24px;height:24px;font-size:0.65rem">${getInitials(m.name)}</div><span class="fs-sm fw-600">${m.name}</span></div><span class="fs-sm text-muted">${m.reviewed}/${m.totalGoals} reviewed</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${m.totalGoals ? (m.reviewed / m.totalGoals) * 100 : 0}%"></div></div></div>`).join('')}
      </div>
    </div>
  `;
  refreshIcons();
}

function renderAnalytics() {
  const users = DataStore.getUsers().filter(u => u.role === 'employee');
  const goals = DataStore.getGoals();
  const thrustCounts = {};
  const uomCounts = {};
  const deptScores = {};

  goals.forEach(g => {
    thrustCounts[g.thrustArea] = (thrustCounts[g.thrustArea] || 0) + 1;
    const uLabel = getUOMLabel(g.uom);
    uomCounts[uLabel] = (uomCounts[uLabel] || 0) + 1;
  });

  users.forEach(u => {
    const uGoals = DataStore.getGoalsByEmployee(u.id).filter(g => g.status === 'approved' || g.status === 'locked');
    const sc = calcWeightedScore(uGoals, 'q1');
    if (!deptScores[u.department]) deptScores[u.department] = [];
    if (sc !== null) deptScores[u.department].push(sc);
  });

  document.getElementById('content').innerHTML = `
    <div class="section-header"><h3>Analytics</h3></div>
    <div class="grid grid-2 mb-24">
      <div class="card"><div class="card-header"><span class="card-title">Goals by Thrust Area</span></div><div class="chart-container"><canvas id="thrustChart"></canvas></div></div>
      <div class="card"><div class="card-header"><span class="card-title">Goals by UoM Type</span></div><div class="chart-container"><canvas id="uomChart"></canvas></div></div>
    </div>
    <div class="grid grid-2">
      <div class="card"><div class="card-header"><span class="card-title">Department Avg Scores (Q1)</span></div><div class="chart-container"><canvas id="deptChart"></canvas></div></div>
      <div class="card"><div class="card-header"><span class="card-title">Goal Status Distribution</span></div><div class="chart-container"><canvas id="statusChart"></canvas></div></div>
    </div>
  `;

  const chartColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];
  const chartDefaults = { plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } }, responsive: true, maintainAspectRatio: false };

  // Thrust area chart
  new Chart(document.getElementById('thrustChart'), {
    type: 'doughnut', data: { labels: Object.keys(thrustCounts), datasets: [{ data: Object.values(thrustCounts), backgroundColor: chartColors, borderWidth: 0 }] },
    options: { ...chartDefaults, cutout: '65%' }
  });

  // UoM chart
  new Chart(document.getElementById('uomChart'), {
    type: 'bar', data: { labels: Object.keys(uomCounts), datasets: [{ label: 'Count', data: Object.values(uomCounts), backgroundColor: chartColors.slice(0, Object.keys(uomCounts).length), borderRadius: 8, borderWidth: 0 }] },
    options: { ...chartDefaults, scales: { y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#64748b' }, grid: { display: false } } } }
  });

  // Dept scores
  const deptLabels = Object.keys(deptScores);
  const deptAvgs = deptLabels.map(d => deptScores[d].length ? Math.round(deptScores[d].reduce((a, b) => a + b, 0) / deptScores[d].length) : 0);
  new Chart(document.getElementById('deptChart'), {
    type: 'bar', data: { labels: deptLabels, datasets: [{ label: 'Avg Score %', data: deptAvgs, backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899'], borderRadius: 8, borderWidth: 0 }] },
    options: { ...chartDefaults, indexAxis: 'y', scales: { x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { display: false } } } }
  });

  // Status distribution
  const statusCounts = {};
  goals.forEach(g => { statusCounts[g.status] = (statusCounts[g.status] || 0) + 1; });
  const statusColors = { draft: '#64748b', submitted: '#3b82f6', approved: '#10b981', returned: '#f59e0b', locked: '#8b5cf6' };
  new Chart(document.getElementById('statusChart'), {
    type: 'pie', data: { labels: Object.keys(statusCounts).map(formatStatus), datasets: [{ data: Object.values(statusCounts), backgroundColor: Object.keys(statusCounts).map(s => statusColors[s] || '#6366f1'), borderWidth: 0 }] },
    options: { ...chartDefaults }
  });
  refreshIcons();
}

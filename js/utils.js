// ===== UTILITY HELPERS =====

// Toast notifications
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// Modal
function showModal(title, bodyHTML, footerHTML = '') {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h3>${title}</h3><button class="btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const m = document.getElementById('modal-overlay');
  if (m) m.remove();
}

// Validation
function validateGoals(goals) {
  const errors = [];
  if (goals.length > 8) errors.push('Maximum 8 goals allowed');
  const totalWeight = goals.reduce((s, g) => s + (Number(g.weightage) || 0), 0);
  if (totalWeight !== 100) errors.push(`Total weightage must equal 100% (currently ${totalWeight}%)`);
  goals.forEach((g, i) => {
    if ((Number(g.weightage) || 0) < 10) errors.push(`Goal "${g.title || i + 1}" weightage must be at least 10%`);
    if (!g.title) errors.push(`Goal ${i + 1} needs a title`);
    if (!g.thrustArea) errors.push(`Goal "${g.title || i + 1}" needs a thrust area`);
    if (!g.target) errors.push(`Goal "${g.title || i + 1}" needs a target`);
  });
  return errors;
}

// Progress score calc
function calcProgressScore(goal, quarter) {
  const ach = goal.achievements?.[quarter];
  if (!ach || ach.actual === '' || ach.actual === null || ach.actual === undefined) return null;
  const actual = Number(ach.actual);
  const target = Number(goal.target);
  switch (goal.uom) {
    case 'min_numeric': return target > 0 ? Math.min((actual / target) * 100, 150) : 0;
    case 'max_numeric': return actual > 0 ? Math.min((target / actual) * 100, 150) : (target === 0 ? 100 : 0);
    case 'zero': return actual === 0 ? 100 : 0;
    case 'timeline':
      const targetDate = new Date(goal.target);
      const actualDate = ach.actual ? new Date(ach.actual) : new Date();
      if (ach.status === 'completed') return actualDate <= targetDate ? 100 : Math.max(0, 100 - Math.floor((actualDate - targetDate) / 86400000));
      return null;
    default: return null;
  }
}

// Weighted score for employee
function calcWeightedScore(goals, quarter) {
  let totalWeightedScore = 0, totalWeight = 0;
  goals.forEach(g => {
    const score = calcProgressScore(g, quarter);
    if (score !== null) { totalWeightedScore += score * (g.weightage / 100); totalWeight += g.weightage; }
  });
  return totalWeight > 0 ? Math.round(totalWeightedScore / (totalWeight / 100)) : null;
}

// Formatting
function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatStatus(s) {
  const map = { draft: 'Draft', submitted: 'Submitted', approved: 'Approved', returned: 'Returned', locked: 'Locked', not_started: 'Not Started', on_track: 'On Track', completed: 'Completed' };
  return map[s] || s;
}

function getStatusBadge(status) { return `<span class="badge badge-${status}">${formatStatus(status)}</span>`; }
function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
function getUOMLabel(uom) { const u = UOM_TYPES.find(t => t.id === uom); return u ? u.label : uom; }
function getScoreColor(score) { if (score === null) return ''; if (score >= 80) return 'text-success'; if (score >= 50) return 'text-warning'; return 'text-danger'; }
function getProgressBarColor(score) { if (score >= 80) return 'green'; if (score >= 50) return 'yellow'; return 'red'; }

// Active quarter helper
function getActiveQuarter() {
  const cycle = DataStore.getCycle();
  if (!cycle) return 'q1';
  const now = new Date();
  for (let i = 1; i < cycle.phases.length; i++) {
    const phase = cycle.phases[i];
    if (phase.status === 'active') return QUARTERS[i - 1];
  }
  return 'q1';
}

function isPhaseActive(phaseName) {
  const cycle = DataStore.getCycle();
  if (!cycle) return false;
  const phase = cycle.phases.find(p => p.name === phaseName);
  return phase?.status === 'active';
}

// CSV Export
function exportToCSV(data, filename) {
  if (!data.length) return showToast('No data to export', 'warning');
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('Report exported successfully', 'success');
}

// Lucide icon helper
function icon(name, size = 18) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

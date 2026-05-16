// ===== DATA STORE =====
const DB_KEY = 'goalPortalDB';
const API_BASE = '/api';

const THRUST_AREAS = ['Revenue Growth', 'Cost Optimization', 'Quality & Process', 'People & Culture', 'Innovation & Digital'];
const UOM_TYPES = [
  { id: 'min_numeric', label: 'Min (Numeric / %)', desc: 'Higher is better', icon: '📈' },
  { id: 'max_numeric', label: 'Max (Numeric / %)', desc: 'Lower is better', icon: '📉' },
  { id: 'timeline', label: 'Timeline', desc: 'Date-based completion', icon: '📅' },
  { id: 'zero', label: 'Zero-based', desc: 'Zero = Success', icon: '🎯' }
];
const QUARTERS = ['q1', 'q2', 'q3', 'q4'];
const QUARTER_LABELS = { q1: 'Q1 (Jul)', q2: 'Q2 (Oct)', q3: 'Q3 (Jan)', q4: 'Q4 (Mar-Apr)' };
const GOAL_STATUSES = ['draft', 'submitted', 'approved', 'returned', 'locked'];
const PROGRESS_STATUSES = ['not_started', 'on_track', 'completed'];

// ===== Local Storage (fast reads) =====
function getDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return seedDatabase();
  try { return JSON.parse(raw); } catch { return seedDatabase(); }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function generateId() { return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }

// ===== Server Sync (persistent storage) =====
// Fire-and-forget: sync to server in background after every local write
function syncToServer(endpoint, method, body) {
  fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(err => console.warn('Server sync failed (offline mode):', err.message));
}

// Full database sync to server
function fullSync() {
  syncToServer('/data', 'POST', getDB());
}

// Load from server on startup (if available)
async function loadFromServer() {
  try {
    const res = await fetch(`${API_BASE}/data`);
    const json = await res.json();
    if (json.success && json.data) {
      saveDB(json.data);
      console.log('✅ Data loaded from server');
      return true;
    }
  } catch (e) {
    console.warn('⚠ Server unavailable, using local data');
  }
  return false;
}

// ===== CRUD Operations =====
const DataStore = {
  getUsers: () => getDB().users,
  getUser: (id) => getDB().users.find(u => u.id === id),
  getUsersByRole: (role) => getDB().users.filter(u => u.role === role),
  getUsersByManager: (managerId) => getDB().users.filter(u => u.managerId === managerId),

  getGoals: () => getDB().goals,
  getGoalsByEmployee: (empId) => getDB().goals.filter(g => g.employeeId === empId),
  getGoal: (id) => getDB().goals.find(g => g.id === id),
  saveGoal: (goal) => {
    const db = getDB();
    const idx = db.goals.findIndex(g => g.id === goal.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      db.goals[idx] = { ...db.goals[idx], ...goal, updatedAt: now };
    } else {
      goal.id = goal.id || generateId();
      goal.createdAt = now;
      goal.updatedAt = now;
      db.goals.push(goal);
    }
    saveDB(db);
    // Sync to server
    syncToServer('/goals', 'POST', db.goals.find(g => g.id === goal.id));
    return goal;
  },
  deleteGoal: (id) => {
    const db = getDB();
    db.goals = db.goals.filter(g => g.id !== id);
    saveDB(db);
    syncToServer(`/goals/${id}`, 'DELETE', null);
  },

  getCheckIns: () => getDB().checkIns,
  getCheckInsByGoal: (goalId) => getDB().checkIns.filter(c => c.goalId === goalId),
  saveCheckIn: (ci) => {
    const db = getDB();
    const idx = db.checkIns.findIndex(c => c.id === ci.id);
    if (idx >= 0) db.checkIns[idx] = ci;
    else db.checkIns.push({ ...ci, id: ci.id || generateId() });
    saveDB(db);
    syncToServer('/checkins', 'POST', ci);
  },

  getAuditLogs: () => getDB().auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
  addAuditLog: (log) => {
    const db = getDB();
    const entry = { ...log, id: generateId(), timestamp: new Date().toISOString() };
    db.auditLogs.push(entry);
    saveDB(db);
    syncToServer('/auditlogs', 'POST', entry);
  },

  getCycle: () => getDB().cycle,
  saveCycle: (cycle) => {
    const db = getDB();
    db.cycle = cycle;
    saveDB(db);
    syncToServer('/cycle', 'POST', cycle);
  },

  resetDB: () => {
    localStorage.removeItem(DB_KEY);
    syncToServer('/reset', 'POST', {});
    return seedDatabase();
  },

  // Initialize: try loading from server first, fallback to local/seed
  async init() {
    const loaded = await loadFromServer();
    if (!loaded) {
      // No server data — push local/seed data to server
      const db = getDB();
      fullSync();
    }
  }
};

// ===== SEED DATA =====
function seedDatabase() {
  const db = {
    users: [
      { id: 'emp1', name: 'Rahul Sharma', email: 'rahul@atomberg.com', department: 'Engineering', managerId: 'mgr1', role: 'employee' },
      { id: 'emp2', name: 'Priya Patel', email: 'priya@atomberg.com', department: 'Engineering', managerId: 'mgr1', role: 'employee' },
      { id: 'emp3', name: 'Amit Kumar', email: 'amit@atomberg.com', department: 'Sales', managerId: 'mgr2', role: 'employee' },
      { id: 'emp4', name: 'Sneha Reddy', email: 'sneha@atomberg.com', department: 'Sales', managerId: 'mgr2', role: 'employee' },
      { id: 'emp5', name: 'Vikram Singh', email: 'vikram@atomberg.com', department: 'Engineering', managerId: 'mgr1', role: 'employee' },
      { id: 'mgr1', name: 'Anita Desai', email: 'anita@atomberg.com', department: 'Engineering', managerId: null, role: 'manager' },
      { id: 'mgr2', name: 'Rajesh Nair', email: 'rajesh@atomberg.com', department: 'Sales', managerId: null, role: 'manager' },
      { id: 'adm1', name: 'Deepa Gupta', email: 'deepa@atomberg.com', department: 'HR', managerId: null, role: 'admin' }
    ],
    goals: [
      { id: 'g1', employeeId: 'emp1', thrustArea: 'Innovation & Digital', title: 'Launch New IoT Dashboard', description: 'Design and deploy real-time IoT monitoring dashboard for smart fans', uom: 'timeline', target: '2026-09-30', weightage: 30, status: 'approved', achievements: { q1: { actual: '', status: 'on_track' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-05T10:00:00Z' },
      { id: 'g2', employeeId: 'emp1', thrustArea: 'Quality & Process', title: 'Reduce Bug Escape Rate', description: 'Reduce post-release critical bugs by 40% through improved code review', uom: 'max_numeric', target: '15', weightage: 25, status: 'approved', achievements: { q1: { actual: '18', status: 'on_track' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-05T10:00:00Z' },
      { id: 'g3', employeeId: 'emp1', thrustArea: 'People & Culture', title: 'Mentor Junior Engineers', description: 'Conduct bi-weekly mentoring sessions for 3 junior engineers', uom: 'min_numeric', target: '24', weightage: 20, status: 'approved', achievements: { q1: { actual: '7', status: 'on_track' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-05T10:00:00Z' },
      { id: 'g4', employeeId: 'emp1', thrustArea: 'Cost Optimization', title: 'Optimize Cloud Costs', description: 'Reduce AWS monthly spend by 20% through resource right-sizing', uom: 'max_numeric', target: '50000', weightage: 25, status: 'approved', achievements: { q1: { actual: '55000', status: 'on_track' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-05T10:00:00Z' },
      { id: 'g5', employeeId: 'emp2', thrustArea: 'Innovation & Digital', title: 'Implement ML Pipeline', description: 'Build automated ML pipeline for predictive maintenance', uom: 'timeline', target: '2026-11-30', weightage: 35, status: 'submitted', achievements: { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-02T10:00:00Z', updatedAt: '2026-05-02T10:00:00Z' },
      { id: 'g6', employeeId: 'emp2', thrustArea: 'Quality & Process', title: 'Achieve 90% Test Coverage', description: 'Increase unit test coverage across all microservices', uom: 'min_numeric', target: '90', weightage: 30, status: 'submitted', achievements: { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-02T10:00:00Z', updatedAt: '2026-05-02T10:00:00Z' },
      { id: 'g7', employeeId: 'emp2', thrustArea: 'People & Culture', title: 'Knowledge Sharing Sessions', description: 'Present 4 tech talks on AI/ML topics', uom: 'min_numeric', target: '4', weightage: 15, status: 'submitted', achievements: { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-02T10:00:00Z', updatedAt: '2026-05-02T10:00:00Z' },
      { id: 'g8', employeeId: 'emp2', thrustArea: 'Cost Optimization', title: 'Reduce Data Pipeline Costs', description: 'Optimize ETL jobs to reduce compute time by 30%', uom: 'max_numeric', target: '200', weightage: 20, status: 'submitted', achievements: { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-02T10:00:00Z', updatedAt: '2026-05-02T10:00:00Z' },
      { id: 'g9', employeeId: 'emp3', thrustArea: 'Revenue Growth', title: 'Achieve Q1 Sales Target', description: 'Close deals worth ₹2Cr in Q1', uom: 'min_numeric', target: '200', weightage: 40, status: 'approved', achievements: { q1: { actual: '180', status: 'on_track' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-04T10:00:00Z' },
      { id: 'g10', employeeId: 'emp3', thrustArea: 'Revenue Growth', title: 'Expand to 5 New Regions', description: 'Onboard distributors in 5 new tier-2 cities', uom: 'min_numeric', target: '5', weightage: 30, status: 'approved', achievements: { q1: { actual: '2', status: 'on_track' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-04T10:00:00Z' },
      { id: 'g11', employeeId: 'emp3', thrustArea: 'People & Culture', title: 'Train Sales Team', description: 'Conduct monthly product training for new joiners', uom: 'min_numeric', target: '12', weightage: 15, status: 'approved', achievements: { q1: { actual: '3', status: 'on_track' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-04T10:00:00Z' },
      { id: 'g12', employeeId: 'emp3', thrustArea: 'Quality & Process', title: 'Zero Customer Escalations', description: 'Ensure no critical customer escalation goes unresolved for >48h', uom: 'zero', target: '0', weightage: 15, status: 'approved', achievements: { q1: { actual: '0', status: 'completed' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-04T10:00:00Z' },
      { id: 'g13', employeeId: 'emp4', thrustArea: 'Revenue Growth', title: 'Increase E-commerce Revenue', description: 'Grow online channel revenue by 35%', uom: 'min_numeric', target: '350', weightage: 35, status: 'draft', achievements: { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-10T10:00:00Z', updatedAt: '2026-05-10T10:00:00Z' },
      { id: 'g14', employeeId: 'emp4', thrustArea: 'Cost Optimization', title: 'Reduce Return Rate', description: 'Bring product return rate below 3%', uom: 'max_numeric', target: '3', weightage: 25, status: 'draft', achievements: { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, createdAt: '2026-05-10T10:00:00Z', updatedAt: '2026-05-10T10:00:00Z' },
      { id: 'g15', employeeId: 'emp5', thrustArea: 'Innovation & Digital', title: 'Build Mobile App v2', description: 'Redesign and launch mobile app with new UX', uom: 'timeline', target: '2026-10-15', weightage: 40, status: 'returned', achievements: { q1: { actual: '', status: 'not_started' }, q2: { actual: '', status: 'not_started' }, q3: { actual: '', status: 'not_started' }, q4: { actual: '', status: 'not_started' } }, sharedFromGoalId: null, returnComment: 'Please break this into smaller milestones with quarterly targets.', createdAt: '2026-05-03T10:00:00Z', updatedAt: '2026-05-06T10:00:00Z' }
    ],
    checkIns: [
      { id: 'ci1', goalId: 'g1', employeeId: 'emp1', quarter: 'q1', managerComment: 'Good progress on dashboard design. Keep pushing on the backend integration.', managerId: 'mgr1', date: '2026-07-15T10:00:00Z' },
      { id: 'ci2', goalId: 'g9', employeeId: 'emp3', quarter: 'q1', managerComment: 'Slightly behind target. Focus on closing the Pune and Jaipur deals.', managerId: 'mgr2', date: '2026-07-16T10:00:00Z' }
    ],
    auditLogs: [
      { id: 'al1', entityType: 'goal', entityId: 'g1', action: 'status_change', changedBy: 'mgr1', field: 'status', oldValue: 'submitted', newValue: 'approved', reason: 'Goals look well-defined', timestamp: '2026-05-05T10:00:00Z' },
      { id: 'al2', entityType: 'goal', entityId: 'g15', action: 'status_change', changedBy: 'mgr1', field: 'status', oldValue: 'submitted', newValue: 'returned', reason: 'Please break this into smaller milestones with quarterly targets.', timestamp: '2026-05-06T10:00:00Z' }
    ],
    cycle: {
      id: 'cycle_2026', name: 'FY 2026-27', year: 2026,
      phases: [
        { name: 'Goal Setting', startDate: '2026-05-01', endDate: '2026-06-30', status: 'active' },
        { name: 'Q1 Check-in', startDate: '2026-07-01', endDate: '2026-07-31', status: 'upcoming' },
        { name: 'Q2 Check-in', startDate: '2026-10-01', endDate: '2026-10-31', status: 'upcoming' },
        { name: 'Q3 Check-in', startDate: '2027-01-01', endDate: '2027-01-31', status: 'upcoming' },
        { name: 'Q4 / Annual', startDate: '2027-03-01', endDate: '2027-04-30', status: 'upcoming' }
      ]
    }
  };
  saveDB(db);
  return db;
}

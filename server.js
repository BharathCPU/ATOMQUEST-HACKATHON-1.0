const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'server', 'db.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // Serve frontend files

// Ensure server directory and db file exist
if (!fs.existsSync(path.join(__dirname, 'server'))) {
  fs.mkdirSync(path.join(__dirname, 'server'));
}

// ===== Helper: Read/Write DB =====
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading DB:', e.message);
  }
  return null;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ===== API ROUTES =====

// GET full database
app.get('/api/data', (req, res) => {
  const db = readDB();
  if (db) {
    res.json({ success: true, data: db });
  } else {
    res.json({ success: false, data: null });
  }
});

// POST full database sync (save entire state)
app.post('/api/data', (req, res) => {
  try {
    writeDB(req.body);
    res.json({ success: true, message: 'Database saved' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST a single goal (upsert)
app.post('/api/goals', (req, res) => {
  try {
    const db = readDB();
    if (!db) return res.status(500).json({ success: false, message: 'DB not initialized' });
    const goal = req.body;
    const idx = db.goals.findIndex(g => g.id === goal.id);
    if (idx >= 0) {
      db.goals[idx] = { ...db.goals[idx], ...goal, updatedAt: new Date().toISOString() };
    } else {
      db.goals.push({ ...goal, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    writeDB(db);
    res.json({ success: true, goal: db.goals.find(g => g.id === goal.id) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE a goal
app.delete('/api/goals/:id', (req, res) => {
  try {
    const db = readDB();
    if (!db) return res.status(500).json({ success: false });
    db.goals = db.goals.filter(g => g.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST a check-in (upsert)
app.post('/api/checkins', (req, res) => {
  try {
    const db = readDB();
    if (!db) return res.status(500).json({ success: false });
    const ci = req.body;
    const idx = db.checkIns.findIndex(c => c.id === ci.id);
    if (idx >= 0) db.checkIns[idx] = ci;
    else db.checkIns.push(ci);
    writeDB(db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST an audit log
app.post('/api/auditlogs', (req, res) => {
  try {
    const db = readDB();
    if (!db) return res.status(500).json({ success: false });
    db.auditLogs.push(req.body);
    writeDB(db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST cycle config
app.post('/api/cycle', (req, res) => {
  try {
    const db = readDB();
    if (!db) return res.status(500).json({ success: false });
    db.cycle = req.body;
    writeDB(db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST reset database
app.post('/api/reset', (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
    res.json({ success: true, message: 'Database reset' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Fallback: serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ⚡ GoalSync Server running at http://localhost:${PORT}\n`);
  console.log(`  📁 Database file: ${DB_FILE}`);
  console.log(`  🌐 Open http://localhost:${PORT} in your browser\n`);
});

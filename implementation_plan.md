# In-House Goal Setting & Tracking Portal

Build a modern, premium web-based portal for the ATOMQUEST Hackathon 1.0 that supports the full lifecycle of employee goals — creation, approval, quarterly check-ins, and reporting — across 3 user roles.

## Tech Stack Decision

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend** | Vanilla HTML + CSS + JS | Zero build step, instant deploy, cost-optimised (evaluation criteria #6) |
| **Data** | `localStorage` + JSON | No server costs, fully offline-capable, easy demo |
| **Styling** | Custom CSS with CSS Variables | Dark theme, glassmorphism, smooth animations |
| **Icons** | Lucide Icons (CDN) | Modern, lightweight icon set |
| **Fonts** | Inter (Google Fonts) | Clean, professional typography |
| **Charts** | Chart.js (CDN) | Lightweight charting for analytics |
| **Export** | SheetJS (CDN) | CSV/Excel export capability |

> [!IMPORTANT]
> **No backend server required.** All data lives in `localStorage`. This means the demo is self-contained, zero-cost to host (GitHub Pages / static hosting), and works offline — aligning perfectly with the "Cost Optimisation" evaluation criteria.

## User Review Required

> [!IMPORTANT]
> **Role Switching**: Since there's no real authentication, I'll implement a **role switcher** in the top-right corner so evaluators can instantly switch between Employee / Manager / Admin views with pre-seeded demo data. This satisfies deliverable #4 ("Login credentials of the 3 roles or option to switch between user journeys").

> [!WARNING]
> **Scope**: You mentioned this is "one third of the problem statement." The README I read appears to be the **complete** problem statement (all 8 sections). I'll implement **everything shown**: Phase 1, Phase 2, all 3 roles, reporting, and selected bonus features. Please confirm if there are additional requirements I haven't seen.

## Proposed Changes

### File Structure

```
ATOMQUEST-HACKATHON-1.0/
├── index.html              # Single-page app shell
├── css/
│   └── styles.css          # Complete design system
├── js/
│   ├── app.js              # Router, navigation, role switching
│   ├── data.js             # Data layer (localStorage CRUD + seed data)
│   ├── employee.js         # Employee: goal creation, achievement tracking
│   ├── manager.js          # Manager: approval workflow, check-ins
│   ├── admin.js            # Admin: cycle config, org hierarchy, audit logs
│   ├── reports.js          # Reporting & dashboards (charts, export)
│   └── utils.js            # Validation, formatting, shared helpers
├── assets/
│   └── logo.png            # Atomberg-inspired branding
└── README.md               # Existing
```

---

### Design System (`css/styles.css`)

- **Theme**: Dark mode with deep navy/slate backgrounds (`#0f1729`, `#1a2332`)
- **Accents**: Vibrant blue-purple gradient (`#6366f1` → `#8b5cf6`) for primary actions
- **Cards**: Glassmorphism with `backdrop-filter: blur()`, subtle borders
- **Animations**: Smooth page transitions, hover effects, micro-interactions on buttons/cards
- **Typography**: Inter font, proper hierarchy (h1–h4)
- **Responsive**: Mobile-first grid layout

---

### Core App Shell (`index.html` + `js/app.js`)

- **Sidebar navigation** with role-specific menu items
- **Top bar** with role switcher (Employee ↔ Manager ↔ Admin), current user info, notifications bell
- **Content area** with smooth page transitions
- **Toast notification system** for success/error/info messages

---

### Data Layer (`js/data.js`)

Pre-seeded demo data:
- **5 Employees** across 2 departments (Engineering, Sales)
- **2 Managers** (one per department)  
- **1 Admin/HR** user
- **Sample goals** in various states (draft, submitted, approved, locked)
- **Sample check-in data** for Q1

Key data models:
```
Employee: { id, name, email, department, managerId, role }
Goal:     { id, employeeId, thrustArea, title, description, uom, target, weightage, status, achievements[], sharedFrom? }
CheckIn:  { id, goalId, quarter, planned, actual, status, managerComment, date }
AuditLog: { id, goalId, action, changedBy, changedAt, before, after }
Cycle:    { id, name, phases[], activePhase }
```

---

### Phase 1 — Goal Creation & Approval (`js/employee.js` + `js/manager.js`)

#### Employee View
- **Goal Sheet page**: Card-based list of current goals with a floating "+" button
- **Create/Edit Goal modal**:
  - Thrust Area dropdown (pre-defined: Revenue, Cost, Quality, People, Innovation)
  - Goal Title + Description (rich text area)
  - UoM selector with visual icons (Numeric, %, Timeline, Zero)
  - Target input (dynamic based on UoM — number, date, or zero)
  - Weightage slider (10% min, step 5%)
- **Live validation bar** at top showing:
  - Total weightage gauge (must = 100%)
  - Goal count (max 8)
  - Per-goal min 10% check
- **Submit button** (disabled until all validations pass)
- **Shared goals** shown with a "shared" badge, read-only fields, editable weightage

#### Manager View
- **Team Goals dashboard**: Grouped by employee, with status badges
- **Inline editing**: Click any target/weightage cell to edit directly
- **Approve / Return for Rework** buttons with comment modal
- **Push Shared Goal** button: Select goal → assign to multiple employees

---

### Phase 2 — Achievement Tracking & Check-ins (`js/employee.js` + `js/manager.js`)

#### Employee View
- **Quarterly Update page**: Shows each goal with planned target, input field for actual achievement
- **Status selector** per goal: pill-style toggle (Not Started / On Track / Completed)
- **Auto-calculated progress score** displayed in real-time using the UoM formulas
- **Window enforcement**: Check-in inputs only editable during active quarter window

#### Manager Check-in View
- **Team member list** with completion status indicators
- **Planned vs. Actual comparison** table per employee
- **Comment text area** for structured check-in documentation
- **Progress score summary** with color-coded indicators (red/amber/green)

---

### Admin / HR Module (`js/admin.js`)

- **Cycle Management**: Create/configure annual cycles, set phase dates
- **Org Hierarchy**: Tree view of departments → managers → employees
- **Goal Unlock**: Search locked goals, unlock with reason (logged to audit)
- **Audit Trail**: Searchable/filterable log of all post-lock changes
- **Completion Dashboard**: Which employees/managers have completed each phase

---

### Reporting & Analytics (`js/reports.js`)

- **Achievement Report**: Table with Planned vs. Actual for all employees, export to CSV/Excel
- **Completion Dashboard**: Real-time progress bars showing check-in completion rates
- **Analytics (Bonus)**:
  - QoQ trend line chart (Chart.js)
  - Department heatmap
  - Goal distribution by Thrust Area (doughnut chart)
  - Manager effectiveness comparison (bar chart)

---

## Verification Plan

### Automated Tests (Browser-based)
1. **Employee journey**: Create account → Add 3 goals → Validate weightage rules → Submit
2. **Manager journey**: View team goals → Inline edit → Approve → Verify lock
3. **Admin journey**: Configure cycle → Unlock a goal → Verify audit log
4. **Check-in journey**: Enter Q1 actuals → Verify progress score calculation
5. **Edge cases**: 
   - Try to exceed 8 goals
   - Try weightage < 10% or total ≠ 100%
   - Try to edit locked goals
6. **Export**: Verify CSV download works

### Manual Verification
- Visual inspection of all pages across different roles
- Responsive layout check
- Animation smoothness
- Data persistence across page reloads

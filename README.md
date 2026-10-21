# House Surgeon Schedule Planner — Full-Stack Monorepo

A mobile-first scheduling and clinical rotation planner for house surgeons (interns) in Indian medical colleges and hospitals, with an administrative dashboard for rotation matrix management.

---

## 1. Repository Architecture & Workspaces

Built as an npm workspaces monorepo:

```text
house-surgeon-planner/
├── apps/
│   ├── admin-web/            # Vite + React + TypeScript + Tailwind CSS v4 Admin Console
│   ├── hs-pwa/               # Mobile-First Installable PWA for House Surgeons
│   └── api/                  # Node.js + Express + TypeScript + Mongoose Backend
├── packages/
│   └── shared/               # Pure TypeScript contracts, date math & schedule resolution engine
├── package.json              # Monorepo workspaces definition
├── tsconfig.base.json        # Base TypeScript compiler options
├── .env.example              # Environment variables template
└── README.md
```

### Why two separate frontends exist
1. **Admin Web (`apps/admin-web`)**: Tailored for medical college administrators, department heads, and academic cell staff on desktop and tablet viewports. It emphasizes large-scale data entry, batch tree visualization, complex multi-week matrix grids, and bulk rotation publishing.
2. **House Surgeon PWA (`apps/hs-pwa`)**: Built specifically for house surgeons walking hospital wards. It provides a mobile-first, installable Progressive Web App with quick access to today's posting, the upcoming rotation countdown, a colleague directory, offline schedule browsing via the Cache API, and Web Push notifications.

---

## 2. Installation & Quick Start

Ensure Node.js (v18+ or v20+) and MongoDB (v6.0+) are installed.

### 1. Clone & Install Dependencies
From the monorepo root:

```bash
npm install
```

### 2. Environment Configuration
Copy the template file to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```ini
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hs_schedule_planner
ADMIN_WEB_URL=http://localhost:5173
HS_PWA_URL=http://localhost:5174

# Google OAuth (for HS accounts)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# JWT Keys
JWT_ACCESS_SECRET=your-32-char-minimum-access-secret-key-string
JWT_REFRESH_SECRET=your-32-char-minimum-refresh-secret-key-string

# Administrator Bootstrap
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=AdminSecurePass2026!
ADMIN_BOOTSTRAP_EMAIL=admin@institution.edu

# Web Push VAPID credentials
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@institution.edu
```

### 3. VAPID Key Generation
To generate permanent VAPID keys for Web Push:

```bash
npx web-push generate-vapid-keys
```
Paste the generated Public Key into `VAPID_PUBLIC_KEY` and Private Key into `VAPID_PRIVATE_KEY` in `.env`.

*(Note: During development, if left blank, the server will auto-generate an ephemeral VAPID keypair on boot)*.

---

## 3. Running Applications in Development

Run all or individual services:

- **Run Backend API**:
  ```bash
  npm run dev:api
  ```
  API starts at `http://localhost:5000` (Health check: `http://localhost:5000/health`).

- **Run Admin Web Console**:
  ```bash
  npm run dev:admin
  ```
  Opens at `http://localhost:5173`.

- **Run House Surgeon PWA**:
  ```bash
  npm run dev:hs
  ```
  Opens at `http://localhost:5174`.

- **Build all packages and apps**:
  ```bash
  npm run build
  ```

- **Run Unit Tests**:
  ```bash
  npm test
  ```

---

## 4. Admin Bootstrap & Security

- **Automatic Bootstrap**: On the first startup of the Express API, the server inspects the MongoDB `User` collection. If no administrator account exists, it automatically provisions the admin account configured in `ADMIN_BOOTSTRAP_USERNAME` and `ADMIN_BOOTSTRAP_PASSWORD`.
- **Standalone CLI Bootstrap Command**:
  ```bash
  npm run bootstrap:admin
  ```
- **Password Security**: Passwords are saved with `bcryptjs` using a cost factor of 12.
- **Session Architecture**: Access tokens are kept strictly in frontend memory (never in `localStorage`). Refresh sessions are rotated on every refresh and stored as secure `HttpOnly` cookies.

---

## 5. Medical College Institutions & Access Codes

- **Independent Boundaries**: Every college is a distinct tenant with its own departments, batch hierarchy, roster records, and schedule versions.
- **Secure Access Codes**: When creating or rotating an access code (e.g. `KMC-8F4A-92B1`), the plaintext is shown to the admin once. MongoDB only stores the cryptographic SHA-256 hash.
- **Membership**: House surgeons join a college using this code after signing in with Google. Leaving a college revokes access and immediately cancels pending reminder jobs without touching the user account or official roster records.

---

## 6. Official House Surgeon Roster

- **No Real-World Identifiers Required**: Official roster records require only:
  1. `name` (Doctor's name)
  2. `batchNodeIds` (Direct batch memberships)
- Registration numbers, government IDs, phone numbers, and emails are **never** required.
- Administrators can enter the entire hospital roster before any house surgeon ever creates an account.

---

## 7. Hierarchical Batches & Inheritance Engine

- **Arbitrarily Nested Batches**: Supports any depth, such as `A -> A1 -> A1a`.
- **Precomputed Ancestry**: Every batch node stores `ancestorIds` and `depth`, preventing cycle loops.
- **Track-Scoped Hierarchical Resolution**:
  - If parent batch `A` is assigned to **General Medicine**, and child batch `A1a` has no direct assignment, a doctor belonging to `A1a` inherits **General Medicine**.
  - If child batch `A1a` has an explicit assignment to **Pediatrics** in the same date range, `A1a` overrides `A` and resolves to **Pediatrics** (flagged as `isOverride: true`).
  - Other sibling descendants of `A` continue inheriting **General Medicine**.

---

## 8. Schedule Matrix Design & Duplicate Assignment Rule

### Mandatory Orientation
- **Rows represent clinical departments.**
- **Columns represent date ranges within explicit rotation tracks.**
- **Cells contain assigned batches.**

### Duplicate Assignment Prevention Rule
A batch cannot be assigned to more than one department cell during the same exact period and rotation track.
- Enforced at database level via a MongoDB unique compound index on `ScheduleAssignment`:
  ```javascript
  { scheduleVersionId: 1, rotationTrackId: 1, periodId: 1, batchNodeId: 1 } // unique: true
  ```
- The backend rejects duplicate cell insertions with HTTP 409 Conflict.
- **Overlapping tracks**: Separate tracks (e.g., Main Rotation 07–21 Oct vs. Sub-Rotation 07–14 Oct) can feature the same batch over overlapping dates.

---

## 9. PWA Installation & Offline Schedule Access

- **Installable PWA**: Features web app manifest (`manifest.json`), service worker (`sw.js`), and mobile safe-area styling.
- **Offline Snapshot**: Once synchronized, the PWA stores a versioned JSON snapshot of the college schedule in the browser **Cache API**.
- **Offline Operation**: When network is lost, the PWA shell loads from cache, and the Home, Calendar, and Directory screens compute postings offline using the deterministic schedule engine.
- **Status Indicator**: Displays `"Offline • Last synced 18 Oct, 6:40 PM"`.

---

## 10. Web Push Notifications & Limitations

- **Posting-End Reminder**: Scheduled for the day before inclusive end date (default 7:00 PM IST).
- **Posting-Start Notification**: Scheduled for the first day of the new posting (default 7:00 AM IST).
- **MongoDB-Backed Persistent Scheduler**: A background `node-cron` worker runs every 5 minutes in the Express API to claim and deliver due reminder events using `web-push`.
- **Offline Notification Limitation**: Server-scheduled Web Push notifications require network availability to reach the device. The app does not guarantee offline notification delivery if the phone is disconnected.

---

## 11. Database Indexes Summary

| Collection | Compound Index | Constraint |
|---|---|---|
| `users` | `{ email: 1 }`, `{ username: 1 }`, `{ googleSubjectId: 1 }` | Unique |
| `institutions` | `{ codeHash: 1 }`, `{ name: 1 }` | Unique hash |
| `institutionmemberships` | `{ userId: 1, institutionId: 1 }` | Unique |
| `departments` | `{ institutionId: 1, name: 1 }` | Unique |
| `batchnodes` | `{ institutionId: 1, code: 1 }` | Unique |
| `scheduleperiods` | `{ scheduleVersionId: 1, rotationTrackId: 1, startDate: 1, endDate: 1 }` | Unique |
| `scheduleassignments` | `{ scheduleVersionId: 1, rotationTrackId: 1, periodId: 1, batchNodeId: 1 }` | **Mandatory Unique** |
| `notificationevents` | `{ idempotencyKey: 1 }`, `{ status: 1, scheduledFor: 1 }` | Unique Key, Fast Index |
| `pushsubscriptions` | `{ endpoint: 1 }` | Unique |
| `authsessions` | `{ refreshTokenHash: 1 }`, `{ expiresAt: 1 }` | Unique, TTL Expire |

---

## 12. Testing

Run unit tests verifying the schedule resolution hierarchy, child overrides, multi-track coexistence, and inclusive date math:

```bash
npm run test --workspace=@hs/api
```

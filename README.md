# ExpenseIQ

**Smart Expense & Budget Manager** — a full-stack personal finance application focused on helping people track income, understand spending, manage budgets, and build healthier financial habits.

> Current status: Day 1 foundation. The dashboard currently uses illustrative sample data. Authentication, transaction persistence, budgets, reports, and other product modules will be added in upcoming milestones.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, CSS |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL |
| Database driver | node-postgres (pg) |
| API style | REST |
| CI | GitHub Actions |

## Repository structure

```text
ExpenseIQ/
├── .github/
│   └── workflows/
│       └── ci.yml
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── utils/
│   │   │   └── formatCurrency.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   └── formatCurrency.test.js
│   ├── .env.example
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 22 or later
- npm
- PostgreSQL 14 or later for database-backed features

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Vite starts the frontend at [http://localhost:5173](http://localhost:5173).

## Run the backend

Open another terminal:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The API starts at [http://localhost:5000](http://localhost:5000).

Available foundation endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check API availability |
| GET | `/api/health/database` | Check PostgreSQL configuration and connectivity |

Set `DATABASE_URL` in `backend/.env` to your PostgreSQL connection string. The database health endpoint reports an unconfigured database until this value is supplied.

## Run backend tests

```bash
cd backend
npm test
```

## Environment variables

Copy `backend/.env.example` to `backend/.env` and configure:

- `PORT`: API server port (default: 5000)
- `NODE_ENV`: runtime environment
- `CLIENT_ORIGIN`: allowed frontend origin
- `DATABASE_URL`: PostgreSQL connection string

Never commit real credentials or `.env` files.

## Development workflow

- Pushes to `main` and `develop` trigger GitHub Actions.
- Pull requests targeting those branches run the same validation workflow.
- CI checks available lint, test, and build scripts for the frontend and backend.
- Keep commits small, descriptive, and tied to real project progress.

## Planned milestones

1. Project foundation and responsive dashboard
2. PostgreSQL schema and database migrations
3. User authentication and protected routes
4. Income and expense transaction management
5. Category budgets and spending alerts
6. Analytics, reports, and savings goals
7. Receipt scanning and optional AI-powered insights
8. Integration testing and deployment

## Disclaimer

ExpenseIQ is a learning and portfolio project. The current dashboard contains sample figures only and is not connected to a bank or payment account.

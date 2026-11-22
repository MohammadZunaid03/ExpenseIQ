# ExpenseIQ

**Smart Expense & Budget Manager** — a full-stack personal finance application focused on helping people track income, understand spending, manage budgets, and build healthier financial habits.

> Current status: Day 3 authentication foundation is implemented. Users can register and sign in; the React dashboard is protected by an API-verified session. Dashboard figures are still illustrative sample data and transaction management is not connected yet.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, CSS |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL |
| Database driver | node-postgres (pg) |
| Authentication | bcryptjs password hashing, JWT access tokens |
| API style | REST |
| CI | GitHub Actions |

## Repository structure

```text
ExpenseIQ/
├── .github/workflows/ci.yml
├── frontend/
│   ├── src/
│   │   ├── lib/api.js
│   │   ├── AuthScreen.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   └── package.json
├── backend/
│   ├── db/migrations/001_initial_schema.sql
│   ├── src/
│   │   ├── config/database.js
│   │   ├── db/migrate.js
│   │   ├── middleware/requireAuth.js
│   │   ├── routes/auth.js
│   │   ├── utils/
│   │   │   ├── formatCurrency.js
│   │   │   ├── tokens.js
│   │   │   └── validateRegistration.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 22 or later
- npm
- PostgreSQL 14 or later

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Run the backend

In another terminal:

```bash
cd backend
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `backend/.env` to your PostgreSQL connection string. Replace the example `JWT_SECRET` with a unique random value of at least 32 bytes. You can generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then run:

```bash
npm run db:migrate
npm run dev
```

The API starts at [http://localhost:5000](http://localhost:5000).

## Database migrations

The first migration creates:

- `users` — account identity and password hash storage
- `categories` — income and expense categories
- `transactions` — user income and expense records
- `budgets` — category or general spending limits over a date range
- `savings_goals` — target and current savings amounts
- `schema_migrations` — applied migration history

The migration runner uses a database transaction and records each applied version, so rerunning the command does not apply the same migration twice.

```bash
npm run db:migrate
```

## Authentication API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and return an access token |
| POST | `/api/auth/login` | Verify credentials and return an access token |
| GET | `/api/auth/me` | Return the signed-in user; requires a bearer token |
| GET | `/api/health` | Check API availability |
| GET | `/api/health/database` | Check PostgreSQL connectivity |

Send protected requests with the header:

```http
Authorization: Bearer <access-token>
```

Passwords are hashed with bcryptjs before they are stored. JWTs are signed using `JWT_SECRET`; the API requires a secret of at least 32 bytes and defaults to a one-hour token lifetime. The frontend keeps the access token in session storage and removes it when the user signs out.

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
- `JWT_SECRET`: unique secret used to sign access tokens (at least 32 bytes)
- `JWT_EXPIRES_IN`: token lifetime accepted by jsonwebtoken (default: `1h`)

Never commit real credentials or `.env` files.

## Development workflow

- Pushes to `main` and `develop` trigger GitHub Actions.
- Pull requests targeting those branches run the same validation workflow.
- CI checks available lint, test, and build scripts.
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

ExpenseIQ is a learning and portfolio project. The dashboard still contains sample figures only and is not connected to a bank or payment account.

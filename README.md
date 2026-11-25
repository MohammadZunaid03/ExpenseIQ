# ExpenseIQ

**Smart Expense & Budget Manager** — a full-stack personal finance application focused on helping people track income, understand spending, manage budgets, and build healthier financial habits.

> Current status: The Day 4 income and expense transaction milestone is implemented. Users can register and sign in, then create, view, edit, delete, search and filter their own transactions. The overview cards, spending chart and budget snapshot still use illustrative sample data.

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

~~~text
ExpenseIQ/
├── .github/workflows/ci.yml
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   └── transactionValidation.js
│   │   ├── AuthScreen.jsx
│   │   ├── TransactionManager.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── tests/transactionValidation.test.js
│   ├── index.html
│   └── package.json
├── backend/
│   ├── db/migrations/001_initial_schema.sql
│   ├── src/
│   │   ├── config/database.js
│   │   ├── db/migrate.js
│   │   ├── middleware/requireAuth.js
│   │   ├── routes/auth.js
│   │   ├── routes/transactions.js
│   │   ├── utils/
│   │   │   ├── formatCurrency.js
│   │   │   ├── tokens.js
│   │   │   ├── validateRegistration.js
│   │   │   └── validateTransaction.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
└── README.md
~~~

## Prerequisites

- Node.js 22 or later
- npm
- PostgreSQL 14 or later

## Run the frontend

~~~bash
cd frontend
npm install
npm run dev
~~~

Open http://localhost:5173.

## Run the backend

In another terminal:

~~~bash
cd backend
npm install
cp .env.example .env
~~~

Set DATABASE_URL in backend/.env to your PostgreSQL connection string. Replace the example JWT_SECRET with a unique random value of at least 32 bytes. Generate one with:

~~~bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
~~~

Then apply the schema and start the API:

~~~bash
npm run db:migrate
npm run dev
~~~

The API starts at http://localhost:5000.

## Database

The initial migration creates:

- users — account identity and password hash storage
- categories — default and user-owned income and expense categories\n- transactions — user income and expense records with an optional category assignment
- transactions — user income and expense records
- budgets — category or general spending limits over a date range
- savings_goals — target and current savings amounts
- schema_migrations — applied migration history

The transactions table stores a positive NUMERIC(12, 2) amount, an income/expense type, an optional category, title, optional description and payment method, transaction date, and timestamps. Each record belongs to one user through user_id.

The migration runner uses a database transaction and records each applied version, so rerunning the command does not apply the same migration twice.

~~~bash
npm run db:migrate
~~~

## Authentication API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | /api/auth/register | Create an account and return an access token |
| POST | /api/auth/login | Verify credentials and return an access token |
| GET | /api/auth/me | Return the signed-in user; requires a bearer token |
| GET | /api/health | Check API availability |
| GET | /api/health/database | Check PostgreSQL connectivity |

## Transaction API

All transaction endpoints require the Authorization: Bearer <access-token> header. The authenticated user ID is taken from the verified JWT; clients cannot choose a user_id. List, update and delete queries are scoped to that user, and a transaction belonging to another account is returned as not found.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /api/transactions | List the signed-in user's transactions |
| POST | /api/transactions | Create an income or expense |
| PUT | /api/transactions/:id | Replace an owned transaction |
| DELETE | /api/transactions/:id | Delete an owned transaction |

GET supports these optional query parameters:

| Parameter | Accepted values | Default |
| --- | --- | --- |
| type | income or expense | all types |
| startDate | YYYY-MM-DD | no lower date bound |
| endDate | YYYY-MM-DD | no upper date bound |
| search | Up to 100 characters; matches title or description | no search |
| limit | Whole number from 1 to 100 | 20 |
| offset | Whole number from 0 to 100,000 | 0 |

Example:

~~~http
GET /api/transactions?type=expense&startDate=2026-11-01&endDate=2026-11-30&search=food&limit=20&offset=0
Authorization: Bearer <access-token>
~~~

POST and PUT accept the same JSON fields:

~~~json
{
  "type": "expense",
  "amount": "850.00",
  "title": "Grocery shopping",
  "description": "Weekly groceries",
  "paymentMethod": "UPI",
  "transactionDate": "2026-11-23"
}
~~~

Validation requires type to be income or expense, an amount greater than zero with at most two decimal places, a title up to 160 characters, a valid YYYY-MM-DD date, an optional description up to 2,000 characters, and an optional payment method up to 30 characters. Invalid payloads and filters return HTTP 400. Missing or invalid bearer tokens return HTTP 401. A record that does not belong to the signed-in user returns HTTP 404.

## Frontend transaction experience

The signed-in dashboard includes a transaction form and live transaction list connected to the API. Users can:

- Add income and expense records
- Edit or delete their own records
- Search title and description
- Filter by all transactions, income, or expenses
- See loading, API error, retry, and empty states

The overview summary cards, spending chart, and budget snapshot remain clearly labelled illustrative sample data. They are not calculated from transactions yet.

## Run tests and build

Backend tests:

~~~bash
cd backend
npm test
~~~

The transaction route tests use an injected in-memory pool to verify authentication, validation, filtering, and user-scoped create/update/delete behavior. They do not connect to PostgreSQL.

Frontend validation tests and production build:

~~~bash
cd frontend
npm test
npm run build
~~~

GitHub Actions runs frontend tests/build and backend tests for pushes to main and develop and for pull requests targeting those branches.

## Environment variables

Copy backend/.env.example to backend/.env and configure:

- PORT: API server port (default: 5000)
- NODE_ENV: runtime environment
- CLIENT_ORIGIN: allowed frontend origin
- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: unique secret used to sign access tokens (at least 32 bytes)
- JWT_EXPIRES_IN: token lifetime accepted by jsonwebtoken (default: 1h)

For the frontend, VITE_API_BASE_URL can override the default API base URL (http://localhost:5000/api).

Never commit real credentials or .env files.

## Development workflow

- Pushes to main and develop trigger GitHub Actions.
- Pull requests targeting those branches run the same validation workflow.
- CI checks available lint, test, and build scripts.
- Keep commits small, descriptive, and tied to real project progress.

## Planned milestones

1. Project foundation and responsive dashboard
2. PostgreSQL schema and database migrations
3. User authentication and protected routes
4. Income and expense transaction management — implemented
5. Category budgets and spending alerts
6. Analytics, reports, and savings goals
7. Receipt scanning and optional AI-powered insights
8. Integration testing and deployment

## Disclaimer

ExpenseIQ is a learning and portfolio project. The dashboard is not connected to a bank or payment account. Transaction records are entered manually by the signed-in user.

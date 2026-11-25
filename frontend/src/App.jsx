import { useEffect, useState } from "react";
import AuthScreen from "./AuthScreen.jsx";
import TransactionManager from "./TransactionManager.jsx";
import BudgetManager from "./BudgetManager.jsx";
import {
  clearAccessToken,
  getCurrentUser,
  getStoredAccessToken,
  storeAccessToken,
} from "./lib/api.js";

const summaryCards = [
  { label: "Total balance", amount: "₹24,560.00", change: "+8.2%", tone: "positive", icon: "↗" },
  { label: "Monthly income", amount: "₹32,000.00", change: "+4.5%", tone: "positive", icon: "↓" },
  { label: "Monthly expenses", amount: "₹7,440.00", change: "-2.1%", tone: "positive", icon: "↗" },
];

function App() {
  const [authStatus, setAuthStatus] = useState("checking");
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!getStoredAccessToken()) {
      setAuthStatus("signed-out");
      return;
    }

    getCurrentUser()
      .then((result) => {
        setUser(result.user);
        setAuthStatus("signed-in");
      })
      .catch(() => {
        clearAccessToken();
        setAuthStatus("signed-out");
      });
  }, []);

  function handleAuthenticated(result) {
    storeAccessToken(result.accessToken);
    setUser(result.user);
    setAuthStatus("signed-in");
  }

  function handleLogout() {
    clearAccessToken();
    setUser(null);
    setAuthStatus("signed-out");
  }

  if (authStatus === "checking") {
    return <div className="auth-loading" role="status">Loading your ExpenseIQ workspace…</div>;
  }

  if (authStatus === "signed-out") {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const firstName = user?.fullName?.split(" ")[0] || "there";
  const initials = (user?.fullName || "User")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="ExpenseIQ home">
          <span className="brand-mark">E</span>
          <span>Expense<span className="brand-light">IQ</span></span>
        </a>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="navigation" aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><span>▦</span> Overview</a>
          <a className="nav-link" href="#transactions"><span>↔</span> Transactions</a>
          <a className="nav-link" href="#budgets"><span>◷</span> Budgets</a>
          <a className="nav-link" href="#reports"><span>▥</span> Reports</a>
          <a className="nav-link" href="#goals"><span>◎</span> Savings goals</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">✦</span>
            <strong>Make every rupee count.</strong>
            <p>Small steps today build stronger financial habits tomorrow.</p>
          </div>
          <div className="profile">
            <div className="avatar">{initials || "U"}</div>
            <div className="profile-details">
              <strong>{user?.fullName || "Your account"}</strong>
              <small>{user?.email || "Personal workspace"}</small>
            </div>
            <button className="profile-logout" type="button" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div><span className="eyebrow">PERSONAL FINANCE</span><h1>Overview</h1></div>
          <div className="topbar-actions">
            <span className="date-label">Your financial snapshot</span>
            <button className="logout-button" type="button" onClick={handleLogout}>Log out</button>
          </div>
        </header>

        <section className="welcome-row">
          <div><h2>Good to see you, {firstName} 👋</h2><p>Here’s what’s happening with your money.</p></div>
        </section>

        <section className="summary-grid" aria-label="Illustrative financial summary">
          {summaryCards.map((card) => (
            <article className="summary-card" key={card.label}>
              <div className="card-top"><span>{card.label}</span><span className="card-icon">{card.icon}</span></div>
              <strong className="amount">{card.amount}</strong>
              <span className={"change " + card.tone}>{card.change} <span className="muted">vs. last month</span></span>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel spending-panel" id="reports">
            <div className="panel-heading"><div><h3>Spending overview</h3><p>Your spending activity at a glance</p></div><button className="select-button" type="button">This month⌄</button></div>
            <div className="chart-placeholder">
              <div className="chart-total"><span>Total spent</span><strong>₹7,440</strong><small>Monthly sample data</small></div>
              <div className="bars" aria-label="Illustrative weekly spending chart">
                {[38, 58, 44, 76, 52, 88, 64, 48, 70, 56, 94, 62].map((height, index) => <span className={index === 10 ? "bar highlight" : "bar"} style={{ height: height + "%" }} key={index} />)}
              </div>
              <div className="chart-labels"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
            </div>
          </article>

          <BudgetManager />
        </section>

        <TransactionManager />
        <p className="demo-note">The overview cards and spending chart are illustrative sample data. Transactions and budgets are saved to your signed-in account.</p>
      </main>
    </div>
  );
}

export default App;

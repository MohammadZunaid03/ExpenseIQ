import { useState } from "react";
import { loginUser, registerUser } from "./lib/api.js";

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegistering = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isRegistering && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = isRegistering
        ? await registerUser({ fullName, email, password })
        : await loginUser({ email, password });

      onAuthenticated(result);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? "Could not connect to ExpenseIQ. Check that the API server is running."
          : requestError.message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isRegistering ? "login" : "register");
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <a className="auth-brand" href="/" aria-label="ExpenseIQ home">
          <span className="brand-mark">E</span>
          <span>Expense<span className="brand-light">IQ</span></span>
        </a>
        <div className="auth-intro-copy">
          <span className="eyebrow">A CLEARER VIEW OF YOUR MONEY</span>
          <h1>Make confident decisions with every rupee.</h1>
          <p>Bring your everyday spending, budgets, and savings goals into one calm, easy-to-understand space.</p>
        </div>
        <p className="auth-intro-foot">Your money. Your plan. Your progress.</p>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <span className="auth-kicker">{isRegistering ? "GET STARTED" : "WELCOME BACK"}</span>
          <h2>{isRegistering ? "Create your account" : "Sign in to ExpenseIQ"}</h2>
          <p className="auth-subtitle">
            {isRegistering
              ? "Start building a better picture of your finances."
              : "Enter your details to open your personal workspace."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegistering && (
              <label className="auth-field">
                <span>Full name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
            )}

            <label className="auth-field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                required
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegistering ? "At least 8 characters" : "Enter your password"}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                minLength={isRegistering ? 8 : 1}
                maxLength={72}
                required
              />
            </label>

            {isRegistering && (
              <label className="auth-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </label>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait…"
                : isRegistering
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            {isRegistering ? "Already have an account?" : "New to ExpenseIQ?"}
            <button type="button" onClick={switchMode}>
              {isRegistering ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="auth-security-note">Your password is securely hashed before it is stored.</p>
        </div>
      </section>
    </main>
  );
}

export default AuthScreen;

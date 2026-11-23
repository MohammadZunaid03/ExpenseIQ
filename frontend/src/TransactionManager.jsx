import { useEffect, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from "./lib/api.js";
import { validateTransactionForm } from "./lib/transactionValidation.js";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function emptyForm() {
  return {
    type: "expense",
    amount: "",
    title: "",
    transactionDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "",
    description: "",
  };
}

function formatDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TransactionManager() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const filters = { limit: 50 };
    if (filter !== "all") filters.type = filter;
    if (search.trim()) filters.search = search.trim();

    setLoading(true);
    setLoadError("");
    getTransactions(filters)
      .then((result) => {
        if (!cancelled) setTransactions(result.transactions || []);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || "Could not load transactions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, search, refreshVersion]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormErrors({});
    setFormError("");
    setFormOpen(true);
    setNotice("");
  }

  function openEditForm(transaction) {
    setEditingId(transaction.id);
    setForm({
      type: transaction.type,
      amount: String(transaction.amount),
      title: transaction.title,
      transactionDate: transaction.transactionDate,
      paymentMethod: transaction.paymentMethod || "",
      description: transaction.description || "",
    });
    setFormErrors({});
    setFormError("");
    setFormOpen(true);
    setNotice("");
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setFormErrors({});
    setFormError("");
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateTransactionForm(form);
    setFormErrors(validation.errors);
    setFormError("");
    if (!validation.isValid) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateTransaction(editingId, form);
        setNotice("Transaction updated.");
      } else {
        await createTransaction(form);
        setNotice("Transaction added.");
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setRefreshVersion((value) => value + 1);
    } catch (error) {
      setFormError(error.message || "Could not save this transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction) {
    const confirmed = window.confirm("Delete " + transaction.title + "? This cannot be undone.");
    if (!confirmed) return;

    setDeletingId(transaction.id);
    setLoadError("");
    setNotice("");
    try {
      await deleteTransaction(transaction.id);
      setNotice("Transaction deleted.");
      setRefreshVersion((value) => value + 1);
    } catch (error) {
      setLoadError(error.message || "Could not delete this transaction.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel transactions-panel live-transactions-panel" id="transactions">
      <div className="panel-heading">
        <div>
          <h3>Transactions</h3>
          <p>Your income and expense records</p>
        </div>
        <button className="primary-button transaction-add-button" type="button" onClick={openCreateForm}>
          ＋ Add transaction
        </button>
      </div>

      <div className="transaction-toolbar">
        <label className="transaction-search">
          <span className="visually-hidden">Search transactions</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or description"
          />
        </label>
        <label className="transaction-filter">
          <span className="visually-hidden">Filter transactions by type</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All transactions</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
          </select>
        </label>
      </div>

      {notice && <p className="transaction-notice" role="status">{notice}</p>}
      {loadError && (
        <div className="transaction-error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => setRefreshVersion((value) => value + 1)}>Retry</button>
        </div>
      )}

      {formOpen && (
        <form className="transaction-form" onSubmit={handleSubmit}>
          <div className="transaction-form-heading">
            <h4>{editingId ? "Edit transaction" : "Add a transaction"}</h4>
            <span>Fields marked with * are required</span>
          </div>
          <div className="transaction-form-grid">
            <label>
              <span>Type *</span>
              <select name="type" value={form.type} onChange={handleFieldChange} required>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              {formErrors.type && <small>{formErrors.type}</small>}
            </label>
            <label>
              <span>Amount (₹) *</span>
              <input
                name="amount"
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={form.amount}
                onChange={handleFieldChange}
                placeholder="0.00"
                required
              />
              {formErrors.amount && <small>{formErrors.amount}</small>}
            </label>
            <label className="transaction-field-wide">
              <span>Title *</span>
              <input
                name="title"
                type="text"
                maxLength="160"
                value={form.title}
                onChange={handleFieldChange}
                placeholder="e.g. Monthly stipend"
                required
              />
              {formErrors.title && <small>{formErrors.title}</small>}
            </label>
            <label>
              <span>Date *</span>
              <input
                name="transactionDate"
                type="date"
                value={form.transactionDate}
                onChange={handleFieldChange}
                required
              />
              {formErrors.transactionDate && <small>{formErrors.transactionDate}</small>}
            </label>
            <label>
              <span>Payment method</span>
              <input
                name="paymentMethod"
                type="text"
                maxLength="30"
                value={form.paymentMethod}
                onChange={handleFieldChange}
                placeholder="UPI, cash, card..."
              />
              {formErrors.paymentMethod && <small>{formErrors.paymentMethod}</small>}
            </label>
            <label className="transaction-field-wide">
              <span>Description</span>
              <textarea
                name="description"
                rows="2"
                maxLength="2000"
                value={form.description}
                onChange={handleFieldChange}
                placeholder="Add an optional note"
              />
              {formErrors.description && <small>{formErrors.description}</small>}
            </label>
          </div>
          {formError && <p className="transaction-error" role="alert">{formError}</p>}
          <div className="transaction-form-actions">
            <button className="secondary-button" type="button" onClick={closeForm} disabled={saving}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Save transaction"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="transaction-state" role="status">Loading transactions…</p>
      ) : transactions.length === 0 ? (
        <div className="transaction-empty">
          <strong>{search || filter !== "all" ? "No matching transactions" : "No transactions yet"}</strong>
          <p>{search || filter !== "all"
            ? "Try changing your search or filter."
            : "Add your first income or expense to start tracking your money."}</p>
          {!search && filter === "all" && (
            <button className="text-button" type="button" onClick={openCreateForm}>Add your first transaction</button>
          )}
        </div>
      ) : (
        <div className="live-transaction-list">
          {transactions.map((transaction) => {
            const isIncome = transaction.type === "income";
            return (
              <article className="live-transaction-row" key={transaction.id}>
                <div className={"transaction-mark " + (isIncome ? "green" : "orange")}>
                  {isIncome ? "↙" : "↗"}
                </div>
                <div className="transaction-description">
                  <strong>{transaction.title}</strong>
                  <span>
                    {isIncome ? "Income" : "Expense"}
                    {transaction.paymentMethod ? " · " + transaction.paymentMethod : ""}
                    {" · " + formatDate(transaction.transactionDate)}
                  </span>
                  {transaction.description && <small>{transaction.description}</small>}
                </div>
                <strong className={isIncome ? "income" : "expense"}>
                  {isIncome ? "+" : "−"}{currency.format(Number(transaction.amount))}
                </strong>
                <div className="transaction-row-actions">
                  <button type="button" onClick={() => openEditForm(transaction)} aria-label={"Edit " + transaction.title}>Edit</button>
                  <button
                    type="button"
                    onClick={() => handleDelete(transaction)}
                    disabled={deletingId === transaction.id}
                    aria-label={"Delete " + transaction.title}
                  >
                    {deletingId === transaction.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default TransactionManager;

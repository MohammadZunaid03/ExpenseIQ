import { useEffect, useState } from "react";
import {
  createBudget,
  deleteBudget,
  getBudgets,
  getCategories,
  updateBudget,
} from "./lib/api.js";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function dateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function monthRange() {
  const now = new Date();
  return {
    periodStart: dateOnly(new Date(now.getFullYear(), now.getMonth(), 1)),
    periodEnd: dateOnly(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function emptyForm() {
  return { name: "", amountLimit: "", ...monthRange(), categoryId: "" };
}

function formatDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BudgetManager() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [budgetResult, categoryResult] = await Promise.all([getBudgets(), getCategories()]);
      setBudgets(budgetResult.budgets || []);
      setCategories((categoryResult.categories || []).filter((category) => category.type === "expense"));
    } catch (loadError) {
      setError(loadError.message || "Could not load your budgets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function openEdit(budget) {
    setEditingId(budget.id);
    setForm({
      name: budget.name,
      amountLimit: String(budget.amountLimit),
      periodStart: String(budget.periodStart).slice(0, 10),
      periodEnd: String(budget.periodEnd).slice(0, 10),
      categoryId: budget.categoryId || "",
    });
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.name.trim()) return setError("Enter a name for this budget.");
    if (!Number.isFinite(Number(form.amountLimit)) || Number(form.amountLimit) <= 0) {
      return setError("Enter a budget limit greater than zero.");
    }
    if (!form.periodStart || !form.periodEnd || form.periodEnd < form.periodStart) {
      return setError("Choose a valid date range. The end date must not be before the start date.");
    }

    setSaving(true);
    try {
      const details = {
        name: form.name.trim(),
        amountLimit: form.amountLimit,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        categoryId: form.categoryId || null,
      };
      if (editingId) {
        await updateBudget(editingId, details);
        setNotice("Budget updated.");
      } else {
        await createBudget(details);
        setNotice("Budget created.");
      }
      setFormOpen(false);
      setEditingId(null);
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Could not save this budget.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(budget) {
    if (!window.confirm("Delete the budget '" + budget.name + "'?")) return;
    setDeletingId(budget.id);
    setError("");
    setNotice("");
    try {
      await deleteBudget(budget.id);
      setNotice("Budget deleted.");
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete this budget.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel budget-manager-panel" id="budgets">
      <div className="panel-heading">
        <div>
          <h3>Your budgets</h3>
          <p>Live spending against your saved limits</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}>＋ Add budget</button>
      </div>

      {notice && <p className="transaction-notice" role="status">{notice}</p>}
      {error && (
        <div className="transaction-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadData}>Retry</button>
        </div>
      )}

      {formOpen && (
        <form className="transaction-form" onSubmit={handleSubmit}>
          <div className="transaction-form-heading">
            <h4>{editingId ? "Edit budget" : "Create a budget"}</h4>
            <span>Track total or category-specific expenses</span>
          </div>
          <div className="transaction-form-grid">
            <label className="transaction-field-wide">
              <span>Budget name *</span>
              <input name="name" value={form.name} onChange={handleChange} maxLength="120" placeholder="e.g. Monthly essentials" required />
            </label>
            <label>
              <span>Limit (₹) *</span>
              <input name="amountLimit" type="number" min="0.01" step="0.01" value={form.amountLimit} onChange={handleChange} placeholder="12000" required />
            </label>
            <label>
              <span>Expense category</span>
              <select name="categoryId" value={form.categoryId} onChange={handleChange}>
                <option value="">All expense categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label>
              <span>Start date *</span>
              <input name="periodStart" type="date" value={form.periodStart} onChange={handleChange} required />
            </label>
            <label>
              <span>End date *</span>
              <input name="periodEnd" type="date" min={form.periodStart} value={form.periodEnd} onChange={handleChange} required />
            </label>
          </div>
          <div className="transaction-form-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create budget"}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="transaction-state" role="status">Loading budgets…</p>
      ) : budgets.length === 0 ? (
        <div className="transaction-empty">
          <strong>No budgets yet</strong>
          <p>Create a spending limit to start tracking your expenses.</p>
          <button className="text-button" type="button" onClick={openCreate}>Create your first budget</button>
        </div>
      ) : (
        <div className="budget-list">
          {budgets.map((budget) => {
            const spent = Number(budget.spent);
            const limit = Number(budget.amountLimit);
            const remaining = limit - spent;
            const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            return (
              <article className="budget-item" key={budget.id}>
                <div className="budget-item-heading">
                  <div>
                    <strong>{budget.name}</strong>
                    <span>{budget.categoryName || "All expense categories"} · {formatDate(String(budget.periodStart).slice(0, 10))} – {formatDate(String(budget.periodEnd).slice(0, 10))}</span>
                  </div>
                  <div className="budget-item-actions">
                    <button type="button" onClick={() => openEdit(budget)}>Edit</button>
                    <button type="button" disabled={deletingId === budget.id} onClick={() => handleDelete(budget)}>{deletingId === budget.id ? "Deleting…" : "Delete"}</button>
                  </div>
                </div>
                <div className="budget-item-numbers">
                  <strong>{currency.format(spent)} <span>spent</span></strong>
                  <span>of {currency.format(limit)}</span>
                </div>
                <div className="budget-progress" role="progressbar" aria-label={budget.name + " usage"} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(percent, 100)}>
                  <span className={remaining < 0 ? "over" : ""} style={{ width: Math.min(Math.max(percent, 0), 100) + "%" }} />
                </div>
                <div className="budget-item-footer">
                  <span>{percent}% used</span>
                  <strong className={remaining < 0 ? "over-budget" : ""}>{remaining < 0 ? "Over by " : "Remaining "}{currency.format(Math.abs(remaining))}</strong>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default BudgetManager;

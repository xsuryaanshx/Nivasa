import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Banknote, Edit2, Trash2, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { useCustomExpenses, CustomExpense } from "@/lib/expensesStore";
import { useCurrency, formatMoney } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useCustomExpenses();
  const { currency } = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCost, setEditCost] = useState("");

  const handleEdit = (exp: CustomExpense) => {
    setEditingId(exp.id);
    setEditName(exp.name);
    setEditCost(String(exp.cost));
  };

  const handleSave = (id: string) => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    const cost = Number(editCost);
    if (isNaN(cost) || cost < 0) {
      toast.error("Please enter a valid cost");
      return;
    }
    updateExpense(id, editName.trim(), cost);
    toast.success("Expense updated");
    setEditingId(null);
  };

  const handleAdd = () => {
    addExpense("New Add-on", 0);
    // automatically enter edit mode for the newly created expense
    // Note: since it adds to the end, it might be better to just let them click edit,
    // but we can find the new one by doing this:
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight);
    }, 100);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this add-on expense?")) {
      deleteExpense(id);
      toast.success("Expense deleted");
    }
  };

  return (
    <div className="pb-20">
      <Link to="/app/profile" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
      </Link>

      <PageHeader
        title="Custom Expenses"
        subtitle="Define add-on expenses like Laundry or Mess. You can apply these to specific tenants."
        action={
          <MagneticButton onClick={handleAdd}>
            <Plus className="h-4 w-4" /> Add Expense
          </MagneticButton>
        }
      />

      <div className="mt-6 space-y-3">
        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Banknote className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">No custom expenses</h3>
            <p className="mt-1 text-xs text-muted-foreground">Click 'Add Expense' to create one.</p>
          </div>
        ) : (
          expenses.map((exp) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              {editingId === exp.id ? (
                <div className="flex w-full flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expense Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Laundry"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cost per month ({currency.symbol})</label>
                    <input
                      type="number"
                      value={editCost}
                      onChange={(e) => setEditCost(e.target.value)}
                      placeholder="Amount"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex items-end gap-2 pt-2 sm:pt-0">
                    <button
                      onClick={() => handleSave(exp.id)}
                      className="flex h-9 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 transition"
                    >
                      <Check className="h-4 w-4 mr-1" /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Banknote className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{exp.name}</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        {formatMoney(exp.cost, currency, { decimals: 0 })} / month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(exp)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

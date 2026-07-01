import { useState, useEffect } from "react";
import { nivasaApi } from "./api";

export interface CustomExpense {
  id: string;
  name: string;
  cost: number;
}

const STORAGE_KEY = "nivasa_custom_expenses";

const defaultExpenses: CustomExpense[] = [
  { id: "e1", name: "Laundry", cost: 500 },
  { id: "e2", name: "Food / Mess", cost: 3000 },
];

export function getLocalExpenses(): CustomExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(e => typeof e.id === "string" && typeof e.name === "string" && typeof e.cost === "number")) {
        return parsed;
      }
    }
  } catch (e) {}
  return defaultExpenses;
}

export function saveLocalExpenses(expenses: CustomExpense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  window.dispatchEvent(new Event("nivasa:expenses-updated"));
}

export function useCustomExpenses() {
  const [expenses, setExpenses] = useState<CustomExpense[]>(getLocalExpenses());

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const { data: { session } } = await nivasaApi.supabase.auth.getSession();
        if (!session) return;
        const data = await nivasaApi.getExpenseTemplates();
        if (data && data.length > 0) {
          const mapped = data.map(d => ({ id: d.id, name: d.name, cost: Number(d.cost) }));
          setExpenses(mapped);
          saveLocalExpenses(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch custom expenses from Supabase", err);
      }
    };
    fetchExpenses();

    const handler = () => setExpenses(getLocalExpenses());
    window.addEventListener("nivasa:expenses-updated", handler);
    return () => window.removeEventListener("nivasa:expenses-updated", handler);
  }, []);

  const addExpense = async (name: string, cost: number) => {
    try {
      const { data: { session } } = await nivasaApi.supabase.auth.getSession();
      if (session) {
        const d = await nivasaApi.addExpenseTemplate({ name, cost });
        if (d) {
          const current = getLocalExpenses();
          current.push({ id: d.id, name: d.name, cost: Number(d.cost) });
          saveLocalExpenses(current);
          nivasaApi.logFeatureUsage("expense_management", "add_custom_expense", { name, cost });
          return;
        }
      }
    } catch {}
    
    // Fallback to local
    const current = getLocalExpenses();
    const id = "exp_" + Date.now().toString(36);
    current.push({ id, name, cost });
    saveLocalExpenses(current);
  };

  const updateExpense = async (id: string, name: string, cost: number) => {
    try {
      const { data: { session } } = await nivasaApi.supabase.auth.getSession();
      if (session && !id.startsWith("exp_") && !id.startsWith("e")) {
        await nivasaApi.updateExpenseTemplate(id, name, cost);
      }
    } catch {}

    const current = getLocalExpenses();
    const index = current.findIndex((e) => e.id === id);
    if (index !== -1) {
      current[index] = { id, name, cost };
      saveLocalExpenses(current);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { data: { session } } = await nivasaApi.supabase.auth.getSession();
      if (session && !id.startsWith("exp_") && !id.startsWith("e")) {
        await nivasaApi.deleteExpenseTemplate(id);
      }
    } catch {}

    const current = getLocalExpenses();
    saveLocalExpenses(current.filter((e) => e.id !== id));
  };

  return { expenses, addExpense, updateExpense, deleteExpense };
}

export function getTenantExpenses(tenantId: string): string[] {
  try {
    const raw = localStorage.getItem(`nivasa_tenant_exp_${tenantId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveTenantExpenses(tenantId: string, expenseIds: string[]) {
  localStorage.setItem(`nivasa_tenant_exp_${tenantId}`, JSON.stringify(expenseIds));
  // Fire refresh to update UI in RoomDetails
  window.dispatchEvent(new Event("nivasa:refresh"));
}

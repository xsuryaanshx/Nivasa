import { useState, useEffect } from "react";

export interface CustomExpense {
  id: string;
  name: string;
  cost: number;
}

const STORAGE_KEY = "nivasa_custom_expenses";

export function getCustomExpenses(): CustomExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [
    { id: "e1", name: "Laundry", cost: 500 },
    { id: "e2", name: "Food / Mess", cost: 3000 },
  ];
}

export function saveCustomExpenses(expenses: CustomExpense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  window.dispatchEvent(new Event("nivasa:expenses-updated"));
}

export function addCustomExpense(name: string, cost: number) {
  const current = getCustomExpenses();
  const id = "exp_" + Date.now().toString(36);
  current.push({ id, name, cost });
  saveCustomExpenses(current);
}

export function updateCustomExpense(id: string, name: string, cost: number) {
  const current = getCustomExpenses();
  const index = current.findIndex((e) => e.id === id);
  if (index !== -1) {
    current[index] = { id, name, cost };
    saveCustomExpenses(current);
  }
}

export function deleteCustomExpense(id: string) {
  const current = getCustomExpenses();
  saveCustomExpenses(current.filter((e) => e.id !== id));
}

export function useCustomExpenses() {
  const [expenses, setExpenses] = useState<CustomExpense[]>(getCustomExpenses());

  useEffect(() => {
    const handler = () => setExpenses(getCustomExpenses());
    window.addEventListener("nivasa:expenses-updated", handler);
    return () => window.removeEventListener("nivasa:expenses-updated", handler);
  }, []);

  return {
    expenses,
    addExpense: addCustomExpense,
    updateExpense: updateCustomExpense,
    deleteExpense: deleteCustomExpense,
  };
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

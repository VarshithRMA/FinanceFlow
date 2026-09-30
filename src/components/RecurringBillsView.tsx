import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit2,
  RotateCw,
  AlertCircle,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { RecurringItem } from '../types/finance';

export const RecurringBillsView: React.FC = () => {
  const {
    recurring,
    categories,
    selectedMonth,
    addRecurringItem,
    updateRecurringItem,
    deleteRecurringItem,
    recordRecurringPayment,
  } = useFinance();

  const [isAdding, setIsAdding] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [account, setAccount] = useState('Primary Checking');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [notes, setNotes] = useState('');
  const [recordedToast, setRecordedToast] = useState<string | null>(null);

  // Category map
  const catMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[0]>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  // Total recurring commitments
  const totalMonthlyRecurring = useMemo(() => {
    return recurring
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => {
        if (r.frequency === 'monthly') return sum + r.amount;
        if (r.frequency === 'weekly') return sum + r.amount * 4.33;
        if (r.frequency === 'yearly') return sum + r.amount / 12;
        return sum + r.amount;
      }, 0);
  }, [recurring]);

  // Sort by day of month
  const sortedRecurring = useMemo(() => {
    return [...recurring].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [recurring]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim() || amount <= 0) return;

    addRecurringItem({
      merchant: merchant.trim(),
      amount,
      categoryId,
      account,
      frequency,
      dayOfMonth,
      status: 'active',
      notes: notes.trim(),
    });

    setMerchant('');
    setAmount(0);
    setNotes('');
    setIsAdding(false);
  };

  const handleRecord = (id: string, name: string) => {
    recordRecurringPayment(id);
    setRecordedToast(`Payment logged for "${name}" on 2026-09-30.`);
    setTimeout(() => setRecordedToast(null), 3500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Automated Subscription & Bill Tracker</span>
            <span aria-hidden="true">·</span>
            <span>Forecast Schedule</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{recurring.length} Subscriptions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Recurring Bills & Fixed Commitments
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Monitor predictable monthly obligations, projected debit days, and post charges with one click.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Cancel' : 'Add Recurring Bill'}</span>
        </button>
      </div>

      {/* Toast */}
      {recordedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{recordedToast}</span>
          </div>
          <button
            onClick={() => setRecordedToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 font-medium">Monthly Committed Fixed Total</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            ${totalMonthlyRecurring.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Across {recurring.filter((r) => r.status === 'active').length} active recurring plans
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 font-medium">Annualized Fixed Impact</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            ${(totalMonthlyRecurring * 12).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Baseline annual expenses before discretionary spend
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 font-medium">Automated Ledger Logging</div>
          <div className="text-sm font-semibold text-slate-800 mt-1">
            Real-time Status Tracking
          </div>
          <div className="text-xs text-slate-500 mt-2 leading-relaxed">
            Record charges immediately as bank debits occur to maintain accurate monthly pacing.
          </div>
        </div>
      </div>

      {/* Add Recurring Form */}
      {isAdding && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-white border-2 border-slate-900 rounded-lg p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Add Recurring Obligation</h3>
            <span className="text-xs text-slate-400">Fixed bills & subscriptions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Provider / Merchant</label>
              <input
                type="text"
                required
                placeholder="e.g. ConEdison, Spotify, Rent"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Billing Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cadence</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Payment Account</label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="e.g. Primary Checking, Chase"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Plan details, contract terms"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800"
            >
              Save Recurring Item
            </button>
          </div>
        </form>
      )}

      {/* Recurring Schedule Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recurring Bills Schedule
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Arranged chronologically by expected day of billing.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Active in {selectedMonth}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-24">Due Day</th>
                <th className="py-3 px-4">Provider & Service</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRecurring.map((item) => {
                const cat = catMap.get(item.categoryId);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-700">
                      Day {item.dayOfMonth}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.merchant}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="capitalize">{item.frequency}</span>
                        {item.lastBilledDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Last logged: {item.lastBilledDate}</span>
                          </>
                        )}
                        {item.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.notes}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat?.color || '#94a3b8' }}
                        />
                        <span className="font-medium text-slate-800">{cat?.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {item.account}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ${item.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() =>
                          updateRecurringItem({
                            ...item,
                            status: item.status === 'active' ? 'paused' : 'active',
                          })
                        }
                        className={`text-xs font-medium cursor-pointer ${
                          item.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {item.status === 'active' ? 'Active' : 'Paused'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRecord(item.id, item.merchant)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
                          title="Record payment into ledger for this month"
                        >
                          Log Payment
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete recurring bill "${item.merchant}"?`)) {
                              deleteRecurringItem(item.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                          title="Delete bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

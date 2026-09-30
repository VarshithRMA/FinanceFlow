import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types/finance';
import { runAutoCategorizer } from '../utils/automation';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  editingTransaction,
}) => {
  const { categories, rules, addTransaction, updateTransaction, selectedMonth, autoCategorizationService } = useFinance();

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [account, setAccount] = useState('Chase Sapphire');
  const [date, setDate] = useState('2026-09-30');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (editingTransaction) {
      setMerchant(editingTransaction.merchant);
      setAmount(editingTransaction.amount);
      setType(editingTransaction.type);
      setCategoryId(editingTransaction.categoryId);
      setAccount(editingTransaction.account);
      setDate(editingTransaction.date);
      setNotes(editingTransaction.notes || '');
      setIsRecurring(Boolean(editingTransaction.isRecurring));
      setManualOverride(true);
    } else {
      setMerchant('');
      setAmount('');
      setType('expense');
      setCategoryId('');
      setAccount('Chase Sapphire');
      // Set default date to current selected month date
      setDate(`${selectedMonth}-28`);
      setNotes('');
      setIsRecurring(false);
      setManualOverride(false);
    }
  }, [editingTransaction, isOpen, selectedMonth]);

  // Live auto-match engine via autoCategorizationService
  const liveMatch = useMemo(() => {
    if (!merchant.trim() || manualOverride) return null;
    return autoCategorizationService.categorizeByMerchant(
      merchant,
      notes,
      typeof amount === 'number' ? amount : 0
    );
  }, [merchant, amount, notes, autoCategorizationService, manualOverride]);

  // Automatically update category if matched and not manually overridden
  useEffect(() => {
    if (!manualOverride && liveMatch?.categoryId) {
      setCategoryId(liveMatch.categoryId);
    } else if (!manualOverride && !categoryId) {
      setCategoryId(type === 'income' ? 'cat-salary' : 'cat-shopping');
    }
  }, [liveMatch, manualOverride, type]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim() || !amount || Number(amount) <= 0) return;

    const numAmount = Number(amount);
    const finalCatId = categoryId || (type === 'income' ? 'cat-salary' : 'cat-shopping');

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        merchant: merchant.trim(),
        amount: numAmount,
        type,
        categoryId: finalCatId,
        account,
        date,
        notes: notes.trim(),
        isRecurring,
      });
    } else {
      const match = runAutoCategorizer({ merchant, amount: numAmount, notes }, rules);
      addTransaction({
        merchant: merchant.trim(),
        amount: numAmount,
        type,
        categoryId: finalCatId,
        account,
        date,
        notes: notes.trim(),
        autoCategorized: Boolean(match.categoryId && match.categoryId === finalCatId),
        matchedRuleId: match.ruleId,
        matchedRuleName: match.ruleName,
        isRecurring,
      });
    }

    onClose();
  };

  const matchedCat = categories.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingTransaction ? 'Edit Transaction' : 'Log New Transaction'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live automated rule matching assigns category instantly.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Selector Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (!manualOverride) setCategoryId('cat-shopping');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                type === 'expense'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expense Outflow
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                if (!manualOverride) setCategoryId('cat-salary');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                type === 'income'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income Inflow
            </button>
          </div>

          {/* Merchant / Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Merchant / Counterparty
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Whole Foods, Uber, Spotify, Acme Corp"
              value={merchant}
              onChange={(e) => {
                setMerchant(e.target.value);
                setManualOverride(false);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-500"
              autoFocus
            />

            {/* Live Auto-Categorization Feedback (Zero-pill discipline) */}
            {liveMatch?.categoryId && (
              <div className="mt-1.5 text-[11px] text-emerald-700 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Auto-detected:</span>
                <span className="font-semibold">{matchedCat?.name}</span>
                {liveMatch.ruleName && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-500">via rule "{liveMatch.ruleName}"</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {/* Category & Payment Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Category</label>
                {manualOverride && (
                  <span className="text-[10px] text-slate-400">Manual override</span>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setManualOverride(true);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.group})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Account</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-500"
              >
                <option value="Primary Checking">Primary Checking</option>
                <option value="Chase Sapphire">Chase Sapphire</option>
                <option value="Amex Gold">Amex Gold</option>
                <option value="Savings Reserve">Savings Reserve</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Tags</label>
            <input
              type="text"
              placeholder="e.g. Client lunch, grocery supplies, tax-deductible"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Recurring checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Mark as recurring monthly charge</span>
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
            >
              {editingTransaction ? 'Save Changes' : 'Log Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

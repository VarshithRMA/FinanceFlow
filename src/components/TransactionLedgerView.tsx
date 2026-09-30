import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  UploadCloud,
  FileText,
  RotateCw,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar,
  CreditCard,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Transaction } from '../types/finance';

interface TransactionLedgerViewProps {
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenScanModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const TransactionLedgerView: React.FC<TransactionLedgerViewProps> = ({
  onOpenAddModal,
  onOpenImportModal,
  onOpenScanModal,
  onEditTransaction,
}) => {
  const {
    transactions,
    categories,
    selectedMonth,
    deleteTransaction,
    runAllRulesOnTransactions,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [filterByMonthOnly, setFilterByMonthOnly] = useState(true);
  const [reRunStatus, setReRunStatus] = useState<string | null>(null);

  // Category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[0]>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  // Accounts list
  const accounts = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) if (t.account) set.add(t.account);
    return Array.from(set);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Month filter
      if (filterByMonthOnly && !tx.date.startsWith(selectedMonth)) {
        return false;
      }
      // Type filter
      if (selectedTypeFilter !== 'all' && tx.type !== selectedTypeFilter) {
        return false;
      }
      // Category filter
      if (selectedCategoryFilter !== 'all' && tx.categoryId !== selectedCategoryFilter) {
        return false;
      }
      // Account filter
      if (selectedAccountFilter !== 'all' && tx.account !== selectedAccountFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchMerchant = tx.merchant.toLowerCase().includes(query);
        const matchNotes = (tx.notes || '').toLowerCase().includes(query);
        const matchRule = (tx.matchedRuleName || '').toLowerCase().includes(query);
        const catName = categoryMap.get(tx.categoryId)?.name.toLowerCase() || '';
        const matchCat = catName.includes(query);
        if (!matchMerchant && !matchNotes && !matchRule && !matchCat) {
          return false;
        }
      }
      return true;
    });
  }, [
    transactions,
    filterByMonthOnly,
    selectedMonth,
    selectedTypeFilter,
    selectedCategoryFilter,
    selectedAccountFilter,
    searchQuery,
    categoryMap,
  ]);

  const handleReRunRules = () => {
    const result = runAllRulesOnTransactions();
    setReRunStatus(`Evaluated active rules: updated ${result.matchedCount} transaction categories.`);
    setTimeout(() => setReRunStatus(null), 4000);
  };

  // Subtotals for current filtered view
  const { totalFilteredExpenses, totalFilteredIncome } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    for (const t of filteredTransactions) {
      if (t.type === 'expense') exp += t.amount;
      else inc += t.amount;
    }
    return { totalFilteredExpenses: exp, totalFilteredIncome: inc };
  }, [filteredTransactions]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Automated Expense Engine</span>
            <span aria-hidden="true">·</span>
            <span>Real-time Classification</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{filteredTransactions.length} records</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Expense & Outflow Ledger
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Audit, reclassify, or search automated bank charges with linked rule triggers.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReRunRules}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            title="Re-run all active auto-categorization rules against existing ledger"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Re-run Rules</span>
          </button>

          <button
            onClick={onOpenScanModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            title="Scan or parse receipt image/text"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Scan Receipt</span>
          </button>

          <button
            onClick={onOpenImportModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Feed</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Notification Toast for Rule Execution */}
      {reRunStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reRunStatus}</span>
          </div>
          <button
            onClick={() => setReRunStatus(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search merchant, notes, or matched rule name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-400"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Account Filter */}
            <select
              value={selectedAccountFilter}
              onChange={(e) => setSelectedAccountFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-400"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: Segmented Controls for Type and Month Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Segmented Type Filter Buttons */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                selectedTypeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedTypeFilter('expense')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                selectedTypeFilter === 'expense'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setSelectedTypeFilter('income')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                selectedTypeFilter === 'income'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income
            </button>
          </div>

          {/* Month Scope Toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
              <input
                type="checkbox"
                checked={filterByMonthOnly}
                onChange={(e) => setFilterByMonthOnly(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Limit to active month ({selectedMonth})</span>
            </label>

            {/* Quick summary totals */}
            <div className="hidden sm:flex items-center gap-3 text-slate-500 font-mono tabular-nums">
              <span>Expenses: ${totalFilteredExpenses.toFixed(2)}</span>
              <span>·</span>
              <span>Income: ${totalFilteredIncome.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* High-Density Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-28">Date</th>
                <th className="py-3 px-4">Merchant & Automation Status</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing filters or log a new transaction to start tracking.
                    </p>
                    <button
                      onClick={onOpenAddModal}
                      className="mt-4 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
                    >
                      + Log First Expense
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Merchant & Rule Metadata (Zero-pill discipline: unboxed text with · separators) */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{tx.merchant}</span>
                          {tx.isRecurring && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Recurring)
                            </span>
                          )}
                        </div>

                        {/* Unboxed Metadata Line with typographic separators */}
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {tx.autoCategorized ? (
                            <>
                              <span className="text-emerald-700 font-medium">Auto-Categorized</span>
                              {tx.matchedRuleName && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-slate-500 truncate max-w-[200px]">
                                    Rule: {tx.matchedRuleName}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">Manual Entry</span>
                          )}

                          {tx.notes && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-slate-400 truncate max-w-[220px]" title={tx.notes}>
                                {tx.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat?.color || '#94a3b8' }}
                          />
                          <span className="text-slate-800 font-medium">
                            {cat?.name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {cat?.group}
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {tx.account || 'Checking'}
                      </td>

                      {/* Amount: Tabular Monospace Right-aligned */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                        <span
                          className={
                            tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                          }
                        >
                          {tx.type === 'income' ? '+' : '-'}$
                          {tx.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete transaction "${tx.merchant}"?`)) {
                                deleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

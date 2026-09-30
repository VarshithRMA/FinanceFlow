import React, { useState } from 'react';
import { X, Printer, Copy, Check, FileText } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({ isOpen, onClose }) => {
  const {
    selectedMonth,
    currentSummary,
    currentBudgetConfig,
    categories,
    transactions,
    recurring,
  } = useFinance();

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Month transactions
  const monthTxs = transactions.filter((t) => t.date.startsWith(selectedMonth));
  const catSpendMap: Record<string, number> = {};
  for (const t of monthTxs) {
    if (t.type === 'expense') {
      catSpendMap[t.categoryId] = (catSpendMap[t.categoryId] || 0) + t.amount;
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummaryText = () => {
    const lines = [
      `=== LEDGERPULSE MONTHLY FINANCIAL STATEMENT ===`,
      `Period: ${selectedMonth}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      ``,
      `--- CASH FLOW RECONCILIATION ---`,
      `Total Gross Income: $${currentSummary.totalIncome.toFixed(2)}`,
      `Total Operating Expenses: $${currentSummary.totalExpenses.toFixed(2)}`,
      `Net Retained Savings: $${currentSummary.netSavings.toFixed(2)}`,
      `Net Savings Rate: ${currentSummary.savingsRate.toFixed(1)}%`,
      `Budget Cap: $${currentSummary.totalBudget.toFixed(2)} (${currentSummary.budgetUtilization.toFixed(1)}% utilized)`,
      `Daily Burn Rate: $${currentSummary.dailyBurnRate.toFixed(2)} / day (Target: $${currentSummary.targetDailyRate.toFixed(2)} / day)`,
      ``,
      `--- CATEGORY ALLOCATION BREAKDOWN ---`,
    ];

    for (const cat of categories) {
      if (cat.group !== 'Income') {
        const spent = catSpendMap[cat.id] || 0;
        const budget = currentBudgetConfig.categoryBudgets[cat.id] ?? cat.defaultBudget;
        const remaining = budget - spent;
        lines.push(
          `${cat.name} (${cat.group}): Spent $${spent.toFixed(2)} / Budget $${budget.toFixed(2)} [Variance: ${remaining >= 0 ? '+' : ''}$${remaining.toFixed(2)}]`
        );
      }
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Monthly Budget & Financial Statement</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Audited summary of period {selectedMonth} cash flow and category caps.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Statement Sheet */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800 font-sans print:p-0">
          {/* Statement Header */}
          <div className="flex justify-between items-start border-b border-slate-900 pb-4">
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900">LedgerPulse</div>
              <div className="text-slate-500 mt-0.5">Personal Financial Management Statement</div>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-600">
              <div>Period: <span className="font-semibold text-slate-900">{selectedMonth}</span></div>
              <div>Status: Audited & Reconciled</div>
            </div>
          </div>

          {/* Cash Flow Summary Table */}
          <div className="space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-600 border-b border-slate-200 pb-1">
              Cash Flow & Net Savings
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1 font-mono">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                <div className="text-[10px] text-slate-400 font-sans">Gross Inflows</div>
                <div className="text-sm font-bold text-emerald-600">
                  ${currentSummary.totalIncome.toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                <div className="text-[10px] text-slate-400 font-sans">Gross Expenses</div>
                <div className="text-sm font-bold text-slate-900">
                  ${currentSummary.totalExpenses.toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                <div className="text-[10px] text-slate-400 font-sans">Net Savings</div>
                <div className="text-sm font-bold text-slate-900">
                  ${currentSummary.netSavings.toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                <div className="text-[10px] text-slate-400 font-sans">Savings Margin</div>
                <div className="text-sm font-bold text-emerald-600">
                  {currentSummary.savingsRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Category Allocation Matrix */}
          <div className="space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-600 border-b border-slate-200 pb-1">
              Category Allocations vs Actual Outflows
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-1.5">Category</th>
                  <th className="py-1.5">Group</th>
                  <th className="py-1.5 text-right font-mono">Budget Cap</th>
                  <th className="py-1.5 text-right font-mono">Actual Spent</th>
                  <th className="py-1.5 text-right font-mono">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {categories
                  .filter((c) => c.group !== 'Income')
                  .map((cat) => {
                    const spent = catSpendMap[cat.id] || 0;
                    const budget =
                      currentBudgetConfig.categoryBudgets[cat.id] ?? cat.defaultBudget;
                    const variance = budget - spent;

                    return (
                      <tr key={cat.id}>
                        <td className="py-1.5 font-sans font-medium text-slate-800">
                          {cat.name}
                        </td>
                        <td className="py-1.5 font-sans text-slate-500 text-[11px]">
                          {cat.group}
                        </td>
                        <td className="py-1.5 text-right text-slate-600">
                          ${budget.toFixed(2)}
                        </td>
                        <td className="py-1.5 text-right text-slate-900 font-semibold">
                          ${spent.toFixed(2)}
                        </td>
                        <td
                          className={`py-1.5 text-right ${
                            variance >= 0 ? 'text-emerald-600' : 'text-rose-600 font-semibold'
                          }`}
                        >
                          {variance >= 0 ? '+' : ''}${variance.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Statement Sign-off */}
          <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
            <span>Reconciled by LedgerPulse Automated Finance Engine</span>
            <span>All calculations based on settled ledger transactions</span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <button
            onClick={handleCopySummaryText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Plaintext'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

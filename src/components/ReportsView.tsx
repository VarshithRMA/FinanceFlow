import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
  PieChart,
  DollarSign,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { calculateMonthSummary } from '../utils/automation';

interface ReportsViewProps {
  onOpenExportModal: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onOpenExportModal }) => {
  const {
    transactions,
    categories,
    budgetConfigs,
    selectedMonth,
    availableMonths,
  } = useFinance();

  // Compute summaries for all available months
  const monthlySummaries = useMemo(() => {
    return availableMonths.map((m) => {
      const config = budgetConfigs[m] || {
        month: m,
        incomeTarget: 7500,
        savingsTarget: 1500,
        categoryBudgets: {},
      };
      return calculateMonthSummary(m, transactions, config, categories);
    });
  }, [availableMonths, transactions, budgetConfigs, categories]);

  // Current month summary
  const currentSummary = useMemo(() => {
    return (
      monthlySummaries.find((s) => s.month === selectedMonth) ||
      monthlySummaries[0]
    );
  }, [monthlySummaries, selectedMonth]);

  // Prior month summary for variance calculation
  const priorMonthSummary = useMemo(() => {
    const idx = monthlySummaries.findIndex((s) => s.month === selectedMonth);
    if (idx !== -1 && idx + 1 < monthlySummaries.length) {
      return monthlySummaries[idx + 1];
    }
    return null;
  }, [monthlySummaries, selectedMonth]);

  // Variance deltas
  const expenseMoMVariance = useMemo(() => {
    if (!priorMonthSummary || priorMonthSummary.totalExpenses === 0) return 0;
    return (
      ((currentSummary.totalExpenses - priorMonthSummary.totalExpenses) /
        priorMonthSummary.totalExpenses) *
      100
    );
  }, [currentSummary, priorMonthSummary]);

  const savingsMoMVariance = useMemo(() => {
    if (!priorMonthSummary || priorMonthSummary.netSavings === 0) return 0;
    return (
      ((currentSummary.netSavings - priorMonthSummary.netSavings) /
        Math.abs(priorMonthSummary.netSavings)) *
      100
    );
  }, [currentSummary, priorMonthSummary]);

  // Spending group breakdown for active month
  const groupBreakdown = useMemo(() => {
    const monthTxs = transactions.filter(
      (t) => t.date.startsWith(selectedMonth) && t.type === 'expense'
    );
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const groups: Record<string, number> = {
      Essentials: 0,
      Discretionary: 0,
      'Savings & Investments': 0,
    };

    let total = 0;
    for (const t of monthTxs) {
      const cat = catMap.get(t.categoryId);
      const grp = cat?.group || 'Discretionary';
      if (groups[grp] !== undefined) {
        groups[grp] += t.amount;
        total += t.amount;
      }
    }

    return {
      groups,
      total,
      essentialsPct: total > 0 ? (groups['Essentials'] / total) * 100 : 0,
      discretionaryPct: total > 0 ? (groups['Discretionary'] / total) * 100 : 0,
      savingsPct: total > 0 ? (groups['Savings & Investments'] / total) * 100 : 0,
    };
  }, [transactions, selectedMonth, categories]);

  // Export CSV
  const handleExportCSV = () => {
    const monthTxs = transactions.filter((t) => t.date.startsWith(selectedMonth));
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const headers = ['Date', 'Merchant', 'Type', 'Category', 'Account', 'Amount', 'AutoCategorized', 'Notes'];
    const rows = monthTxs.map((t) => [
      t.date,
      `"${t.merchant.replace(/"/g, '""')}"`,
      t.type,
      `"${catMap.get(t.categoryId) || 'Unassigned'}"`,
      `"${t.account || ''}"`,
      t.amount.toFixed(2),
      t.autoCategorized ? 'true' : 'false',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ledgerpulse-expenses-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Historical Analytics</span>
            <span aria-hidden="true">·</span>
            <span>Month-over-Month Variance</span>
            <span aria-hidden="true">·</span>
            <span>Audited Statements</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Monthly Performance & Variance Reports
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Compare longitudinal spending trajectory, net retention, and group ratios across periods.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Financial Statement</span>
          </button>
        </div>
      </div>

      {/* Month-over-Month Delta Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 font-medium">Active Outflow ({selectedMonth})</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            ${currentSummary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {priorMonthSummary ? (
              <>
                <span
                  className={`font-semibold font-mono tabular-nums flex items-center ${
                    expenseMoMVariance <= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {expenseMoMVariance > 0 ? '+' : ''}
                  {expenseMoMVariance.toFixed(1)}% MoM
                </span>
                <span className="text-slate-400">vs prior period (${priorMonthSummary.totalExpenses.toFixed(0)})</span>
              </>
            ) : (
              <span className="text-slate-400">No prior baseline record</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 font-medium">Net Savings & Retention</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 tracking-tight">
            ${currentSummary.netSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-800 font-mono tabular-nums">
              {currentSummary.savingsRate.toFixed(1)}%
            </span>
            <span className="text-slate-400">of gross revenue retained</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 font-medium">Budget Discipline Status</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            {currentSummary.budgetUtilization.toFixed(0)}%
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {currentSummary.pacingStatus === 'on-track' ? (
              <span className="text-emerald-700 font-semibold">Under Allocated Cap</span>
            ) : currentSummary.pacingStatus === 'approaching-limit' ? (
              <span className="text-amber-700 font-semibold">Approaching Cap Limit</span>
            ) : (
              <span className="text-rose-700 font-semibold">Exceeded Cap Limit</span>
            )}
          </div>
        </div>
      </div>

      {/* Spending Group Share Distribution (Zero-pill discipline) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Spending Group Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Portfolio distribution against benchmark 50/30/20 lifestyle standards.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Total Outflow: ${groupBreakdown.total.toFixed(2)}
          </div>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-sky-600 transition-all duration-300"
            style={{ width: `${groupBreakdown.essentialsPct}%` }}
            title={`Essentials: ${groupBreakdown.essentialsPct.toFixed(1)}%`}
          />
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${groupBreakdown.discretionaryPct}%` }}
            title={`Discretionary: ${groupBreakdown.discretionaryPct.toFixed(1)}%`}
          />
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${groupBreakdown.savingsPct}%` }}
            title={`Savings & Investments: ${groupBreakdown.savingsPct.toFixed(1)}%`}
          />
        </div>

        {/* Group Legend & Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 inline-block" />
                Essentials
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {groupBreakdown.essentialsPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900">
              ${groupBreakdown.groups['Essentials'].toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Target: ~50% (Housing, Utilities, Groceries, Transit)
            </div>
          </div>

          <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                Discretionary
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {groupBreakdown.discretionaryPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900">
              ${groupBreakdown.groups['Discretionary'].toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Target: ~30% (Dining, Entertainment, Shopping)
            </div>
          </div>

          <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Savings & Investments
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {groupBreakdown.savingsPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900">
              ${groupBreakdown.groups['Savings & Investments'].toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Target: ~20% (Index Funds, Emergency Fund)
            </div>
          </div>
        </div>
      </div>

      {/* Historical Monthly Comparative Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Multi-Month Historical Ledger Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side reconciliation of historical revenue, expense burn, and savings margins.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">Quarterly View</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-right">Gross Income</th>
                <th className="py-3 px-4 text-right">Total Outflow</th>
                <th className="py-3 px-4 text-right">Budget Limit</th>
                <th className="py-3 px-4 text-right">Net Savings</th>
                <th className="py-3 px-4 text-right">Savings Rate</th>
                <th className="py-3 px-4 text-center">Discipline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlySummaries.map((summary) => (
                <tr
                  key={summary.month}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    summary.month === selectedMonth ? 'bg-slate-50/70 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {summary.month}
                    {summary.month === selectedMonth && (
                      <span className="text-[11px] text-emerald-600 ml-2 font-normal">
                        (Active)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 font-semibold">
                    ${summary.totalIncome.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                    ${summary.totalExpenses.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                    ${summary.totalBudget.toFixed(2)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                      summary.netSavings >= 0 ? 'text-slate-900' : 'text-rose-600'
                    }`}
                  >
                    ${summary.netSavings.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {summary.savingsRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-xs font-medium ${
                        summary.pacingStatus === 'over-budget'
                          ? 'text-rose-600'
                          : summary.pacingStatus === 'approaching-limit'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {summary.budgetUtilization.toFixed(0)}% Cap
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

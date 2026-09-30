import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  DollarSign,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { getDailySpendingTimeline } from '../utils/automation';

interface BudgetSummaryViewProps {
  onOpenAddModal: () => void;
  onNavigateToLedger: () => void;
  onOpenExportModal: () => void;
}

export const BudgetSummaryView: React.FC<BudgetSummaryViewProps> = ({
  onOpenAddModal,
  onNavigateToLedger,
  onOpenExportModal,
}) => {
  const {
    categories,
    transactions,
    selectedMonth,
    currentBudgetConfig,
    currentSummary,
    updateCategoryBudget,
    updateIncomeTarget,
    apply503020Rule,
    checkAndNotifyBudgetThresholds,
    setDefaultAlertThreshold,
    setCategoryAlertThreshold,
  } = useFinance();

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<{ day: number; amount: number; cumulative: number; budgetTrajectory: number } | null>(null);
  const [alertCheckedToast, setAlertCheckedToast] = useState(false);

  const activeAlertThreshold = currentBudgetConfig.alertThresholdPercentage ?? 100;

  const handleRunAlertCheck = () => {
    checkAndNotifyBudgetThresholds(selectedMonth);
    setAlertCheckedToast(true);
    setTimeout(() => setAlertCheckedToast(false), 3000);
  };

  // Filter transactions for current month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Compute category spend for current month
  const categorySpendMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of monthTransactions) {
      if (t.type === 'expense') {
        map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
      }
    }
    return map;
  }, [monthTransactions]);

  // Cumulative timeline for pacing chart
  const timelineData = useMemo(() => {
    return getDailySpendingTimeline(selectedMonth, transactions, currentSummary.totalBudget);
  }, [selectedMonth, transactions, currentSummary.totalBudget]);

  // Top spending merchants this month
  const topMerchants = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const t of monthTransactions) {
      if (t.type === 'expense') {
        const key = t.merchant;
        if (!map[key]) map[key] = { total: 0, count: 0 };
        map[key].total += t.amount;
        map[key].count += 1;
      }
    }
    return Object.entries(map)
      .map(([merchant, data]) => ({ merchant, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [monthTransactions]);

  // Group categories
  const groupedCategories = useMemo(() => {
    const groups: Record<string, typeof categories> = {
      Essentials: [],
      Discretionary: [],
      'Savings & Investments': [],
    };
    for (const cat of categories) {
      if (groups[cat.group]) {
        groups[cat.group].push(cat);
      }
    }
    return groups;
  }, [categories]);

  // Chart dimensions math
  const chartHeight = 180;
  const chartWidth = 720;
  const maxSpend = Math.max(
    currentSummary.totalBudget * 1.1,
    timelineData[timelineData.length - 1]?.cumulative || 1000
  );

  const getSvgCoordinates = (day: number, val: number) => {
    const x = ((day - 1) / (timelineData.length - 1 || 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (val / maxSpend) * (chartHeight - 30) - 15;
    return { x, y };
  };

  const actualPath = useMemo(() => {
    // Only draw up to current passed days
    const activePoints = timelineData.filter((d) => d.day <= currentSummary.daysPassed);
    if (!activePoints.length) return '';
    return activePoints
      .map((pt, i) => {
        const { x, y } = getSvgCoordinates(pt.day, pt.cumulative);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [timelineData, currentSummary.daysPassed, maxSpend]);

  const targetPath = useMemo(() => {
    if (!timelineData.length) return '';
    const start = getSvgCoordinates(1, 0);
    const end = getSvgCoordinates(timelineData.length, currentSummary.totalBudget);
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }, [timelineData, currentSummary.totalBudget, maxSpend]);

  const remainingBudget = Math.max(0, currentSummary.totalBudget - currentSummary.totalExpenses);

  return (
    <div className="space-y-8 pb-12">
      {/* Overview Context & Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Monthly Financial Report</span>
            <span aria-hidden="true">·</span>
            <span>{selectedMonth}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-semibold">Active Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Monthly Budget Summary & Pacing
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Automated expense tracking with daily burn rate projection and category allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAlertCheck}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            title="Scan all categories and trigger in-app alert toasts for any that exceed threshold"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>Audit Alerts ({activeAlertThreshold}%)</span>
          </button>

          <button
            onClick={() => setIsEditingBudget(!isEditingBudget)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              isEditingBudget
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isEditingBudget ? 'Done Adjusting' : 'Adjust Budgets'}</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Summary Statement</span>
          </button>
        </div>
      </div>

      {/* Alert Check Feedback Toast */}
      {alertCheckedToast && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Scanned all {categories.filter((c) => c.group !== 'Income').length} categories against{' '}
              <strong>{activeAlertThreshold}%</strong> monthly budget threshold. In-app alert toasts dispatched for any over-limit categories.
            </span>
          </div>
          <button
            onClick={() => setAlertCheckedToast(false)}
            className="text-amber-700 hover:text-amber-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Core Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Spend vs Budget */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Total Monthly Outflow</span>
            <span
              className={`font-semibold ${
                currentSummary.pacingStatus === 'over-budget'
                  ? 'text-rose-600'
                  : currentSummary.pacingStatus === 'approaching-limit'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {currentSummary.budgetUtilization.toFixed(0)}% Utilized
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            ${currentSummary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Limit: ${currentSummary.totalBudget.toLocaleString()}</span>
            <span className="font-mono tabular-nums text-slate-700 font-medium">
              ${remainingBudget.toFixed(0)} left
            </span>
          </div>
          {/* Micro progress bar */}
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                currentSummary.budgetUtilization > 100
                  ? 'bg-rose-500'
                  : currentSummary.budgetUtilization > 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, currentSummary.budgetUtilization)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Net Cash Flow & Savings Rate */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Net Monthly Savings</span>
            <span className="font-semibold text-emerald-600 font-mono tabular-nums">
              {currentSummary.savingsRate.toFixed(1)}% Saved
            </span>
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
              currentSummary.netSavings >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {currentSummary.netSavings >= 0 ? '+' : ''}$
            {currentSummary.netSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
              <span>In: ${currentSummary.totalIncome.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              <span>Out: ${currentSummary.totalExpenses.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* Metric 3: Daily Burn Rate & Pacing */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Daily Spend Pacing</span>
            <span
              className={`text-xs font-semibold ${
                currentSummary.pacingStatus === 'over-budget'
                  ? 'text-rose-600'
                  : currentSummary.pacingStatus === 'approaching-limit'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {currentSummary.pacingStatus === 'on-track' ? 'On Pace' : 'Accelerated'}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            ${currentSummary.dailyBurnRate.toFixed(0)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ day</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Target: ${currentSummary.targetDailyRate.toFixed(0)}/day</span>
            <span>Day {currentSummary.daysPassed} of {currentSummary.daysInMonth}</span>
          </div>
        </div>

        {/* Metric 4: Projected Month-End Total */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Projected EOM Total</span>
            <span className="text-xs text-slate-500">At current pace</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            ${currentSummary.projectedMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Projected Variance:</span>
            <span
              className={`font-mono tabular-nums font-semibold ${
                currentSummary.projectedVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {currentSummary.projectedVariance >= 0 ? '+$' : '-$'}
              {Math.abs(currentSummary.projectedVariance).toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Burn-Down & Pacing Visualization Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Cumulative Expense Trajectory vs Budget Line
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks actual daily cumulative expenditure against the continuous linear allowance for {selectedMonth}.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-900 inline-block"></span>
              <span className="text-slate-700 font-medium">Actual Spend Path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-300 border-b border-dashed border-slate-400 inline-block"></span>
              <span className="text-slate-500">Linear Target Pace</span>
            </div>
          </div>
        </div>

        {/* SVG Pacing Chart */}
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[640px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 overflow-visible"
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Grid Lines */}
              <line x1="20" y1="15" x2={chartWidth - 20} y2="15" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="20" y1={chartHeight / 2} x2={chartWidth - 20} y2={chartHeight / 2} stroke="#f1f5f9" strokeWidth="1" />
              <line x1="20" y1={chartHeight - 15} x2={chartWidth - 20} y2={chartHeight - 15} stroke="#e2e8f0" strokeWidth="1" />

              {/* Target Line (Dashed) */}
              <path
                d={targetPath}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Actual Cumulative Path */}
              {actualPath && (
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Point Dots */}
              {timelineData
                .filter((d) => d.day <= currentSummary.daysPassed)
                .map((pt) => {
                  const { x, y } = getSvgCoordinates(pt.day, pt.cumulative);
                  const isHovered = hoveredDay?.day === pt.day;
                  return (
                    <g key={pt.day}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 5 : 2.5}
                        fill={isHovered ? '#0f172a' : '#334155'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-all cursor-pointer"
                        onMouseEnter={() => setHoveredDay(pt)}
                      />
                    </g>
                  );
                })}
            </svg>

            {/* X-axis days markers */}
            <div className="flex justify-between text-[11px] text-slate-400 font-mono px-5 pt-2 border-t border-slate-100">
              <span>Day 1</span>
              <span>Day 7</span>
              <span>Day 14</span>
              <span>Day 21</span>
              <span>Day {timelineData.length}</span>
            </div>
          </div>

          {/* Hover Tooltip Overlay */}
          {hoveredDay && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded shadow-lg pointer-events-none flex items-center gap-3">
              <span className="font-semibold">Day {hoveredDay.day}</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span>Day Spend: ${hoveredDay.amount.toFixed(2)}</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="font-mono tabular-nums text-emerald-400">
                Total: ${hoveredDay.cumulative.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Budgets Tool Drawer (if active) */}
      {isEditingBudget && (
        <div className="bg-slate-900 text-white rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Budget Allocation Strategy</h3>
              <p className="text-xs text-slate-400">
                Configure your monthly spending thresholds per category or apply automated financial models.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => apply503020Rule(selectedMonth)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 rounded hover:bg-emerald-300 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply 50/30/20 Rule</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Expected Monthly Income ($)</label>
              <input
                type="number"
                value={currentBudgetConfig.incomeTarget || ''}
                onChange={(e) => updateIncomeTarget(selectedMonth, parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Default Alert Notification Threshold (%)
              </label>
              <select
                value={activeAlertThreshold}
                onChange={(e) => setDefaultAlertThreshold(selectedMonth, parseInt(e.target.value, 10))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-slate-500"
              >
                <option value="80">80% of category limit (Early Warning)</option>
                <option value="90">90% of category limit (Approaching Cap)</option>
                <option value="100">100% of category limit (Strict Limit Exceeded)</option>
                <option value="105">105% of category limit (Grace Overflow)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleRunAlertCheck}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>Trigger All Threshold Checks</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Budgets Matrix */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Category Allocations & Real-Time Burn
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live consumption against allocated monthly caps across spending groups.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {categories.filter((c) => c.group !== 'Income').length} Active Categories
          </div>
        </div>

        <div className="p-6 space-y-8">
          {Object.entries(groupedCategories).map(([groupName, catList]) => {
            const groupSpend = catList.reduce((sum, c) => sum + (categorySpendMap[c.id] || 0), 0);
            const groupBudget = catList.reduce(
              (sum, c) => sum + (currentBudgetConfig.categoryBudgets[c.id] ?? c.defaultBudget),
              0
            );
            const groupPct = groupBudget > 0 ? (groupSpend / groupBudget) * 100 : 0;

            return (
              <div key={groupName} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      {groupName}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      ${groupSpend.toFixed(0)} of ${groupBudget.toFixed(0)} ({groupPct.toFixed(0)}%)
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      groupPct > 100
                        ? 'text-rose-600'
                        : groupPct > 85
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {groupPct > 100 ? 'Limit Exceeded' : groupPct > 85 ? 'Caution' : 'Healthy'}
                  </span>
                </div>

                {/* Categories Table / Rows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catList.map((cat) => {
                    const spent = categorySpendMap[cat.id] || 0;
                    const budget = currentBudgetConfig.categoryBudgets[cat.id] ?? cat.defaultBudget;
                    const remaining = budget - spent;
                    const pct = budget > 0 ? (spent / budget) * 100 : 0;
                    const catThreshold = currentBudgetConfig.categoryAlertThresholds?.[cat.id] ?? activeAlertThreshold;
                    const isAlertTriggered = pct >= catThreshold;

                    return (
                      <div
                        key={cat.id}
                        className={`p-3.5 border rounded-lg transition-colors bg-slate-50/50 ${
                          isAlertTriggered ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-slate-600 font-medium">
                            ${spent.toFixed(2)}
                            <span className="text-slate-400 font-normal"> / ${budget}</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden my-2">
                          <div
                            className={`h-full transition-all ${
                              pct > 100 ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono tabular-nums">
                            {remaining >= 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over budget`}
                          </span>

                          {isEditingBudget ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400">Cap:</span>
                                <input
                                  type="number"
                                  value={budget}
                                  onChange={(e) =>
                                    updateCategoryBudget(selectedMonth, cat.id, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-800 text-right focus:outline-none focus:border-slate-500"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400">Alert:</span>
                                <select
                                  value={catThreshold}
                                  onChange={(e) =>
                                    setCategoryAlertThreshold(selectedMonth, cat.id, parseInt(e.target.value, 10))
                                  }
                                  className="bg-white border border-slate-300 rounded px-1 py-0.5 text-[10px] font-mono text-slate-800 focus:outline-none"
                                >
                                  <option value="80">80%</option>
                                  <option value="90">90%</option>
                                  <option value="100">100%</option>
                                </select>
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono tabular-nums text-slate-400">
                              {pct.toFixed(0)}%
                            </span>
                          )}
                        </div>

                        {/* Alert Threshold Exceeded Indicator Banner */}
                        {isAlertTriggered && !isEditingBudget && (
                          <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-rose-700">
                            <span className="flex items-center gap-1 font-semibold">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>Threshold Exceeded ({catThreshold}%)</span>
                            </span>
                            <span className="font-mono tabular-nums">
                              {spent > budget ? `+$${(spent - budget).toFixed(2)} over` : `${pct.toFixed(0)}% reached`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Insights: Top Merchants & Quick Automated Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Spending Outlets */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Top Outlets This Month
            </h3>
            <span className="text-xs text-slate-400 font-mono">By volume</span>
          </div>

          <div className="divide-y divide-slate-100">
            {topMerchants.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No expense transactions logged for this month.
              </div>
            ) : (
              topMerchants.map((m, idx) => (
                <div key={m.merchant} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400 font-mono text-[11px] w-4">
                      {idx + 1}.
                    </span>
                    <div>
                      <div className="font-medium text-slate-800">{m.merchant}</div>
                      <div className="text-[11px] text-slate-400">
                        {m.count} {m.count === 1 ? 'charge' : 'charges'}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-semibold text-slate-900">
                    ${m.total.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Action & Automated Ledger Snapshot */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Automated Ledger Actions
              </h3>
              <button
                onClick={onNavigateToLedger}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <span>View Full Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every expense processed through LedgerPulse passes through prioritized automation rules,
              matching transaction descriptions with predefined category tags and recurring bill schedules.
            </p>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-md text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Active Transactions in Month:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {monthTransactions.length} items
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto-Categorization Rate:</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-600">
                  {monthTransactions.length > 0
                    ? `${(
                        (monthTransactions.filter((t) => t.autoCategorized).length /
                          monthTransactions.length) *
                        100
                      ).toFixed(0)}%`
                    : '100%'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={onOpenAddModal}
              className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors text-center"
            >
              + Quick Expense Entry
            </button>
            <button
              onClick={onNavigateToLedger}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors text-center"
            >
              Review Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

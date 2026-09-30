import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  DollarSign,
  History,
  PiggyBank,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { SavingsGoal } from '../types/finance';

export const SavingsGoalsView: React.FC = () => {
  const {
    savingsGoals,
    currentSummary,
    selectedMonth,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    allocateSurplusToGoal,
  } = useFinance();

  // Modal / drawer states
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [selectedGoalForAllocation, setSelectedGoalForAllocation] = useState<string>(
    savingsGoals[0]?.id || ''
  );
  const [allocationAmount, setAllocationAmount] = useState<number | ''>('');
  const [allocationSource, setAllocationSource] = useState(`${selectedMonth} Budget Surplus`);
  const [expandedHistoryGoalId, setExpandedHistoryGoalId] = useState<string | null>(null);

  // New Goal Form State
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState<number | ''>('');
  const [newGoalInitial, setNewGoalInitial] = useState<number | ''>('');
  const [newGoalDate, setNewGoalDate] = useState('2027-06-30');
  const [newGoalColor, setNewGoalColor] = useState('#059669');
  const [newGoalNotes, setNewGoalNotes] = useState('');

  // Toast feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Aggregate metrics
  const { totalTarget, totalCurrent, overallProgress, totalRemaining } = useMemo(() => {
    let target = 0;
    let current = 0;
    for (const g of savingsGoals) {
      target += g.targetAmount;
      current += g.currentAmount;
    }
    const progress = target > 0 ? (current / target) * 100 : 0;
    const remaining = Math.max(0, target - current);
    return {
      totalTarget: target,
      totalCurrent: current,
      overallProgress: progress,
      totalRemaining: remaining,
    };
  }, [savingsGoals]);

  // Current month available surplus (Net Savings = Total Income - Total Expenses)
  const availableMonthlySurplus = Math.max(0, currentSummary.netSavings);

  const handleOpenAllocateModal = (goalId?: string) => {
    if (goalId) setSelectedGoalForAllocation(goalId);
    else if (savingsGoals.length > 0) setSelectedGoalForAllocation(savingsGoals[0].id);

    // Default to suggested allocation (e.g. 50% of available surplus or $250)
    const suggested = availableMonthlySurplus > 0 ? Math.min(500, Math.round(availableMonthlySurplus * 0.5)) : 250;
    setAllocationAmount(suggested);
    setAllocationSource(`${selectedMonth} Budget Surplus`);
    setIsAllocateOpen(true);
  };

  const handleConfirmAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForAllocation || !allocationAmount || Number(allocationAmount) <= 0) return;

    const numAmount = Number(allocationAmount);
    const result = allocateSurplusToGoal(
      selectedGoalForAllocation,
      numAmount,
      allocationSource.trim() || 'Budget Surplus Allocation',
      `Allocated from ${selectedMonth} budget surplus`
    );

    const goal = savingsGoals.find((g) => g.id === selectedGoalForAllocation);
    if (result.success) {
      setSuccessToast(
        `Allocated $${numAmount.toLocaleString()} to "${goal?.name}". New balance: $${result.newCurrent.toLocaleString()}.`
      );
      setTimeout(() => setSuccessToast(null), 4000);
      setIsAllocateOpen(false);
      setAllocationAmount('');
    }
  };

  const handleQuickAddSurplus = (goalId: string, amount: number) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    const result = allocateSurplusToGoal(
      goalId,
      amount,
      `${selectedMonth} Quick Surplus Allocation`,
      `Quick surplus allocation of $${amount}`
    );
    if (result.success) {
      setSuccessToast(`Added $${amount} to "${goal?.name}".`);
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newGoalTarget || Number(newGoalTarget) <= 0) return;

    addSavingsGoal({
      name: newGoalName.trim(),
      targetAmount: Number(newGoalTarget),
      currentAmount: Number(newGoalInitial) || 0,
      targetDate: newGoalDate || undefined,
      color: newGoalColor,
      notes: newGoalNotes.trim() || undefined,
    });

    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalInitial('');
    setNewGoalNotes('');
    setIsAddGoalOpen(false);

    setSuccessToast(`New financial target "${newGoalName.trim()}" created.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Capital Accumulation Engine</span>
            <span aria-hidden="true">·</span>
            <span>Surplus Optimization</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{savingsGoals.length} Active Targets</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Savings Goals & Surplus Allocation
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Track multi-goal accumulation targets and manually channel monthly operating surpluses into reserves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAllocateModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Allocate Surplus</span>
          </button>

          <button
            onClick={() => setIsAddGoalOpen(!isAddGoalOpen)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddGoalOpen ? 'Cancel' : 'New Savings Goal'}</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Capital Saved */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Total Capital Saved</span>
            <span className="font-semibold text-emerald-600 font-mono tabular-nums">
              {overallProgress.toFixed(0)}% Target
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            ${totalCurrent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Portfolio Cap: ${totalTarget.toLocaleString()}</span>
            <span className="font-mono tabular-nums text-slate-700">
              ${totalRemaining.toLocaleString()} remaining
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, overallProgress)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Available Monthly Surplus */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Available Monthly Surplus</span>
            <span className="text-slate-400 font-mono text-[11px]">{selectedMonth}</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 tracking-tight">
            ${availableMonthlySurplus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>From Net Retention</span>
            <button
              onClick={() => handleOpenAllocateModal()}
              className="text-slate-700 hover:text-slate-900 font-semibold underline underline-offset-2"
            >
              Allocate Now
            </button>
          </div>
        </div>

        {/* Metric 3: Active Goals Count */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Funding Targets</span>
            <span className="text-slate-400 font-mono text-[11px]">Milestones</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            {savingsGoals.length}
            <span className="text-xs font-normal text-slate-500 ml-1.5">Goals In Flight</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              {savingsGoals.filter((g) => (g.currentAmount / g.targetAmount) >= 0.75).length} Near Completion
            </span>
            <span className="font-mono text-emerald-600 font-medium">Liquid Reserves</span>
          </div>
        </div>

        {/* Metric 4: Projected Horizon */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Monthly Allocation Pace</span>
            <span className="text-slate-400 font-mono text-[11px]">Run-Rate</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            ${(availableMonthlySurplus > 0 ? availableMonthlySurplus : 1000).toFixed(0)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ mo</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Target completion estimated within 8–12 months</span>
          </div>
        </div>
      </div>

      {/* New Goal Creation Form Drawer */}
      {isAddGoalOpen && (
        <form
          onSubmit={handleCreateGoal}
          className="bg-white border-2 border-slate-900 rounded-lg p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Create New Savings Target</h3>
            <span className="text-xs text-slate-400">Define milestone, capital requirement & horizon</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Goal Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Home Down Payment, Wedding"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Amount ($)</label>
              <input
                type="number"
                min="1"
                required
                placeholder="5000"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Starting Balance ($)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={newGoalInitial}
                onChange={(e) => setNewGoalInitial(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Date</label>
              <input
                type="date"
                value={newGoalDate}
                onChange={(e) => setNewGoalDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Purpose / Notes</label>
              <input
                type="text"
                placeholder="e.g. Dedicated high-yield fund for flight tickets and lodging"
                value={newGoalNotes}
                onChange={(e) => setNewGoalNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Color Marker</label>
              <div className="flex items-center gap-2 pt-1">
                {['#059669', '#0284c7', '#d97706', '#8b5cf6', '#ec4899', '#0f172a'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewGoalColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      newGoalColor === c ? 'scale-110 border-slate-900 shadow-xs' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddGoalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800"
            >
              Save Savings Target
            </button>
          </div>
        </form>
      )}

      {/* Allocate Surplus Modal / Drawer */}
      {isAllocateOpen && (
        <form
          onSubmit={handleConfirmAllocation}
          className="bg-emerald-950 text-white rounded-lg p-6 shadow-md space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-800 pb-3">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-emerald-400" />
                <span>Allocate Monthly Operating Surplus</span>
              </h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                Channel unspent cash flow into target milestones. This also creates a recorded ledger transfer entry.
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="text-emerald-400">Available Surplus:</span>{' '}
              <strong className="font-mono tabular-nums text-white text-sm">
                ${availableMonthlySurplus.toFixed(2)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-emerald-200 mb-1">Target Savings Goal</label>
              <select
                value={selectedGoalForAllocation}
                onChange={(e) => setSelectedGoalForAllocation(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-emerald-900 border border-emerald-700 rounded text-white focus:outline-none focus:border-emerald-400"
              >
                {savingsGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (${g.currentAmount.toLocaleString()} / ${g.targetAmount.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-emerald-200 mb-1">Allocation Amount ($)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={allocationAmount}
                onChange={(e) => setAllocationAmount(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 text-xs font-mono bg-emerald-900 border border-emerald-700 rounded text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs text-emerald-200 mb-1">Source / Note</label>
              <input
                type="text"
                value={allocationSource}
                onChange={(e) => setAllocationSource(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-emerald-900 border border-emerald-700 rounded text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-300 text-[11px]">Quick Amounts:</span>
              <button
                type="button"
                onClick={() => setAllocationAmount(100)}
                className="px-2 py-0.5 bg-emerald-900 border border-emerald-700 rounded text-emerald-200 hover:bg-emerald-800 text-[11px]"
              >
                $100
              </button>
              <button
                type="button"
                onClick={() => setAllocationAmount(250)}
                className="px-2 py-0.5 bg-emerald-900 border border-emerald-700 rounded text-emerald-200 hover:bg-emerald-800 text-[11px]"
              >
                $250
              </button>
              <button
                type="button"
                onClick={() => setAllocationAmount(500)}
                className="px-2 py-0.5 bg-emerald-900 border border-emerald-700 rounded text-emerald-200 hover:bg-emerald-800 text-[11px]"
              >
                $500
              </button>
              {availableMonthlySurplus > 0 && (
                <button
                  type="button"
                  onClick={() => setAllocationAmount(Math.round(availableMonthlySurplus))}
                  className="px-2 py-0.5 bg-emerald-800 border border-emerald-600 rounded text-emerald-100 hover:bg-emerald-700 text-[11px] font-medium"
                >
                  Full Surplus (${Math.round(availableMonthlySurplus)})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAllocateOpen(false)}
                className="px-3 py-1.5 text-xs text-emerald-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded hover:bg-emerald-300 transition-colors shadow-xs"
              >
                Confirm Surplus Allocation
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Savings Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {savingsGoals.map((goal) => {
          const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const isHistoryOpen = expandedHistoryGoalId === goal.id;

          return (
            <div
              key={goal.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: goal.color }}
                      />
                      <span>{goal.name}</span>
                    </h2>
                    {goal.notes && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{goal.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete savings goal "${goal.name}"?`)) {
                          deleteSavingsGoal(goal.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Amount and Progress */}
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="font-mono tabular-nums text-2xl font-bold text-slate-900">
                    ${goal.currentAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      of ${goal.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-sm font-semibold text-emerald-600">
                    {pct.toFixed(0)}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-3">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: goal.color,
                    }}
                  />
                </div>

                {/* Status and Target Horizon (Zero-pill discipline: unboxed metadata with · separator) */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span>${remaining.toLocaleString()} needed</span>
                    {goal.targetDate && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span>Due {goal.targetDate}</span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {goal.history.length} contributions
                  </span>
                </div>
              </div>

              {/* Bottom Actions and Quick Surplus Presets */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px] font-medium">Quick Surplus Boost:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuickAddSurplus(goal.id, 100)}
                      className="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      title="Instantly allocate $100 from budget surplus"
                    >
                      +$100
                    </button>
                    <button
                      onClick={() => handleQuickAddSurplus(goal.id, 250)}
                      className="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      title="Instantly allocate $250 from budget surplus"
                    >
                      +$250
                    </button>
                    <button
                      onClick={() => handleOpenAllocateModal(goal.id)}
                      className="px-2.5 py-0.5 text-[11px] font-semibold text-slate-900 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors"
                    >
                      Custom Surplus
                    </button>
                  </div>
                </div>

                {/* Contribution History Toggle */}
                {goal.history.length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setExpandedHistoryGoalId(isHistoryOpen ? null : goal.id)
                      }
                      className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-800 py-1"
                    >
                      <span className="flex items-center gap-1">
                        <History className="w-3 h-3" />
                        <span>Allocation Ledger ({goal.history.length})</span>
                      </span>
                      {isHistoryOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isHistoryOpen && (
                      <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100 text-[11px]">
                        {goal.history.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="py-1.5 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-slate-800">{item.source}</div>
                              <div className="text-slate-400 font-mono text-[10px]">
                                {item.date} {item.notes ? `· ${item.notes}` : ''}
                              </div>
                            </div>
                            <div className="font-mono tabular-nums font-semibold text-emerald-600">
                              +${item.amount.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

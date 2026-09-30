import React, { useEffect } from 'react';
import { AlertTriangle, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { BudgetAlertToast } from '../types/finance';

interface BudgetAlertToastsProps {
  onNavigateToCategory?: (categoryId: string) => void;
}

export const BudgetAlertToasts: React.FC<BudgetAlertToastsProps> = ({ onNavigateToCategory }) => {
  const { alertToasts, dismissAlertToast } = useFinance();

  // Auto-dismiss toasts after 8 seconds
  useEffect(() => {
    if (alertToasts.length === 0) return;

    const timers = alertToasts.map((toast) => {
      const remainingTime = Math.max(1000, 8000 - (Date.now() - toast.createdAt));
      return setTimeout(() => {
        dismissAlertToast(toast.id);
      }, remainingTime);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [alertToasts, dismissAlertToast]);

  if (alertToasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none"
    >
      {alertToasts.map((toast) => {
        const isOverBudget = toast.spent >= toast.budgetLimit;
        const percentUtilized = Math.round((toast.spent / toast.budgetLimit) * 100);

        return (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto bg-white border border-rose-200 rounded-lg p-4 shadow-lg text-xs text-slate-800 animate-in slide-in-from-top-4 fade-in duration-200 flex items-start gap-3 relative overflow-hidden"
          >
            {/* Visual semantic accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-600" />

            <div className="p-1.5 bg-rose-50 rounded-md text-rose-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>

            <div className="flex-1 pr-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>Budget Alert</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-rose-700 font-semibold">{toast.categoryName}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {toast.month}
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed text-[11px]">
                Expenses have reached{' '}
                <strong className="font-mono tabular-nums text-slate-900 font-semibold">
                  ${toast.spent.toFixed(2)}
                </strong>{' '}
                of allocated{' '}
                <strong className="font-mono tabular-nums text-slate-900">
                  ${toast.budgetLimit.toFixed(2)}
                </strong>{' '}
                limit ({percentUtilized}% utilized).
              </p>

              <div className="pt-1 flex items-center gap-3 text-[11px]">
                <span className="font-mono tabular-nums font-semibold text-rose-600">
                  {isOverBudget ? `+$${toast.overage.toFixed(2)} over budget` : `At ${percentUtilized}% threshold limit`}
                </span>

                {onNavigateToCategory && (
                  <button
                    onClick={() => {
                      onNavigateToCategory(toast.categoryId);
                      dismissAlertToast(toast.id);
                    }}
                    className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-0.5 underline underline-offset-2"
                  >
                    <span>Inspect Ledger</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => dismissAlertToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

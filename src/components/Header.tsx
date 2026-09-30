import React from 'react';
import { Plus, UploadCloud, RotateCcw } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface HeaderProps {
  activeTab: 'summary' | 'tracker' | 'savings' | 'rules' | 'recurring' | 'reports';
  setActiveTab: (tab: 'summary' | 'tracker' | 'savings' | 'rules' | 'recurring' | 'reports') => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenImportModal,
}) => {
  const { selectedMonth, setSelectedMonth, availableMonths, resetToDemoData } = useFinance();

  const formatMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      {/* Strict Top Bar Contract: Zone 1 (Brand) — Zone 2 (4-6 nav links) — Zone 3 (1-2 primary actions) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-6 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('summary');
            }}
            className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>LedgerPulse</span>
          </a>

          {/* Month selector */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-md px-2.5 py-1 bg-slate-50">
            <span className="text-slate-400 font-medium">Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium text-slate-800 cursor-pointer focus:outline-none"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthName(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone 2: 4-6 clean text navigation links with subtle active states */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'summary'
                ? 'text-slate-900 bg-slate-100 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Budget Summary
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'tracker'
                ? 'text-slate-900 bg-slate-100 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Expense Ledger
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'savings'
                ? 'text-slate-900 bg-slate-100 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Savings Goals
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'rules'
                ? 'text-slate-900 bg-slate-100 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Auto Rules
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'text-slate-900 bg-slate-100 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Recurring Bills
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'reports'
                ? 'text-slate-900 bg-slate-100 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Reports
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenImportModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            title="Import bank statements or CSV feed"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Feed</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset to initial sample finance data?')) {
                resetToDemoData();
              }
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
            title="Reset to sample dataset"
            aria-label="Reset data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-slate-100 gap-2 text-xs">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'summary' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
        >
          Budget
        </button>
        <button
          onClick={() => setActiveTab('tracker')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'tracker' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
        >
          Ledger
        </button>
        <button
          onClick={() => setActiveTab('savings')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'savings' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
        >
          Savings
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'rules' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
        >
          Rules
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'recurring' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
        >
          Recurring
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'reports' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
        >
          Reports
        </button>
        <button
          onClick={onOpenImportModal}
          className="ml-auto px-2 py-1 text-slate-700 bg-slate-100 rounded whitespace-nowrap font-medium"
        >
          Import
        </button>
      </div>
    </header>
  );
};

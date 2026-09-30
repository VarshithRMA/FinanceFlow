import React, { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Header } from './components/Header';
import { BudgetSummaryView } from './components/BudgetSummaryView';
import { TransactionLedgerView } from './components/TransactionLedgerView';
import { AutomationRulesView } from './components/AutomationRulesView';
import { RecurringBillsView } from './components/RecurringBillsView';
import { ReportsView } from './components/ReportsView';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { StatementImportModal } from './components/StatementImportModal';
import { ReceiptScanModal } from './components/ReceiptScanModal';
import { ExportSummaryModal } from './components/ExportSummaryModal';
import { BudgetAlertToasts } from './components/BudgetAlertToasts';
import { Transaction } from './types/finance';

function FinanceApp() {
  const [activeTab, setActiveTab] = useState<'summary' | 'tracker' | 'savings' | 'rules' | 'recurring' | 'reports'>('summary');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setIsAddModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar following strict Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={handleOpenAddModal}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'summary' && (
          <BudgetSummaryView
            onOpenAddModal={handleOpenAddModal}
            onNavigateToLedger={() => setActiveTab('tracker')}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        )}

        {activeTab === 'tracker' && (
          <TransactionLedgerView
            onOpenAddModal={handleOpenAddModal}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenScanModal={() => setIsScanModalOpen(true)}
            onEditTransaction={handleEditTransaction}
          />
        )}

        {activeTab === 'savings' && <SavingsGoalsView />}

        {activeTab === 'rules' && <AutomationRulesView />}

        {activeTab === 'recurring' && <RecurringBillsView />}

        {activeTab === 'reports' && (
          <ReportsView onOpenExportModal={() => setIsExportModalOpen(true)} />
        )}
      </main>

      {/* Clean Editorial Footer (Anti-Slop: No fake telemetry or worker engine tags) */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">LedgerPulse</span>
            <span aria-hidden="true">·</span>
            <span>Automated Personal Finance & Budget Management</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Client-side Encrypted Storage</span>
            <span aria-hidden="true">·</span>
            <span>Tabular Precision</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="hover:text-slate-800 underline underline-offset-2"
            >
              Export Period Statement
            </button>
          </div>
        </div>
      </footer>

      {/* Budget Alert In-App Toast Notifications */}
      <BudgetAlertToasts onNavigateToCategory={() => setActiveTab('tracker')} />

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
        }}
        editingTransaction={editingTransaction}
      />

      <StatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <ReceiptScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
      />

      <ExportSummaryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <FinanceApp />
    </FinanceProvider>
  );
}

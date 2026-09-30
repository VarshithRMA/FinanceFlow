import React, { useState, useMemo } from 'react';
import {
  Plus,
  Play,
  RotateCw,
  Trash2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { AutomationRule, RuleField, RuleOperator } from '../types/finance';
import { runAutoCategorizer } from '../utils/automation';

export const AutomationRulesView: React.FC = () => {
  const {
    rules,
    categories,
    addRule,
    updateRule,
    deleteRule,
    toggleRuleActive,
    runAllRulesOnTransactions,
    autoCategorizationService,
  } = useFinance();

  // New rule form state
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleField, setNewRuleField] = useState<RuleField>('merchant');
  const [newRuleOperator, setNewRuleOperator] = useState<RuleOperator>('contains');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleTargetCat, setNewRuleTargetCat] = useState(categories[0]?.id || '');

  // Live Rule Tester / Playground state
  const [testMerchant, setTestMerchant] = useState('Uber Trip Airport');
  const [testAmount, setTestAmount] = useState<number>(35.0);

  // Execution toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live test result via autoCategorizationService
  const testResult = useMemo(() => {
    return autoCategorizationService.categorizeByMerchant(testMerchant, '', testAmount);
  }, [testMerchant, testAmount, autoCategorizationService]);

  const matchedCat = useMemo(() => {
    if (!testResult.categoryId) return null;
    return categories.find((c) => c.id === testResult.categoryId);
  }, [testResult, categories]);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleValue.trim()) return;

    addRule({
      name: newRuleName.trim(),
      field: newRuleField,
      operator: newRuleOperator,
      value: newRuleField === 'amount' ? parseFloat(newRuleValue) || 0 : newRuleValue.trim(),
      targetCategoryId: newRuleTargetCat,
      priority: rules.length + 1,
      isActive: true,
    });

    setNewRuleName('');
    setNewRuleValue('');
    setIsAddingRule(false);

    setToastMessage('New automated categorization rule created.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rules.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);

    // Swap priorities
    const currentRule = sorted[index];
    const targetRule = sorted[targetIndex];

    updateRule({ ...currentRule, priority: targetRule.priority });
    updateRule({ ...targetRule, priority: currentRule.priority });
  };

  const handleReRunAll = () => {
    const res = runAllRulesOnTransactions();
    setToastMessage(`Executed rules across ledger: updated ${res.matchedCount} transactions.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sort rules by priority
  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => a.priority - b.priority);
  }, [rules]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Automation Engine</span>
            <span aria-hidden="true">·</span>
            <span>Pattern Recognition</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{rules.length} Active Rules</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Automated Expense Categorization Rules
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Configure matching expressions to automatically categorize imported bank feeds and receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReRunAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Apply to All Transactions</span>
          </button>

          <button
            onClick={() => setIsAddingRule(!isAddingRule)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingRule ? 'Cancel' : 'New Rule'}</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Rule Tester / Playground */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Live Rule Matching Playground</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate how incoming raw merchant strings or bank descriptions resolve against your rule pipeline.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Real-time evaluation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Sample Bank Description / Merchant String
            </label>
            <input
              type="text"
              value={testMerchant}
              onChange={(e) => setTestMerchant(e.target.value)}
              placeholder="e.g. UBER TRIP 8419 CA, STARBUCKS #1902..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Sample Amount ($)
            </label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Evaluation Output Bar (Zero-pill discipline) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">Evaluation Result:</span>
            {matchedCat ? (
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: matchedCat.color }}
                />
                <span className="font-semibold text-slate-900">{matchedCat.name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{matchedCat.group}</span>
              </div>
            ) : (
              <span className="text-amber-700 font-medium">
                No matching rule (Fallback to default shopping)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            {testResult.ruleName && (
              <>
                <span>Triggered by:</span>
                <span className="font-semibold text-slate-800">{testResult.ruleName}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-emerald-600">
                  {(testResult.confidence * 100).toFixed(0)}% confidence
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Rule Creation Drawer */}
      {isAddingRule && (
        <form
          onSubmit={handleCreateRule}
          className="bg-white border-2 border-slate-900 rounded-lg p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Add Automation Rule</h3>
            <span className="text-xs text-slate-400">Assigns categories based on match criteria</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rule Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Spotify Subscription"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Field</label>
              <select
                value={newRuleField}
                onChange={(e) => setNewRuleField(e.target.value as RuleField)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              >
                <option value="merchant">Merchant Name</option>
                <option value="notes">Notes / Raw Description</option>
                <option value="amount">Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Condition</label>
              <select
                value={newRuleOperator}
                onChange={(e) => setNewRuleOperator(e.target.value as RuleOperator)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              >
                <option value="contains">Contains text</option>
                <option value="equals">Equals exactly</option>
                <option value="startsWith">Starts with</option>
                {newRuleField === 'amount' && (
                  <>
                    <option value="greaterThan">Greater than</option>
                    <option value="lessThan">Less than</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Match Value</label>
              <input
                type="text"
                required
                placeholder="e.g. Spotify or 100"
                value={newRuleValue}
                onChange={(e) => setNewRuleValue(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Category</label>
              <select
                value={newRuleTargetCat}
                onChange={(e) => setNewRuleTargetCat(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.group})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800"
              >
                Save Automation Rule
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Rules Registry Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Rule Execution Sequence
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rules execute in ascending priority order. First matching rule categorizes the transaction.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {sortedRules.filter((r) => r.isActive).length} Active · {sortedRules.filter((r) => !r.isActive).length} Paused
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-16 text-center">Order</th>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Matching Condition</th>
                <th className="py-3 px-4">Target Category</th>
                <th className="py-3 px-4 text-center">Hits</th>
                <th className="py-3 px-4 text-center">State</th>
                <th className="py-3 px-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRules.map((rule, index) => {
                const targetCat = categories.find((c) => c.id === rule.targetCategoryId);

                return (
                  <tr
                    key={rule.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !rule.isActive ? 'opacity-50 bg-slate-50/30' : ''
                    }`}
                  >
                    {/* Order / Priority Controls */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 font-mono text-slate-400">
                        <span>{index + 1}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMovePriority(index, 'up')}
                            disabled={index === 0}
                            className="disabled:opacity-20 hover:text-slate-800 p-0.5"
                            title="Move priority up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMovePriority(index, 'down')}
                            disabled={index === sortedRules.length - 1}
                            className="disabled:opacity-20 hover:text-slate-800 p-0.5"
                            title="Move priority down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Rule Name */}
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {rule.name}
                    </td>

                    {/* Condition Prose (No fake code comments) */}
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-medium text-slate-700">
                        {rule.field === 'merchant'
                          ? 'Merchant'
                          : rule.field === 'notes'
                          ? 'Notes'
                          : 'Amount'}
                      </span>{' '}
                      <span className="text-slate-400">
                        {rule.operator === 'contains'
                          ? 'contains'
                          : rule.operator === 'equals'
                          ? 'equals'
                          : rule.operator === 'startsWith'
                          ? 'starts with'
                          : rule.operator === 'greaterThan'
                          ? '>'
                          : '<'}
                      </span>{' '}
                      <span className="font-mono font-medium text-slate-800 bg-slate-100 px-1 py-0.5 rounded">
                        "{rule.value}"
                      </span>
                    </td>

                    {/* Target Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: targetCat?.color || '#94a3b8' }}
                        />
                        <span className="font-medium text-slate-800">
                          {targetCat?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Hits */}
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-600">
                      {rule.matchCount}
                    </td>

                    {/* Active toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleRuleActive(rule.id)}
                        className={`text-xs font-medium cursor-pointer ${
                          rule.isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Paused'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete rule "${rule.name}"?`)) {
                            deleteRule(rule.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

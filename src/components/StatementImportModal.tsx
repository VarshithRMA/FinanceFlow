import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { parseStatementFeed, ParsedStatementRow, SAMPLE_BANK_FEEDS } from '../utils/automation';

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatementImportModal: React.FC<StatementImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { categories, rules, batchImportTransactions } = useFinance();

  const [rawText, setRawText] = useState(SAMPLE_BANK_FEEDS.chase);
  const [account, setAccount] = useState('Chase Sapphire');
  const [parsedRows, setParsedRows] = useState<ParsedStatementRow[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    if (!rawText.trim()) return;
    const results = parseStatementFeed(rawText, account, rules);
    setParsedRows(results);
    setHasParsed(true);
  };

  const handleSelectTemplate = (templateKey: keyof typeof SAMPLE_BANK_FEEDS) => {
    setRawText(SAMPLE_BANK_FEEDS[templateKey]);
    if (templateKey === 'chase') setAccount('Chase Sapphire');
    else if (templateKey === 'appleCard') setAccount('Apple Card');
    else setAccount('Primary Checking');
    setHasParsed(false);
  };

  const handleToggleRow = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  const handleCategoryChange = (id: string, newCatId: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, suggestedCategoryId: newCatId } : r))
    );
  };

  const handleImport = () => {
    const selected = parsedRows.filter((r) => r.selected);
    if (!selected.length) return;

    const drafts = selected.map((r) => ({
      date: r.date,
      merchant: r.cleanMerchant,
      amount: r.amount,
      type: r.type,
      categoryId: r.suggestedCategoryId,
      account: r.account,
      notes: `Imported via automated statement feed (${r.rawMerchant})`,
      autoCategorized: Boolean(r.ruleMatched),
      matchedRuleName: r.ruleMatched,
    }));

    const count = batchImportTransactions(drafts);
    setImportSuccessCount(count);
    setTimeout(() => {
      setImportSuccessCount(null);
      onClose();
    }, 1500);
  };

  const selectedCount = parsedRows.filter((r) => r.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>Automated Statement & Feed Importer</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste raw CSV or statement text. The automation engine normalizes dates, merchants, and tags categories.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {importSuccessCount !== null ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-900">
                Successfully Imported {importSuccessCount} Transactions
              </h3>
              <p className="text-xs text-slate-500">
                Categories allocated and monthly budget pacing updated automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Preset Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Quick Test Feeds:</span>
                  <span className="text-slate-500 ml-1">
                    Select a format or paste your custom statement lines below.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSelectTemplate('chase')}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                  >
                    Chase Bank
                  </button>
                  <button
                    onClick={() => handleSelectTemplate('appleCard')}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                  >
                    Apple Card CSV
                  </button>
                  <button
                    onClick={() => handleSelectTemplate('bankOfAmerica')}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                  >
                    Bank of America
                  </button>
                </div>
              </div>

              {/* Input Area */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Statement Content (CSV, Tab-separated, or Raw Text)
                  </label>
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => {
                      setRawText(e.target.value);
                      setHasParsed(false);
                    }}
                    placeholder="2026-09-28, WHOLE FOODS MARKET #102, 64.20..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-500 resize-y"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target Account
                    </label>
                    <select
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-500"
                    >
                      <option value="Chase Sapphire">Chase Sapphire</option>
                      <option value="Primary Checking">Primary Checking</option>
                      <option value="Amex Gold">Amex Gold</option>
                      <option value="Apple Card">Apple Card</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <button
                    onClick={handleParse}
                    className="w-full px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    Run Parser & Rules
                  </button>
                </div>
              </div>

              {/* Parsed & Auto-Categorized Preview */}
              {hasParsed && (
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">Parsed Records:</span>
                      <span className="font-mono text-slate-500">{parsedRows.length} rows found</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-emerald-700 font-medium">
                        {parsedRows.filter((r) => r.ruleMatched).length} Auto-Matched
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectAll(true)}
                        className="text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleSelectAll(false)}
                        className="text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-medium text-[11px]">
                          <th className="py-2 px-3 w-8"></th>
                          <th className="py-2 px-3 w-24">Date</th>
                          <th className="py-2 px-3">Normalized Merchant</th>
                          <th className="py-2 px-3">Auto-Assigned Category</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((row) => (
                          <tr
                            key={row.id}
                            className={`hover:bg-slate-50 transition-colors ${
                              !row.selected ? 'opacity-40 bg-slate-50/50' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => handleToggleRow(row.id)}
                                className="rounded border-slate-300 text-slate-900 focus:ring-0"
                              />
                            </td>

                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                              {row.date}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">
                                {row.cleanMerchant}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                                {row.rawMerchant}
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <select
                                value={row.suggestedCategoryId}
                                onChange={(e) => handleCategoryChange(row.id, e.target.value)}
                                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              {row.ruleMatched && (
                                <div className="text-[10px] text-emerald-700 mt-0.5 font-medium flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Matched: {row.ruleMatched}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                              <span
                                className={
                                  row.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                                }
                              >
                                {row.type === 'income' ? '+' : '-'}$
                                {row.amount.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {importSuccessCount === null && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
            <div className="text-xs text-slate-500 font-mono">
              {hasParsed ? `${selectedCount} of ${parsedRows.length} selected for import` : 'Ready to parse'}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!hasParsed || selectedCount === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Import {selectedCount} Transactions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

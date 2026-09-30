import React, { useState } from 'react';
import {
  X,
  FileText,
  Scan,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Coffee,
  Fuel,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { runAutoCategorizer } from '../utils/automation';

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SampleReceipt {
  id: string;
  name: string;
  icon: typeof ShoppingBag;
  merchant: string;
  date: string;
  items: Array<{ name: string; price: number }>;
  tax: number;
  total: number;
  account: string;
}

const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'rc-1',
    name: 'Whole Foods Market',
    icon: ShoppingBag,
    merchant: 'Whole Foods Market',
    date: '2026-09-29',
    items: [
      { name: 'Organic Almond Milk 64oz', price: 4.29 },
      { name: 'Hass Avocados 4pk', price: 5.99 },
      { name: 'Wild Sockeye Salmon 0.8lb', price: 16.40 },
      { name: 'Artisan Sourdough Loaf', price: 6.50 },
    ],
    tax: 1.85,
    total: 35.03,
    account: 'Amex Gold',
  },
  {
    id: 'rc-2',
    name: 'Blue Bottle Cafe',
    icon: Coffee,
    merchant: 'Blue Bottle Coffee',
    date: '2026-09-30',
    items: [
      { name: 'Hayes Valley Espresso', price: 5.50 },
      { name: 'Oat Milk Flat White', price: 6.75 },
      { name: 'Almond Croissant', price: 5.25 },
    ],
    tax: 1.50,
    total: 19.00,
    account: 'Chase Sapphire',
  },
  {
    id: 'rc-3',
    name: 'Shell Fuel Station',
    icon: Fuel,
    merchant: 'Shell Oil Station #84',
    date: '2026-09-28',
    items: [
      { name: 'V-Power NiTRO+ 93 (11.4 gal)', price: 51.30 },
      { name: 'Sparkling Mineral Water', price: 2.79 },
    ],
    tax: 4.40,
    total: 58.49,
    account: 'Chase Sapphire',
  },
];

export const ReceiptScanModal: React.FC<ReceiptScanModalProps> = ({ isOpen, onClose }) => {
  const { categories, addTransaction, autoCategorizationService } = useFinance();

  const [selectedReceipt, setSelectedReceipt] = useState<SampleReceipt>(SAMPLE_RECEIPTS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(true);
  const [successToast, setSuccessToast] = useState(false);

  if (!isOpen) return null;

  // Run auto-categorization service on current receipt merchant
  const match = autoCategorizationService.categorizeByMerchant(
    selectedReceipt.merchant,
    '',
    selectedReceipt.total
  );

  const matchedCat = categories.find((c) => c.id === match.categoryId) || categories[0];

  const handleSimulateScan = (receipt: SampleReceipt) => {
    setSelectedReceipt(receipt);
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);
    }, 600);
  };

  const handleAddToLedger = () => {
    const itemizedSummary = selectedReceipt.items
      .map((it) => `${it.name} ($${it.price.toFixed(2)})`)
      .join(', ');

    addTransaction({
      merchant: selectedReceipt.merchant,
      amount: selectedReceipt.total,
      type: 'expense',
      categoryId: matchedCat.id,
      account: selectedReceipt.account,
      date: selectedReceipt.date,
      notes: `Receipt parsed: ${itemizedSummary} [Tax: $${selectedReceipt.tax.toFixed(2)}]`,
      autoCategorized: true,
      matchedRuleId: match.ruleId,
      matchedRuleName: match.ruleName,
    });

    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-600" />
              <span>Smart Receipt Scanner & Parser</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate paper receipt parsing, itemized totals extraction, and auto-tagging.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {successToast ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-900">
                Receipt Logged to Ledger!
              </h3>
              <p className="text-xs text-slate-500">
                ${selectedReceipt.total.toFixed(2)} categorized under {matchedCat.name}.
              </p>
            </div>
          ) : (
            <>
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Physical Receipt to Scan:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_RECEIPTS.map((rc) => {
                    const Icon = rc.icon;
                    const isSelected = selectedReceipt.id === rc.id;
                    return (
                      <button
                        key={rc.id}
                        type="button"
                        onClick={() => handleSimulateScan(rc)}
                        className={`p-3 text-left border rounded-md transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-slate-700 mb-1" />
                        <div className="font-semibold text-xs text-slate-900 truncate">
                          {rc.name}
                        </div>
                        <div className="font-mono tabular-nums text-xs text-slate-500 mt-0.5">
                          ${rc.total.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OCR Parsing Simulation Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs space-y-3 relative overflow-hidden">
                {isScanning && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 text-slate-900 font-sans font-semibold text-xs animate-pulse">
                      <Scan className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span>Extracting OCR text and parsing totals...</span>
                    </div>
                  </div>
                )}

                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <div className="font-bold text-slate-900 uppercase">
                    {selectedReceipt.merchant}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Terminal ID #4829 · {selectedReceipt.date}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 py-1">
                  {selectedReceipt.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span className="truncate pr-2">{item.name}</span>
                      <span className="tabular-nums">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-slate-400 pt-1 text-[11px]">
                    <span>Sales Tax / VAT</span>
                    <span>${selectedReceipt.tax.toFixed(2)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-bold text-slate-900 text-sm">
                  <span>TOTAL CHARGE</span>
                  <span className="tabular-nums">${selectedReceipt.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Auto Classification Result Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-emerald-900 font-medium">
                      Categorized as:{' '}
                    </span>
                    <span className="font-bold text-emerald-900">
                      {matchedCat.name}
                    </span>
                    <span className="text-emerald-700 text-[11px] ml-1">
                      ({matchedCat.group})
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-emerald-700">
                  95% confidence
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!successToast && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToLedger}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
            >
              Confirm & Post to Ledger
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

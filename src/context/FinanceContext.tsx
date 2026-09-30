import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Category,
  Transaction,
  AutomationRule,
  RecurringItem,
  MonthlyBudgetConfig,
  MonthPacingSummary,
  BudgetAlertToast,
  AutoCategorizationService,
  AutoCategorizationResult,
  SavingsGoal,
} from '../types/finance';
import {
  INITIAL_CATEGORIES,
  INITIAL_RULES,
  INITIAL_RECURRING,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGET_CONFIGS,
  INITIAL_SAVINGS_GOALS,
} from '../data/initialData';
import { calculateMonthSummary, runAutoCategorizer, evaluateRuleMatch } from '../utils/automation';

interface FinanceContextType {
  categories: Category[];
  transactions: Transaction[];
  rules: AutomationRule[];
  recurring: RecurringItem[];
  budgetConfigs: Record<string, MonthlyBudgetConfig>;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  currentBudgetConfig: MonthlyBudgetConfig;
  currentSummary: MonthPacingSummary;
  availableMonths: string[];

  // Budget Alert Notification System
  alertToasts: BudgetAlertToast[];
  dismissAlertToast: (id: string) => void;
  clearAllAlerts: () => void;
  checkAndNotifyBudgetThresholds: (month?: string, customTxList?: Transaction[]) => void;
  setCategoryAlertThreshold: (month: string, categoryId: string, thresholdPercent: number) => void;
  setDefaultAlertThreshold: (month: string, thresholdPercent: number) => void;

  // Automated Categorization Service
  autoCategorizationService: AutoCategorizationService;

  // Transaction mutations
  addTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  batchImportTransactions: (txs: Array<Omit<Transaction, 'id'>>) => number;

  // Automation rules mutations
  addRule: (rule: Omit<AutomationRule, 'id' | 'matchCount'>) => void;
  updateRule: (rule: AutomationRule) => void;
  deleteRule: (id: string) => void;
  toggleRuleActive: (id: string) => void;
  runAllRulesOnTransactions: () => { matchedCount: number };

  // Budget configuration mutations
  updateCategoryBudget: (month: string, categoryId: string, amount: number) => void;
  updateIncomeTarget: (month: string, amount: number) => void;
  apply503020Rule: (month: string) => void;

  // Recurring mutations
  addRecurringItem: (item: Omit<RecurringItem, 'id'>) => void;
  updateRecurringItem: (item: RecurringItem) => void;
  deleteRecurringItem: (id: string) => void;
  recordRecurringPayment: (recurringId: string) => void;

  // Savings Goals & Surplus Allocation
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'history'>) => void;
  updateSavingsGoal: (goal: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  allocateSurplusToGoal: (
    goalId: string,
    amount: number,
    sourceName?: string,
    notes?: string
  ) => { success: boolean; newCurrent: number };

  // Reset
  resetToDemoData: () => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

const STORAGE_KEY_TXS = 'ledgerpulse_txs_v1';
const STORAGE_KEY_RULES = 'ledgerpulse_rules_v1';
const STORAGE_KEY_RECURRING = 'ledgerpulse_rec_v1';
const STORAGE_KEY_BUDGETS = 'ledgerpulse_budgets_v1';
const STORAGE_KEY_SAVINGS_GOALS = 'ledgerpulse_goals_v1';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TXS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load txs from storage', e);
    }
    return INITIAL_TRANSACTIONS;
  });

  const [rules, setRules] = useState<AutomationRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RULES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load rules from storage', e);
    }
    return INITIAL_RULES;
  });

  const [recurring, setRecurring] = useState<RecurringItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECURRING);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load recurring from storage', e);
    }
    return INITIAL_RECURRING;
  });

  const [budgetConfigs, setBudgetConfigs] = useState<Record<string, MonthlyBudgetConfig>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BUDGETS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load budgets from storage', e);
    }
    return INITIAL_BUDGET_CONFIGS;
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVINGS_GOALS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load savings goals from storage', e);
    }
    return INITIAL_SAVINGS_GOALS;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Budget Alert Toasts state
  const [alertToasts, setAlertToasts] = useState<BudgetAlertToast[]>([]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RECURRING, JSON.stringify(recurring));
  }, [recurring]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgetConfigs));
  }, [budgetConfigs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SAVINGS_GOALS, JSON.stringify(savingsGoals));
  }, [savingsGoals]);

  // Dismiss a toast
  const dismissAlertToast = useCallback((id: string) => {
    setAlertToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlertToasts([]);
  }, []);

  // Helper to evaluate and trigger alert if a category exceeds threshold
  const evaluateCategoryThreshold = useCallback(
    (
      categoryId: string,
      month: string,
      txList: Transaction[],
      configs: Record<string, MonthlyBudgetConfig>
    ) => {
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat || cat.group === 'Income') return;

      const config = configs[month] || {
        month,
        incomeTarget: 7500,
        savingsTarget: 1500,
        categoryBudgets: {},
        alertThresholdPercentage: 100,
      };

      const budgetLimit = config.categoryBudgets[categoryId] ?? cat.defaultBudget;
      if (budgetLimit <= 0) return;

      const thresholdPct =
        config.categoryAlertThresholds?.[categoryId] ??
        config.alertThresholdPercentage ??
        100;

      // Sum expenses for this category in this month
      const categorySpent = txList
        .filter(
          (t) => t.date.startsWith(month) && t.categoryId === categoryId && t.type === 'expense'
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const thresholdAmount = (budgetLimit * thresholdPct) / 100;

      if (categorySpent >= thresholdAmount) {
        const overage = categorySpent - budgetLimit;
        const alertId = `alert-${month}-${categoryId}`;

        const newAlert: BudgetAlertToast = {
          id: alertId,
          categoryId,
          categoryName: cat.name,
          month,
          spent: categorySpent,
          budgetLimit,
          thresholdPercentage: thresholdPct,
          overage,
          createdAt: Date.now(),
        };

        setAlertToasts((prev) => {
          const withoutCurrent = prev.filter((item) => item.id !== alertId);
          return [newAlert, ...withoutCurrent];
        });
      }
    },
    [categories]
  );

  // Check and notify for all categories in a month
  const checkAndNotifyBudgetThresholds = useCallback(
    (targetMonth?: string, customTxList?: Transaction[]) => {
      const month = targetMonth || selectedMonth;
      const txList = customTxList || transactions;
      for (const cat of categories) {
        if (cat.group !== 'Income') {
          evaluateCategoryThreshold(cat.id, month, txList, budgetConfigs);
        }
      }
    },
    [selectedMonth, transactions, categories, budgetConfigs, evaluateCategoryThreshold]
  );

  // Set category alert threshold percentage
  const setCategoryAlertThreshold = useCallback(
    (month: string, categoryId: string, thresholdPercent: number) => {
      setBudgetConfigs((prev) => {
        const current = prev[month] || {
          month,
          incomeTarget: 7500,
          savingsTarget: 1500,
          categoryBudgets: {},
          alertThresholdPercentage: 100,
          categoryAlertThresholds: {},
        };
        const updated = {
          ...prev,
          [month]: {
            ...current,
            categoryAlertThresholds: {
              ...(current.categoryAlertThresholds || {}),
              [categoryId]: thresholdPercent,
            },
          },
        };
        // Re-evaluate immediately with new threshold
        setTimeout(() => {
          evaluateCategoryThreshold(categoryId, month, transactions, updated);
        }, 50);
        return updated;
      });
    },
    [transactions, evaluateCategoryThreshold]
  );

  // Set default alert threshold percentage
  const setDefaultAlertThreshold = useCallback(
    (month: string, thresholdPercent: number) => {
      setBudgetConfigs((prev) => {
        const current = prev[month] || {
          month,
          incomeTarget: 7500,
          savingsTarget: 1500,
          categoryBudgets: {},
          alertThresholdPercentage: 100,
        };
        const updated = {
          ...prev,
          [month]: {
            ...current,
            alertThresholdPercentage: thresholdPercent,
          },
        };
        setTimeout(() => {
          for (const cat of categories) {
            if (cat.group !== 'Income') {
              evaluateCategoryThreshold(cat.id, month, transactions, updated);
            }
          }
        }, 50);
        return updated;
      });
    },
    [categories, transactions, evaluateCategoryThreshold]
  );

  // Available months list derived from transactions + defaults
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>(['2026-09', '2026-08', '2026-07', '2026-10']);
    for (const t of transactions) {
      const m = t.date.slice(0, 7);
      if (m.length === 7) monthsSet.add(m);
    }
    return Array.from(monthsSet).sort().reverse();
  }, [transactions]);

  // Current active budget configuration for selected month
  const currentBudgetConfig = useMemo((): MonthlyBudgetConfig => {
    if (budgetConfigs[selectedMonth]) {
      return budgetConfigs[selectedMonth];
    }
    const categoryBudgets: Record<string, number> = {};
    for (const cat of categories) {
      if (cat.group !== 'Income') {
        categoryBudgets[cat.id] = cat.defaultBudget;
      }
    }
    return {
      month: selectedMonth,
      incomeTarget: 7500,
      savingsTarget: 1500,
      categoryBudgets,
      alertThresholdPercentage: 100,
    };
  }, [budgetConfigs, selectedMonth, categories]);

  // Current month summary metrics
  const currentSummary = useMemo(() => {
    return calculateMonthSummary(selectedMonth, transactions, currentBudgetConfig, categories);
  }, [selectedMonth, transactions, currentBudgetConfig, categories]);

  // ---------------- Automated Categorization Service ----------------
  const autoCategorizationService = useMemo((): AutoCategorizationService => {
    return {
      /**
       * Evaluates an incoming merchant name against active automation rules (and fallback patterns)
       */
      categorizeByMerchant: (merchantName: string, notes = '', amount = 0): AutoCategorizationResult => {
        const cleanMerchant = (merchantName || '').trim();
        // Priority sorted active rules
        const activeRules = [...rules]
          .filter((r) => r.isActive)
          .sort((a, b) => a.priority - b.priority);

        for (const rule of activeRules) {
          if (evaluateRuleMatch(rule, { merchant: cleanMerchant, notes, amount })) {
            return {
              categoryId: rule.targetCategoryId,
              autoCategorized: true,
              matchedRuleId: rule.id,
              matchedRuleName: rule.name,
              ruleId: rule.id,
              ruleName: rule.name,
              confidence: 0.98,
            };
          }
        }

        // Secondary pattern matching heuristic
        const match = runAutoCategorizer({ merchant: cleanMerchant, notes, amount }, rules);
        if (match.categoryId) {
          return {
            categoryId: match.categoryId,
            autoCategorized: true,
            matchedRuleId: match.ruleId,
            matchedRuleName: match.ruleName,
            ruleId: match.ruleId,
            ruleName: match.ruleName,
            confidence: match.confidence,
          };
        }

        return {
          categoryId: 'cat-shopping',
          autoCategorized: false,
          confidence: 0.1,
        };
      },

      /**
       * Automatically assigns category to a single incoming transaction
       */
      assignCategoryToTransaction: <
        T extends {
          merchant: string;
          categoryId?: string;
          notes?: string;
          amount?: number;
          type?: Transaction['type'];
        }
      >(
        transaction: T
      ) => {
        // If user already assigned a category and it is valid, preserve it
        if (
          transaction.categoryId &&
          transaction.categoryId !== 'cat-uncategorized' &&
          categories.some((c) => c.id === transaction.categoryId)
        ) {
          return {
            ...transaction,
            categoryId: transaction.categoryId,
            autoCategorized: false,
          };
        }

        const match = autoCategorizationService.categorizeByMerchant(
          transaction.merchant,
          transaction.notes,
          transaction.amount
        );

        const fallbackCategory = transaction.type === 'income' ? 'cat-salary' : 'cat-shopping';

        return {
          ...transaction,
          categoryId: match.autoCategorized ? match.categoryId : fallbackCategory,
          autoCategorized: match.autoCategorized,
          matchedRuleId: match.matchedRuleId,
          matchedRuleName: match.matchedRuleName,
        };
      },

      /**
       * Automatically categorizes an incoming batch of transactions based on merchant names
       */
      categorizeBatch: <
        T extends {
          merchant: string;
          categoryId?: string;
          notes?: string;
          amount?: number;
          type?: Transaction['type'];
        }
      >(
        batch: T[]
      ) => {
        return batch.map((item) => autoCategorizationService.assignCategoryToTransaction(item));
      },

      /**
       * Tests whether a merchant name matches a specific rule
       */
      testRuleMatch: (merchantName: string, rule: AutomationRule, amount = 0) => {
        return evaluateRuleMatch(rule, { merchant: merchantName, amount });
      },
    };
  }, [rules, categories]);

  // ---------------- Transactions ----------------
  const addTransaction = (txDraft: Omit<Transaction, 'id'>): Transaction => {
    // Automatically assign category using the rule-matching engine service
    const assigned = autoCategorizationService.assignCategoryToTransaction(txDraft);

    const newTx: Transaction = {
      ...assigned,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    const updatedTransactions = [newTx, ...transactions];
    setTransactions(updatedTransactions);

    // Update rule match count
    if (newTx.matchedRuleId) {
      setRules((prev) =>
        prev.map((r) => (r.id === newTx.matchedRuleId ? { ...r, matchCount: r.matchCount + 1 } : r))
      );
    }

    // Evaluate budget alert threshold for this category
    if (newTx.type === 'expense') {
      const txMonth = newTx.date.slice(0, 7);
      evaluateCategoryThreshold(newTx.categoryId, txMonth, updatedTransactions, budgetConfigs);
    }

    return newTx;
  };

  const updateTransaction = (tx: Transaction) => {
    const updated = transactions.map((item) => (item.id === tx.id ? tx : item));
    setTransactions(updated);

    if (tx.type === 'expense') {
      const txMonth = tx.date.slice(0, 7);
      evaluateCategoryThreshold(tx.categoryId, txMonth, updated, budgetConfigs);
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  const batchImportTransactions = (txs: Array<Omit<Transaction, 'id'>>): number => {
    const newItems: Transaction[] = [];
    const ruleHits: Record<string, number> = {};
    const affectedCategories = new Set<string>();
    const affectedMonths = new Set<string>();

    for (let i = 0; i < txs.length; i++) {
      const draft = txs[i];
      // Process through auto-categorization service
      const processed = autoCategorizationService.assignCategoryToTransaction(draft);

      if (processed.matchedRuleId) {
        ruleHits[processed.matchedRuleId] = (ruleHits[processed.matchedRuleId] || 0) + 1;
      }

      if (processed.type === 'expense') {
        affectedCategories.add(processed.categoryId);
        affectedMonths.add(processed.date.slice(0, 7));
      }

      newItems.push({
        ...processed,
        id: `tx-import-${Date.now()}-${i}`,
      });
    }

    const updatedTransactions = [...newItems, ...transactions];
    setTransactions(updatedTransactions);

    // Increment matched rule counts
    setRules((prev) =>
      prev.map((r) =>
        ruleHits[r.id] ? { ...r, matchCount: r.matchCount + ruleHits[r.id] } : r
      )
    );

    // Check budget alert thresholds for all affected categories across affected months
    for (const month of affectedMonths) {
      for (const catId of affectedCategories) {
        evaluateCategoryThreshold(catId, month, updatedTransactions, budgetConfigs);
      }
    }

    return newItems.length;
  };

  // ---------------- Rules ----------------
  const addRule = (rule: Omit<AutomationRule, 'id' | 'matchCount'>) => {
    const newRule: AutomationRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      matchCount: 0,
    };
    setRules((prev) => [...prev, newRule]);
  };

  const updateRule = (rule: AutomationRule) => {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleRuleActive = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const runAllRulesOnTransactions = () => {
    let matchedCount = 0;
    const ruleHits: Record<string, number> = {};

    setTransactions((prev) =>
      prev.map((tx) => {
        const match = runAutoCategorizer(
          { merchant: tx.merchant, notes: tx.notes, amount: tx.amount },
          rules
        );
        if (match.categoryId && match.categoryId !== tx.categoryId) {
          matchedCount++;
          if (match.ruleId) {
            ruleHits[match.ruleId] = (ruleHits[match.ruleId] || 0) + 1;
          }
          return {
            ...tx,
            categoryId: match.categoryId,
            autoCategorized: true,
            matchedRuleId: match.ruleId,
            matchedRuleName: match.ruleName,
          };
        }
        return tx;
      })
    );

    if (Object.keys(ruleHits).length > 0) {
      setRules((prev) =>
        prev.map((r) =>
          ruleHits[r.id] ? { ...r, matchCount: r.matchCount + ruleHits[r.id] } : r
        )
      );
    }

    return { matchedCount };
  };

  // ---------------- Budgets ----------------
  const updateCategoryBudget = (month: string, categoryId: string, amount: number) => {
    setBudgetConfigs((prev) => {
      const current = prev[month] || {
        month,
        incomeTarget: 7500,
        savingsTarget: 1500,
        categoryBudgets: {},
        alertThresholdPercentage: 100,
      };
      const updated = {
        ...prev,
        [month]: {
          ...current,
          categoryBudgets: {
            ...current.categoryBudgets,
            [categoryId]: Math.max(0, amount),
          },
        },
      };

      // Check if this new budget limit is exceeded by existing spend
      setTimeout(() => {
        evaluateCategoryThreshold(categoryId, month, transactions, updated);
      }, 50);

      return updated;
    });
  };

  const updateIncomeTarget = (month: string, amount: number) => {
    setBudgetConfigs((prev) => {
      const current = prev[month] || {
        month,
        incomeTarget: 7500,
        savingsTarget: 1500,
        categoryBudgets: {},
        alertThresholdPercentage: 100,
      };
      return {
        ...prev,
        [month]: {
          ...current,
          incomeTarget: Math.max(0, amount),
        },
      };
    });
  };

  const apply503020Rule = (month: string) => {
    const targetIncome = currentBudgetConfig.incomeTarget || 7500;
    const essentialsTarget = targetIncome * 0.5; // 50%
    const discretionaryTarget = targetIncome * 0.3; // 30%
    const savingsTarget = targetIncome * 0.2; // 20%

    const essentialCats = categories.filter((c) => c.group === 'Essentials');
    const discretionaryCats = categories.filter((c) => c.group === 'Discretionary');
    const savingsCats = categories.filter((c) => c.group === 'Savings & Investments');

    const newBudgets: Record<string, number> = { ...currentBudgetConfig.categoryBudgets };

    const distribute = (list: Category[], totalPool: number) => {
      const baseSum = list.reduce((sum, c) => sum + c.defaultBudget, 0) || 1;
      for (const item of list) {
        newBudgets[item.id] = Math.round((item.defaultBudget / baseSum) * totalPool);
      }
    };

    distribute(essentialCats, essentialsTarget);
    distribute(discretionaryCats, discretionaryTarget);
    distribute(savingsCats, savingsTarget);

    const updated = {
      ...budgetConfigs,
      [month]: {
        month,
        incomeTarget: targetIncome,
        savingsTarget,
        categoryBudgets: newBudgets,
        alertThresholdPercentage: currentBudgetConfig.alertThresholdPercentage ?? 100,
      },
    };

    setBudgetConfigs(updated);

    // Re-check all categories against new limits
    setTimeout(() => {
      for (const cat of categories) {
        if (cat.group !== 'Income') {
          evaluateCategoryThreshold(cat.id, month, transactions, updated);
        }
      }
    }, 50);
  };

  // ---------------- Recurring ----------------
  const addRecurringItem = (item: Omit<RecurringItem, 'id'>) => {
    const newItem: RecurringItem = {
      ...item,
      id: `rec-${Date.now()}`,
    };
    setRecurring((prev) => [...prev, newItem]);
  };

  const updateRecurringItem = (item: RecurringItem) => {
    setRecurring((prev) => prev.map((r) => (r.id === item.id ? item : r)));
  };

  const deleteRecurringItem = (id: string) => {
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  };

  const recordRecurringPayment = (recurringId: string) => {
    const item = recurring.find((r) => r.id === recurringId);
    if (!item) return;

    const todayStr = '2026-09-30';
    addTransaction({
      date: todayStr,
      merchant: item.merchant,
      amount: item.amount,
      type: 'expense',
      categoryId: item.categoryId,
      account: item.account,
      notes: `Recurring ${item.frequency} payment logged`,
      autoCategorized: true,
      isRecurring: true,
    });

    setRecurring((prev) =>
      prev.map((r) => (r.id === recurringId ? { ...r, lastBilledDate: todayStr } : r))
    );
  };

  // ---------------- Savings Goals & Surplus Allocation ----------------
  const addSavingsGoal = (goalDraft: Omit<SavingsGoal, 'id' | 'history'>) => {
    const newGoal: SavingsGoal = {
      ...goalDraft,
      id: `goal-${Date.now()}`,
      history:
        goalDraft.currentAmount > 0
          ? [
              {
                id: `contrib-${Date.now()}`,
                date: '2026-09-30',
                amount: goalDraft.currentAmount,
                source: 'Initial Starting Capital',
              },
            ]
          : [],
    };
    setSavingsGoals((prev) => [newGoal, ...prev]);
  };

  const updateSavingsGoal = (goal: SavingsGoal) => {
    setSavingsGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const allocateSurplusToGoal = (
    goalId: string,
    amount: number,
    sourceName = 'Monthly Budget Surplus Allocation',
    notes = ''
  ) => {
    const targetGoal = savingsGoals.find((g) => g.id === goalId);
    if (!targetGoal || amount <= 0) {
      return { success: false, newCurrent: targetGoal?.currentAmount || 0 };
    }

    const todayStr = '2026-09-30';
    const newCurrent = targetGoal.currentAmount + amount;

    const contribution = {
      id: `contrib-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      date: todayStr,
      amount,
      source: sourceName,
      notes: notes || undefined,
    };

    setSavingsGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              currentAmount: newCurrent,
              history: [contribution, ...g.history],
            }
          : g
      )
    );

    // Record an allocation expense in the active ledger
    addTransaction({
      date: todayStr,
      merchant: `Surplus Allocation: ${targetGoal.name}`,
      amount,
      type: 'expense',
      categoryId: 'cat-emergency',
      account: 'Primary Checking',
      notes: notes || `Manual surplus allocation of $${amount.toFixed(2)} to ${targetGoal.name}`,
      autoCategorized: false,
    });

    return { success: true, newCurrent };
  };

  // ---------------- Reset ----------------
  const resetToDemoData = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    setRules(INITIAL_RULES);
    setRecurring(INITIAL_RECURRING);
    setBudgetConfigs(INITIAL_BUDGET_CONFIGS);
    setSavingsGoals(INITIAL_SAVINGS_GOALS);
    setSelectedMonth('2026-09');
    setAlertToasts([]);
    localStorage.removeItem(STORAGE_KEY_TXS);
    localStorage.removeItem(STORAGE_KEY_RULES);
    localStorage.removeItem(STORAGE_KEY_RECURRING);
    localStorage.removeItem(STORAGE_KEY_BUDGETS);
    localStorage.removeItem(STORAGE_KEY_SAVINGS_GOALS);
  };

  return (
    <FinanceContext.Provider
      value={{
        categories,
        transactions,
        rules,
        recurring,
        budgetConfigs,
        selectedMonth,
        setSelectedMonth,
        currentBudgetConfig,
        currentSummary,
        availableMonths,
        alertToasts,
        dismissAlertToast,
        clearAllAlerts,
        checkAndNotifyBudgetThresholds,
        setCategoryAlertThreshold,
        setDefaultAlertThreshold,
        autoCategorizationService,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        batchImportTransactions,
        addRule,
        updateRule,
        deleteRule,
        toggleRuleActive,
        runAllRulesOnTransactions,
        updateCategoryBudget,
        updateIncomeTarget,
        apply503020Rule,
        addRecurringItem,
        updateRecurringItem,
        deleteRecurringItem,
        recordRecurringPayment,
        savingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        allocateSurplusToGoal,
        resetToDemoData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};


export type TransactionType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  group: 'Essentials' | 'Discretionary' | 'Savings & Investments' | 'Income';
  color: string;
  defaultBudget: number;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number; // positive number always; type indicates sign
  type: TransactionType;
  categoryId: string;
  account: string; // e.g. "Primary Checking", "Chase Sapphire", "Amex Gold", "Cash"
  notes?: string;
  autoCategorized: boolean;
  matchedRuleId?: string;
  matchedRuleName?: string;
  isRecurring?: boolean;
}

export type RuleField = 'merchant' | 'notes' | 'amount';
export type RuleOperator = 'contains' | 'equals' | 'startsWith' | 'greaterThan' | 'lessThan';

export interface AutomationRule {
  id: string;
  name: string;
  field: RuleField;
  operator: RuleOperator;
  value: string | number;
  targetCategoryId: string;
  targetAccount?: string;
  priority: number; // 1 is highest
  isActive: boolean;
  matchCount: number;
}

export interface RecurringItem {
  id: string;
  merchant: string;
  amount: number;
  categoryId: string;
  account: string;
  frequency: 'monthly' | 'yearly' | 'weekly';
  dayOfMonth: number; // 1-31
  status: 'active' | 'paused';
  lastBilledDate?: string;
  notes?: string;
}

export interface GoalContribution {
  id: string;
  date: string;
  amount: number;
  source: string; // e.g. "Monthly Budget Surplus", "Direct Transfer", "Bonus"
  notes?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string; // YYYY-MM-DD
  color: string;
  categoryIcon?: string;
  notes?: string;
  history: GoalContribution[];
}

export interface BudgetAlertToast {
  id: string;
  categoryId: string;
  categoryName: string;
  month: string;
  spent: number;
  budgetLimit: number;
  thresholdPercentage: number; // e.g. 100% or custom 85%
  overage: number; // spent - budgetLimit
  createdAt: number;
}

export interface MonthlyBudgetConfig {
  month: string; // "YYYY-MM"
  incomeTarget: number;
  savingsTarget: number;
  categoryBudgets: Record<string, number>; // categoryId -> amount
  alertThresholdPercentage?: number; // default percentage to trigger alert (e.g. 100 = 100% of budget)
  categoryAlertThresholds?: Record<string, number>; // optional categoryId -> specific threshold percentage
}

export interface MonthPacingSummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage (0 - 100)
  totalBudget: number;
  budgetUtilization: number; // percentage
  daysPassed: number;
  daysInMonth: number;
  dailyBurnRate: number; // actual spend per day so far
  targetDailyRate: number; // budgeted spend per day
  projectedMonthTotal: number;
  projectedVariance: number; // positive = under budget, negative = over budget
  pacingStatus: 'on-track' | 'approaching-limit' | 'over-budget';
}

export interface AutoCategorizationResult {
  categoryId: string;
  autoCategorized: boolean;
  matchedRuleId?: string;
  matchedRuleName?: string;
  ruleId?: string;
  ruleName?: string;
  confidence: number;
}

export interface AutoCategorizationService {
  categorizeByMerchant: (
    merchantName: string,
    notes?: string,
    amount?: number
  ) => AutoCategorizationResult;
  assignCategoryToTransaction: <
    T extends {
      merchant: string;
      categoryId?: string;
      notes?: string;
      amount?: number;
      type?: TransactionType;
    }
  >(
    transaction: T
  ) => T & {
    categoryId: string;
    autoCategorized: boolean;
    matchedRuleId?: string;
    matchedRuleName?: string;
  };
  categorizeBatch: <
    T extends {
      merchant: string;
      categoryId?: string;
      notes?: string;
      amount?: number;
      type?: TransactionType;
    }
  >(
    transactions: T[]
  ) => Array<
    T & {
      categoryId: string;
      autoCategorized: boolean;
      matchedRuleId?: string;
      matchedRuleName?: string;
    }
  >;
  testRuleMatch: (merchantName: string, rule: AutomationRule, amount?: number) => boolean;
}


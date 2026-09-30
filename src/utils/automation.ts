import { AutomationRule, Category, MonthlyBudgetConfig, MonthPacingSummary, Transaction } from '../types/finance';

export interface AutoMatchResult {
  categoryId: string | null;
  ruleId?: string;
  ruleName?: string;
  confidence: number;
}

/**
 * Evaluates whether a transaction matches an automation rule
 */
export function evaluateRuleMatch(
  rule: AutomationRule,
  draft: { merchant: string; notes?: string; amount: number }
): boolean {
  if (!rule.isActive) return false;

  let testValue: string | number = '';
  if (rule.field === 'merchant') testValue = (draft.merchant || '').toLowerCase();
  else if (rule.field === 'notes') testValue = (draft.notes || '').toLowerCase();
  else if (rule.field === 'amount') testValue = draft.amount || 0;

  const ruleValueStr = String(rule.value).toLowerCase();

  switch (rule.operator) {
    case 'contains':
      return typeof testValue === 'string' && testValue.includes(ruleValueStr);
    case 'equals':
      return typeof testValue === 'string'
        ? testValue === ruleValueStr
        : Number(testValue) === Number(rule.value);
    case 'startsWith':
      return typeof testValue === 'string' && testValue.startsWith(ruleValueStr);
    case 'greaterThan':
      return Number(testValue) > Number(rule.value);
    case 'lessThan':
      return Number(testValue) < Number(rule.value);
    default:
      return false;
  }
}

/**
 * Runs the automation rule pipeline against a transaction draft
 */
export function runAutoCategorizer(
  draft: { merchant: string; notes?: string; amount: number },
  rules: AutomationRule[]
): AutoMatchResult {
  // Sort rules by priority (ascending: 1 is top priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (evaluateRuleMatch(rule, draft)) {
      return {
        categoryId: rule.targetCategoryId,
        ruleId: rule.id,
        ruleName: rule.name,
        confidence: 0.95,
      };
    }
  }

  // Fallback heuristic keyword dictionary if no user rule matched
  const heuristics: Array<{ pattern: RegExp; categoryId: string; name: string }> = [
    { pattern: /(uber|lyft|transit|mta|gas|fuel|chevron|shell|exxon|mobil|bp|speedway)/i, categoryId: 'cat-transport', name: 'Transit & Fuel Pattern' },
    { pattern: /(whole\s?foods|trader\s?joe|safeway|kroger|aldi|costco|market|grocery|supermarket|target|walmart)/i, categoryId: 'cat-groceries', name: 'Grocery Pattern' },
    { pattern: /(coffee|starbucks|blue bottle|dunkin|peet|cafe|espresso|roasters)/i, categoryId: 'cat-dining', name: 'Cafe Pattern' },
    { pattern: /(restaurant|bistro|grill|burger|pizza|sushi|taco|doordash|ubereats|grubhub|sweetgreen|chipotle)/i, categoryId: 'cat-dining', name: 'Dining Pattern' },
    { pattern: /(netflix|spotify|hulu|disney|apple\.com\/bill|youtube|patreon|substack|github|cursor)/i, categoryId: 'cat-subscriptions', name: 'Subscription Pattern' },
    { pattern: /(rent|lease|mortgage|property\s?mgmt|avalon|equity\s?residential)/i, categoryId: 'cat-housing', name: 'Housing Pattern' },
    { pattern: /(electric|power|coned|pge|national\s?grid|water|sewer|trash|verizon|at&t|t-mobile)/i, categoryId: 'cat-utilities', name: 'Utilities Pattern' },
    { pattern: /(pharmacy|cvs|walgreens|doctor|clinic|dental|hospital|equinox|gym|fitness)/i, categoryId: 'cat-health', name: 'Health Pattern' },
    { pattern: /(payroll|direct\s?dep|salary|employer|bonus|dividend|ach\s?credit)/i, categoryId: 'cat-salary', name: 'Payroll Deposit Pattern' },
    { pattern: /(vanguard|fidelity|schwab|etrade|robinhood|index|fund)/i, categoryId: 'cat-investing', name: 'Investment Pattern' },
    { pattern: /(airline|flight|hotel|airbnb|booking|delta|united|american\s?air)/i, categoryId: 'cat-travel', name: 'Travel Pattern' },
  ];

  const searchTarget = `${draft.merchant} ${draft.notes || ''}`;
  for (const h of heuristics) {
    if (h.pattern.test(searchTarget)) {
      return {
        categoryId: h.categoryId,
        ruleName: h.name,
        confidence: 0.75,
      };
    }
  }

  return { categoryId: null, confidence: 0 };
}

/**
 * Parses raw bank statements (CSV or text dump)
 */
export interface ParsedStatementRow {
  id: string;
  date: string;
  rawMerchant: string;
  cleanMerchant: string;
  amount: number;
  type: 'expense' | 'income';
  suggestedCategoryId: string;
  ruleMatched?: string;
  account: string;
  selected: boolean;
}

export function parseStatementFeed(
  rawText: string,
  accountName: string,
  rules: AutomationRule[]
): ParsedStatementRow[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedStatementRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip CSV header row if detected
    if (
      i === 0 &&
      (line.toLowerCase().includes('date') ||
        line.toLowerCase().includes('transaction') ||
        line.toLowerCase().includes('description') ||
        line.toLowerCase().includes('amount'))
    ) {
      continue;
    }

    // Try splitting by comma, tab, or multiple spaces
    let parts: string[] = [];
    if (line.includes(',')) {
      // Basic CSV split respecting quotes
      const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const val = match[1] ?? match[2] ?? '';
        parts.push(val.trim());
      }
      if (parts.length && parts[0] === '') parts.shift();
    } else if (line.includes('\t')) {
      parts = line.split('\t').map((p) => p.trim());
    } else {
      // Split by semicolon or 2+ spaces
      parts = line.split(/\s{2,}|\;/).map((p) => p.trim());
    }

    if (parts.length < 2) continue;

    // Detect fields: Date, Description, Amount
    let dateStr = '';
    let merchantStr = '';
    let amountNum = 0;
    let isIncome = false;

    // 1. Search for date format (YYYY-MM-DD or MM/DD/YYYY)
    for (const part of parts) {
      const isoMatch = part.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
      const usMatch = part.match(/\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](20\d{2})\b/);

      if (isoMatch) {
        dateStr = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
        break;
      } else if (usMatch) {
        dateStr = `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
        break;
      }
    }

    // If no date found, default to current simulated month date
    if (!dateStr) {
      dateStr = '2026-09-29';
    }

    // 2. Search for amount ($123.45, -45.00, (50.00))
    for (let pIdx = parts.length - 1; pIdx >= 0; pIdx--) {
      const part = parts[pIdx];
      const cleanMoney = part.replace(/[$\s,]/g, '');

      // Check parentheses for negative: (45.00)
      const parenMatch = cleanMoney.match(/^\(([\d.]+)\)$/);
      if (parenMatch) {
        amountNum = parseFloat(parenMatch[1]);
        isIncome = false;
        break;
      }

      if (/^-?[\d.]+$/.test(cleanMoney) && !isNaN(Number(cleanMoney))) {
        const val = parseFloat(cleanMoney);
        if (val < 0) {
          // Negative on credit card / bank statement often means debit/expense or credit/payment depending on issuer
          amountNum = Math.abs(val);
          isIncome = false;
        } else {
          amountNum = Math.abs(val);
          // If explicitly marked Credit or Deposit
          if (line.toLowerCase().includes('payroll') || line.toLowerCase().includes('deposit') || line.toLowerCase().includes('salary')) {
            isIncome = true;
          }
        }
        break;
      }
    }

    // 3. Search for merchant string (longest remaining part that is not date or amount)
    for (const part of parts) {
      const isDatePart = part.includes(dateStr) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(part);
      const isMoneyPart = /[$\d,.-]+/.test(part) && !/[a-zA-Z]{3,}/.test(part);
      if (!isDatePart && !isMoneyPart && part.length > merchantStr.length) {
        merchantStr = part;
      }
    }

    if (!merchantStr) {
      merchantStr = parts[1] || 'Unidentified Merchant';
    }

    // Clean up merchant name (strip transaction codes, card suffix, merchant terminal IDs)
    const cleanMerchant = merchantStr
      .replace(/(PURCHASE AUTHORIZED ON|CHECKCARD|DEBIT CARD|POS PURCHASE|TERMINAL|STORE #\d+|REF #\d+)/gi, '')
      .replace(/#\d+|\*\w+|\d{4,}/g, '')
      .replace(/\s+/g, ' ')
      .trim() || merchantStr;

    // Run auto-categorizer
    const match = runAutoCategorizer({ merchant: cleanMerchant, amount: amountNum }, rules);

    results.push({
      id: `stmt-${Date.now()}-${i}`,
      date: dateStr,
      rawMerchant: merchantStr,
      cleanMerchant: cleanMerchant,
      amount: amountNum || 25.0,
      type: isIncome ? 'income' : 'expense',
      suggestedCategoryId: match.categoryId || (isIncome ? 'cat-salary' : 'cat-shopping'),
      ruleMatched: match.ruleName,
      account: accountName,
      selected: true,
    });
  }

  return results;
}

export const SAMPLE_BANK_FEEDS = {
  chase: `2026-09-28,DEBIT CARD PURCHASE WHOLE FOODS #10293 SAN FRANCISCO CA,68.40
2026-09-28,UBER TRIP HELP.UBER.COM CA,24.15
2026-09-27,STARBUCKS STORE 09182 SEATTLE WA,8.45
2026-09-26,CHEVRON 009281 GAS SAN FRANCISCO CA,52.30
2026-09-25,NETFLIX.COM DIGITAL SUBSCRIPTION CA,22.99
2026-09-24,DOORDASH*SWEETGREEN RESTAURANT,31.75
2026-09-23,TRADER JOE 412 SAN FRANCISCO CA,94.20`,

  appleCard: `Transaction Date,Description,Merchant,Category,Amount
2026-09-27,Blue Bottle Coffee South Park,Blue Bottle,Dining,12.50
2026-09-26,Apple Services iCloud & Music,Apple,Subscriptions,14.99
2026-09-25,Nordstrom Retail Store,Nordstrom,Shopping,185.00
2026-09-23,Equinox Fitness Monthly,Equinox,Health,260.00
2026-09-22,Shell Oil Service Station,Shell,Automotive,46.80`,

  bankOfAmerica: `09/27/2026	CHECKCARD 0926 CVS PHARMACY #3812	38.20
09/25/2026	CONEDISON UTILITY PAYMENT ONLINE	142.50
09/24/2026	ACH DIRECT DEPOSIT ACME CORP PAYROLL	3400.00
09/22/2026	SPOTIFY USA MONTHLY SUBSCRIPTION	19.99
09/20/2026	LYFT *RIDE 09-20 SAN FRANCISCO	19.40`,
};

/**
 * Calculates budget pacing metrics for a given month
 */
export function calculateMonthSummary(
  monthStr: string, // YYYY-MM
  transactions: Transaction[],
  budgetConfig: MonthlyBudgetConfig,
  categories: Category[]
): MonthPacingSummary {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // For current month (2026-09), simulated today is 2026-09-30 (day 30)
  const isCurrentMonth = monthStr === '2026-09';
  const isPastMonth = monthStr < '2026-09';
  const daysPassed = isPastMonth ? daysInMonth : isCurrentMonth ? 30 : 1;

  // Filter transactions for this month
  const monthTxs = transactions.filter((t) => t.date.startsWith(monthStr));

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const t of monthTxs) {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
    }
  }

  // Calculate sum of active category budgets
  let totalBudget = 0;
  for (const cat of categories) {
    if (cat.group !== 'Income') {
      const alloc = budgetConfig.categoryBudgets[cat.id] ?? cat.defaultBudget;
      totalBudget += alloc;
    }
  }

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netSavings / totalIncome) * 100) : 0;
  const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  // Daily burn rate vs target
  const dailyBurnRate = daysPassed > 0 ? totalExpenses / daysPassed : 0;
  const targetDailyRate = daysInMonth > 0 ? totalBudget / daysInMonth : 0;

  // Projected end-of-month spend
  const projectedMonthTotal = dailyBurnRate * daysInMonth;
  const projectedVariance = totalBudget - projectedMonthTotal;

  // Pacing status determination
  // If actual spend is >100% of budget -> over-budget
  // If projected spend is >105% of budget OR spend is > 90% before month end -> approaching-limit
  // Else -> on-track
  let pacingStatus: 'on-track' | 'approaching-limit' | 'over-budget' = 'on-track';
  if (totalExpenses > totalBudget) {
    pacingStatus = 'over-budget';
  } else if (projectedMonthTotal > totalBudget * 1.05 || (daysPassed < daysInMonth && (totalExpenses / totalBudget) > (daysPassed / daysInMonth) * 1.15)) {
    pacingStatus = 'approaching-limit';
  }

  return {
    month: monthStr,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    totalBudget,
    budgetUtilization,
    daysPassed,
    daysInMonth,
    dailyBurnRate,
    targetDailyRate,
    projectedMonthTotal,
    projectedVariance,
    pacingStatus,
  };
}

/**
 * Computes daily cumulative spending array for burn-down / pacing visualization
 */
export function getDailySpendingTimeline(
  monthStr: string,
  transactions: Transaction[],
  totalBudget: number
) {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthTxs = transactions.filter((t) => t.date.startsWith(monthStr) && t.type === 'expense');

  const dailyMap: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) dailyMap[d] = 0;

  for (const t of monthTxs) {
    const day = parseInt(t.date.split('-')[2], 10);
    if (day && dailyMap[day] !== undefined) {
      dailyMap[day] += t.amount;
    }
  }

  const result: Array<{
    day: number;
    amount: number;
    cumulative: number;
    budgetTrajectory: number;
  }> = [];

  let runningTotal = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    runningTotal += dailyMap[d];
    const budgetTrajectory = (totalBudget / daysInMonth) * d;
    result.push({
      day: d,
      amount: dailyMap[d],
      cumulative: runningTotal,
      budgetTrajectory,
    });
  }

  return result;
}

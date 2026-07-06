export type AssetType =
  | 'mutual_fund'
  | 'stock'
  | 'rsu_esop'
  | 'gold'
  | 'real_estate'
  | 'fixed_deposit'
  | 'epf_ppf'
  | 'crypto'
  | 'other'
  | 'lent_amount'
  | 'bank_balance'
  | 'fixed_asset'
  | 'physical_gold';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category: 'Equity' | 'Debt' | 'Hybrid' | 'Precious Metals' | 'Real Estate' | 'Cash Equivalents' | 'Other' | 'Lent Assets' | 'Personal Assets';
  units?: number;
  purchasePrice: number; // Avg buy price, principal or lent principal
  currentPrice: number;  // Current NAV, market price or rate
  value: number;         // Current valuation (units * currentPrice, total principal + growth, or lent + accrued interest)
  folio?: string;
  symbol?: string;       // Ticker symbol if applicable
  institution?: string;   // AMC or Bank or Borrower
  mappedGoalId: string | null;
  lastUpdated: string;
  
  // Advanced fields
  ownerName: string;      // Family member name (e.g. 'Self', 'Spouse', 'Father', 'Mother')
  interestRate?: number;  // e.g. 8.5 for 8.5% interest rate for lent amounts or deposits
  borrowerName?: string;  // for lent amounts
  lentDate?: string;      // for lent amounts
  accountNumber?: string; // for bank balances
  goldKarat?: 14 | 18 | 22 | 24; // for gold karat specifications
  goldWeightGrams?: number; // weight of physical gold in grams
  country?: string;       // country where physical gold is held or priced
  brokerName?: string;    // 'Zerodha' | 'Groww' | 'Upstox' if pulled from a broker
  
  // Currency and RSU specific fields
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  vestedUnits?: number;
  unvestedUnits?: number;
  grantDate?: string;
}

export interface UserSettings {
  countryOfResidence: string;
  residentialAddress: string;
  primaryCurrency: 'INR' | 'USD' | 'EUR' | 'GBP';
  inflationRate: number;
  equityCAGR: number;
  debtCAGR: number;
  taxBracket: number;
  casDecryptionPassword?: string;
}

export interface Insurance {
  id: string;
  name: string;
  type: 'life' | 'health' | 'car' | 'two_wheeler' | 'other';
  insurer: string;
  policyNumber: string;
  sumAssured: number;
  premiumAmount: number;
  premiumFrequency: 'annual' | 'monthly' | 'quarterly' | 'one-time';
  premiumDueDate: string;
  nominee?: string;
  status: 'active' | 'lapsed' | 'grace_period';
  ownerName: string;      // Family member name (e.g. 'Self', 'Spouse')
  lastUpdated: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: 'Self' | 'Spouse' | 'Child' | 'Father' | 'Mother' | 'Sibling' | 'Other';
  avatarColor: string; // Tailwind bg color class
}

export interface FinancialGoal {
  id: string;
  name: string;
  category: 'retirement' | 'education' | 'home' | 'custom';
  targetAmount: number;
  targetYear: number;
  currentValue: number; // Computed dynamically as the sum of all mapped assets
  monthlySipContribution: number; // Current monthly addition
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  targetAge?: number; // for retirement
  currentAge?: number; // for retirement
}

export interface CASParseResult {
  success: boolean;
  investorName?: string;
  email?: string;
  pan?: string;
  assets: Omit<Asset, 'id' | 'mappedGoalId' | 'lastUpdated' | 'ownerName'>[];
}

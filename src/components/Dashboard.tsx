import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Wallet, ShieldCheck, RefreshCw, ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, User, Users, Plus, Shield, Check, Trash2, Settings } from 'lucide-react';
import { Asset, FinancialGoal, FamilyMember, Insurance, UserSettings } from '../types';
import { convertCurrency, formatCurrency, CurrencyType, CURRENCY_SYMBOLS } from '../utils/currency';

interface DashboardProps {
  assets: Asset[];
  goals: FinancialGoal[];
  insurances: Insurance[];
  familyMembers: FamilyMember[];
  selectedMember: string;
  onSelectMember: (memberName: string) => void;
  onAddFamilyMember: (name: string, relationship: FamilyMember['relationship']) => void;
  onDeleteFamilyMember: (id: string) => void;
  investorDetails: { name: string; email: string; pan: string } | null;
  onRefreshPrices: () => void;
  settings?: UserSettings;
  usdInrRate?: number;
  onSwitchTab?: (tab: 'dashboard' | 'goals' | 'assets' | 'insurance' | 'settings') => void;
}

export default function Dashboard({
  assets,
  goals,
  insurances,
  familyMembers,
  selectedMember,
  onSelectMember,
  onAddFamilyMember,
  onDeleteFamilyMember,
  investorDetails,
  onRefreshPrices,
  settings,
  usdInrRate,
  onSwitchTab
}: DashboardProps) {
  const displayCurrency = settings?.primaryCurrency || 'INR';
  const usdRate = usdInrRate || 83.54;

  const [expectedReturn, setExpectedReturn] = useState<number>(settings?.equityCAGR || 12); // Expected CAGR
  const [projectionYears, setProjectionYears] = useState<number>(15); // Timeline
  const [marketPrices, setMarketPrices] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize initial expectedReturn with user settings overrides
  useEffect(() => {
    if (settings?.equityCAGR) {
      setExpectedReturn(settings.equityCAGR);
    }
  }, [settings?.equityCAGR]);

  // Fetch market rates from server API
  const fetchMarketPrices = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/market-prices');
      const data = await res.json();
      setMarketPrices(data.indices);
    } catch (err) {
      console.error("Error fetching market prices:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketPrices();
    const interval = setInterval(fetchMarketPrices, 15000);
    return () => clearInterval(interval);
  }, []);

  // Helpers for currency-converted assets
  const getAssetValInDisplayCurrency = (a: Asset): number => {
    let valInAssetCurrency = a.value || 0;
    
    if (a.type === 'lent_amount' && a.interestRate && a.lentDate) {
      // Simple Interest accrued dynamically
      const lentDateObj = new Date(a.lentDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lentDateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const interestAccrued = a.purchasePrice * (a.interestRate / 100) * (diffDays / 365);
      valInAssetCurrency = a.purchasePrice + interestAccrued;
    } else if (a.type === 'physical_gold' && a.goldWeightGrams && a.goldKarat && a.country) {
      // Live or fallback gold pricing
      const ratePer10g = marketPrices?.gold_24k?.price || 72450.00;
      const ratePerGram = ratePer10g / 10;
      const multiplier = a.goldKarat / 24;
      valInAssetCurrency = a.goldWeightGrams * ratePerGram * multiplier;
    }

    const assetCurrency = a.currency || 'INR';
    return convertCurrency(valInAssetCurrency, assetCurrency, displayCurrency, usdRate);
  };

  const getAssetCostInDisplayCurrency = (a: Asset): number => {
    const costInAssetCurrency = a.purchasePrice || 0;
    const assetCurrency = a.currency || 'INR';
    return convertCurrency(costInAssetCurrency, assetCurrency, displayCurrency, usdRate);
  };

  // Filter parameters by selected family member
  const filteredAssets = selectedMember === 'all'
    ? assets
    : assets.filter(a => a.ownerName === selectedMember);

  const filteredInsurances = selectedMember === 'all'
    ? insurances
    : insurances.filter(ins => ins.ownerName === selectedMember);

  // 1. Core Portfolio Metric calculations in Primary Display Currency
  const totalValue = filteredAssets.reduce((sum, a) => sum + getAssetValInDisplayCurrency(a), 0);
  const totalCost = filteredAssets.reduce((sum, a) => sum + getAssetCostInDisplayCurrency(a), 0);
  const totalProfitLoss = totalValue - totalCost;
  const plPercentage = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  // Active Insurance summary (sumAssured is assumed INR, convert to Display Currency)
  const activeInsurances = filteredInsurances.filter(i => i.status === 'active');
  const totalInsuranceCoverRaw = activeInsurances.reduce((sum, i) => sum + i.sumAssured, 0);
  const totalInsuranceCover = convertCurrency(totalInsuranceCoverRaw, 'INR', displayCurrency, usdRate);

  // Goals monthly SIP contribution (assumed INR, convert to Display Currency)
  const totalMonthlySipRaw = goals.reduce((sum, g) => sum + g.monthlySipContribution, 0);
  const totalMonthlySip = convertCurrency(totalMonthlySipRaw, 'INR', displayCurrency, usdRate);

  // 2. Asset Allocation Chart Data
  const categoriesMap: { [key: string]: number } = {};
  filteredAssets.forEach(asset => {
    const assetVal = getAssetValInDisplayCurrency(asset);
    categoriesMap[asset.category] = (categoriesMap[asset.category] || 0) + assetVal;
  });

  const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ef4444', '#64748b', '#ec4899', '#8b5cf6'];
  const allocationData = Object.keys(categoriesMap).map(cat => ({
    name: cat,
    value: Number(categoriesMap[cat].toFixed(2)),
    percentage: totalValue > 0 ? (categoriesMap[cat] / totalValue) * 100 : 0
  }));

  // 3. Family Member Wealth Distribution split
  const familyContributionsMap: { [key: string]: number } = {};
  assets.forEach(a => {
    const assetVal = getAssetValInDisplayCurrency(a);
    familyContributionsMap[a.ownerName || 'Self'] = (familyContributionsMap[a.ownerName || 'Self'] || 0) + assetVal;
  });

  const familyContributionData = Object.keys(familyContributionsMap).map(member => {
    const totalAssetsVal = assets.reduce((sum, a) => sum + getAssetValInDisplayCurrency(a), 0);
    return {
      name: member,
      value: Number(familyContributionsMap[member].toFixed(2)),
      percentage: totalAssetsVal > 0 ? (familyContributionsMap[member] / totalAssetsVal) * 100 : 0
    };
  });

  // 4. Goal progress bars data
  const goalsBarData = goals.map(goal => {
    // Accumulate value of mapped assets in primary display currency
    const mappedAssets = assets.filter(a => a.mappedGoalId === goal.id && (selectedMember === 'all' || a.ownerName === selectedMember));
    const accumulatedInDisplay = mappedAssets.reduce((sum, a) => sum + getAssetValInDisplayCurrency(a), 0);
    const targetInDisplay = convertCurrency(goal.targetAmount, 'INR', displayCurrency, usdRate);

    const keyAccrued = `Current Accumulated (${CURRENCY_SYMBOLS[displayCurrency]})`;
    const keyTarget = `Target Corpus (${CURRENCY_SYMBOLS[displayCurrency]})`;

    return {
      name: goal.name.length > 20 ? goal.name.substring(0, 20) + '...' : goal.name,
      [keyAccrued]: Math.round(accumulatedInDisplay),
      [keyTarget]: Math.round(targetInDisplay),
    };
  });

  // 5. Compound Growth Simulation
  const generateProjectionData = () => {
    const data = [];
    const monthlyRate = expectedReturn / 100 / 12;
    const annualRate = expectedReturn / 100;
    
    const keyProjected = `Projected Wealth (${CURRENCY_SYMBOLS[displayCurrency]})`;
    const keyInvested = `Invested Capital (${CURRENCY_SYMBOLS[displayCurrency]})`;

    for (let year = 0; year <= projectionYears; year++) {
      if (year === 0) {
        data.push({
          year: `Year 0`,
          [keyProjected]: Math.round(totalValue),
          [keyInvested]: Math.round(totalValue)
        });
      } else {
        const compoundedCorpus = totalValue * Math.pow(1 + annualRate, year);
        const months = year * 12;
        const sipFutureValue = totalMonthlySip > 0 
          ? totalMonthlySip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
          : 0;

        const projectedVal = compoundedCorpus + sipFutureValue;
        const totalInvested = totalValue + (totalMonthlySip * months);

        data.push({
          year: `Yr ${year}`,
          [keyProjected]: Math.round(projectedVal),
          [keyInvested]: Math.round(totalInvested)
        });
      }
    }
    return data;
  };

  const projectionData = generateProjectionData();

  const renderCurrencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700/60 font-mono text-xs shadow-lg">
          <p className="font-display font-semibold mb-1 text-slate-300">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="font-semibold">
              {entry.name}: {formatCurrency(entry.value, displayCurrency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dashboard-root" className="space-y-6">
      {/* Family Hub Filter Row */}
      {familyMembers.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">No Active Profiles Registered</h3>
              <p className="text-slate-400 text-xs mt-0.5 max-w-xl leading-relaxed">
                Welcome! Get started by setting up your primary investor profile and registering any family members under the <strong>Settings</strong> panel.
              </p>
            </div>
          </div>
          <button
            id="btn-goto-settings-init"
            onClick={() => onSwitchTab?.('settings')}
            className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Settings className="h-3.5 w-3.5" />
            Initialize Profile
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm/5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Users className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="font-display font-bold text-slate-900 text-sm">Family Portfolio Selection Hub</h2>
                <p className="text-slate-400 text-[11px]">Filter wealth parameters or manage dynamic family portfolios</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="filter-member-all"
                onClick={() => onSelectMember('all')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                  selectedMember === 'all'
                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/10'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                👨‍👩‍👧‍👦 Combined Family
              </button>

              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-1">
                  <button
                    id={`filter-member-${member.id}`}
                    onClick={() => onSelectMember(member.name)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                      selectedMember === member.name
                        ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/10'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${member.avatarColor}`}></span>
                    {member.name}
                  </button>
                </div>
              ))}

              <button
                id="btn-manage-members-settings"
                onClick={() => onSwitchTab?.('settings')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100/50 rounded-full hover:bg-indigo-100 transition-all cursor-pointer"
              >
                <Settings className="h-3 w-3" /> Manage Family
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Market Live Ticker Widget */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4 border border-slate-800 relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingUp className="h-44 w-44 text-brand-500" />
        </div>
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          <span className="text-xs font-mono font-bold tracking-wider text-brand-400 uppercase">Live Index Monitor</span>
          <span className="text-slate-500 text-[10px] hidden md:inline">| Indian Equities & Precious Commodities</span>
        </div>
        <div className="flex items-center gap-6 overflow-x-auto py-1 max-w-full no-scrollbar font-mono text-xs">
          {marketPrices ? (
            Object.keys(marketPrices).slice(0, 5).map(key => {
              const item = marketPrices[key];
              const isUp = item.changePercent >= 0;
              return (
                <div key={key} className="flex items-center gap-1.5 whitespace-nowrap bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 text-[11px] font-display font-medium">{item.name.replace(' Index', '')}</span>
                  <span className="font-semibold">₹{item.price.toLocaleString('en-IN')}</span>
                  <span className={`flex items-center text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {isUp ? '+' : ''}{item.changePercent}%
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className="h-3 w-3 animate-spin text-brand-500" />
              <span>Connecting dynamically to pricing APIs...</span>
            </div>
          )}
        </div>
        <button
          id="btn-refresh-market"
          onClick={() => { fetchMarketPrices(); onRefreshPrices(); }}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-center text-slate-400 border border-slate-700/60 cursor-pointer"
          title="Force Update Market Feed"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand-500' : ''}`} />
        </button>
      </div>

      {/* Core Summary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="geo-card p-6 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Net Portfolio Valuation</span>
            <p className="font-display font-bold text-slate-900 text-2xl mt-1.5">
              {formatCurrency(totalValue, displayCurrency)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 border-t border-slate-100 pt-3">
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-bold rounded-full ${
              totalProfitLoss >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {totalProfitLoss >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalProfitLoss), displayCurrency)} ({plPercentage.toFixed(1)}%)
            </span>
            <span className="text-slate-400 text-[10px]">Gain</span>
          </div>
        </div>

        <div className="geo-card p-6 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Invested Principal</span>
            <p className="font-display font-bold text-slate-900 text-2xl mt-1.5">
              {formatCurrency(totalCost, displayCurrency)}
            </p>
          </div>
          <div className="text-slate-400 text-xs mt-4 border-t border-slate-100 pt-3 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-slate-400" />
            Across {filteredAssets.length} active wealth holdings
          </div>
        </div>

        <div className="geo-card p-6 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Insurance Risk Protection Cover</span>
            <p className="font-display font-bold text-indigo-900 text-2xl mt-1.5">
              {formatCurrency(totalInsuranceCover, displayCurrency)}
            </p>
          </div>
          <div className="text-slate-400 text-xs mt-4 border-t border-slate-100 pt-3 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-indigo-600 animate-pulse-slow" />
            Buffer cover across {activeInsurances.length} active policies
          </div>
        </div>

        {/* Account Credentials / Member Badge */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-brand-300 text-xs font-semibold uppercase tracking-wider">Account Active</span>
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            {investorDetails ? (
              <div className="mt-2.5">
                <p className="font-display font-bold text-sm text-slate-100">
                  {selectedMember === 'all' ? 'All Family Members' : `${selectedMember}'s Portfolio`}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{investorDetails.email}</p>
                <p className="font-mono text-[10px] text-brand-400 font-bold tracking-wider mt-1.5 uppercase">PAN: {investorDetails.pan}</p>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-slate-300 font-semibold text-xs leading-snug">Family Demat Sandbox</p>
                <p className="text-[10px] text-slate-400 mt-1">Upload CAS text or sync broker to verify security.</p>
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3.5 flex items-center gap-1.5 mt-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Encrypted Family Sandbox Active
          </div>
        </div>
      </div>

      {/* Asset Allocation & Goal progress split charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Asset Class Allocation or Member Contribution */}
        <div className="geo-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 font-display font-semibold text-base">
              {selectedMember === 'all' ? 'Family Wealth Class Allocation' : `${selectedMember} Class Allocation`}
            </h3>
            {selectedMember === 'all' && familyContributionData.length > 0 && (
              <span className="text-[10px] text-brand-600 font-mono font-bold bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-md uppercase">
                Combined Aggregate
              </span>
            )}
          </div>

          {allocationData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-xs italic">
              Please register custom assets or import CAS text to inspect allocation structures.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              <div className="md:col-span-3 h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Total</span>
                  <span className="font-display font-bold text-slate-800 text-sm leading-none">
                    ₹{Math.round(totalValue / 1000).toLocaleString('en-IN')}k
                  </span>
                </div>
              </div>
              <div className="md:col-span-2 space-y-3">
                {allocationData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}></span>
                      <span className="font-medium text-slate-600 truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-xs font-mono">{item.percentage.toFixed(1)}%</p>
                      <p className="text-[10px] text-slate-400 font-mono">₹{(item.value / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Family-wide Wealth Share pie chart (Rendered when 'all' is selected) */}
        {selectedMember === 'all' && familyContributionData.length > 0 ? (
          <div className="geo-card p-6">
            <h3 className="text-slate-900 font-display font-semibold text-base mb-4">Family Member Portfolio Share</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              <div className="md:col-span-3 h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={familyContributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {familyContributionData.map((entry, index) => {
                        const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Net Worth</span>
                  <span className="font-display font-bold text-slate-800 text-sm leading-none">
                    ₹{Math.round(totalValue / 100000).toFixed(1)}L
                  </span>
                </div>
              </div>
              <div className="md:col-span-2 space-y-3">
                {familyContributionData.map((item, index) => {
                  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></span>
                        <span className="font-medium text-slate-600">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 text-xs font-mono">{item.percentage.toFixed(1)}%</p>
                        <p className="text-[10px] text-slate-400 font-mono">₹{(item.value / 100000).toFixed(2)}L</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Show Goals chart when member selected or family chart empty */
          <div className="geo-card p-6">
            <h3 className="text-slate-900 font-display font-semibold text-base mb-4">Financial Goal Milestones</h3>
            {goalsBarData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-xs italic">
                Please create long-term goals and map assets to see progress tracking.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={goalsBarData} margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${Math.round(val / 100000)}L`} />
                    <Tooltip content={renderCurrencyTooltip} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Current Accumulated (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Target Corpus (₹)" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Compound Projections simulation */}
      <div className="geo-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-slate-900 font-display font-semibold text-base">Compound Wealth Projection</h3>
            <p className="text-slate-400 text-xs mt-0.5">Explore how current {selectedMember === 'all' ? 'family' : selectedMember} corpus grows over long-term timelines</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs font-semibold">Timeline:</span>
              <select
                id="select-projection-years"
                value={projectionYears}
                onChange={(e) => setProjectionYears(parseInt(e.target.value))}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:border-brand-500"
              >
                <option value={5}>5 Years</option>
                <option value={10}>10 Years</option>
                <option value={15}>15 Years</option>
                <option value={20}>20 Years</option>
                <option value={25}>25 Years</option>
                <option value={30}>30 Years</option>
              </select>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-slate-500 text-xs font-semibold">CAGR Rate:</span>
              <input
                id="range-expected-return"
                type="range"
                min={6}
                max={18}
                step={0.5}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <span className="text-brand-700 font-mono font-bold text-xs bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">{expectedReturn}%</span>
            </div>
          </div>
        </div>

        {totalValue === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-xs italic">
            Please import mutual funds or add custom assets to run compound growth models.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
            <div className="lg:col-span-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 30, bottom: 5 }}>
                  <defs>
                    <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="capitalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${Math.round(val / 100000)}L`} />
                  <Tooltip content={renderCurrencyTooltip} />
                  <Legend verticalAlign="top" height={36} iconType="line" wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="Projected Wealth (₹)" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#wealthGrad)" />
                  <Area type="monotone" dataKey="Invested Capital (₹)" stroke="#4f46e5" strokeWidth={1.5} fillOpacity={1} fill="url(#capitalGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
              <h4 className="font-display font-semibold text-xs text-slate-700 uppercase tracking-wider">Compound Growth Values</h4>
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block font-display">Target Period</span>
                  <p className="text-slate-800 font-semibold text-sm mt-0.5">{projectionYears} Years (by {new Date().getFullYear() + projectionYears})</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-display">Principal Capital</span>
                  <p className="text-slate-800 font-semibold text-sm mt-0.5">₹{Math.round(projectionData[projectionData.length - 1]['Invested Capital (₹)']).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-display">Estimated Corpus</span>
                  <p className="text-brand-700 font-bold text-lg mt-0.5">₹{Math.round(projectionData[projectionData.length - 1]['Projected Wealth (₹)']).toLocaleString('en-IN')}</p>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-emerald-600 font-bold block">₹{Math.round(projectionData[projectionData.length - 1]['Projected Wealth (₹)'] - projectionData[projectionData.length - 1]['Invested Capital (₹)']).toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 text-[10px] font-display">Compounded Earnings</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

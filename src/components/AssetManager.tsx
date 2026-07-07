import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Landmark, Coins, TrendingUp, Circle, Check, RefreshCw, AlertTriangle, User, HelpCircle, Shield, ArrowDownUp, Lock, Key, Info, DollarSign, Sparkles } from 'lucide-react';
import { Asset, AssetType, FinancialGoal, FamilyMember, UserSettings } from '../types';
import { convertCurrency, formatCurrency, CurrencyType, CURRENCY_SYMBOLS } from '../utils/currency';
import CASImporter from './CASImporter';

interface AssetManagerProps {
  assets: Asset[];
  goals: FinancialGoal[];
  familyMembers: FamilyMember[];
  onAddAsset: (asset: Omit<Asset, 'id' | 'lastUpdated'>) => void;
  onDeleteAsset: (id: string) => void;
  onUpdateAsset: (id: string, updated: Partial<Asset>) => void;
  onImportCASSuccess?: (parsedAssets: Omit<Asset, 'id' | 'mappedGoalId' | 'lastUpdated' | 'ownerName'>[], details?: { name: string; email: string; pan: string }, targetOwnerName?: string, parserUsed?: string) => void;
  selectedMember: string;
  settings?: UserSettings;
  usdInrRate?: number;
}

const GOLD_PRICE_FALLBACK: Record<string, { currency: string, pricePer10g: number, symbol: string }> = {
  "India": { currency: "INR", pricePer10g: 72450.00, symbol: "₹" },
  "USA": { currency: "USD", pricePer10g: 64200.00, symbol: "$" },
  "UAE": { currency: "AED", pricePer10g: 65400.00, symbol: "AED " },
  "UK": { currency: "GBP", pricePer10g: 65100.00, symbol: "£" },
  "Singapore": { currency: "SGD", pricePer10g: 65900.00, symbol: "S$" }
};

export default function AssetManager({
  assets,
  goals,
  familyMembers,
  onAddAsset,
  onDeleteAsset,
  onUpdateAsset,
  onImportCASSuccess,
  selectedMember,
  settings,
  usdInrRate
}: AssetManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Integration States
  const [integrationTab, setIntegrationTab] = useState<'broker' | 'cas'>('broker');
  const [importOwner, setImportOwner] = useState(familyMembers[0]?.name || 'Self');

  // Keep importOwner in sync with family members list to prevent orphaned or stale defaults
  useEffect(() => {
    if (familyMembers.length > 0) {
      const hasOwner = familyMembers.some(m => m.name === importOwner);
      if (!hasOwner || importOwner === 'Self' || importOwner === 'Rajesh (Self)') {
        const selfMember = familyMembers.find(m => m.relationship === 'Self');
        const target = selfMember ? selfMember.name : familyMembers[0].name;
        if (importOwner !== target) {
          setImportOwner(target);
        }
      }
    } else if (importOwner !== 'Self') {
      setImportOwner('Self');
    }
  }, [familyMembers]);

  // Broker Sync State
  const [showBrokerSync, setShowBrokerSync] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<'Zerodha' | 'Groww' | 'Upstox' | 'AngelOne'>('Zerodha');
  const [clientId, setClientId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [integrationMode, setIntegrationMode] = useState<'sandbox' | 'api'>('sandbox');
  const [apiKey, setApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [password, setPassword] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncPreview, setSyncPreview] = useState<{
    success: boolean;
    holdings: any[];
    duplicates: any[];
    uniques: any[];
    authenticated?: boolean;
    authenticatedAt?: string | null;
  } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('fixed_deposit');
  const [category, setCategory] = useState<Asset['category']>('Cash Equivalents');
  const [units, setUnits] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [institution, setInstitution] = useState('');
  const [mappedGoalId, setMappedGoalId] = useState<string>('');
  const [ownerName, setOwnerName] = useState('Self');

  // Advanced inputs
  const [borrowerName, setBorrowerName] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [lentDate, setLentDate] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [goldKarat, setGoldKarat] = useState<14 | 18 | 22 | 24>(22);
  const [goldWeightGrams, setGoldWeightGrams] = useState('');
  const [goldCountry, setGoldCountry] = useState('India');

  // RSU/ESOP and Custom Currency fields
  const [currency, setCurrency] = useState<CurrencyType>('INR');
  const [vestedUnits, setVestedUnits] = useState('');
  const [unvestedUnits, setUnvestedUnits] = useState('');
  const [grantDate, setGrantDate] = useState('');

  // Gold rate from server or fallback
  const [goldRates, setGoldRates] = useState<any>(GOLD_PRICE_FALLBACK);

  useEffect(() => {
    fetch('/api/gold-country-rates')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.rates) {
          setGoldRates(data.rates);
        }
      })
      .catch(err => console.log("Failed to fetch custom gold rates, using fallback: ", err));
  }, []);

  const handleTypeChange = (selectedType: AssetType) => {
    setType(selectedType);
    switch (selectedType) {
      case 'mutual_fund':
      case 'stock':
        setCategory('Equity');
        setCurrency('INR');
        break;
      case 'rsu_esop':
        setCategory('Equity');
        setCurrency('USD');
        break;
      case 'gold':
      case 'physical_gold':
        setCategory('Precious Metals');
        setCurrency('INR');
        break;
      case 'real_estate':
        setCategory('Real Estate');
        setCurrency('INR');
        break;
      case 'fixed_deposit':
      case 'epf_ppf':
        setCategory('Debt');
        setCurrency('INR');
        break;
      case 'crypto':
        setCategory('Other');
        setCurrency('USD');
        break;
      case 'lent_amount':
        setCategory('Lent Assets');
        setCurrency('INR');
        break;
      case 'bank_balance':
        setCategory('Cash Equivalents');
        setCurrency('INR');
        break;
      case 'fixed_asset':
        setCategory('Personal Assets');
        setCurrency('INR');
        break;
      default:
        setCategory('Other');
        setCurrency('INR');
    }
  };

  const calculateAccruedLentAmount = (principal: number, rate: number, dateStr: string): number => {
    if (!dateStr) return principal;
    const lentDateObj = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lentDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Simple Interest calculated daily
    const interestAccrued = principal * (rate / 100) * (diffDays / 365);
    return Number((principal + interestAccrued).toFixed(2));
  };

  const calculateGoldValue = (weight: number, karat: number, country: string): number => {
    const rateInfo = goldRates[country] || goldRates['India'];
    const ratePer10g = rateInfo.pricePer10g;
    const ratePerGram = ratePer10g / 10;
    
    // Karat Multiplier
    const multiplier = karat / 24;
    return Number((weight * ratePerGram * multiplier).toFixed(2));
  };

  const resetForm = () => {
    setName('');
    setType('fixed_deposit');
    setCategory('Cash Equivalents');
    setUnits('');
    setPurchasePrice('');
    setCurrentPrice('');
    setInstitution('');
    setMappedGoalId('');
    setOwnerName('Self');
    setBorrowerName('');
    setInterestRate('');
    setLentDate('');
    setAccountNumber('');
    setGoldKarat(22);
    setGoldWeightGrams('');
    setGoldCountry('India');
    setCurrency('INR');
    setVestedUnits('');
    setUnvestedUnits('');
    setGrantDate('');
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let parsedPurchase = parseFloat(purchasePrice) || 0;
    let parsedCurrentPrice = parseFloat(currentPrice) || parsedPurchase || 0;
    let parsedUnits = parseFloat(units) || 1;
    let computedValue = parsedUnits * parsedCurrentPrice;

    // Advanced overrides
    let updatedFields: Partial<Asset> = {
      ownerName: ownerName || 'Self',
      currency: currency || 'INR'
    };

    if (type === 'lent_amount') {
      const p = parseFloat(purchasePrice) || 0;
      const r = parseFloat(interestRate) || 0;
      computedValue = calculateAccruedLentAmount(p, r, lentDate);
      parsedPurchase = p;
      parsedCurrentPrice = computedValue;
      parsedUnits = 1;

      updatedFields = {
        ...updatedFields,
        interestRate: r,
        borrowerName: borrowerName,
        lentDate: lentDate,
        institution: borrowerName || 'Friend'
      };
    } else if (type === 'physical_gold') {
      const weight = parseFloat(goldWeightGrams) || 0;
      computedValue = calculateGoldValue(weight, goldKarat, goldCountry);
      parsedPurchase = computedValue * 0.9; // estimate buying value at slightly lower
      parsedCurrentPrice = calculateGoldValue(1, goldKarat, goldCountry);
      parsedUnits = weight;

      updatedFields = {
        ...updatedFields,
        goldKarat: goldKarat,
        goldWeightGrams: weight,
        country: goldCountry,
        institution: `Stored in ${goldCountry}`
      };
    } else if (type === 'bank_balance') {
      const balance = parseFloat(purchasePrice) || 0;
      computedValue = balance;
      parsedPurchase = balance;
      parsedCurrentPrice = balance;
      parsedUnits = 1;

      updatedFields = {
        ...updatedFields,
        accountNumber: accountNumber,
        institution: institution || 'Bank'
      };
    } else if (type === 'rsu_esop') {
      const vested = parseFloat(vestedUnits) || 0;
      const unvested = parseFloat(unvestedUnits) || 0;
      const totalUnits = vested + unvested;
      
      parsedUnits = totalUnits;
      computedValue = totalUnits * parsedCurrentPrice;

      updatedFields = {
        ...updatedFields,
        vestedUnits: vested,
        unvestedUnits: unvested,
        grantDate: grantDate || undefined,
        institution: institution || 'Company Treasury'
      };
    }

    if (editingId) {
      onUpdateAsset(editingId, {
        name,
        type,
        category,
        units: parsedUnits,
        purchasePrice: parsedPurchase,
        currentPrice: parsedCurrentPrice,
        value: computedValue,
        institution: institution || updatedFields.institution || undefined,
        mappedGoalId: mappedGoalId || null,
        ownerName: ownerName || 'Self',
        ...updatedFields
      });
    } else {
      onAddAsset({
        name,
        type,
        category,
        units: parsedUnits,
        purchasePrice: parsedPurchase,
        currentPrice: parsedCurrentPrice,
        value: computedValue,
        institution: institution || updatedFields.institution || undefined,
        mappedGoalId: mappedGoalId || null,
        ownerName: ownerName || 'Self',
        ...updatedFields
      });
    }

    resetForm();
  };

  const startEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setName(asset.name);
    setType(asset.type);
    setCategory(asset.category);
    setUnits(asset.units?.toString() || '');
    setPurchasePrice(asset.purchasePrice.toString());
    setCurrentPrice(asset.currentPrice.toString());
    setInstitution(asset.institution || '');
    setMappedGoalId(asset.mappedGoalId || '');
    setOwnerName(asset.ownerName || 'Self');
    setCurrency(asset.currency || 'INR');

    if (asset.type === 'lent_amount') {
      setBorrowerName(asset.borrowerName || '');
      setInterestRate(asset.interestRate?.toString() || '');
      setLentDate(asset.lentDate || '');
    } else if (asset.type === 'physical_gold') {
      setGoldKarat(asset.goldKarat || 22);
      setGoldWeightGrams(asset.goldWeightGrams?.toString() || '');
      setGoldCountry(asset.country || 'India');
    } else if (asset.type === 'bank_balance') {
      setAccountNumber(asset.accountNumber || '');
    } else if (asset.type === 'rsu_esop') {
      setVestedUnits(asset.vestedUnits?.toString() || '');
      setUnvestedUnits(asset.unvestedUnits?.toString() || '');
      setGrantDate(asset.grantDate || '');
    }
    setShowAddForm(true);
  };

  // Indian Broker Integration Handler
  const handleBrokerSync = async () => {
    if (!clientId.trim()) {
      setSyncError("Broker Client ID / PAN is required.");
      return;
    }
    setIsSyncing(true);
    setSyncPreview(null);
    setSyncError(null);

    try {
      const response = await fetch('/api/fetch-broker-holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerName: selectedBroker,
          clientId,
          integrationMode,
          apiKey: integrationMode === 'api' ? apiKey : undefined,
          accessToken: integrationMode === 'api' ? accessToken : undefined,
          totpSecret: integrationMode === 'api' ? totpSecret : undefined,
          password: integrationMode === 'api' ? password : undefined
        })
      });
      const data = await response.json();
      
      if (!response.ok || (data && data.success === false)) {
        setSyncError(data.error || "Failed to authenticate or fetch holdings from broker API.");
        return;
      }

      if (data.success && data.holdings) {
        // Analyze duplicates
        const duplicates: any[] = [];
        const uniques: any[] = [];

        data.holdings.forEach((hold: any) => {
          const isDuplicate = assets.some(a => a.folio && hold.folio && a.folio === hold.folio);
          if (isDuplicate) {
            duplicates.push(hold);
          } else {
            uniques.push(hold);
          }
        });

        setSyncPreview({
          success: true,
          holdings: data.holdings,
          duplicates,
          uniques,
          authenticated: data.authenticated,
          authenticatedAt: data.authenticatedAt
        });
      }
    } catch (err) {
      console.error("Broker connection failed:", err);
      setSyncError("Network error: Could not connect to the broker API servers.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplyBrokerImport = () => {
    if (!syncPreview) return;

    // Import only unique holdings
    syncPreview.uniques.forEach((hold) => {
      onAddAsset({
        name: hold.name,
        type: hold.type,
        category: hold.category as any,
        units: hold.units,
        purchasePrice: hold.purchasePrice,
        currentPrice: hold.currentPrice,
        value: hold.value,
        folio: hold.folio || undefined,
        symbol: hold.symbol || undefined,
        institution: `${selectedBroker} Demat`,
        mappedGoalId: null,
        ownerName: importOwner, // Map to selected family member
        brokerName: selectedBroker
      });
    });

    setClientId('');
    setApiKey('');
    setAccessToken('');
    setTotpSecret('');
    setPassword('');
    setSyncError(null);
    setSyncPreview(null);
    setShowBrokerSync(false);
  };

  // Filter assets by selected family member
  const filteredAssets = selectedMember === 'all'
    ? assets
    : assets.filter(a => a.ownerName === selectedMember);

  const getAssetIcon = (assetType: AssetType) => {
    switch (assetType) {
      case 'gold':
      case 'physical_gold':
        return <span className="text-amber-500 font-bold text-sm">🥇</span>;
      case 'real_estate':
        return <Landmark className="h-4 w-4 text-sky-600" />;
      case 'fixed_deposit':
        return <Landmark className="h-4 w-4 text-emerald-600" />;
      case 'epf_ppf':
        return <TrendingUp className="h-4 w-4 text-teal-600" />;
      case 'crypto':
        return <Coins className="h-4 w-4 text-purple-600" />;
      case 'mutual_fund':
        return <Circle className="h-4 w-4 text-brand-600 fill-brand-100" />;
      case 'stock':
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case 'lent_amount':
        return <span className="text-rose-500 font-bold text-sm">🤝</span>;
      case 'bank_balance':
        return <Landmark className="h-4 w-4 text-indigo-600" />;
      case 'fixed_asset':
        return <span className="text-slate-700 font-bold text-sm">🚗</span>;
      default:
        return <Circle className="h-4 w-4 text-slate-400" />;
    }
  };

  const getAssetTypeLabel = (assetType: AssetType) => {
    switch (assetType) {
      case 'fixed_deposit': return 'Fixed Deposit';
      case 'gold': return 'Gold Bond';
      case 'physical_gold': return 'Physical Gold';
      case 'real_estate': return 'Real Estate';
      case 'epf_ppf': return 'PPF / EPF';
      case 'stock': return 'Direct Stock';
      case 'mutual_fund': return 'Mutual Fund';
      case 'crypto': return 'Cryptocurrency';
      case 'lent_amount': return 'Lent to Friend';
      case 'bank_balance': return 'Bank Account';
      case 'fixed_asset': return 'Fixed Personal Asset';
      default: return 'Other Asset';
    }
  };

  return (
    <div id="asset-manager-root" className="space-y-6">
      {/* External Account & Statement Integrations (India) */}
      <div className="geo-card p-6 bg-gradient-to-r from-slate-50 to-indigo-50/20 border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold">
              <ArrowDownUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">External Accounts & Statement Integrations</h3>
              <p className="text-slate-400 text-xs">Directly pull holdings from Indian brokers or import mutual fund CAS statements</p>
            </div>
          </div>
          {!showBrokerSync && (
            <button
              id="btn-broker-sync-toggle"
              onClick={() => setShowBrokerSync(true)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
              Open Integrations
            </button>
          )}
        </div>

        {showBrokerSync && (
          <div className="mt-5 border-t border-slate-200/60 pt-5 space-y-5 slide-in">
            {/* Sub-tab Switcher and Family Member Mapping */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full md:max-w-md">
                <button
                  type="button"
                  onClick={() => {
                    setIntegrationTab('broker');
                    setSyncError(null);
                    setSyncPreview(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    integrationTab === 'broker'
                      ? 'bg-white text-indigo-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💼 Indian Broker Sync
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIntegrationTab('cas');
                    setSyncError(null);
                    setSyncPreview(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    integrationTab === 'cas'
                      ? 'bg-white text-indigo-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 CAS Statement Import
                </button>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" /> Map holdings to:
                </label>
                <select
                  value={importOwner}
                  onChange={(e) => setImportOwner(e.target.value)}
                  className="px-3 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-bold text-slate-700"
                >
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name} ({member.relationship})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {integrationTab === 'broker' ? (
              <div className="space-y-4">
                {/* Mode selection tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIntegrationMode('sandbox');
                      setSyncError(null);
                      setSyncPreview(null);
                    }}
                    className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      integrationMode === 'sandbox'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🎮 Sandbox Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIntegrationMode('api');
                      setSyncError(null);
                      setSyncPreview(null);
                    }}
                    className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      integrationMode === 'api'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔒 Secure Broker API
                  </button>
                </div>

                {/* Explanatory text */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-indigo-650 mt-0.5 shrink-0" />
                  <div>
                    {integrationMode === 'sandbox' ? (
                      <p>
                        <strong>Interactive Sandbox Mode:</strong> Instant demo mode that parses portfolio holdings based on any Client ID or PAN. Ideal for testing de-duplication and goal-allocation without requesting developer credentials.
                      </p>
                    ) : (
                      <p>
                        <strong>Direct Developer API Access:</strong> Connects to your official broker developer console. Requests are routed securely server-side through our Node.js middleware proxy to keep keys hidden from client-side inspectors. No data or passwords are ever stored.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select Indian Broker</label>
                    <select
                      id="broker-select"
                      value={selectedBroker}
                      onChange={(e) => {
                        setSelectedBroker(e.target.value as any);
                        setSyncError(null);
                        setSyncPreview(null);
                      }}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="Zerodha">Zerodha (Kite API)</option>
                      <option value="Groww">Groww (Brokerage Feed)</option>
                      <option value="Upstox">Upstox (OAuth / Token)</option>
                      <option value="AngelOne">Angel One (SmartAPI)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {selectedBroker === 'AngelOne' ? 'Client Code / User ID' : 'Broker Client ID / PAN'}
                    </label>
                    <input
                      id="broker-client-id"
                      type="text"
                      placeholder={selectedBroker === 'AngelOne' ? 'e.g. ANG776' : 'e.g. AB1234 or PAN'}
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium font-mono"
                    />
                  </div>

                  {integrationMode === 'api' && selectedBroker === 'Zerodha' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Key className="h-3 w-3 text-slate-400" /> Kite API Key
                        </label>
                        <input
                          type="password"
                          placeholder="32-character API Key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Lock className="h-3 w-3 text-slate-400" /> Kite Access Token
                        </label>
                        <input
                          type="password"
                          placeholder="Session Access Token"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {integrationMode === 'api' && selectedBroker === 'AngelOne' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Key className="h-3 w-3 text-slate-400" /> SmartAPI Key
                        </label>
                        <input
                          type="password"
                          placeholder="App API Key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Lock className="h-3 w-3 text-slate-400" /> Google TOTP Secret
                        </label>
                        <input
                          type="password"
                          placeholder="TOTP Secret Key (2FA)"
                          value={totpSecret}
                          onChange={(e) => setTotpSecret(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {integrationMode === 'api' && selectedBroker === 'Upstox' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Lock className="h-3 w-3 text-slate-400" /> Upstox Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium font-mono text-xs"
                      />
                    </div>
                  )}

                  {integrationMode === 'api' && selectedBroker === 'Groww' && (
                    <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950 text-xs">
                      <p className="font-semibold flex items-center gap-1.5 mb-0.5 text-amber-850">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-650 shrink-0" />
                        Groww API Restriction
                      </p>
                      Groww does not provide a public developer API portal. Please use our high-fidelity Interactive Sandbox to model your Groww holdings, or import your unified CAMS/Karvy CAS statements directly using the CAS PDF tool above.
                    </div>
                  )}

                  {!(integrationMode === 'api' && selectedBroker === 'Groww') && (
                    <div className="md:col-span-1">
                      <button
                        id="btn-fetch-broker-holdings"
                        type="button"
                        onClick={handleBrokerSync}
                        disabled={isSyncing || !clientId}
                        className="w-full px-4.5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 h-[41px]"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            {integrationMode === 'api' ? 'Verifying...' : 'Syncing...'}
                          </>
                        ) : (
                          <>
                            {integrationMode === 'api' ? 'Secure API Sync' : 'Sync Portfolio'}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Help / Setup Link */}
                {integrationMode === 'api' && selectedBroker !== 'Groww' && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/50 rounded-xl p-2.5 flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-emerald-650 shrink-0" />
                    <span>
                      How to get your API Keys: Visit the{' '}
                      <a
                        href={
                          selectedBroker === 'Zerodha'
                            ? 'https://kite.trade'
                            : selectedBroker === 'AngelOne'
                            ? 'https://smartapi.angelone.in'
                            : 'https://upstox.com/developer/api'
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 font-bold underline"
                      >
                        {selectedBroker} Developer Console
                      </a>
                      , register an app, copy your Client Credentials, and complete the connection handshake.
                    </span>
                  </div>
                )}

                {/* Sync Error Display */}
                {syncError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-950 rounded-xl p-4 text-xs font-semibold flex items-center gap-2.5 slide-in">
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-650 shrink-0" />
                    <div>
                      <p className="font-bold text-rose-800">Broker Handshake Failed</p>
                      <p className="font-medium text-rose-700 mt-0.5">{syncError}</p>
                    </div>
                  </div>
                )}

                {syncPreview && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-4 space-y-4 shadow-sm slide-in">
                    {syncPreview.authenticated && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl p-3.5 text-xs">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                          <Shield className="h-4 w-4 text-emerald-650" />
                          🔒 SSL SECURED DEVELOPER API CONNECTION ESTABLISHED
                        </p>
                        <p className="text-emerald-700 font-medium mt-1">
                          Authenticated successfully via developer authorization gateway.{' '}
                          {syncPreview.authenticatedAt && (
                            <span>Handshake timestamp: <strong className="font-mono">{new Date(syncPreview.authenticatedAt).toLocaleString()}</strong></span>
                          )}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="font-display font-bold text-xs text-slate-800">
                        Holdings Discovered ({syncPreview.holdings.length})
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-bold">
                          {syncPreview.duplicates.length} duplicate skipped
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                          {syncPreview.uniques.length} unique ready
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {syncPreview.holdings.map((h, idx) => {
                        const isDup = syncPreview.duplicates.some(d => d.folio && h.folio && d.folio === h.folio);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50/50 transition-all">
                            <div className="flex items-center gap-3">
                              <span className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center text-xs">📈</span>
                              <div>
                                <p className="text-xs font-bold text-slate-800 leading-none">{h.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {h.units ? `${h.units} units` : ''} {h.folio ? `• Folio: ${h.folio}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold font-mono text-slate-900">₹{h.value.toLocaleString('en-IN')}</p>
                              {isDup ? (
                                <span className="text-[9px] uppercase font-bold tracking-wider text-rose-500 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Overlap Skipped
                                </span>
                              ) : (
                                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 flex items-center gap-1 mt-0.5">
                                  <Check className="h-2.5 w-2.5" /> De-duplicated New
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
                      <button
                        id="btn-broker-cancel"
                        type="button"
                        onClick={() => setSyncPreview(null)}
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Discard Sync
                      </button>
                      <button
                        id="btn-broker-apply"
                        type="button"
                        onClick={handleApplyBrokerImport}
                        disabled={syncPreview.uniques.length === 0}
                        className="px-4.5 py-2.5 text-xs font-semibold text-white bg-indigo-900 hover:bg-indigo-850 disabled:bg-slate-300 rounded-xl transition-all cursor-pointer"
                      >
                        Import {syncPreview.uniques.length} New Assets
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {onImportCASSuccess ? (
                  <CASImporter onImportSuccess={(parsedAssets, details, parserUsed) => {
                    onImportCASSuccess(parsedAssets, details, importOwner, parserUsed);
                  }} />
                ) : (
                  <div className="p-4 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl">
                    CAS Importer callback is not configured.
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-500 flex items-start gap-3 shadow-sm">
                  <Info className="h-4.5 w-4.5 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">CAS Statement Guide:</p>
                    <p className="mt-1 leading-relaxed text-slate-500">
                      Consolidated Account Statements (CAS) can be uploaded as PDFs or copy-pasted as text. Selecting a family member from the mapper maps all newly compiled mutual fund schemes directly to their profile inside the wealth ledger.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Asset Ledger Card */}
      <div className="geo-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900">All Asset Ledger & Calculators</h2>
            <p className="text-slate-400 text-xs mt-0.5">Manually manage, value-track, or allocate wealth parameters</p>
          </div>
          {!showAddForm && (
            <button
              id="btn-add-asset-toggle"
              onClick={() => {
                setShowAddForm(true);
                if (selectedMember !== 'all') {
                  setOwnerName(selectedMember);
                }
              }}
              className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Custom Asset
            </button>
          )}
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-6 mb-6 slide-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-2">
              <h3 className="font-display font-semibold text-sm text-slate-800">
                {editingId ? 'Edit Wealth Parameter details' : 'Register New Custom Financial Instrument'}
              </h3>
              <button
                id="btn-cancel-asset-form"
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Asset Owner (Family Member)</label>
                <select
                  id="asset-form-owner"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                >
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Asset Instrument Type</label>
                <select
                  id="asset-form-type"
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as AssetType)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                >
                  <option value="fixed_deposit">Fixed Deposit (FD)</option>
                  <option value="bank_balance">Current / Savings Bank Account</option>
                  <option value="physical_gold">Physical Gold (Karat Calculator)</option>
                  <option value="gold">Sovereign Gold Bond (SGB)</option>
                  <option value="lent_amount">Money Lent to Friends (Simple Interest)</option>
                  <option value="fixed_asset">Fixed Physical Asset (Car / Vehicle / Machinery)</option>
                  <option value="real_estate">Real Estate / Property</option>
                  <option value="epf_ppf">Provident Fund (PPF / EPF)</option>
                  <option value="stock">Direct Stock / Equity</option>
                  <option value="rsu_esop">Company RSU / ESOP Plan</option>
                  <option value="mutual_fund">Mutual Fund Holding</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="other">Other Assets</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Asset Name</label>
                <input
                  id="asset-form-name"
                  type="text"
                  placeholder="e.g. HDFC 1-Year FD, Sovereign Gold Bond 2026, Bangalore Plot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Asset Category Allocation</label>
                <select
                  id="asset-form-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Asset['category'])}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                >
                  <option value="Equity">Equity (Aggressive Growth)</option>
                  <option value="Debt">Debt (Stability & FDs)</option>
                  <option value="Precious Metals">Precious Metals (Gold/Hedge)</option>
                  <option value="Real Estate">Real Estate (Long-term Asset)</option>
                  <option value="Cash Equivalents">Cash Equivalents (Liquidity)</option>
                  <option value="Hybrid">Hybrid Allocation</option>
                  <option value="Lent Assets">Lent Assets (Loans to Friends)</option>
                  <option value="Personal Assets">Personal Fixed Assets (Cars/Gadgets)</option>
                  <option value="Other">Other / Alternatives</option>
                </select>
              </div>

              {/* Advanced Conditional Inputs */}
              {type === 'lent_amount' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Borrower's Name (Friend)</label>
                    <input
                      id="asset-form-borrower"
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Interest Rate (% Per Annum)</label>
                    <input
                      id="asset-form-interest"
                      type="number"
                      step="any"
                      placeholder="e.g. 12"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Date Money Lent</label>
                    <input
                      id="asset-form-lentdate"
                      type="date"
                      value={lentDate}
                      onChange={(e) => setLentDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                      required
                    />
                  </div>
                </>
              )}

              {type === 'physical_gold' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Gold Purity (Karat)</label>
                    <select
                      id="asset-form-karat"
                      value={goldKarat}
                      onChange={(e) => setGoldKarat(parseInt(e.target.value) as any)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                    >
                      <option value="24">24 Karat (Fine Gold 99.9%)</option>
                      <option value="22">22 Karat (Jewellery Standard 91.6%)</option>
                      <option value="18">18 Karat (75.0%)</option>
                      <option value="14">14 Karat (58.3%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Gold Weight (Grams)</label>
                    <input
                      id="asset-form-goldweight"
                      type="number"
                      step="any"
                      placeholder="e.g. 10"
                      value={goldWeightGrams}
                      onChange={(e) => setGoldWeightGrams(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Country Region Rate Source</label>
                    <select
                      id="asset-form-goldcountry"
                      value={goldCountry}
                      onChange={(e) => setGoldCountry(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                    >
                      {Object.keys(goldRates).map(country => (
                        <option key={country} value={country}>{country} Rate ({goldRates[country].symbol}{(goldRates[country].pricePer10g/10).toFixed(0)}/g)</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {type === 'bank_balance' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Account Number (Optional)</label>
                  <input
                    id="asset-form-bankaccount"
                    type="text"
                    placeholder="e.g. xxxx-xxxx-4981"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  />
                </div>
              )}

              {type === 'rsu_esop' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Asset Currency Denomination</label>
                    <select
                      id="asset-form-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencyType)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-medium"
                    >
                      <option value="USD">USD ($) - US Dollars</option>
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="EUR">EUR (€) - Euros</option>
                      <option value="GBP">GBP (£) - British Pounds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Vested Stock Units</label>
                    <input
                      id="asset-form-vested"
                      type="number"
                      step="any"
                      placeholder="e.g. 120"
                      value={vestedUnits}
                      onChange={(e) => setVestedUnits(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Unvested Stock Units</label>
                    <input
                      id="asset-form-unvested"
                      type="number"
                      step="any"
                      placeholder="e.g. 240"
                      value={unvestedUnits}
                      onChange={(e) => setUnvestedUnits(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Initial Grant Date</label>
                    <input
                      id="asset-form-grantdate"
                      type="date"
                      value={grantDate}
                      onChange={(e) => setGrantDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                    />
                  </div>
                </>
              )}

              {/* Standard inputs for everything else */}
              {type !== 'lent_amount' && type !== 'physical_gold' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      {type === 'bank_balance' 
                        ? `Current Balance Amount (${CURRENCY_SYMBOLS[currency || 'INR']})` 
                        : `Avg Purchase Price per Unit / Principal (${CURRENCY_SYMBOLS[currency || 'INR']})`}
                    </label>
                    <input
                      id="asset-form-purchase"
                      type="number"
                      placeholder="e.g. 250000"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      {type === 'bank_balance' 
                        ? `Current Liquid Value (${CURRENCY_SYMBOLS[currency || 'INR']})` 
                        : `Current Price per Unit / Valuation (${CURRENCY_SYMBOLS[currency || 'INR']})`}
                    </label>
                    <input
                      id="asset-form-current"
                      type="number"
                      placeholder="Leave blank to default to Purchase Price"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                    />
                  </div>

                  {type !== 'rsu_esop' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Units / Quantity (Optional)</label>
                      <input
                        id="asset-form-units"
                        type="number"
                        step="any"
                        placeholder="e.g. 1"
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                      />
                    </div>
                  )}
                </>
              )}

              {type !== 'lent_amount' && type !== 'physical_gold' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Institution / Bank / Provider</label>
                  <input
                    id="asset-form-institution"
                    type="text"
                    placeholder="e.g. ICICI Bank, Zerodha, SBI"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Map to Long-term Financial Goal</label>
                <select
                  id="asset-form-goal"
                  value={mappedGoalId}
                  onChange={(e) => setMappedGoalId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white text-slate-700"
                >
                  <option value="">-- No Specific Goal (General Savings) --</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (Target: ₹{g.targetAmount.toLocaleString('en-IN')}, Year: {g.targetYear})
                    </option>
                  ))}
                </select>
                <p className="text-slate-400 text-[10px] mt-1.5">
                  Associating this asset automatically increments the designated financial goal progress meter.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50">
              <button
                id="btn-asset-submit"
                type="submit"
                className="px-4.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {editingId ? 'Save Changes' : 'Confirm & Add Asset'}
              </button>
            </div>
          </form>
        )}

        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-200 rounded-2xl">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No assets registered for {selectedMember === 'all' ? 'the family' : selectedMember}</p>
            <p className="text-slate-400 text-xs mt-1.5 max-w-sm">
              Add FDs, gold weights, PPF accounts, or broker stocks owned by {selectedMember === 'all' ? 'any family member' : selectedMember} to map their allocation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-display text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-3">Asset Instrument & Details</th>
                  <th className="py-4 px-3">Category</th>
                  <th className="py-4 px-3">Owner</th>
                  <th className="py-4 px-3 text-right">Investment / Cost</th>
                  <th className="py-4 px-3 text-right">Current Value</th>
                  <th className="py-4 px-3">Goal Association</th>
                  <th className="py-4 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {filteredAssets.map((asset) => {
                  const associatedGoal = goals.find((g) => g.id === asset.mappedGoalId);
                  
                  // Compute dynamic valuations based on advanced types
                  let currentValuation = asset.value;
                  let plPercentage = 0;
                  let profitLoss = 0;

                  if (asset.type === 'lent_amount' && asset.interestRate && asset.lentDate) {
                    currentValuation = calculateAccruedLentAmount(asset.purchasePrice, asset.interestRate, asset.lentDate);
                  } else if (asset.type === 'physical_gold' && asset.goldWeightGrams && asset.goldKarat && asset.country) {
                    currentValuation = calculateGoldValue(asset.goldWeightGrams, asset.goldKarat, asset.country);
                  } else {
                    currentValuation = asset.value || (asset.units ? asset.units * asset.currentPrice : asset.purchasePrice);
                  }

                  profitLoss = currentValuation - asset.purchasePrice;
                  plPercentage = asset.purchasePrice > 0 ? (profitLoss / asset.purchasePrice) * 100 : 0;

                  const assetCurrency = asset.currency || 'INR';
                  const displayCurrency = settings?.primaryCurrency || 'INR';
                  const usdRate = usdInrRate || 83.54;

                  const purchasePriceInDisplay = convertCurrency(asset.purchasePrice, assetCurrency, displayCurrency, usdRate);
                  const currentValuationInDisplay = convertCurrency(currentValuation, assetCurrency, displayCurrency, usdRate);

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-3">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {getAssetIcon(asset.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800 leading-snug">{asset.name}</p>
                              {asset.brokerName && (
                                <span className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                  Synced • {asset.brokerName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                                {getAssetTypeLabel(asset.type)}
                              </span>
                              {asset.institution && (
                                <>
                                  <span>•</span>
                                  <span>{asset.institution}</span>
                                </>
                              )}
                              
                              {/* Advanced labels */}
                              {asset.type === 'lent_amount' && asset.interestRate && (
                                <>
                                  <span>•</span>
                                  <span className="text-rose-600 font-bold font-mono">Interest: {asset.interestRate}% P.A.</span>
                                </>
                              )}
                              {asset.type === 'physical_gold' && asset.goldWeightGrams && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 font-bold font-mono">
                                    {asset.goldWeightGrams}g ({asset.goldKarat}K)
                                  </span>
                                </>
                              )}
                              {asset.type === 'bank_balance' && asset.accountNumber && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">Acct: {asset.accountNumber}</span>
                                </>
                              )}
                              {asset.type === 'rsu_esop' && (
                                <>
                                  <span>•</span>
                                  <span className="text-brand-600 font-bold font-mono">
                                    Vested: {asset.vestedUnits || 0} | Unvested: {asset.unvestedUnits || 0}
                                  </span>
                                </>
                              )}

                              {asset.units && asset.type !== 'physical_gold' && asset.type !== 'rsu_esop' && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{asset.units.toLocaleString()} units @ {formatCurrency(asset.currentPrice, assetCurrency)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                          asset.category === 'Equity' ? 'bg-brand-50 text-brand-700' :
                          asset.category === 'Debt' ? 'bg-emerald-50 text-emerald-700' :
                          asset.category === 'Precious Metals' ? 'bg-amber-50 text-amber-700' :
                          asset.category === 'Real Estate' ? 'bg-sky-50 text-sky-700' :
                          asset.category === 'Lent Assets' ? 'bg-rose-50 text-rose-700' :
                          asset.category === 'Personal Assets' ? 'bg-slate-100 text-slate-700' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {asset.category}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-xs text-slate-600 font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3 w-3 text-slate-400" />
                          {asset.ownerName || 'Self'}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right font-mono text-xs text-slate-500">
                        <div>{formatCurrency(asset.purchasePrice, assetCurrency)}</div>
                        {assetCurrency !== displayCurrency && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ≈ {formatCurrency(purchasePriceInDisplay, displayCurrency)}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-right">
                        <p className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(currentValuation, assetCurrency)}
                        </p>
                        {assetCurrency !== displayCurrency && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            ≈ {formatCurrency(currentValuationInDisplay, displayCurrency)}
                          </div>
                        )}
                        <span className={`font-mono text-[10px] font-bold block mt-0.5 ${profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {profitLoss >= 0 ? '+' : ''}{plPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        {associatedGoal ? (
                          <div className="flex items-center gap-1.5 text-brand-700 font-semibold text-xs bg-brand-50/70 border border-brand-100/50 px-2.5 py-1 rounded-xl w-fit">
                            <Check className="h-3 w-3 text-brand-500" />
                            {associatedGoal.name.length > 25 ? associatedGoal.name.substring(0, 25) + '...' : associatedGoal.name}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unmapped</span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-edit-asset-${asset.id}`}
                            onClick={() => startEdit(asset)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-delete-asset-${asset.id}`}
                            onClick={() => onDeleteAsset(asset.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

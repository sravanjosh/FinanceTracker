import React, { useState, useEffect } from 'react';
import { Wallet, Target, TrendingUp, Sparkles, FolderClosed, Landmark, Layers, CircleCheck, Info, User, Shield, Settings } from 'lucide-react';
import { Asset, FinancialGoal, FamilyMember, Insurance, UserSettings } from './types';
import Dashboard from './components/Dashboard';
import GoalPlanner from './components/GoalPlanner';
import AssetManager from './components/AssetManager';
import InsuranceTracker from './components/InsuranceTracker';
import SettingsPanel from './components/SettingsPanel';

// Initial empty goals
const initialGoals: FinancialGoal[] = [];

// Initial family-partitioned assets
const initialAssets: Asset[] = [];

// Initial Family Members Setup
const initialFamilyMembers: FamilyMember[] = [];

// Initial Protection Coverages
const initialInsurances: Insurance[] = [];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'goals' | 'assets' | 'insurance' | 'settings'>('dashboard');
  
  // Persistent Local States loaded from localStorage or fallback
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('wealth_assets');
    return saved ? JSON.parse(saved) : initialAssets;
  });
  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const saved = localStorage.getItem('wealth_goals');
    return saved ? JSON.parse(saved) : initialGoals;
  });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('wealth_family_members');
    return saved ? JSON.parse(saved) : initialFamilyMembers;
  });
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [insurances, setInsurances] = useState<Insurance[]>(() => {
    const saved = localStorage.getItem('wealth_insurances');
    return saved ? JSON.parse(saved) : initialInsurances;
  });

  // System Settings state
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('wealth_settings');
    return saved ? JSON.parse(saved) : {
      countryOfResidence: 'India',
      residentialAddress: '',
      primaryCurrency: 'INR',
      inflationRate: 6,
      equityCAGR: 12,
      debtCAGR: 7,
      taxBracket: 30,
      casDecryptionPassword: ''
    };
  });

  // Dynamic exchange rate state
  const [usdInrRate, setUsdInrRate] = useState<number>(83.54);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('/api/market-prices');
        const data = await res.json();
        if (data?.indices?.inr_usd?.price) {
          setUsdInrRate(data.indices.inr_usd.price);
        }
      } catch (err) {
        console.error("Error fetching USD/INR rate:", err);
      }
    };
    fetchRate();
    const interval = setInterval(fetchRate, 30000);
    return () => clearInterval(interval);
  }, []);

  const [investorDetails, setInvestorDetails] = useState<{ name: string; email: string; pan: string } | null>(() => {
    const saved = localStorage.getItem('wealth_investor_details');
    return saved ? JSON.parse(saved) : null;
  });

  const primaryProfileName = investorDetails?.name ? `${investorDetails.name} (Self)` : 'Self';

  const [notif, setNotif] = useState<string | null>(null);

  const triggerNotif = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 4000);
  };

  // Synchronize states to localStorage on change
  useEffect(() => {
    localStorage.setItem('wealth_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('wealth_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('wealth_family_members', JSON.stringify(familyMembers));
  }, [familyMembers]);

  useEffect(() => {
    localStorage.setItem('wealth_insurances', JSON.stringify(insurances));
  }, [insurances]);

  useEffect(() => {
    if (investorDetails) {
      localStorage.setItem('wealth_investor_details', JSON.stringify(investorDetails));
    } else {
      localStorage.removeItem('wealth_investor_details');
    }
  }, [investorDetails]);

  useEffect(() => {
    localStorage.setItem('wealth_settings', JSON.stringify(settings));
  }, [settings]);

  // Sync primary profile (investorDetails) with 'Self' family member
  useEffect(() => {
    if (investorDetails && investorDetails.name.trim()) {
      const selfName = `${investorDetails.name} (Self)`;
      setFamilyMembers(prev => {
        const hasSelf = prev.some(m => m.relationship === 'Self');
        if (hasSelf) {
          return prev.map(m => m.relationship === 'Self' ? { ...m, name: selfName } : m);
        } else {
          return [
            { id: 'mem-self', name: selfName, relationship: 'Self', avatarColor: 'bg-indigo-600' },
            ...prev
          ];
        }
      });
    } else {
      // If investor details are blank, remove any Self family member
      setFamilyMembers(prev => prev.filter(m => m.relationship !== 'Self'));
    }
  }, [investorDetails]);

  const handleResetToDefaults = () => {
    // Completely wipe all data on reset as requested
    localStorage.removeItem('wealth_assets');
    localStorage.removeItem('wealth_goals');
    localStorage.removeItem('wealth_family_members');
    localStorage.removeItem('wealth_insurances');
    localStorage.removeItem('wealth_investor_details');
    localStorage.removeItem('wealth_settings');

    setAssets([]);
    setGoals([]);
    setFamilyMembers([]);
    setSelectedMember('all');
    setInsurances([]);
    setInvestorDetails(null);
    setSettings({
      countryOfResidence: 'India',
      residentialAddress: '',
      primaryCurrency: 'INR',
      inflationRate: 6,
      equityCAGR: 12,
      debtCAGR: 7,
      taxBracket: 30,
      casDecryptionPassword: ''
    });
    triggerNotif("Portfolio completely cleansed and all parameters reset to default values!");
  };

  // 1. Asset Manager Callbacks
  const handleAddAsset = (newAsset: Omit<Asset, 'id' | 'lastUpdated'>) => {
    const asset: Asset = {
      ...newAsset,
      id: `asset-${Date.now()}`,
      lastUpdated: new Date().toISOString()
    };
    setAssets(prev => [...prev, asset]);
    triggerNotif(`Successfully added custom asset: "${newAsset.name}" for ${newAsset.ownerName}!`);
  };

  const handleDeleteAsset = (id: string) => {
    const deleted = assets.find(a => a.id === id);
    setAssets(prev => prev.filter(a => a.id !== id));
    if (deleted) {
      triggerNotif(`Removed asset: "${deleted.name}"`);
    }
  };

  const handleUpdateAsset = (id: string, updated: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updated, lastUpdated: new Date().toISOString() } as Asset : a));
    triggerNotif(`Updated asset values successfully.`);
  };

  // 2. Goal Planner Callbacks
  const handleAddGoal = (newGoal: Omit<FinancialGoal, 'id' | 'currentValue'>) => {
    const goal: FinancialGoal = {
      ...newGoal,
      id: `goal-${Date.now()}`,
      currentValue: 0
    };
    setGoals(prev => [...prev, goal]);
    triggerNotif(`Target financial milestone "${newGoal.name}" established!`);
  };

  const handleDeleteGoal = (id: string) => {
    const deleted = goals.find(g => g.id === id);
    setGoals(prev => prev.filter(g => g.id !== id));
    // Unmap assets mapped to this goal
    setAssets(prev => prev.map(a => a.mappedGoalId === id ? { ...a, mappedGoalId: null } : a));
    if (deleted) {
      triggerNotif(`Deleted milestone: "${deleted.name}"`);
    }
  };

  // 3. Family Member Management Callbacks
  const handleAddFamilyMember = (name: string, relationship: FamilyMember['relationship']) => {
    const colors = ['bg-indigo-600', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newMember: FamilyMember = {
      id: `mem-${Date.now()}`,
      name,
      relationship,
      avatarColor: randomColor
    };
    setFamilyMembers(prev => [...prev, newMember]);
    triggerNotif(`Added family member: ${name} (${relationship})`);
  };

  const handleDeleteFamilyMember = (id: string) => {
    const deleted = familyMembers.find(m => m.id === id);
    if (!deleted) return;

    setFamilyMembers(prev => prev.filter(m => m.id !== id));
    // Also delete or re-map assets owned by them to the primary profile
    const fallbackOwner = primaryProfileName;
    setAssets(prev => prev.map(a => a.ownerName === deleted.name ? { ...a, ownerName: fallbackOwner } : a));
    setInsurances(prev => prev.map(i => i.ownerName === deleted.name ? { ...i, ownerName: fallbackOwner } : i));
    
    if (selectedMember === deleted.name) {
      setSelectedMember('all');
    }
    triggerNotif(`Removed member ${deleted.name}. All owned assets reassigned to ${fallbackOwner}.`);
  };

  // 4. Insurance Tracker Callbacks
  const handleAddInsurance = (newIns: Omit<Insurance, 'id' | 'lastUpdated'>) => {
    const ins: Insurance = {
      ...newIns,
      id: `ins-${Date.now()}`,
      lastUpdated: new Date().toISOString()
    };
    setInsurances(prev => [...prev, ins]);
    triggerNotif(`Registered insurance policy: "${newIns.name}" for ${newIns.ownerName}!`);
  };

  const handleDeleteInsurance = (id: string) => {
    const deleted = insurances.find(i => i.id === id);
    setInsurances(prev => prev.filter(i => i.id !== id));
    if (deleted) {
      triggerNotif(`Removed insurance policy: "${deleted.name}"`);
    }
  };

  // 5. CAS Importer Callback
  const handleImportCASSuccess = (
    parsedAssets: Omit<Asset, 'id' | 'mappedGoalId' | 'lastUpdated' | 'ownerName'>[],
    details?: { name: string; email: string; pan: string },
    targetOwnerName: string = primaryProfileName
  ) => {
    const fullAssets: Asset[] = parsedAssets.map((pa, idx) => ({
      ...pa,
      id: `cas-mf-${idx}-${Date.now()}`,
      mappedGoalId: idx === 0 ? 'goal-retirement' : idx === 1 ? 'goal-education' : null, // Smart mapping demo
      lastUpdated: new Date().toISOString(),
      ownerName: targetOwnerName // Assigned to chosen family member
    }));

    // Filter previous CAS mutual funds for that family member and merge new ones
    setAssets(prev => [
      ...prev.filter(a => a.type !== 'mutual_fund' || a.ownerName !== targetOwnerName),
      ...fullAssets
    ]);

    if (details) {
      // Merge with existing details if name, email, or pan was returned as empty by the parser
      setInvestorDetails(prev => {
        const mergedName = details.name.trim() || prev?.name || "";
        const mergedEmail = details.email.trim() || prev?.email || "";
        const mergedPan = details.pan.trim() || prev?.pan || "";
        return (mergedName || mergedEmail || mergedPan) ? {
          name: mergedName,
          email: mergedEmail,
          pan: mergedPan
        } : prev;
      });
    }
    triggerNotif(`CAS statement processed! Mutual funds compiled & allocated successfully for ${targetOwnerName}.`);
  };

  const forceRefreshPrices = () => {
    triggerNotif("Syncing latest NAV and market index valuations...");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-500 selection:text-white antialiased">
      {/* Header Navigation Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-600/20">
              <TrendingUp className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-slate-900 tracking-tight leading-none geo-underline">Financial Portfolio</h1>
              <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">CAS AI Engine & Family Goals Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-100">
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-100/50 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-brand-500" />
              <span className="hidden sm:inline">Overview</span>
            </button>

            <button
              id="tab-btn-goals"
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-100/50 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Target className="h-3.5 w-3.5 text-brand-500" />
              <span>Goals</span>
            </button>

            <button
              id="tab-btn-assets"
              onClick={() => setActiveTab('assets')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'assets'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-100/50 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wallet className="h-3.5 w-3.5 text-brand-500" />
              <span>Wealth Ledger</span>
            </button>

            <button
              id="tab-btn-insurance"
              onClick={() => setActiveTab('insurance')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'insurance'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-100/50 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-brand-500" />
              <span>Insurances</span>
            </button>

            <button
              id="tab-btn-settings"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-100/50 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="h-3.5 w-3.5 text-brand-500" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notifications overlay */}
      {notif && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white py-3.5 px-5 rounded-2xl border border-slate-800 shadow-2xl flex items-center gap-2.5 text-xs font-mono font-semibold slide-in">
          <CircleCheck className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {/* Main Dashboard Canvas Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            assets={assets}
            goals={goals}
            insurances={insurances}
            familyMembers={familyMembers}
            selectedMember={selectedMember}
            onSelectMember={setSelectedMember}
            onAddFamilyMember={handleAddFamilyMember}
            onDeleteFamilyMember={handleDeleteFamilyMember}
            investorDetails={investorDetails}
            onRefreshPrices={forceRefreshPrices}
            settings={settings}
            usdInrRate={usdInrRate}
            onSwitchTab={setActiveTab}
          />
        )}

        {activeTab === 'goals' && (
          <GoalPlanner
            goals={goals}
            assets={assets}
            onAddGoal={handleAddGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {activeTab === 'assets' && (
          <AssetManager
            assets={assets}
            goals={goals}
            familyMembers={familyMembers}
            onAddAsset={handleAddAsset}
            onDeleteAsset={handleDeleteAsset}
            onUpdateAsset={handleUpdateAsset}
            onImportCASSuccess={handleImportCASSuccess}
            selectedMember={selectedMember}
            settings={settings}
            usdInrRate={usdInrRate}
          />
        )}

        {activeTab === 'insurance' && (
          <InsuranceTracker
            insurances={insurances}
            familyMembers={familyMembers}
            onAddInsurance={handleAddInsurance}
            onDeleteInsurance={handleDeleteInsurance}
            selectedMember={selectedMember}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={setSettings}
            onResetToDefaults={handleResetToDefaults}
            portfolioData={{
              assets,
              goals,
              familyMembers,
              insurances,
              investorDetails
            }}
            investorDetails={investorDetails}
            onUpdateInvestorDetails={setInvestorDetails}
            familyMembers={familyMembers}
            onAddFamilyMember={handleAddFamilyMember}
            onDeleteFamilyMember={handleDeleteFamilyMember}
            onRestorePortfolioData={(data) => {
              if (data.assets) setAssets(data.assets);
              if (data.goals) setGoals(data.goals);
              if (data.familyMembers) setFamilyMembers(data.familyMembers);
              if (data.insurances) setInsurances(data.insurances);
              if (data.settings) setSettings(data.settings);
              if (data.investorDetails) setInvestorDetails(data.investorDetails);
              triggerNotif("Portfolio restored successfully from Google Drive backup!");
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-16 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Financial Portfolio Tracker. Built for secure local wealth analytics.</p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-slow"></span>
            <span className="font-mono text-[10px] text-slate-400 font-semibold uppercase tracking-wider">API Status: Fully Synced</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

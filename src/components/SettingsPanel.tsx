import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  RotateCcw, 
  Coins, 
  Percent, 
  TrendingUp, 
  Lock, 
  ShieldAlert, 
  Globe, 
  KeyRound, 
  Check, 
  HelpCircle,
  Sparkles,
  RefreshCw,
  Cloud,
  CloudLightning,
  CloudOff,
  DownloadCloud,
  UploadCloud,
  UserCheck,
  Power,
  Trash2,
  Plus,
  Mail,
  FileText,
  User,
  Users
} from 'lucide-react';
import { UserSettings, Asset, FinancialGoal, FamilyMember, Insurance } from '../types';
import { CURRENCY_SYMBOLS, CurrencyType } from '../utils/currency';
import { googleSignIn, logout, initAuth } from '../utils/firebaseAuth';
import { findBackupFile, saveBackupFile, loadBackupFile, GoogleDriveFile } from '../utils/googleDrive';
import { User as FirebaseUser } from 'firebase/auth';

interface SettingsPanelProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onResetToDefaults: () => void;
  portfolioData: {
    assets: Asset[];
    goals: FinancialGoal[];
    familyMembers: FamilyMember[];
    insurances: Insurance[];
    investorDetails: { name: string; email: string; pan: string } | null;
  };
  onRestorePortfolioData: (data: {
    assets: Asset[];
    goals: FinancialGoal[];
    familyMembers: FamilyMember[];
    insurances: Insurance[];
    settings: UserSettings;
    investorDetails: { name: string; email: string; pan: string } | null;
  }) => void;
  investorDetails: { name: string; email: string; pan: string } | null;
  onUpdateInvestorDetails: (details: { name: string; email: string; pan: string } | null) => void;
  familyMembers: FamilyMember[];
  onAddFamilyMember: (name: string, relationship: FamilyMember['relationship']) => void;
  onDeleteFamilyMember: (id: string) => void;
}

export default function SettingsPanel({
  settings,
  onUpdateSettings,
  onResetToDefaults,
  portfolioData,
  onRestorePortfolioData,
  investorDetails,
  onUpdateInvestorDetails,
  familyMembers,
  onAddFamilyMember,
  onDeleteFamilyMember
}: SettingsPanelProps) {
  // Local form state
  const [country, setCountry] = useState(settings.countryOfResidence);
  const [address, setAddress] = useState(settings.residentialAddress);
  const [currency, setCurrency] = useState<CurrencyType>(settings.primaryCurrency);
  const [inflation, setInflation] = useState(settings.inflationRate);
  const [equityCAGR, setEquityCAGR] = useState(settings.equityCAGR);
  const [debtCAGR, setDebtCAGR] = useState(settings.debtCAGR);
  const [taxBracket, setTaxBracket] = useState(settings.taxBracket);
  const [password, setPassword] = useState(settings.casDecryptionPassword || '');
  
  // Primary Profile form state
  const [profileName, setProfileName] = useState(investorDetails?.name || '');
  const [profileEmail, setProfileEmail] = useState(investorDetails?.email || '');
  const [profilePan, setProfilePan] = useState(investorDetails?.pan || '');
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  // Synchronize with external investorDetails prop
  useEffect(() => {
    setProfileName(investorDetails?.name || '');
    setProfileEmail(investorDetails?.email || '');
    setProfilePan(investorDetails?.pan || '');
  }, [investorDetails]);

  // Family Member form state
  const [newMemName, setNewMemName] = useState('');
  const [newMemRel, setNewMemRel] = useState<FamilyMember['relationship']>('Spouse');
  const [memError, setMemError] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    onUpdateInvestorDetails({
      name: profileName.trim(),
      email: profileEmail.trim(),
      pan: profilePan.trim().toUpperCase()
    });
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 3000);
  };

  const handleAddFamilyMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemName.trim()) return;
    
    // Check for duplicate names
    const isDup = familyMembers.some(m => m.name.toLowerCase() === newMemName.trim().toLowerCase());
    if (isDup) {
      setMemError("A family member with this name is already registered.");
      return;
    }

    onAddFamilyMember(newMemName.trim(), newMemRel);
    setNewMemName('');
    setMemError(null);
  };

  // Interaction states
  const [isSaved, setIsSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Google Drive Integration State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
    lastSynced?: string;
  }>({ type: 'idle', message: '' });
  const [driveFile, setDriveFile] = useState<GoogleDriveFile | null>(null);

  const checkExistingBackup = async (token: string) => {
    try {
      const file = await findBackupFile(token);
      setDriveFile(file);
    } catch (err) {
      console.error("Error checking existing Google Drive backup:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setToken(token);
        checkExistingBackup(token);
      },
      () => {
        setCurrentUser(null);
        setToken(null);
        setDriveFile(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'Connecting to Google accounts...' });
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setToken(result.accessToken);
        await checkExistingBackup(result.accessToken);
        setSyncStatus({ type: 'success', message: 'Connected to Google Drive successfully!' });
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', message: `Connection failed: ${err.message || 'Unknown error'}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setToken(null);
      setDriveFile(null);
      setSyncStatus({ type: 'idle', message: 'Disconnected from Google Drive.' });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleBackup = async () => {
    if (!accessToken) return;
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'Preparing backup payload...' });

    try {
      const payload = {
        version: "1.0",
        backupDate: new Date().toISOString(),
        assets: portfolioData.assets,
        goals: portfolioData.goals,
        familyMembers: portfolioData.familyMembers,
        insurances: portfolioData.insurances,
        settings: settings,
        investorDetails: portfolioData.investorDetails
      };

      let confirmed = true;
      if (driveFile) {
        confirmed = window.confirm(
          `An existing portfolio backup from ${new Date(driveFile.modifiedTime).toLocaleString()} was found on your Google Drive. Do you want to overwrite it with your current local data?`
        );
      }

      if (!confirmed) {
        setIsSyncing(false);
        setSyncStatus({ type: 'idle', message: 'Backup cancelled by user.' });
        return;
      }

      setSyncStatus({ type: 'idle', message: 'Uploading securely to Google Drive...' });
      const result = await saveBackupFile(accessToken, payload, driveFile?.id);
      
      setDriveFile({
        id: result.id,
        name: 'wealth_portfolio_backup.json',
        modifiedTime: result.modifiedTime
      });

      setSyncStatus({
        type: 'success',
        message: 'Portfolio successfully backed up to Google Drive!',
        lastSynced: new Date(result.modifiedTime).toLocaleString()
      });
    } catch (err: any) {
      console.error(err);
      setSyncStatus({
        type: 'error',
        message: `Backup failed: ${err.message || 'Unknown cloud error'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!accessToken || !driveFile) return;

    const confirmed = window.confirm(
      "⚠️ WARNING: This will replace ALL your current local assets, goals, family members, and settings with the backup from Google Drive. Your current local data will be lost. Are you absolutely sure?"
    );

    if (!confirmed) return;

    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'Downloading backup from Google Drive...' });

    try {
      const data = await loadBackupFile(accessToken, driveFile.id);
      
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid backup file format: data is empty or corrupted.");
      }

      setSyncStatus({ type: 'idle', message: 'Importing data and refreshing state...' });
      onRestorePortfolioData(data);

      setSyncStatus({
        type: 'success',
        message: 'Portfolio restored successfully from Google Drive backup!',
        lastSynced: new Date(driveFile.modifiedTime).toLocaleString()
      });
    } catch (err: any) {
      console.error(err);
      setSyncStatus({
        type: 'error',
        message: `Restore failed: ${err.message || 'Unknown cloud error'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      countryOfResidence: country,
      residentialAddress: address,
      primaryCurrency: currency,
      inflationRate: Number(inflation),
      equityCAGR: Number(equityCAGR),
      debtCAGR: Number(debtCAGR),
      taxBracket: Number(taxBracket),
      casDecryptionPassword: password
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const triggerReset = () => {
    onResetToDefaults();
    setShowResetConfirm(false);
    // Sync local state
    setCountry('India');
    setAddress('');
    setCurrency('INR');
    setInflation(6);
    setEquityCAGR(12);
    setDebtCAGR(7);
    setTaxBracket(30);
    setPassword('');
    setProfileName('');
    setProfileEmail('');
    setProfilePan('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Intro Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">System Settings & Parameters</h2>
        <p className="text-slate-500 text-sm mt-1">Configure geographic localization, projection baselines, and reset state overrides.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION: Profile & Family Management */}
          <div className="geo-card p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                Primary Investor Profile (Self)
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Define your legal identity, contact email, and taxation metrics</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Mail className="h-3 w-3 text-slate-400" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rajesh@example.com"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <FileText className="h-3 w-3 text-slate-400" /> PAN Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    value={profilePan}
                    onChange={(e) => setProfilePan(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-semibold font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {isProfileSaved ? (
                  <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                    <Check className="h-4 w-4" /> Profile updated and saved locally!
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Entering your PAN enables auto-decryption parameters inside the ledger.
                  </span>
                )}
                <button
                  type="submit"
                  className="px-4.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Save Primary Profile
                </button>
              </div>
            </form>
          </div>

          <div className="geo-card p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Family Member Registry
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Add or remove family profiles to distribute assets and organize joint goals</p>
            </div>

            {familyMembers.length === 0 ? (
              <div className="p-5 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-xs font-medium">No family members registered yet.</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Add spouse, parents, or children's details to map out joint asset allocations.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm/5">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${member.avatarColor || 'bg-slate-500'} text-white font-bold flex items-center justify-center text-xs shadow-sm`}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{member.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wider">{member.relationship}</p>
                      </div>
                    </div>
                    {member.relationship !== 'Self' ? (
                      <button
                        type="button"
                        onClick={() => onDeleteFamilyMember(member.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title={`Delete ${member.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2.5 py-1 rounded-xl font-bold uppercase tracking-wide shadow-sm/2">
                        Primary Account
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Form to add new family member */}
            <form onSubmit={handleAddFamilyMemberSubmit} className="bg-slate-50/60 border border-slate-200/50 rounded-2xl p-4.5 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Add New Family Profile</h4>
              
              {memError && (
                <p className="text-rose-500 text-[11px] font-semibold">{memError}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suman Kumar"
                    value={newMemName}
                    onChange={(e) => {
                      setNewMemName(e.target.value);
                      setMemError(null);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Relationship</label>
                  <select
                    value={newMemRel}
                    onChange={(e) => setNewMemRel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-medium"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/55 hover:bg-indigo-100 hover:border-indigo-200 rounded-xl transition-all shadow-sm/2 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Family Profile
                </button>
              </div>
            </form>
          </div>

          <form onSubmit={handleSave} className="geo-card p-8 space-y-6">
            
            {/* SECTION 1: Residency & Country */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-brand-600" />
                Geographic & Residency Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Country of Residence</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-medium"
                  >
                    <option value="India">India (INR Base)</option>
                    <option value="United States">United States (USD Base)</option>
                    <option value="United Kingdom">United Kingdom (GBP Base)</option>
                    <option value="Germany">Germany / Eurozone (EUR Base)</option>
                    <option value="Singapore">Singapore</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Canada">Canada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    Primary Display Currency 
                    <HelpCircle className="h-3 w-3 text-slate-400" title="All portfolio dashboards and graphs convert dynamically using this currency" />
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyType)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-medium"
                  >
                    <option value="INR">Indian Rupee (₹ INR)</option>
                    <option value="USD">US Dollar ($ USD)</option>
                    <option value="EUR">Euro (€ EUR)</option>
                    <option value="GBP">British Pound (£ GBP)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Residential Address</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your detailed residential address"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Required for regulatory cross-border tax estimates and Sovereign asset disclosures.</p>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* SECTION 2: Projection & Calculation Baselines */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-600" />
                Projection & Compounding Baselines
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-slate-400" /> Expected Equity CAGR (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={equityCAGR}
                    onChange={(e) => setEquityCAGR(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-slate-400" /> Expected Debt CAGR (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={debtCAGR}
                    onChange={(e) => setDebtCAGR(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-slate-400" /> Annual Inflation Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inflation}
                    onChange={(e) => setInflation(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-slate-400" /> Default Income Tax Slab (%)
                  </label>
                  <input
                    type="number"
                    value={taxBracket}
                    onChange={(e) => setTaxBracket(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-mono font-semibold"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* SECTION 3: CAS Credentials Override */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4 text-brand-600" />
                Security & Utility Defaults
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-slate-400" /> Saved CAS PDF Decryption Password
                </label>
                <input
                  type="password"
                  placeholder="Defaults to PAN or Custom password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">This password is used to safely auto-fill local PDF extraction handshakes. No values are ever logged server-side.</p>
              </div>
            </div>

            {/* Submit / Save Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              {isSaved ? (
                <div className="text-emerald-600 font-semibold text-xs flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Changes applied and stored successfully!
                </div>
              ) : (
                <div className="text-slate-400 text-xs">
                  All settings are kept in reactive local memory.
                </div>
              )}
              
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>

          {/* GOOGLE DRIVE SYNC CARD */}
          <div className="geo-card p-8 mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Cloud className="h-5 w-5 text-indigo-600" />
                Google Drive Cloud Backup & Synchronization
              </h3>
              <p className="text-slate-500 text-xs mt-1 font-semibold leading-relaxed">
                Securely store or retrieve your family wealth ledger, milestone goals, registered profiles, and configuration templates in your private Google Drive file.
              </p>
            </div>

            {currentUser ? (
              <div className="space-y-4">
                {/* Connected Status Info */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-100/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 leading-none">Connected as {currentUser.displayName || 'Authorized User'}</span>
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Cloud Active" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-1">{currentUser.email}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all cursor-pointer bg-transparent border-none"
                  >
                    <Power className="h-3 w-3" /> Disconnect
                  </button>
                </div>

                {/* Cloud Sync Operations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Backup Card */}
                  <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <UploadCloud className="h-4 w-4 text-indigo-500" /> Backup to Cloud
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Compiles and serializes all current family assets, goals, insurance covers, and parameters, overwriting your Google Drive file.
                    </p>
                    <button
                      disabled={isSyncing}
                      onClick={handleBackup}
                      className="w-full py-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-3.5 w-3.5" /> Backup Now
                        </>
                      )}
                    </button>
                  </div>

                  {/* Restore Card */}
                  <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <DownloadCloud className="h-4 w-4 text-amber-500" /> Restore from Cloud
                    </h4>
                    
                    {driveFile ? (
                      <>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                          Found cloud backup from <span className="font-bold text-indigo-600">{new Date(driveFile.modifiedTime).toLocaleString()}</span>. This will replace your local state.
                        </p>
                        <button
                          disabled={isSyncing}
                          onClick={handleRestore}
                          className="w-full py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isSyncing ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Pulling...
                            </>
                          ) : (
                            <>
                              <DownloadCloud className="h-3.5 w-3.5" /> Restore Now
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-slate-400 italic leading-relaxed font-semibold">
                          No existing portfolio backup file found on Google Drive. Run a backup first to establish cloud state.
                        </p>
                        <button
                          disabled
                          className="w-full py-2 px-3 text-xs font-bold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <CloudOff className="h-3.5 w-3.5" /> No Backup Found
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Live Status Tracker */}
                {syncStatus.message && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 font-mono ${
                    syncStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800' :
                    syncStatus.type === 'error' ? 'bg-rose-50 text-rose-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      syncStatus.type === 'success' ? 'bg-emerald-500' :
                      syncStatus.type === 'error' ? 'bg-rose-500' :
                      'bg-slate-400 animate-pulse'
                    }`} />
                    <span className="font-semibold">{syncStatus.message}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl space-y-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-1">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cloud Synchronization Disabled</h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed font-semibold">
                    Authorize Google Drive to unlock private multi-device backups, automated syncing, and portfolio recovery tools.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSyncing}
                  className="gsi-material-button cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #747775',
                    borderRadius: '12px',
                    boxSizing: 'border-box',
                    color: '#1f1f1f',
                    cursor: 'pointer',
                    fontFamily: 'Roboto, arial, sans-serif',
                    fontSize: '14px',
                    height: '40px',
                    letterSpacing: '0.25px',
                    outline: 'none',
                    overflow: 'hidden',
                    padding: '0 12px',
                    position: 'relative',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    width: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                >
                  <div className="gsi-material-button-icon" style={{ height: '20px', minWidth: '20px', width: '20px' }}>
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents" style={{ fontWeight: 500 }}>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info & Danger Zone */}
        <div className="space-y-6">
          {/* Quick Stats Summary */}
          <div className="geo-card p-6 bg-slate-950 text-white border border-slate-900 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Coins className="h-32 w-32" />
            </div>
            
            <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-wider">Active Configuration</h4>
            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Currency</span>
                <span className="font-bold text-indigo-400">{currency} ({CURRENCY_SYMBOLS[currency]})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Country</span>
                <span className="font-bold">{country}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Equity CAGR</span>
                <span className="font-bold text-emerald-400">{equityCAGR}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Inflation Baseline</span>
                <span className="font-bold text-amber-400">{inflation}%</span>
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="geo-card p-6 border-rose-200 bg-rose-50/50 space-y-4">
            <div className="flex items-center gap-2 text-rose-800">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider">System Recovery / Reset</h4>
            </div>
            
            <p className="text-[11px] text-rose-950 leading-relaxed font-semibold">
              Wipes all customized financial assets, newly registered family members, milestone goals, and insurance policies. Reverts the system back to pre-populated baseline mock portfolios.
            </p>

            {showResetConfirm ? (
              <div className="space-y-2 mt-3 animate-pulse">
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">⚠️ Critical: Are you absolutely sure?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={triggerReset}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                  >
                    Yes, Reset All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 px-4 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Reset System to Defaults
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

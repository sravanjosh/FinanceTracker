import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Shield, Calendar, Heart, Car, Activity, User, HelpCircle } from 'lucide-react';
import { Insurance, FamilyMember } from '../types';

interface InsuranceTrackerProps {
  insurances: Insurance[];
  familyMembers: FamilyMember[];
  onAddInsurance: (ins: Omit<Insurance, 'id' | 'lastUpdated'>) => void;
  onDeleteInsurance: (id: string) => void;
  selectedMember: string;
}

export default function InsuranceTracker({
  insurances,
  familyMembers,
  onAddInsurance,
  onDeleteInsurance,
  selectedMember
}: InsuranceTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<Insurance['type']>('life');
  const [insurer, setInsurer] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [sumAssured, setSumAssured] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [premiumFrequency, setPremiumFrequency] = useState<Insurance['premiumFrequency']>('annual');
  const [premiumDueDate, setPremiumDueDate] = useState('');
  const [nominee, setNominee] = useState('');
  const [status, setStatus] = useState<Insurance['status']>('active');
  const [ownerName, setOwnerName] = useState('Self');

  // Filter insurances
  const filteredInsurances = selectedMember === 'all'
    ? insurances
    : insurances.filter(ins => ins.ownerName === selectedMember);

  // Stats calculations
  const activeInsurances = filteredInsurances.filter(ins => ins.status === 'active');
  const totalCoverAmount = activeInsurances.reduce((sum, ins) => sum + ins.sumAssured, 0);
  const annualPremiumCommitment = filteredInsurances.reduce((sum, ins) => {
    if (ins.status === 'lapsed') return sum;
    const factor = ins.premiumFrequency === 'annual' ? 1 
                 : ins.premiumFrequency === 'monthly' ? 12 
                 : ins.premiumFrequency === 'quarterly' ? 4 
                 : 0; // one-time
    return sum + (ins.premiumAmount * factor);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !insurer.trim() || !policyNumber.trim() || !sumAssured || !premiumAmount || !premiumDueDate) return;

    onAddInsurance({
      name,
      type,
      insurer,
      policyNumber,
      sumAssured: parseFloat(sumAssured),
      premiumAmount: parseFloat(premiumAmount),
      premiumFrequency,
      premiumDueDate,
      nominee: nominee || undefined,
      status,
      ownerName: ownerName || 'Self',
    });

    // Reset Form
    setName('');
    setType('life');
    setInsurer('');
    setPolicyNumber('');
    setSumAssured('');
    setPremiumAmount('');
    setPremiumFrequency('annual');
    setPremiumDueDate('');
    setNominee('');
    setStatus('active');
    setOwnerName('Self');
    setShowAddForm(false);
  };

  const getInsuranceIcon = (insType: Insurance['type']) => {
    switch (insType) {
      case 'life':
        return <Shield className="h-5 w-5 text-indigo-600" />;
      case 'health':
        return <Heart className="h-5 w-5 text-rose-500" />;
      case 'car':
        return <Car className="h-5 w-5 text-amber-500" />;
      case 'two_wheeler':
        return <Activity className="h-5 w-5 text-emerald-500" />;
      default:
        return <ShieldCheck className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div id="insurance-tracker-root" className="space-y-6">
      {/* Insurance Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="geo-card p-6 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Protection Cover</span>
            <p className="font-display font-bold text-slate-900 text-2xl mt-1.5">
              ₹{totalCoverAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-slate-400 text-[11px] mt-4 border-t border-slate-100 pt-3 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
            Across {activeInsurances.length} active insurance shields
          </div>
        </div>

        <div className="geo-card p-6 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Annual Premium Outflow</span>
            <p className="font-display font-bold text-slate-900 text-2xl mt-1.5">
              ₹{annualPremiumCommitment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-slate-400 text-[11px] mt-4 border-t border-slate-100 pt-3 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Budgeted premium obligations per year
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">Risk Protection Status</span>
              <Shield className="h-4.5 w-4.5 text-brand-400" />
            </div>
            <div className="mt-2.5">
              <h4 className="font-display font-bold text-lg">
                {totalCoverAmount > 10000000 ? "Highly Protected" : totalCoverAmount > 0 ? "Partially Shielded" : "No active protection"}
              </h4>
              <p className="text-[11px] text-indigo-200 mt-1">
                {totalCoverAmount > 10000000 ? "Excellent risk transfer buffer for dependents" : "Recommend auditing life/health coverage guidelines"}
              </p>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3 flex items-center gap-1.5 mt-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Non-Investment Protection Ledger
          </div>
        </div>
      </div>

      {/* Main Insurance Section Card */}
      <div className="geo-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900">Insurance & Protection Policies</h2>
            <p className="text-slate-400 text-xs mt-0.5">Track critical life, health, and vehicle protection policy terms</p>
          </div>
          {!showAddForm && (
            <button
              id="btn-add-insurance-toggle"
              onClick={() => {
                setShowAddForm(true);
                if (selectedMember !== 'all') {
                  setOwnerName(selectedMember);
                }
              }}
              className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Policy
            </button>
          )}
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-6 mb-6 slide-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-2">
              <h3 className="font-display font-semibold text-sm text-slate-800">Register Insurance Protection Policy</h3>
              <button
                id="btn-cancel-insurance-form"
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Policy Owner</label>
                <select
                  id="insurance-form-owner"
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
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Insurance Type</label>
                <select
                  id="insurance-form-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as Insurance['type'])}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                >
                  <option value="life">Term / Life Insurance</option>
                  <option value="health">Family / Individual Health Plan</option>
                  <option value="car">Car Insurance</option>
                  <option value="two_wheeler">Two-Wheeler Insurance</option>
                  <option value="other">Other Liability Protection</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Policy / Plan Name</label>
                <input
                  id="insurance-form-name"
                  type="text"
                  placeholder="e.g. Optima Secure Health Cover, Click2Protect Life"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Insurer Name</label>
                <input
                  id="insurance-form-insurer"
                  type="text"
                  placeholder="e.g. HDFC Ergo, LIC of India, Niva Bupa"
                  value={insurer}
                  onChange={(e) => setInsurer(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Policy Document Number</label>
                <input
                  id="insurance-form-policynumber"
                  type="text"
                  placeholder="e.g. POL-9081247"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sum Assured Cover Amount (₹)</label>
                <input
                  id="insurance-form-sumassured"
                  type="number"
                  placeholder="e.g. 10000000 (1 Crore)"
                  value={sumAssured}
                  onChange={(e) => setSumAssured(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Premium Amount (₹)</label>
                <input
                  id="insurance-form-premium"
                  type="number"
                  placeholder="e.g. 18500"
                  value={premiumAmount}
                  onChange={(e) => setPremiumAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Premium Frequency</label>
                <select
                  id="insurance-form-frequency"
                  value={premiumFrequency}
                  onChange={(e) => setPremiumFrequency(e.target.value as Insurance['premiumFrequency'])}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                >
                  <option value="annual">Annually</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                  <option value="one-time">One-time / Paid-up</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Next Premium Due Date</label>
                <input
                  id="insurance-form-duedate"
                  type="date"
                  value={premiumDueDate}
                  onChange={(e) => setPremiumDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nominee Designation (Optional)</label>
                <input
                  id="insurance-form-nominee"
                  type="text"
                  placeholder="e.g. Suman Kumar (Spouse)"
                  value={nominee}
                  onChange={(e) => setNominee(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Policy Status</label>
                <select
                  id="insurance-form-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Insurance['status'])}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                >
                  <option value="active">Active & Protected</option>
                  <option value="grace_period">Grace Period</option>
                  <option value="lapsed">Lapsed (No Protection)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50">
              <button
                id="btn-insurance-submit"
                type="submit"
                className="px-4.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Confirm & Save Policy
              </button>
            </div>
          </form>
        )}

        {filteredInsurances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-200 rounded-2xl">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Shield className="h-5 w-5 text-brand-500" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No insurance policies registered</p>
            <p className="text-slate-400 text-xs mt-1.5 max-w-sm">
              Keep critical records of term plans, medical coverage levels, and vehicle cover terms to avoid lapsing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredInsurances.map((ins) => (
              <div key={ins.id} className="border border-slate-100 rounded-2xl p-6 hover:border-slate-200 transition-all bg-slate-50/20 flex flex-col justify-between relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${
                  ins.status === 'active' ? 'bg-indigo-500 group-hover:bg-indigo-600' :
                  ins.status === 'grace_period' ? 'bg-amber-400' : 'bg-slate-300'
                }`} />

                <div className="pl-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-50 text-slate-700 text-[10px] border border-slate-100 px-2 py-0.5 rounded font-mono font-medium">
                          {ins.type.toUpperCase()}
                        </span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                          ins.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          ins.status === 'grace_period' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {ins.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                          Owner: {ins.ownerName}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-slate-900 text-base mt-2.5">{ins.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ins.insurer} • Pol: {ins.policyNumber}</p>
                    </div>
                    <button
                      id={`btn-delete-ins-${ins.id}`}
                      onClick={() => onDeleteInsurance(ins.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove Policy"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-4 font-mono text-xs">
                    <div>
                      <p className="text-slate-400 font-display text-[10px] uppercase font-semibold tracking-wider">Sum Assured Cover</p>
                      <p className="text-indigo-900 font-bold text-sm mt-0.5">₹{ins.sumAssured.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-display text-[10px] uppercase font-semibold tracking-wider">Premium Cost</p>
                      <p className="text-slate-800 font-bold text-sm mt-0.5">
                        ₹{ins.premiumAmount.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-400">/{ins.premiumFrequency}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono bg-white -mx-6 -mb-6 px-6 py-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Due: {ins.premiumDueDate}
                    </span>
                    {ins.nominee && (
                      <span className="text-slate-400 truncate max-w-[150px]">
                        Nominee: {ins.nominee}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

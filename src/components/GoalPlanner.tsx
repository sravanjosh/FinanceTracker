import React, { useState } from 'react';
import { Target, Calendar, Plus, Trash2, TrendingUp, Sparkles, HelpCircle, ShieldAlert } from 'lucide-react';
import { FinancialGoal, Asset } from '../types';

interface GoalPlannerProps {
  goals: FinancialGoal[];
  assets: Asset[];
  onAddGoal: (goal: Omit<FinancialGoal, 'id' | 'currentValue'>) => void;
  onDeleteGoal: (id: string) => void;
}

export default function GoalPlanner({ goals, assets, onAddGoal, onDeleteGoal }: GoalPlannerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Goal Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FinancialGoal['category']>('retirement');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [monthlySip, setMonthlySip] = useState('');
  const [priority, setPriority] = useState<FinancialGoal['priority']>('medium');
  const [notes, setNotes] = useState('');
  const [currentAge, setCurrentAge] = useState('');
  const [targetAge, setTargetAge] = useState('');

  // Compound Interest Calculator helper to compute required monthly SIP
  const calculateRequiredSip = (target: number, currentVal: number, years: number, expectedReturn = 12) => {
    if (years <= 0) return 0;
    const rate = expectedReturn / 100 / 12;
    const months = years * 12;
    
    const compoundedCurrent = currentVal * Math.pow(1 + expectedReturn / 100, years);
    const deficit = target - compoundedCurrent;

    if (deficit <= 0) return 0; 

    const numerator = deficit * rate;
    const denominator = Math.pow(1 + rate, months) - 1;
    return numerator / denominator;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || !targetYear) return;

    onAddGoal({
      name,
      category,
      targetAmount: parseFloat(targetAmount),
      targetYear: parseInt(targetYear),
      monthlySipContribution: parseFloat(monthlySip) || 0,
      priority,
      notes: notes || undefined,
      currentAge: currentAge ? parseInt(currentAge) : undefined,
      targetAge: targetAge ? parseInt(targetAge) : undefined,
    });

    // Reset Form
    setName('');
    setCategory('retirement');
    setTargetAmount('');
    setTargetYear('');
    setMonthlySip('');
    setPriority('medium');
    setNotes('');
    setCurrentAge('');
    setTargetAge('');
    setShowAddForm(false);
  };

  const handleCategoryChange = (cat: FinancialGoal['category']) => {
    setCategory(cat);
    if (cat === 'retirement') {
      setName('Golden Retirement Corpus');
      setTargetYear('2045');
    } else if (cat === 'education') {
      setName("Child's Higher Education");
      setTargetYear('2038');
    } else if (cat === 'home') {
      setName('Dream Villa Down Payment');
      setTargetYear('2032');
    } else {
      setName('Custom Financial Target');
      setTargetYear('2030');
    }
  };

  return (
    <div id="goal-planner-root" className="geo-card p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900">Financial Goal Planner</h2>
          <p className="text-slate-400 text-xs mt-0.5">Map assets to specific milestones to compute required savings gap</p>
        </div>
        {!showAddForm && (
          <button
            id="btn-add-goal-toggle"
            onClick={() => {
              setShowAddForm(true);
              handleCategoryChange('retirement');
            }}
            className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Goal
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-6 mb-6 slide-in space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-2">
            <h3 className="font-display font-semibold text-sm text-slate-800">Set Up Target Financial Milestone</h3>
            <button
              id="btn-cancel-goal-form"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Goal Category</label>
              <select
                id="goal-form-category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as FinancialGoal['category'])}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
              >
                <option value="retirement">Retirement corpus</option>
                <option value="education">Children's Education / Marriage</option>
                <option value="home">Real Estate / Home Purchase</option>
                <option value="custom">Custom Milestone</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Priority Level</label>
              <select
                id="goal-form-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as FinancialGoal['priority'])}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
              >
                <option value="high">Critical (High Priority)</option>
                <option value="medium">Important (Medium)</option>
                <option value="low">Flexible (Low Priority)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Goal Description Name</label>
              <input
                id="goal-form-name"
                type="text"
                placeholder="e.g. My Early Retirement Fund"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Target Corpus Amount (₹)</label>
              <input
                id="goal-form-amount"
                type="number"
                placeholder="e.g. 50000000 (5 Crores)"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Target Year of Achievement</label>
              <input
                id="goal-form-year"
                type="number"
                placeholder="e.g. 2045"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                required
              />
            </div>

            {category === 'retirement' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Current Age</label>
                  <input
                    id="goal-form-current-age"
                    type="number"
                    placeholder="e.g. 30"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Target Retirement Age</label>
                  <input
                    id="goal-form-target-age"
                    type="number"
                    placeholder="e.g. 55"
                    value={targetAge}
                    onChange={(e) => setTargetAge(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Current Active Monthly SIP towards this goal (₹/month)</label>
              <input
                id="goal-form-sip"
                type="number"
                placeholder="e.g. 25000"
                value={monthlySip}
                onChange={(e) => setMonthlySip(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50">
            <button
              id="btn-goal-submit"
              type="submit"
              className="px-4.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Confirm & Save Goal
            </button>
          </div>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-200 rounded-2xl">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Target className="h-5 w-5 text-brand-500" />
          </div>
          <p className="text-slate-500 font-medium text-sm">No goals established yet</p>
          <p className="text-slate-400 text-xs mt-1.5 max-w-xs">
            Create milestones for retirement corpus or children's education to map and analyze your assets allocation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const mappedAssets = assets.filter((a) => a.mappedGoalId === goal.id);
            const totalAccumulated = mappedAssets.reduce((sum, a) => sum + (a.value || 0), 0);
            const progressPercent = Math.min((totalAccumulated / goal.targetAmount) * 100, 100);

            const currentYear = new Date().getFullYear();
            const yearsLeft = Math.max(goal.targetYear - currentYear, 0);

            const requiredSip = calculateRequiredSip(goal.targetAmount, totalAccumulated, yearsLeft, 12);
            const sipDeficit = requiredSip - goal.monthlySipContribution;

            return (
              <div key={goal.id} className="border border-slate-100 rounded-2xl p-6 hover:border-slate-200 transition-all bg-slate-50/20 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 bg-brand-500 h-full group-hover:bg-brand-600 transition-colors" />
                
                <div className="pl-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                          goal.category === 'retirement' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          goal.category === 'education' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          goal.category === 'home' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {goal.category}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                          goal.priority === 'high' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {goal.priority} priority
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-slate-900 text-base mt-2.5">{goal.name}</h3>
                    </div>
                    <button
                      id={`btn-delete-goal-${goal.id}`}
                      onClick={() => onDeleteGoal(goal.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove Goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-4 font-mono text-xs">
                    <div>
                      <p className="text-slate-400 font-display text-[10px] uppercase font-semibold tracking-wider">Target Corpus</p>
                      <p className="text-slate-800 font-bold text-sm mt-0.5">₹{goal.targetAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-display text-[10px] uppercase font-semibold tracking-wider">Target Deadline</p>
                      <p className="text-slate-800 font-bold text-sm mt-0.5 flex items-center justify-end gap-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {goal.targetYear} ({yearsLeft} yrs left)
                      </p>
                    </div>
                  </div>

                  {/* Goal Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-500">Accumulated: ₹{totalAccumulated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span className="text-brand-700">{progressPercent.toFixed(1)}% Achieved</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                      <div
                        className="bg-brand-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Goal Assets mapped detail */}
                  <div className="mt-4 bg-white p-3.5 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-800 block mb-1.5">Mapped Portfolio Assets ({mappedAssets.length}):</span>
                    {mappedAssets.length === 0 ? (
                      <span className="italic text-slate-400 text-xs">No assets mapped. Link manually from custom assets table.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {mappedAssets.map((asset) => (
                          <span key={asset.id} className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-100/50 text-[10px] font-medium font-mono">
                            {asset.name.split(' - ')[0]} (₹{Math.round(asset.value / 1000)}k)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendation Insight */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col justify-between bg-brand-50/10 -mx-6 -mb-6 px-6 py-4 text-xs">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <div>
                      {sipDeficit <= 0 ? (
                        <p className="text-emerald-700 font-semibold leading-relaxed">
                          🎉 Your active SIP is fully on track! Based on compounding projection (12% CAGR), you will reach this corpus ahead of schedule.
                        </p>
                      ) : (
                        <p className="text-slate-600 leading-relaxed">
                          We recommend an addition of <b className="text-brand-700">₹{Math.ceil(sipDeficit).toLocaleString('en-IN')}/month</b> to your current active monthly SIP of ₹{goal.monthlySipContribution.toLocaleString('en-IN')} to offset the remaining corpus deficit under a standard 12% annualized return.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

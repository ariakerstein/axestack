import { Link } from 'react-router-dom';
import { useState } from 'react';
import { CheckItem } from '../components/CheckItem';
import { SectionHeading } from '../components';

type Stage = 'acquisition' | 'activation' | 'revenue' | 'retention' | 'referral';

const stages: { id: Stage; label: string; width: string }[] = [
  { id: 'acquisition', label: 'Acquisition', width: '100%' },
  { id: 'activation', label: 'Activation', width: '82%' },
  { id: 'revenue', label: 'Revenue', width: '64%' },
  { id: 'retention', label: 'Retention', width: '48%' },
  { id: 'referral', label: 'Referral', width: '34%' },
];

const stageDetails: Record<Stage, { design: string; metric: string; question: string }> = {
  acquisition: {
    design: 'First impression. PCP model. Trust in 2 seconds. Landing pages, ad campaigns, organic search.',
    metric: 'Landing page to CTA click rate',
    question: '"How did you hear about us?" (post-signup)',
  },
  activation: {
    design: 'Remove ALL friction to value. No unnecessary steps. This is the current priority.',
    metric: 'Time from first interaction to AHA moment',
    question: '"What surprised you most?" (post-activation)',
  },
  revenue: {
    design: 'Price anchoring ($4K to $199), value demonstration before ask. Free checklist leads to expert review upsell.',
    metric: 'Free to paid conversion rate',
    question: '"What made you decide to get expert review?" / "What almost stopped you?"',
  },
  retention: {
    design: 'Notification relevance, re-engagement value. New results, appointment prep, record updates.',
    metric: 'Weekly active usage, features used per session',
    question: '"What brought you back today?" (after 2nd+ session)',
  },
  referral: {
    design: 'One-tap sharing, shareable result formats. Care circle invites, share results, word of mouth.',
    metric: 'Invites sent, referred signups',
    question: '"Would you recommend Navis to someone in your situation? Why/why not?"',
  },
};

const activationProfiles = [
  { profile: 'Newly Diagnosed', activated: 'Sees personalized test checklist', target: '< 2 min' },
  { profile: 'Treatment-Stage', activated: 'Gets specific questions for their appointment', target: '< 3 min' },
  { profile: 'Recurrent / Advanced', activated: 'Sees matched clinical trials', target: '< 3 min' },
  { profile: 'Caregiver', activated: 'Shares a result with family/doctor', target: '< 5 min' },
];

type ChecklistStage = 'activation' | 'revenue' | 'referral';

const checklists: Record<ChecklistStage, string[]> = {
  activation: [
    'Can user experience value without signup?',
    'Is time-to-value under 3 minutes?',
    'Is the value personalized (not generic)?',
    'Is there a clear "wow" moment?',
    'Is the next step obvious after the wow?',
  ],
  revenue: [
    'Is free value demonstrated BEFORE the ask?',
    'Is price anchored against alternatives?',
    'Are objections handled inline?',
    'Is the payment flow frictionless (inline, not redirect)?',
    'Is there a satisfaction signal post-purchase?',
  ],
  referral: [
    'Is sharing one tap?',
    'Is the shared content valuable to the recipient (not just promotional)?',
    'Does the recipient get value without signup?',
    'Is there a natural prompt to share (after value delivery)?',
  ],
};

export default function PreviewAARRR() {
  const [selectedStage, setSelectedStage] = useState<Stage>('activation');
  const [checklistTab, setChecklistTab] = useState<ChecklistStage>('activation');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggleCheck = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const detail = stageDetails[selectedStage];

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>AARRR Pirate Metrics</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Current priority: <strong>Activation to Revenue/Referral</strong>. Users experience value, then pay or refer.
        </p>

        {/* Funnel Visualization */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-5">Funnel Stages</SectionHeading>
          <div className="space-y-2">
            {stages.map((stage) => {
              const isSelected = selectedStage === stage.id;
              const isActivation = stage.id === 'activation';
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className="block mx-auto rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-100 cursor-pointer"
                  style={{
                    width: stage.width,
                    backgroundColor: isSelected
                      ? isActivation ? 'var(--p-green-light)' : 'var(--p-orange-light)'
                      : 'var(--p-surface-alt)',
                    color: isSelected
                      ? isActivation ? 'var(--p-green-text)' : 'var(--p-orange)'
                      : 'var(--p-text-body)',
                    border: isSelected
                      ? isActivation ? '2px solid var(--p-green)' : '2px solid var(--p-orange)'
                      : '1px solid var(--p-border)',
                    boxShadow: isSelected && isActivation ? '0 0 12px rgba(22,163,74,0.2)' : 'none',
                  }}
                >
                  {stage.label}
                  {isActivation && (
                    <span className="ml-2 text-xs font-normal opacity-80">PRIORITY</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-center mt-3" style={{ color: 'var(--p-text-faint)' }}>Click a stage to see details</p>
        </div>

        {/* Selected Stage Detail */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="info" className="mb-1">
            {selectedStage.charAt(0).toUpperCase() + selectedStage.slice(1)} — Detail
          </SectionHeading>
          <div className="space-y-4 mt-4">
            <div>
              <SectionHeading className="mb-1">Design Concern</SectionHeading>
              <p className="text-base" style={{ color: 'var(--p-text-body)' }}>{detail.design}</p>
            </div>
            <div>
              <SectionHeading variant="info" className="mb-1">Key Metric</SectionHeading>
              <p className="text-base font-medium" style={{ color: 'var(--p-text)' }}>{detail.metric}</p>
            </div>
            <div>
              <SectionHeading className="mb-1">Qualitative Question</SectionHeading>
              <p className="text-base italic" style={{ color: 'var(--p-text-body)' }}>{detail.question}</p>
            </div>
          </div>
        </div>

        {/* Activation Focus Table */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '2px solid var(--p-green)' }}>
          <SectionHeading variant="success" className="mb-1">Activation Focus</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>What "activated" means per profile and the time target to get there.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--p-border)' }}>
                  <th className="py-2 pr-4 font-semibold" style={{ color: 'var(--p-text)' }}>Profile</th>
                  <th className="py-2 pr-4 font-semibold" style={{ color: 'var(--p-text)' }}>Activated When</th>
                  <th className="py-2 font-semibold" style={{ color: 'var(--p-text)' }}>Target</th>
                </tr>
              </thead>
              <tbody>
                {activationProfiles.map((row) => (
                  <tr key={row.profile} style={{ borderBottom: '1px solid var(--p-border-subtle)' }}>
                    <td className="py-3 pr-4 font-medium" style={{ color: 'var(--p-text)' }}>{row.profile}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--p-text-body)' }}>{row.activated}</td>
                    <td className="py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--p-green-light)', color: 'var(--p-green-text)' }}>
                        {row.target}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Qualitative > Quantitative Callout */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            backgroundColor: 'var(--p-blue-light)',
            borderLeft: '4px solid var(--p-blue)',
          }}
        >
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--p-blue-text)' }}>
            "Qualitative &gt; Quantitative"
          </p>
          <p className="text-base" style={{ color: 'var(--p-text-body)' }}>
            At our stage, <strong style={{ color: 'var(--p-text)' }}>WHY matters more than HOW MANY</strong>.
            Don't optimize conversion rates without understanding conversion reasons.
            Every funnel step should have a qualitative feedback point.
            Typeform-style surveys have great response rates because they feel personal and conversational — one question at a time, just like our wizard flow.
          </p>
        </div>

        {/* Design Checklist */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading variant="success" className="mb-1">Design Checklist</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>Before building any feature, identify its AARRR stage and check these items.</p>

          {/* Tabs */}
          <div className="flex gap-1 mb-5">
            {(['activation', 'revenue', 'referral'] as ChecklistStage[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setChecklistTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-100 cursor-pointer"
                style={{
                  backgroundColor: checklistTab === tab ? 'var(--p-orange-light)' : 'transparent',
                  color: checklistTab === tab ? 'var(--p-orange)' : 'var(--p-text-muted)',
                  border: checklistTab === tab ? '1px solid var(--p-orange)' : '1px solid transparent',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Checklist items */}
          <div className="space-y-2">
            {checklists[checklistTab].map((item) => {
              const key = `${checklistTab}-${item}`;
              const isChecked = !!checked[key];
              return (
                <CheckItem key={key} checked={isChecked} onChange={() => toggleCheck(key)}>
                  {item}
                </CheckItem>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>
            {Object.keys(checked).filter((k) => k.startsWith(checklistTab) && checked[k]).length} / {checklists[checklistTab].length} checked
          </p>
        </div>
      </div>
    </div>
  );
}

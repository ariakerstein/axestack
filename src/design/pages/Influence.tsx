import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  RadioButtonGroup,
  StepIndicator,
  ProgressBar,
  SectionHeading,
  useFieldState,
  validators,
  colors,
} from '../components';

const pcpLayers = [
  {
    id: 'perception',
    label: 'Perception',
    description: 'What does the user perceive in the first 2 seconds?',
    points: ['Clear headline (benefit-first)', 'Trust signals visible (badges, credentials, social proof)', 'Clean, uncluttered layout', 'One clear path forward'],
  },
  {
    id: 'context',
    label: 'Context',
    description: 'Why should this specific person care?',
    points: ['Personalized to their cancer type/stage', 'Addresses their emotional state', 'References their specific situation', 'Handles their top objection'],
  },
  {
    id: 'permission',
    label: 'Permission',
    description: 'What micro-action can they take right now?',
    points: ['Low-friction CTA ("See your results" not "Sign up now")', 'Feels like their choice, not our push', 'Small commitment before big ask'],
  },
];

const fateSteps = [
  {
    id: 'focus',
    label: 'Focus',
    what: 'Break their autopilot. Use novelty to grab attention.',
    example: '"84% of cancer patients never seek a second opinion"',
    notThis: '"Welcome to our platform"',
  },
  {
    id: 'authority',
    label: 'Authority',
    what: 'Establish credibility immediately.',
    example: '"Board-certified oncologists" / "Based on NCCN guidelines" / "Used by 1,200 patients"',
    notThis: 'No credentials or proof shown',
  },
  {
    id: 'tribe',
    label: 'Tribe',
    what: 'Show they\'re not alone. Others like them use this.',
    example: '"Sarah, breast cancer Stage II, found 3 missing tests"',
    notThis: 'Generic testimonials with no specifics',
  },
  {
    id: 'emotion',
    label: 'Emotion',
    what: 'Connect to what they WANT to feel.',
    example: 'Relief: "You\'re not missing anything" / Control: "Here\'s your plan" / Hope: "There are options you haven\'t seen"',
    notThis: 'Purely informational with no emotional payoff',
  },
];

const wizardSteps = [
  { label: 'What\'s your role?', sublabel: 'Tap a button — easy yes' },
  { label: 'What cancer type?', sublabel: 'Personal, but still easy' },
  { label: 'Where should we send results?', sublabel: 'Feels natural after 2 yeses' },
];

const quickRef = [
  { technique: 'PCP Model', where: 'Every page', principle: 'Perception \u2192 Context \u2192 Permission' },
  { technique: 'FATE', where: 'Landing, onboarding', principle: 'Focus \u2192 Authority \u2192 Tribe \u2192 Emotion' },
  { technique: 'Micro-Compliance', where: 'Conversion flows, wizards', principle: 'Small yeses build to big yes' },
  { technique: 'Lego Technique', where: 'Social proof, pricing', principle: 'Two facts, user connects them' },
  { technique: 'Identity Statements', where: 'CTAs, confirmation screens', principle: '"You ARE" not "You should"' },
  { technique: 'Negative-First', where: 'Comparisons, hero sections', principle: 'Bad state \u2192 good state' },
];

export default function PreviewInfluence() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [fateStep, setFateStep] = useState(0);
  const [wizardStep, setWizardStep] = useState(0);
  const [legoMode, setLegoMode] = useState<'do' | 'dont'>('do');
  const emailRef = useRef<HTMLInputElement>(null);
  const emailField = useFieldState(true, validators.email);

  const activeLayerData = pcpLayers.find((l) => l.id === activeLayer);

  // Map PCP layer id to label for RadioButtonGroup
  const pcpLabels = pcpLayers.map((l) => l.label);
  const activePcpLabel = pcpLayers.find((l) => l.id === activeLayer)?.label ?? null;

  // Auto-focus email input when micro-compliance wizard reaches email step
  useEffect(() => {
    if (wizardStep === 2) {
      emailRef.current?.focus();
    }
  }, [wizardStep]);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: colors.text }}>Influence Patterns</h1>
        <p className="text-lg mb-8" style={{ color: colors.textBody }}>
          Ethical tools for helping cancer patients take actions that serve THEIR interests.
        </p>

        {/* PCP Model */}
        <section className="mb-10">
          <SectionHeading className="text-xl mb-4">PCP Model (Every Page)</SectionHeading>
          <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
            Perception &rarr; Context &rarr; Permission. Click each layer to highlight it.
          </p>
          <div className="mb-4">
            <RadioButtonGroup
              options={pcpLabels}
              selected={activePcpLabel}
              onChange={(label) => {
                const layer = pcpLayers.find((l) => l.label === label);
                if (layer) {
                  setActiveLayer(activeLayer === layer.id ? null : layer.id);
                }
              }}
            />
          </div>

          {/* Mock landing section */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
            {/* Perception layer */}
            <div
              className="p-6 transition-all duration-200"
              style={{
                backgroundColor: activeLayer === 'perception' ? colors.blueLight : colors.surface,
                border: activeLayer === 'perception' ? `2px solid ${colors.blue}` : '2px solid transparent',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textFaint }}>Perception Layer</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2" style={{ color: colors.text }}>
                Are you missing critical tests?
              </h3>
              <div className="flex gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: colors.greenLight, color: colors.greenText }}>Board-Certified Oncologists</span>
                <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: colors.blueLight, color: colors.blueText }}>NCCN Guidelines</span>
              </div>
            </div>

            {/* Context layer */}
            <div
              className="p-6 transition-all duration-200"
              style={{
                backgroundColor: activeLayer === 'context' ? colors.violetLight : colors.surfaceAlt,
                border: activeLayer === 'context' ? `2px solid ${colors.violet}` : '2px solid transparent',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textFaint }}>Context Layer</span>
              </div>
              <p className="text-base" style={{ color: colors.textBody }}>
                For Stage II breast cancer patients, NCCN recommends 6 key tests. Most oncologists order 3-4.
              </p>
            </div>

            {/* Permission layer */}
            <div
              className="p-6 transition-all duration-200"
              style={{
                backgroundColor: activeLayer === 'permission' ? colors.greenLight : colors.surface,
                border: activeLayer === 'permission' ? `2px solid ${colors.green}` : '2px solid transparent',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textFaint }}>Permission Layer</span>
              </div>
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-default"
                style={{ backgroundColor: colors.orange, color: '#fff' }}
              >
                See What Tests You Need
              </button>
            </div>
          </div>

          {activeLayerData && (
            <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.borderSubtle}` }}>
              <p className="text-sm font-medium mb-2" style={{ color: colors.text }}>{activeLayerData.description}</p>
              <ul className="space-y-1">
                {activeLayerData.points.map((pt, i) => (
                  <li key={i} className="text-xs flex items-start gap-2" style={{ color: colors.textBody }}>
                    <span style={{ color: colors.green }}>&#8226;</span> {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* FATE Sequence */}
        <section className="mb-10">
          <SectionHeading className="text-xl mb-4">FATE Sequence (Onboarding)</SectionHeading>
          <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
            Focus &rarr; Authority &rarr; Tribe &rarr; Emotion. Click "Next" to advance through the sequence.
          </p>

          {/* Step Indicator */}
          <div className="mb-4">
            <StepIndicator
              steps={['Focus', 'Authority', 'Tribe', 'Emotion']}
              currentStep={fateStep}
            />
          </div>

          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>
              {fateSteps[fateStep].label}
            </h3>
            <p className="text-sm mb-4" style={{ color: colors.textBody }}>{fateSteps[fateStep].what}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-4" style={{ backgroundColor: colors.doBg, border: `1px solid ${colors.doBorder}` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: colors.doText }}>What the user sees</p>
                <p className="text-sm" style={{ color: colors.doText }}>{fateSteps[fateStep].example}</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: colors.dontBg, border: `1px solid ${colors.dontBorder}` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: colors.dontText }}>Not this</p>
                <p className="text-sm" style={{ color: colors.dontText }}>{fateSteps[fateStep].notThis}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFateStep(Math.max(0, fateStep - 1))}
                disabled={fateStep === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100"
                style={{ backgroundColor: colors.surfaceAlt, color: colors.textBody, border: `1px solid ${colors.border}` }}
              >
                Back
              </button>
              <button
                onClick={() => setFateStep(Math.min(fateSteps.length - 1, fateStep + 1))}
                disabled={fateStep === fateSteps.length - 1}
                className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100"
                style={{ backgroundColor: colors.orange, color: '#fff' }}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* Micro-Compliance */}
        <section className="mb-10">
          <SectionHeading className="text-xl mb-4">Micro-Compliance (Conversion)</SectionHeading>
          <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
            Many small yeses before the real ask. Each small commitment increases the likelihood of the next.
          </p>

          {/* Compliance Meter */}
          <div className="mb-4">
            <ProgressBar value={wizardStep / wizardSteps.length} label="Compliance meter" />
          </div>

          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
          >
            {wizardStep < wizardSteps.length ? (
              <>
                <p className="text-xs font-medium mb-1" style={{ color: colors.textFaint }}>
                  Step {wizardStep + 1} of {wizardSteps.length}
                </p>
                <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>
                  {wizardSteps[wizardStep].label}
                </h3>
                <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                  {wizardSteps[wizardStep].sublabel}
                </p>
                <div className="flex gap-2">
                  {wizardStep === 0 && (
                    <RadioButtonGroup
                      options={['🙋 Patient', '💛 Caregiver']}
                      selected={null}
                      onChange={() => setWizardStep(1)}
                    />
                  )}
                  {wizardStep === 1 && (
                    <RadioButtonGroup
                      options={['🎀 Breast', '🫁 Lung', '🔵 Prostate']}
                      selected={null}
                      onChange={() => setWizardStep(2)}
                    />
                  )}
                  {wizardStep === 2 && (
                    <div className="w-full">
                      <input
                        ref={emailRef}
                        type="email"
                        inputMode="email"
                        placeholder="your@email.com"
                        className="w-full rounded-lg py-3 px-4 text-base mb-2 min-h-[44px] outline-none transition-all duration-[50ms]"
                        style={{ backgroundColor: colors.inputBg, color: colors.text, ...emailField.borderStyle }}
                        {...emailField.inputProps}
                      />
                      {emailField.state === 'error' && (
                        <p className="text-xs mb-2" style={{ color: colors.red }}>Please enter a valid email address.</p>
                      )}
                      <button onClick={() => setWizardStep(3)} className="w-full rounded-xl py-3 px-4 font-semibold text-base min-h-[44px] cursor-pointer" style={{ backgroundColor: colors.orange, color: '#fff' }}>Get My Results</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-lg font-semibold mb-2" style={{ color: colors.greenText }}>Compliance complete</p>
                <p className="text-sm mb-3" style={{ color: colors.textMuted }}>3 small yeses led to the email capture — the real ask.</p>
                <button onClick={() => setWizardStep(0)} className="text-sm font-medium cursor-pointer" style={{ color: colors.orange }}>Reset demo</button>
              </div>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: colors.textFaint }}>
            Research: Freedman & Fraser (1966) — people who agreed to a small request first were 4x more likely to agree to a large one.
          </p>
        </section>

        {/* Lego Technique */}
        <section className="mb-10">
          <SectionHeading className="text-xl mb-4">Lego Technique (Social Proof)</SectionHeading>
          <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
            Give two pieces of information. Let the user's brain connect them. Never state the conclusion.
          </p>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLegoMode('do')}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors duration-100"
              style={{
                backgroundColor: legoMode === 'do' ? colors.green : colors.surface,
                color: legoMode === 'do' ? '#fff' : colors.textBody,
                border: `1px solid ${legoMode === 'do' ? colors.green : colors.border}`,
              }}
            >
              DO (Let user connect)
            </button>
            <button
              onClick={() => setLegoMode('dont')}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors duration-100"
              style={{
                backgroundColor: legoMode === 'dont' ? colors.red : colors.surface,
                color: legoMode === 'dont' ? '#fff' : colors.textBody,
                border: `1px solid ${legoMode === 'dont' ? colors.red : colors.border}`,
              }}
            >
              DON'T (State conclusion)
            </button>
          </div>

          <div className="rounded-2xl p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            {legoMode === 'do' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="rounded-xl p-5 text-center" style={{ backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.borderSubtle}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: colors.textFaint }}>Fact 1</p>
                  <p className="text-base font-semibold" style={{ color: colors.text }}>
                    1 in 3 second opinion patients had treatment changes
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.textMuted }}>MSK study</p>
                </div>
                <div className="rounded-xl p-5 text-center" style={{ backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.borderSubtle}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: colors.textFaint }}>Fact 2</p>
                  <p className="text-base font-semibold" style={{ color: colors.text }}>
                    84% of cancer patients never seek a second opinion
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-5" style={{ backgroundColor: colors.dontBg, border: `1px solid ${colors.dontBorder}` }}>
                <p className="text-base" style={{ color: colors.dontText }}>
                  "You should get a second opinion because treatment changes are common."
                </p>
                <p className="text-xs mt-2" style={{ color: colors.dontText }}>
                  When you state the conclusion, the idea feels like YOURS, not theirs.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Reference */}
        <section className="mb-10">
          <SectionHeading className="text-xl mb-4">Quick Reference</SectionHeading>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: colors.surfaceAlt }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: colors.textMuted }}>Technique</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: colors.textMuted }}>Where to Use</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: colors.textMuted }}>Key Principle</th>
                </tr>
              </thead>
              <tbody>
                {quickRef.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? colors.surface : colors.surfaceAlt,
                      borderTop: `1px solid ${colors.borderSubtle}`,
                    }}
                  >
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{row.technique}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm" style={{ color: colors.textBody }}>{row.where}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm" style={{ color: colors.textMuted }}>{row.principle}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ethical Boundary */}
        <section className="mb-10">
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: colors.surfaceAlt, borderLeft: `4px solid ${colors.green}` }}
          >
            <h3 className="text-base font-semibold mb-2" style={{ color: colors.text }}>Ethical Boundary</h3>
            <p className="text-sm italic mb-3" style={{ color: colors.textBody }}>
              "Are we helping them toward what THEY want, or engineering for us?"
            </p>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              If a design element helps them not miss anything, feel in control, understand their options, and take the right next step — it's ethical. If it just extracts data or money without serving them, remove it.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

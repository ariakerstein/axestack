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

const cancerTypes = ['🎀 Breast', '🔵 Prostate', '🫁 Lung', '🔴 Colorectal', '🟣 Lymphoma', '🟤 Melanoma'];
const stages = ['Stage I', 'Stage II', 'Stage III', 'Stage IV', 'Not Sure'];
const wizardStepLabels = ['Role', 'Type', 'Stage', 'Email', 'Result'];

export default function PreviewConversionFlows() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<string | null>(null);
  const [cancerType, setCancerType] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const emailField = useFieldState(true, validators.email);
  const emailRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input when step 4 is reached
  useEffect(() => {
    if (step === 4) {
      emailRef.current?.focus();
    }
  }, [step]);

  const resetWizard = () => {
    setStep(1);
    setRole(null);
    setCancerType(null);
    setStage(null);
    setEmailSubmitted(false);
  };

  // Auto-advance helper: set value, then advance after 200ms
  const selectAndAdvance = (setter: (v: string) => void, value: string, nextStep: number) => {
    setter(value);
    setTimeout(() => setStep(nextStep), 200);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: colors.text }}>Conversion Flows</h1>
        <p className="text-lg mb-8" style={{ color: colors.textBody }}>
          Value before ask. Micro-compliance builds investment before the email capture.
        </p>

        {/* ── Live Wizard Demo ── */}
        <SectionHeading className="text-xl mb-3">Live Wizard Demo</SectionHeading>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          5-step PersonalizationWizard. Email capture at step 4 — after 3 micro-commitments.
        </p>

        <div
          className="rounded-2xl shadow-sm p-6 mb-8 mx-auto"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            maxWidth: 480,
          }}
        >
          {/* Step indicator */}
          <div className="mb-4">
            <StepIndicator
              steps={wizardStepLabels}
              currentStep={step - 1}
              completedSteps={Array.from({ length: step - 1 }, (_, i) => i)}
            />
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <ProgressBar value={(step - 1) / 4} />
          </div>

          {/* Step 1: Role */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Who are you?</h3>
              <p className="text-sm mb-4" style={{ color: colors.textMuted }}>This helps us personalize your experience.</p>
              <RadioButtonGroup
                options={['🙋 Patient', '💛 Caregiver']}
                required={true}
                selected={role}
                onChange={(v) => selectAndAdvance(setRole, v, 2)}
              />
            </div>
          )}

          {/* Step 2: Cancer Type */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>What type of cancer?</h3>
              <p className="text-sm mb-4" style={{ color: colors.textMuted }}>Select the primary diagnosis.</p>
              <RadioButtonGroup
                options={cancerTypes}
                required={true}
                columns={3}
                selected={cancerType}
                onChange={(v) => selectAndAdvance(setCancerType, v, 3)}
              />
            </div>
          )}

          {/* Step 3: Stage */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>What stage?</h3>
              <p className="text-sm mb-4" style={{ color: colors.textMuted }}>If you're not sure, that's okay.</p>
              <RadioButtonGroup
                options={stages}
                required={true}
                selected={stage}
                onChange={(v) => selectAndAdvance(setStage, v, 4)}
              />
            </div>
          )}

          {/* Step 4: Email */}
          {step === 4 && (
            <div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Where should we send your checklist?</h3>
              <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                We'll email your personalized {cancerType} ({stage}) checklist.
              </p>
              <input
                ref={emailRef}
                type="email"
                placeholder="your@email.com"
                {...emailField.inputProps}
                className="w-full rounded-xl py-3 px-4 text-base mb-1 min-h-[44px] outline-none"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  ...emailField.borderStyle,
                }}
              />
              {emailField.state === 'error' && (
                <p className="text-xs mb-2" style={{ color: colors.red }}>Please enter a valid email address.</p>
              )}
              <button
                onClick={() => {
                  if (emailField.value && validators.email(emailField.value)) {
                    setEmailSubmitted(true);
                    setStep(5);
                  }
                }}
                className="w-full rounded-xl py-3 px-4 font-semibold text-base min-h-[44px] transition-colors duration-[50ms] cursor-pointer mt-2"
                style={{
                  backgroundColor: emailField.value && validators.email(emailField.value) ? colors.orange : colors.surfaceAlt,
                  color: emailField.value && validators.email(emailField.value) ? 'white' : colors.textMuted,
                }}
              >
                Get My Checklist
              </button>
            </div>
          )}

          {/* Step 5: Reveal */}
          {step === 5 && (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: colors.greenLight }}
              >
                <svg className="w-7 h-7" style={{ color: colors.green }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Your personalized checklist</h3>
              <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                {role} | {cancerType} | {stage}
              </p>
              <div className="rounded-xl p-4 text-left space-y-2 mb-4" style={{ backgroundColor: colors.surfaceAlt }}>
                {['Genetic testing (BRCA1/BRCA2)', 'HER2 status confirmation', 'Oncotype DX recurrence score', 'MRI if dense breast tissue'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm" style={{ color: colors.textBody }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.greenLight }}>
                      <svg className="w-3 h-3" style={{ color: colors.green }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <button
                onClick={resetWizard}
                className="text-sm font-medium cursor-pointer"
                style={{ color: colors.orange }}
              >
                Reset demo
              </button>
            </div>
          )}

          {/* Back button */}
          {step > 1 && step < 5 && (
            <button
              onClick={() => setStep(step - 1)}
              className="mt-4 text-sm cursor-pointer"
              style={{ color: colors.textMuted }}
            >
              &larr; Back
            </button>
          )}
        </div>

        {/* ── Email Capture Positioning ── */}
        <SectionHeading className="text-xl mb-3">Email Capture Positioning</SectionHeading>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          Never on first contact. Always after demonstrating value.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: 'Homepage popup',
              conversion: 'Low',
              why: 'No context, no value shown yet',
              color: colors.red,
              bgColor: colors.redLight,
              textColor: colors.redText,
            },
            {
              label: 'After 1 commitment',
              conversion: 'Medium',
              why: 'Some investment, but not enough',
              color: colors.orange,
              bgColor: colors.orangeLight,
              textColor: colors.orange,
            },
            {
              label: 'After 3+ commitments',
              conversion: 'High',
              why: 'Sunk cost + demonstrated value',
              color: colors.green,
              bgColor: colors.greenLight,
              textColor: colors.greenText,
            },
          ].map((pos) => (
            <div
              key={pos.label}
              className="rounded-2xl p-5"
              style={{ backgroundColor: pos.bgColor, border: `1px solid ${pos.color}` }}
            >
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: pos.textColor }}>
                {pos.conversion} conversion
              </div>
              <div className="text-base font-semibold mb-1" style={{ color: colors.text }}>{pos.label}</div>
              <div className="text-sm" style={{ color: colors.textBody }}>{pos.why}</div>
            </div>
          ))}
        </div>

        {/* ── Sticky CTA Pattern ── */}
        <SectionHeading className="text-xl mb-3">Sticky CTA Pattern</SectionHeading>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          Appears after 400px scroll on mobile. One full-width button.
        </p>

        <div className="flex justify-center mb-8">
          <StickyCtaDemo />
        </div>

        {/* ── Upsell Flow ── */}
        <SectionHeading className="text-xl mb-3">Expert Upsell Flow</SectionHeading>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          After delivering free value, offer premium with price anchoring.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {[
            { num: '1', title: 'Free Checklist', desc: 'Deliver personalized value', icon: '\u2713' },
            { num: '2', title: 'Soft Upsell', desc: '"Want an expert to review?"', icon: '?' },
            { num: '3', title: 'Price Anchor', desc: '$4,000 at MSK \u2192 $199 here', icon: '$' },
            { num: '4', title: 'Payment', desc: 'Stripe checkout', icon: '\u2192' },
          ].map((item, i) => (
            <div key={i} className="flex-1 relative">
              <div
                className="rounded-2xl p-4 text-center h-full"
                style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold"
                  style={{ backgroundColor: colors.orange, color: 'white' }}
                >
                  {item.num}
                </div>
                <div className="text-sm font-semibold mb-1" style={{ color: colors.text }}>{item.title}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</div>
              </div>
              {i < 3 && (
                <div
                  className="hidden sm:block absolute top-1/2 -right-3 w-3 text-center text-xs"
                  style={{ color: colors.textFaint }}
                >
                  {'\u2192'}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Price anchor detail */}
        <div
          className="rounded-2xl p-6 mb-8 mx-auto"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            maxWidth: 480,
          }}
        >
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.textMuted }}>Second opinions typically cost</p>
            <p className="text-2xl font-semibold mb-1 line-through" style={{ color: colors.textFaint }}>$4,000</p>
            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>at Memorial Sloan Kettering</p>
            <p className="text-3xl font-bold mb-2" style={{ color: colors.greenText }}>$199</p>
            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>Expert review of your case</p>
            <button
              className="w-full rounded-xl py-3 px-4 font-semibold text-base min-h-[44px] cursor-pointer"
              style={{ backgroundColor: colors.orange, color: 'white' }}
            >
              Get Expert Review
            </button>
            <p className="text-xs mt-3" style={{ color: colors.textFaint }}>
              35% of second opinions change treatment plans
            </p>
          </div>
        </div>

        {/* ── Rules ── */}
        <SectionHeading className="text-xl mb-3">Rules</SectionHeading>
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: colors.textBody }}>
          <li><strong style={{ color: colors.text }}>Value before ask.</strong> Show what they get before asking for anything.</li>
          <li><strong style={{ color: colors.text }}>One question per step.</strong> Wizards over long forms.</li>
          <li><strong style={{ color: colors.text }}>Email capture after 3+ micro-commitments.</strong> Not before.</li>
          <li><strong style={{ color: colors.text }}>Price anchor against competitors.</strong> Always contextualize cost.</li>
          <li><strong style={{ color: colors.text }}>Sticky CTA on mobile scroll pages.</strong> One button, appears after 400px.</li>
          <li><strong style={{ color: colors.text }}>Track everything.</strong> Every step, every click, every conversion.</li>
        </ol>
      </div>
    </div>
  );
}

function StickyCtaDemo() {
  const [scrollY, setScrollY] = useState(0);
  const showSticky = scrollY > 120; // scaled down from 400px for the demo frame

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        width: 375,
        height: 560,
        border: `3px solid ${colors.borderStrong}`,
        backgroundColor: colors.bg,
      }}
    >
      {/* Phone header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="text-xs font-semibold" style={{ color: colors.text }}>navis.care</div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.green }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.textFaint }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.textFaint }} />
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="overflow-y-auto px-4 py-4"
        style={{ height: 'calc(100% - 44px)' }}
        onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
      >
        <div className="space-y-4">
          {/* Hero section */}
          <div className="rounded-xl p-4" style={{ backgroundColor: colors.surface }}>
            <div className="text-lg font-semibold mb-2" style={{ color: colors.text }}>
              Know you're not missing anything
            </div>
            <div className="text-sm mb-3" style={{ color: colors.textBody }}>
              Get a personalized checklist of tests recommended for your cancer type and stage.
            </div>
            <button
              className="w-full rounded-lg py-2.5 font-semibold text-sm min-h-[44px]"
              style={{ backgroundColor: colors.orange, color: 'white' }}
            >
              Get Your Free Checklist
            </button>
          </div>

          {/* Scroll indicator */}
          <div className="text-center py-2">
            <div className="text-xs" style={{ color: colors.textFaint }}>Scroll to see sticky CTA appear</div>
            <div className="text-lg" style={{ color: colors.textFaint }}>{'\u2193'}</div>
          </div>

          {/* Filler sections */}
          {['How it works', 'What patients say', 'Why trust Navis', 'Our team'].map((title, i) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
              <div className="text-sm font-semibold mb-2" style={{ color: colors.text }}>{title}</div>
              <div className="space-y-1.5">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 rounded" style={{ backgroundColor: colors.skeleton, width: `${80 - j * 15}%` }} />
                ))}
              </div>
            </div>
          ))}

          {/* Extra space for scrolling */}
          <div className="h-32" />
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="absolute bottom-0 inset-x-0 px-4 py-3 transition-all duration-200"
        style={{
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          boxShadow: showSticky ? '0 -4px 12px rgba(0,0,0,0.08)' : 'none',
          transform: showSticky ? 'translateY(0)' : 'translateY(100%)',
          opacity: showSticky ? 1 : 0,
        }}
      >
        <button
          className="w-full rounded-lg py-2.5 font-semibold text-sm min-h-[44px]"
          style={{ backgroundColor: colors.orange, color: 'white' }}
        >
          Get Your Free Checklist
        </button>
      </div>

      {/* Scroll position indicator */}
      <div
        className="absolute top-12 right-2 rounded-full px-2 py-0.5 text-xs font-mono"
        style={{ backgroundColor: colors.surface, color: colors.textMuted, border: `1px solid ${colors.border}` }}
      >
        {Math.round(scrollY)}px
      </div>
    </div>
  );
}

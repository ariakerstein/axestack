import { Link } from 'react-router-dom';
import { useState } from 'react';
import { CheckItem } from '../components/CheckItem';

interface Profile {
  id: string;
  name: string;
  shortName: string;
  jobs: {
    functional: string[];
    emotional: string[];
    social: string[];
  };
  wantToFeel: string[];
  dontWantToFeel: string[];
  keepsThemUp: string;
  objections: { objection: string; response: string }[];
  ahaMoment: string;
  designImplications: string[];
}

const profiles: Profile[] = [
  {
    id: 'newly-diagnosed',
    name: 'Newly Diagnosed',
    shortName: 'Week 0-4',
    jobs: {
      functional: ['Understand what I have', 'Know what tests I need', 'Find the right doctor', 'Know if my treatment plan is complete'],
      emotional: ['Feel IN CONTROL', 'Feel HOPEFUL'],
      social: ['Be seen as PROACTIVE and STRONG'],
    },
    wantToFeel: ['In control', 'Hopeful'],
    dontWantToFeel: ['Helpless', 'Stupid for not understanding medical terms'],
    keepsThemUp: '"Am I going to die?" "Is my doctor good enough?" "What if we\'re missing something?"',
    objections: [
      { objection: 'I already have a doctor', response: 'Frame as SUPPORTING their doctor, not replacing' },
      { objection: 'I\'m too overwhelmed to deal with this', response: '"Just one step" — we do the work' },
      { objection: 'How is AI qualified?', response: 'Board-certified oncologists review everything' },
      { objection: 'I can\'t afford this', response: 'Free checklist, premium is $199 vs $4,000' },
    ],
    ahaMoment: 'Here\'s your checklist — 3 tests your plan may be missing.',
    designImplications: [
      'SINGLE next step. No complex navigation.',
      'Large, clear CTA. "Get Your Checklist" not "Explore Our Platform."',
      'Minimal text. Front-load the benefit.',
      'Trust signals visible immediately (badges, credentials).',
      'Progressive disclosure for medical details.',
    ],
  },
  {
    id: 'treatment-stage',
    name: 'Treatment-Stage',
    shortName: 'Months 3-18',
    jobs: {
      functional: ['Manage side effects', 'Track appointments', 'Know if treatment is working', 'Find better options if it\'s not'],
      emotional: ['Feel PREPARED for each appointment', 'Feel INFORMED'],
      social: ['Be seen as HANDLING IT'],
    },
    wantToFeel: ['Prepared', 'Informed'],
    dontWantToFeel: ['Blindsided by test results', 'Passive in their care'],
    keepsThemUp: '"Is the treatment working?" "What are these new symptoms?" "What questions should I ask tomorrow?"',
    objections: [
      { objection: 'I\'m already in treatment, it\'s too late', response: '"It\'s never too late to optimize your care"' },
      { objection: 'My doctor has it handled', response: '"We help you ask better questions, not replace your doctor"' },
      { objection: 'I don\'t have energy for this', response: '"5 minutes before your appointment"' },
    ],
    ahaMoment: 'Here are 5 questions to ask at tomorrow\'s appointment — specific to YOUR cancer type and stage.',
    designImplications: [
      'Appointment-centric UX. "Your next appointment" as primary frame.',
      'Question generation front and center.',
      'Timeline/progress view of treatment.',
      'Quick actions: "Prep for appointment" / "What does this result mean?"',
    ],
  },
  {
    id: 'recurrent-advanced',
    name: 'Recurrent / Advanced',
    shortName: 'Year 1+',
    jobs: {
      functional: ['Find new options', 'Get access to clinical trials', 'Get opinions from specialists', 'Explore everything'],
      emotional: ['Feel THERE ARE STILL OPTIONS', 'Feel EMPOWERED'],
      social: ['Be seen as STILL FIGHTING'],
    },
    wantToFeel: ['That there are still options', 'Empowered'],
    dontWantToFeel: ['Abandoned by the system', 'Hopeless'],
    keepsThemUp: '"Is there a trial I don\'t know about?" "Should I go to a different hospital?" "Am I getting the most aggressive treatment possible?"',
    objections: [
      { objection: 'I\'ve already tried everything', response: 'Show options they haven\'t seen (trial matching by biomarker)' },
      { objection: 'Trials are a last resort', response: '"5% enroll, 95% miss potential options"' },
      { objection: 'I don\'t want to be a guinea pig', response: 'Reframe as accessing tomorrow\'s medicine today' },
    ],
    ahaMoment: '3 clinical trials within 50 miles match your specific biomarkers — and you\'re eligible.',
    designImplications: [
      'Clinical trial matching as PRIMARY feature.',
      'Biomarker-aware recommendations.',
      'Research-forward: latest studies, emerging treatments.',
      'Power-user features: detailed filtering, comparison tools.',
    ],
  },
  {
    id: 'caregiver',
    name: 'Caregiver',
    shortName: 'Ongoing',
    jobs: {
      functional: ['Coordinate care without repeating info', 'Keep family updated', 'Track appointments and meds', 'Research on behalf of patient'],
      emotional: ['Feel USEFUL and IN CONTROL of what they can control'],
      social: ['Be seen as a GOOD caregiver'],
    },
    wantToFeel: ['Useful', 'In control of what they can control'],
    dontWantToFeel: ['Helpless watching someone suffer', 'Like they\'re failing'],
    keepsThemUp: '"Did I ask the right questions?" "Am I doing enough?" "What if I miss an appointment?"',
    objections: [
      { objection: 'The patient should handle their own care', response: '"Most patients want help — you\'re not overstepping"' },
      { objection: 'I don\'t have access to their records', response: '"They can invite you to their care circle"' },
      { objection: 'I\'m not medical, I won\'t understand', response: '"We translate everything into plain language"' },
    ],
    ahaMoment: 'Here are the 3 tests mom needs — share this with her doctor before Tuesday\'s appointment.',
    designImplications: [
      'Care Circle tab is primary navigation for caregivers.',
      'One-tap sharing: send checklist, results, or questions to patient/family.',
      'Multi-patient support: can manage care for multiple people.',
      'Plain language by default, medical terms expandable.',
      '"Share with doctor" as a prominent action on every result.',
    ],
  },
];

const beforeYouBuild = [
  'Which profile(s) see this screen?',
  'What emotional state are they in?',
  'What\'s their #1 objection right now?',
  'What\'s the ONE thing they need to do next?',
  'What would make them feel [the emotion they WANT to feel]?',
];

const jobColors: Record<string, { bg: string; text: string }> = {
  functional: { bg: 'var(--p-blue-light)', text: 'var(--p-blue-text)' },
  emotional: { bg: 'var(--p-violet-light)', text: 'var(--p-violet)' },
  social: { bg: 'var(--p-green-light)', text: 'var(--p-green-text)' },
};

export default function PreviewJTBDProfiles() {
  const [selectedId, setSelectedId] = useState('newly-diagnosed');
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const selected = profiles.find((p) => p.id === selectedId)!;

  const toggleCheck = (i: number) => {
    setCheckedItems((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>JTBD Profiles</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Before building any UI, identify which profile sees it. Design for THEIR emotional state, not a generic user.
        </p>

        {/* Profile Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="rounded-xl p-4 text-left cursor-pointer transition-all duration-100"
              style={{
                backgroundColor: selectedId === p.id ? 'var(--p-orange-light)' : 'var(--p-surface)',
                border: `2px solid ${selectedId === p.id ? 'var(--p-orange)' : 'var(--p-border)'}`,
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{p.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--p-text-muted)' }}>{p.shortName}</p>
            </button>
          ))}
        </div>

        {/* Selected Profile Detail */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
        >
          <h2 className="text-xl font-semibold mb-5" style={{ color: 'var(--p-text)' }}>{selected.name}</h2>

          {/* Jobs */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--p-text-muted)' }}>Jobs to Be Done</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(selected.jobs) as Array<keyof typeof selected.jobs>).map((type) =>
                selected.jobs[type].map((job, i) => (
                  <span
                    key={`${type}-${i}`}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: jobColors[type].bg, color: jobColors[type].text }}
                  >
                    {job}
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-6 mt-4">
              {Object.keys(jobColors).map((type) => (
                <span key={type} className="flex items-center gap-2 text-xs font-medium" style={{ color: jobColors[type].text }}>
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: jobColors[type].bg, border: `2px solid ${jobColors[type].text}` }} />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {/* Emotional State */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--p-do-text)' }}>Want to feel</p>
              <ul className="space-y-1">
                {selected.wantToFeel.map((item, i) => (
                  <li key={i} className="text-sm" style={{ color: 'var(--p-do-text)' }}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--p-dont-text)' }}>Don't want to feel</p>
              <ul className="space-y-1">
                {selected.dontWantToFeel.map((item, i) => (
                  <li key={i} className="text-sm" style={{ color: 'var(--p-dont-text)' }}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* What keeps them up */}
          <div className="mb-6">
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--p-surface-alt)', borderLeft: '4px solid var(--p-violet)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--p-text-muted)' }}>What keeps them up at night</p>
              <p className="text-base italic" style={{ color: 'var(--p-text)' }}>{selected.keepsThemUp}</p>
            </div>
          </div>

          {/* Key Objections */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--p-red-text)' }}>Key Objections</h3>
            <div className="space-y-3">
              {selected.objections.map((obj, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: 'var(--p-red-light)', color: 'var(--p-red-text)' }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>"{obj.objection}"</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--p-green-text)' }}>{obj.response}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AHA Moment */}
          <div className="mb-6">
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--p-green-light)', border: '1px solid var(--p-green)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--p-green-text)' }}>AHA Moment</p>
              <p className="text-base font-semibold" style={{ color: 'var(--p-green-text)' }}>"{selected.ahaMoment}"</p>
            </div>
          </div>

          {/* Design Implications */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--p-text-muted)' }}>Design Implications</h3>
            <ul className="space-y-2">
              {selected.designImplications.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--p-text-body)' }}>
                  <span style={{ color: 'var(--p-green)' }}>&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Before You Build */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--p-text)' }}>Before You Build</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            If you can't answer these, you're not ready to design.
          </p>
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
          >
            <div className="space-y-2">
              {beforeYouBuild.map((q, i) => (
                <CheckItem key={i} checked={!!checkedItems[i]} onChange={() => toggleCheck(i)}>
                  {i + 1}. {q}
                </CheckItem>
              ))}
            </div>
            {Object.values(checkedItems).filter(Boolean).length === 5 && (
              <p className="text-sm font-medium mt-4" style={{ color: 'var(--p-green-text)' }}>
                All questions answered. You're ready to design.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

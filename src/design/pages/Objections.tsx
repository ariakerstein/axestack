import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SectionHeading } from '../components';

const universalObjections = [
  {
    objection: 'I trust my oncologist',
    reframe: 'Never contradict this. Validate, then reframe as collaboration.',
    uiResponse: 'Help YOUR oncologist by bringing these questions',
    avoid: 'Any language suggesting their doctor is wrong or incomplete',
    sampleUI: {
      type: 'banner',
      text: 'Give your oncologist a complete picture',
      subtext: 'Supporting your doctor with data',
    },
  },
  {
    objection: 'This is too expensive',
    reframe: 'Show free value FIRST. Never lead with price. Use price anchoring.',
    uiResponse: '$4,000 at major cancer centers → $49 here',
    avoid: 'Leading with price before showing value',
    sampleUI: {
      type: 'pricing',
      text: '$4,000 at major cancer centers',
      subtext: '$49 here',
    },
  },
  {
    objection: 'I\'m too overwhelmed to deal with this',
    reframe: '"Just one step" framing. Never show the whole journey at once.',
    uiResponse: '2 minutes / Just tell us your cancer type / We\'ll handle the rest',
    avoid: 'Showing complex multi-step processes upfront',
    sampleUI: {
      type: 'cta',
      text: 'Just tell us your cancer type',
      subtext: 'We\'ll handle the rest. Takes 2 minutes.',
    },
  },
  {
    objection: 'AI can\'t understand my case',
    reframe: 'Lead with human expertise, AI is the enabler.',
    uiResponse: 'Board-certified oncologists review your case (primary)',
    avoid: '"Our AI analyzed..." as the first thing they see',
    sampleUI: {
      type: 'trust',
      text: 'Board-certified oncologists review your case',
      subtext: 'AI helps organize your records',
    },
  },
  {
    objection: 'I don\'t have my records',
    reframe: 'Remove the blocker entirely. Offer a "start without records" path.',
    uiResponse: 'Start without records — answer questions, get checklist based on diagnosis info alone',
    avoid: 'Gating value behind record upload',
    sampleUI: {
      type: 'options',
      text: 'Start without records',
      subtext: 'Answer a few questions to get your personalized checklist',
    },
  },
];

const profileObjections: Record<string, { objection: string; response: string }[]> = {
  'Newly Diagnosed': [
    { objection: 'I don\'t even know what questions to ask', response: 'We give you the exact questions — just bring this to your appointment' },
    { objection: 'I\'m scared to know more', response: 'Progressive disclosure: headline reassures, details behind "Show more"' },
    { objection: 'This seems too good to be true', response: 'Founder story + credentials + specific methodology (NCCN guidelines)' },
  ],
  'Treatment-Stage': [
    { objection: 'I\'m already in treatment, too late', response: 'It\'s never too late to optimize. 1 in 3 second opinions change treatment.' },
    { objection: 'I don\'t have energy for this', response: '5 minutes before your appointment — minimal time commitment' },
    { objection: 'My numbers are fine, I don\'t need this', response: 'Good — let\'s make sure nothing is being missed (validation + safety net)' },
  ],
  'Recurrent / Advanced': [
    { objection: 'I\'ve tried everything', response: 'Show novel options: biomarker-specific trials, off-label drugs, emerging research' },
    { objection: 'Trials are a last resort / guinea pig', response: 'Clinical trials give access to tomorrow\'s treatments today' },
    { objection: 'No one can help me', response: 'Specific stories of patients with similar situations who found options' },
  ],
  'Caregiver': [
    { objection: 'This isn\'t my decision to make', response: 'Share this with [patient] — let them decide (empowers, doesn\'t overstep)' },
    { objection: 'The patient doesn\'t want to deal with this', response: 'Handle the research so they don\'t have to' },
    { objection: 'I don\'t understand medical terms', response: 'Everything in plain language. Medical terms explained on tap.' },
  ],
};

const profileTabs = Object.keys(profileObjections);

const placementMarkers = [
  { position: 'Below the hero', handler: 'Handle the #1 objection (trust)', where: 'Landing Pages' },
  { position: 'Before pricing', handler: 'Handle the cost objection (anchor + value)', where: 'Landing Pages' },
  { position: 'Before final CTA', handler: 'Handle the overwhelm objection ("just 2 minutes")', where: 'Landing Pages' },
  { position: 'At email capture step', handler: '"We\'ll never spam you. Just your results."', where: 'Wizards' },
  { position: 'At payment step', handler: 'Price anchor + satisfaction guarantee', where: 'Wizards' },
  { position: 'At upload step', handler: '"Or skip this — start with just your diagnosis"', where: 'Wizards' },
  { position: 'Empty states', handler: '"Not sure where to start? Try asking a question."', where: 'In-App' },
  { position: 'Before complex features', handler: '"This takes about 2 minutes"', where: 'In-App' },
  { position: 'After delivering value', handler: '"Want an expert to review this?" (natural upsell)', where: 'In-App' },
];

export default function PreviewObjections() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [activeProfile, setActiveProfile] = useState(profileTabs[0]);

  const toggleExpand = (i: number) => {
    setExpandedIdx(expandedIdx === i ? null : i);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Objection Handling</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>
          Every user has reasons NOT to act. Great UI addresses these before the user articulates them.
        </p>

        {/* Universal Objections */}
        <section className="mb-10">
          <SectionHeading variant="danger" className="mb-4">Universal Objections (All Profiles)</SectionHeading>
          <div className="space-y-3">
            {universalObjections.map((obj, i) => {
              const isExpanded = expandedIdx === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden transition-all duration-200"
                  style={{ backgroundColor: 'var(--p-surface)', border: `1px solid ${isExpanded ? 'var(--p-orange)' : 'var(--p-border)'}` }}
                >
                  <button
                    onClick={() => toggleExpand(i)}
                    className="w-full text-left p-5 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base font-medium" style={{ color: 'var(--p-text)' }}>
                        "{obj.objection}"
                      </span>
                    </div>
                    <span
                      className="text-lg transition-transform duration-200"
                      style={{ color: 'var(--p-text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      &#9662;
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      {/* Reframe Strategy */}
                      <div>
                        <SectionHeading className="mb-1">Reframe Strategy</SectionHeading>
                        <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>{obj.reframe}</p>
                      </div>

                      {/* UI Response */}
                      <div>
                        <SectionHeading variant="success" className="mb-1">UI Response</SectionHeading>
                        <p className="text-sm font-medium" style={{ color: 'var(--p-green-text)' }}>{obj.uiResponse}</p>
                      </div>

                      {/* Avoid */}
                      <div>
                        <SectionHeading variant="danger" className="mb-1">Avoid</SectionHeading>
                        <p className="text-sm" style={{ color: 'var(--p-red-text)' }}>{obj.avoid}</p>
                      </div>

                      {/* Sample UI Component */}
                      <div>
                        <SectionHeading className="mb-2">Sample UI</SectionHeading>
                        <div
                          className="rounded-xl p-4"
                          style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)' }}
                        >
                          {obj.sampleUI.type === 'pricing' ? (
                            <div className="flex items-center gap-4">
                              <span className="text-sm line-through" style={{ color: 'var(--p-text-muted)' }}>{obj.sampleUI.text}</span>
                              <span className="text-lg font-bold" style={{ color: 'var(--p-green-text)' }}>{obj.sampleUI.subtext}</span>
                            </div>
                          ) : obj.sampleUI.type === 'cta' ? (
                            <div>
                              <button
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-default mb-2"
                                style={{ backgroundColor: 'var(--p-orange)', color: '#fff' }}
                              >
                                {obj.sampleUI.text}
                              </button>
                              <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{obj.sampleUI.subtext}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>{obj.sampleUI.text}</p>
                              <p className="text-xs mt-1" style={{ color: 'var(--p-text-muted)' }}>{obj.sampleUI.subtext}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Profile-Specific Objections */}
        <section className="mb-10">
          <SectionHeading variant="danger" className="mb-4">Profile-Specific Objections</SectionHeading>
          <div className="flex flex-wrap gap-2 mb-4">
            {profileTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveProfile(tab)}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors duration-100"
                style={{
                  backgroundColor: activeProfile === tab ? 'var(--p-orange)' : 'var(--p-surface)',
                  color: activeProfile === tab ? '#fff' : 'var(--p-text-body)',
                  border: `1px solid ${activeProfile === tab ? 'var(--p-orange)' : 'var(--p-border)'}`,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}
          >
            <div className="space-y-4">
              {profileObjections[activeProfile].map((obj, i) => (
                <div key={i}>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--p-text)' }}>"{obj.objection}"</p>
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}
                    >
                      <p className="text-sm" style={{ color: 'var(--p-do-text)' }}>{obj.response}</p>
                    </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Placement Guide */}
        <section className="mb-10">
          <SectionHeading variant="success" className="mb-4">Placement Guide</SectionHeading>
          <p className="text-sm mb-4" style={{ color: 'var(--p-text-muted)' }}>
            Where to place objection handlers in the page flow.
          </p>

          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
            {/* Mock page layout */}
            <div className="p-4">
              {['Landing Pages', 'Wizards', 'In-App'].map((section) => {
                const markers = placementMarkers.filter((m) => m.where === section);
                return (
                  <div key={section} className="mb-4 last:mb-0">
                    <SectionHeading className="mb-2 px-2">{section}</SectionHeading>
                    <div className="space-y-2">
                      {markers.map((marker, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl p-3"
                          style={{ backgroundColor: 'var(--p-surface-alt)', border: '1px solid var(--p-border-subtle)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>{marker.position}</p>
                            <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>{marker.handler}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

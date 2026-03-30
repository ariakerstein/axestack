export interface Question {
  id: string
  category: 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism' | 'workstyle' | 'founder'
  text: string
  options: { value: number; label: string }[]
}

export const questions: Question[] = [
  // Big Five - Openness (2 questions)
  {
    id: 'o1',
    category: 'openness',
    text: 'When you have free time, do you prefer exploring new ideas/places, or enjoying familiar routines?',
    options: [
      { value: 1, label: 'Strongly prefer familiar routines' },
      { value: 2, label: 'Somewhat prefer familiar' },
      { value: 3, label: 'Mix of both' },
      { value: 4, label: 'Somewhat prefer exploring' },
      { value: 5, label: 'Strongly prefer exploring new things' },
    ],
  },
  {
    id: 'o2',
    category: 'openness',
    text: 'Do you often get lost in abstract thinking, or do you prefer concrete, practical matters?',
    options: [
      { value: 1, label: 'Strongly prefer concrete/practical' },
      { value: 2, label: 'Somewhat prefer practical' },
      { value: 3, label: 'Comfortable with both' },
      { value: 4, label: 'Somewhat prefer abstract' },
      { value: 5, label: 'Often lost in abstract thinking' },
    ],
  },

  // Big Five - Conscientiousness (2 questions)
  {
    id: 'c1',
    category: 'conscientiousness',
    text: 'Do you naturally keep detailed plans and schedules, or prefer flexibility and spontaneity?',
    options: [
      { value: 5, label: 'Very detailed plans and schedules' },
      { value: 4, label: 'Generally organized with some flexibility' },
      { value: 3, label: 'Mix of planning and spontaneity' },
      { value: 2, label: 'Prefer flexibility, loose plans' },
      { value: 1, label: 'Highly spontaneous, avoid rigid plans' },
    ],
  },
  {
    id: 'c2',
    category: 'conscientiousness',
    text: 'When starting a project, do you plan extensively or dive in and figure it out?',
    options: [
      { value: 5, label: 'Plan extensively before starting' },
      { value: 4, label: 'Do some planning first' },
      { value: 3, label: 'Quick plan then iterate' },
      { value: 2, label: 'Mostly dive in, plan as needed' },
      { value: 1, label: 'Dive in immediately, figure it out' },
    ],
  },

  // Big Five - Extraversion (2 questions)
  {
    id: 'e1',
    category: 'extraversion',
    text: 'After a long day, do you recharge by being with people or by being alone?',
    options: [
      { value: 1, label: 'Definitely alone' },
      { value: 2, label: 'Usually alone' },
      { value: 3, label: 'Depends on the day' },
      { value: 4, label: 'Usually with people' },
      { value: 5, label: 'Definitely with people' },
    ],
  },
  {
    id: 'e2',
    category: 'extraversion',
    text: 'In meetings, do you tend to speak up first or listen and think before contributing?',
    options: [
      { value: 1, label: 'Almost always listen first' },
      { value: 2, label: 'Usually listen, then contribute' },
      { value: 3, label: 'Mix of both' },
      { value: 4, label: 'Usually speak up early' },
      { value: 5, label: 'Almost always speak up first' },
    ],
  },

  // Big Five - Agreeableness (2 questions)
  {
    id: 'a1',
    category: 'agreeableness',
    text: "When you disagree with someone's approach, do you voice it directly or find diplomatic ways?",
    options: [
      { value: 1, label: 'Very direct, say it straight' },
      { value: 2, label: 'Direct but considerate' },
      { value: 3, label: 'Balance directness with diplomacy' },
      { value: 4, label: 'Usually diplomatic' },
      { value: 5, label: 'Very diplomatic, avoid confrontation' },
    ],
  },
  {
    id: 'a2',
    category: 'agreeableness',
    text: 'Do you prioritize harmony in teams or are you comfortable with productive conflict?',
    options: [
      { value: 1, label: 'Very comfortable with conflict' },
      { value: 2, label: 'Accept conflict when needed' },
      { value: 3, label: 'Balance both' },
      { value: 4, label: 'Prefer harmony, tolerate some conflict' },
      { value: 5, label: 'Strongly prioritize harmony' },
    ],
  },

  // Big Five - Neuroticism (2 questions)
  {
    id: 'n1',
    category: 'neuroticism',
    text: 'When facing uncertainty, do you feel energized or anxious?',
    options: [
      { value: 1, label: 'Very energized by uncertainty' },
      { value: 2, label: 'Generally energized' },
      { value: 3, label: 'Neutral / depends' },
      { value: 4, label: 'Somewhat anxious' },
      { value: 5, label: 'Very anxious about uncertainty' },
    ],
  },
  {
    id: 'n2',
    category: 'neuroticism',
    text: 'After a setback, how quickly do you bounce back to baseline?',
    options: [
      { value: 1, label: 'Very quickly, within hours' },
      { value: 2, label: 'Within a day or two' },
      { value: 3, label: 'A few days' },
      { value: 4, label: 'A week or more' },
      { value: 5, label: 'Takes a long time to recover' },
    ],
  },

  // Work Style (4 questions)
  {
    id: 'w1',
    category: 'workstyle',
    text: 'Do you do your best work in long uninterrupted blocks or short energetic bursts?',
    options: [
      { value: 1, label: 'Long deep work blocks (4+ hours)' },
      { value: 2, label: 'Medium blocks (2-3 hours)' },
      { value: 3, label: 'Mix of both' },
      { value: 4, label: 'Shorter focused sessions' },
      { value: 5, label: 'Short energetic bursts' },
    ],
  },
  {
    id: 'w2',
    category: 'workstyle',
    text: 'Do you prefer to go deep on one thing or juggle multiple projects?',
    options: [
      { value: 1, label: 'Strongly prefer one thing at a time' },
      { value: 2, label: 'Prefer focus, can handle 2-3' },
      { value: 3, label: 'Comfortable either way' },
      { value: 4, label: 'Prefer multiple projects' },
      { value: 5, label: 'Thrive juggling many things' },
    ],
  },
  {
    id: 'w3',
    category: 'workstyle',
    text: 'When making big decisions, do you rely more on data/analysis or intuition/gut?',
    options: [
      { value: 1, label: 'Almost entirely data-driven' },
      { value: 2, label: 'Mostly data, some intuition' },
      { value: 3, label: 'Equal mix' },
      { value: 4, label: 'Mostly intuition, some data' },
      { value: 5, label: 'Almost entirely gut/intuition' },
    ],
  },
  {
    id: 'w4',
    category: 'workstyle',
    text: 'Do you decide quickly and adjust, or deliberate thoroughly before committing?',
    options: [
      { value: 1, label: 'Decide very quickly, adjust often' },
      { value: 2, label: 'Decide fairly quickly' },
      { value: 3, label: 'Moderate deliberation' },
      { value: 4, label: 'Deliberate carefully' },
      { value: 5, label: 'Very thorough before committing' },
    ],
  },

  // Founder-Specific (5 questions)
  {
    id: 'f1',
    category: 'founder',
    text: 'Would you rather have a 20% chance at $1M or a certain $100k?',
    options: [
      { value: 5, label: 'Definitely the 20% shot at $1M' },
      { value: 4, label: 'Probably the $1M chance' },
      { value: 3, label: 'Hard to say, truly torn' },
      { value: 2, label: 'Probably the certain $100k' },
      { value: 1, label: 'Definitely the certain $100k' },
    ],
  },
  {
    id: 'f2',
    category: 'founder',
    text: 'Do you think in 10-year arcs or 90-day cycles?',
    options: [
      { value: 5, label: '10+ year vision' },
      { value: 4, label: '3-5 year horizon' },
      { value: 3, label: '1-2 year planning' },
      { value: 2, label: 'Quarterly focus' },
      { value: 1, label: 'Week-to-week / 90-day sprints' },
    ],
  },
  {
    id: 'f3',
    category: 'founder',
    text: 'Would you rather build a small profitable business or swing for a billion-dollar outcome?',
    options: [
      { value: 1, label: 'Definitely small and profitable' },
      { value: 2, label: 'Lean toward smaller' },
      { value: 3, label: 'Open to either' },
      { value: 4, label: 'Lean toward big swing' },
      { value: 5, label: 'Definitely billion-dollar outcome' },
    ],
  },
  {
    id: 'f4',
    category: 'founder',
    text: 'If you could only do ONE thing, would it be: product, sales, ops, or strategy?',
    options: [
      { value: 1, label: 'Product - building the thing' },
      { value: 2, label: 'Sales - talking to customers' },
      { value: 3, label: 'Ops - making things run smoothly' },
      { value: 4, label: 'Strategy - planning the path' },
    ],
  },
  {
    id: 'f5',
    category: 'founder',
    text: 'What matters more: freedom/autonomy or impact/scale?',
    options: [
      { value: 1, label: 'Strongly freedom/autonomy' },
      { value: 2, label: 'Lean toward freedom' },
      { value: 3, label: 'Value both equally' },
      { value: 4, label: 'Lean toward impact' },
      { value: 5, label: 'Strongly impact/scale' },
    ],
  },
]

export const categoryLabels: Record<Question['category'], string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Emotional Stability',
  workstyle: 'Work Style',
  founder: 'Founder DNA',
}

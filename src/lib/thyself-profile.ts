import { Question } from './thyself-questions'

export interface Answers {
  [questionId: string]: number
}

export interface BigFiveScores {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

export interface Profile {
  bigFive: BigFiveScores
  dalioArchetype: {
    primary: string
    secondary: string
    description: string
  }
  disc: {
    primary: string
    secondary: string
    description: string
  }
  founderType: {
    type: string
    description: string
    strengths: string[]
    gaps: string[]
  }
  businessFit: {
    best: string[]
    ok: string[]
    avoid: string[]
  }
  workStyle: {
    energySources: string[]
    energyDrains: string[]
    decisionStyle: string
    focusPattern: string
  }
  cofounderNeeds: string[]
}

export function calculateProfile(answers: Answers, questions: Question[]): Profile {
  // Calculate Big Five scores (0-100)
  const bigFive = calculateBigFive(answers, questions)

  // Determine archetypes
  const dalioArchetype = determineDalioArchetype(bigFive, answers)
  const disc = determineDISC(bigFive, answers)
  const founderType = determineFounderType(bigFive, answers)

  // Business fit recommendations
  const businessFit = determineBusinessFit(bigFive, answers)

  // Work style analysis
  const workStyle = analyzeWorkStyle(answers)

  // Co-founder needs
  const cofounderNeeds = determineCofounderNeeds(bigFive, founderType)

  return {
    bigFive,
    dalioArchetype,
    disc,
    founderType,
    businessFit,
    workStyle,
    cofounderNeeds,
  }
}

function calculateBigFive(answers: Answers, questions: Question[]): BigFiveScores {
  const categories = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const

  const scores: BigFiveScores = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0,
  }

  for (const category of categories) {
    const categoryQuestions = questions.filter(q => q.category === category)
    const categoryAnswers = categoryQuestions.map(q => answers[q.id] || 3)
    const avg = categoryAnswers.reduce((a, b) => a + b, 0) / categoryAnswers.length
    // Convert 1-5 scale to 0-100
    scores[category] = Math.round(((avg - 1) / 4) * 100)
  }

  // Invert neuroticism to show "emotional stability" (high = stable)
  scores.neuroticism = 100 - scores.neuroticism

  return scores
}

function determineDalioArchetype(bigFive: BigFiveScores, answers: Answers): Profile['dalioArchetype'] {
  // Shaper: High openness, low agreeableness, low neuroticism (high stability)
  // Creator: High openness, moderate conscientiousness
  // Advancer: High conscientiousness, moderate extraversion
  // Facilitator: High extraversion, high agreeableness
  // Implementer: High conscientiousness, lower openness
  // Strategist: High conscientiousness, high openness, lower extraversion

  const archetypeScores = {
    Shaper: (bigFive.openness * 0.3) + ((100 - bigFive.agreeableness) * 0.3) + (bigFive.neuroticism * 0.4),
    Creator: (bigFive.openness * 0.5) + (bigFive.conscientiousness * 0.2) + ((100 - bigFive.neuroticism) * 0.3),
    Advancer: (bigFive.conscientiousness * 0.4) + (bigFive.extraversion * 0.3) + (bigFive.neuroticism * 0.3),
    Facilitator: (bigFive.extraversion * 0.4) + (bigFive.agreeableness * 0.4) + ((100 - bigFive.neuroticism) * 0.2),
    Implementer: (bigFive.conscientiousness * 0.5) + ((100 - bigFive.openness) * 0.3) + (bigFive.neuroticism * 0.2),
    Strategist: (bigFive.conscientiousness * 0.3) + (bigFive.openness * 0.3) + ((100 - bigFive.extraversion) * 0.4),
  }

  const sorted = Object.entries(archetypeScores).sort((a, b) => b[1] - a[1])
  const primary = sorted[0][0]
  const secondary = sorted[1][0]

  const descriptions: Record<string, string> = {
    Shaper: 'You push through obstacles and drive change. Independent-minded and determined.',
    Creator: 'You generate ideas and see the big picture. Imaginative and conceptual.',
    Advancer: 'You get things done reliably. Persistent and execution-focused.',
    Facilitator: 'You bring people together and build consensus. Collaborative and empathetic.',
    Implementer: 'You follow through on details. Thorough and quality-focused.',
    Strategist: 'You think systematically about the long term. Analytical and planful.',
  }

  return {
    primary,
    secondary,
    description: descriptions[primary],
  }
}

function determineDISC(bigFive: BigFiveScores, answers: Answers): Profile['disc'] {
  // D (Dominance): Low agreeableness, low neuroticism, high extraversion
  // I (Influence): High extraversion, high agreeableness
  // S (Steadiness): High agreeableness, high conscientiousness, low openness
  // C (Conscientiousness): High conscientiousness, low extraversion

  const discScores = {
    D: ((100 - bigFive.agreeableness) * 0.4) + (bigFive.neuroticism * 0.3) + (bigFive.extraversion * 0.3),
    I: (bigFive.extraversion * 0.5) + (bigFive.openness * 0.3) + ((100 - bigFive.conscientiousness) * 0.2),
    S: (bigFive.agreeableness * 0.4) + ((100 - bigFive.openness) * 0.3) + (bigFive.conscientiousness * 0.3),
    C: (bigFive.conscientiousness * 0.5) + ((100 - bigFive.extraversion) * 0.3) + ((100 - bigFive.openness) * 0.2),
  }

  const sorted = Object.entries(discScores).sort((a, b) => b[1] - a[1])
  const primary = sorted[0][0]
  const secondary = sorted[1][0]

  const descriptions: Record<string, string> = {
    D: 'Results-focused, direct, and decisive. You drive toward outcomes.',
    I: 'Enthusiastic, persuasive, and optimistic. You influence through energy.',
    S: 'Patient, reliable, and team-oriented. You create stability.',
    C: 'Analytical, precise, and quality-focused. You ensure accuracy.',
  }

  return {
    primary,
    secondary,
    description: descriptions[primary],
  }
}

function determineFounderType(bigFive: BigFiveScores, answers: Answers): Profile['founderType'] {
  // The Visionary: High O, High E, Low C
  // The Operator: High C, Low O, High S (stability)
  // The Hustler: High E, High D (low A), Low C
  // The Craftsman: High C, Low E, High O
  // The Analyst: High C, Low A, Low E
  // The Community Builder: High E, High A, High O

  const founderRole = answers['f4'] || 1 // 1=product, 2=sales, 3=ops, 4=strategy
  const riskTolerance = answers['f1'] || 3
  const timeHorizon = answers['f2'] || 3
  const scalePreference = answers['f3'] || 3

  const typeScores = {
    Visionary: (bigFive.openness * 0.4) + (bigFive.extraversion * 0.3) + ((100 - bigFive.conscientiousness) * 0.3),
    Operator: (bigFive.conscientiousness * 0.4) + ((100 - bigFive.openness) * 0.3) + (bigFive.neuroticism * 0.3),
    Hustler: (bigFive.extraversion * 0.4) + ((100 - bigFive.agreeableness) * 0.3) + ((100 - bigFive.conscientiousness) * 0.3),
    Craftsman: (bigFive.conscientiousness * 0.3) + ((100 - bigFive.extraversion) * 0.3) + (bigFive.openness * 0.4),
    Analyst: (bigFive.conscientiousness * 0.4) + ((100 - bigFive.agreeableness) * 0.3) + ((100 - bigFive.extraversion) * 0.3),
    'Community Builder': (bigFive.extraversion * 0.4) + (bigFive.agreeableness * 0.3) + (bigFive.openness * 0.3),
  }

  // Adjust based on founder-specific answers
  if (founderRole === 1) typeScores.Craftsman += 15
  if (founderRole === 2) typeScores.Hustler += 15
  if (founderRole === 3) typeScores.Operator += 15
  if (founderRole === 4) typeScores.Analyst += 10

  if (riskTolerance >= 4) {
    typeScores.Visionary += 10
    typeScores.Hustler += 10
  }
  if (timeHorizon >= 4) typeScores.Visionary += 10
  if (scalePreference >= 4) typeScores.Visionary += 10
  if (scalePreference <= 2) {
    typeScores.Craftsman += 10
    typeScores.Operator += 10
  }

  const sorted = Object.entries(typeScores).sort((a, b) => b[1] - a[1])
  const type = sorted[0][0]

  const typeDetails: Record<string, { description: string; strengths: string[]; gaps: string[] }> = {
    Visionary: {
      description: 'Big swing, vision-driven. You see the future and rally others to it.',
      strengths: ['Vision and storytelling', 'Inspiring teams', 'Seeing market opportunities'],
      gaps: ['May need COO for execution', 'Can overlook details', 'Impatient with process'],
    },
    Operator: {
      description: 'Execution machine. You make complex things run smoothly.',
      strengths: ['Reliability and consistency', 'Process optimization', 'Risk management'],
      gaps: ['May miss innovation opportunities', 'Can be risk-averse', 'Less natural at vision-selling'],
    },
    Hustler: {
      description: 'Sales-driven energy. You open doors and close deals.',
      strengths: ['Customer acquisition', 'Networking', 'Persuasion and energy'],
      gaps: ['May need product partner', 'Can over-commit', 'Less patient with building'],
    },
    Craftsman: {
      description: 'Product-obsessed builder. You create things of quality.',
      strengths: ['Deep product thinking', 'Quality and craft', 'Technical depth'],
      gaps: ['May avoid sales/marketing', 'Can over-engineer', 'Needs help scaling'],
    },
    Analyst: {
      description: 'Data-driven strategist. You find the optimal path.',
      strengths: ['Strategic thinking', 'Data analysis', 'Risk assessment'],
      gaps: ['May over-analyze', 'Can be slow to act', 'Less natural at selling'],
    },
    'Community Builder': {
      description: 'People-first leader. You build tribes and movements.',
      strengths: ['Community and culture', 'Partnerships', 'User empathy'],
      gaps: ['May avoid hard decisions', 'Can prioritize harmony over results', 'Needs help with ops'],
    },
  }

  return {
    type,
    ...typeDetails[type],
  }
}

function determineBusinessFit(bigFive: BigFiveScores, answers: Answers): Profile['businessFit'] {
  const best: string[] = []
  const ok: string[] = []
  const avoid: string[] = []

  const scalePreference = answers['f3'] || 3
  const riskTolerance = answers['f1'] || 3
  const founderRole = answers['f4'] || 1

  // Revenue models
  if (bigFive.conscientiousness > 60) best.push('Subscription SaaS')
  else ok.push('Subscription SaaS')

  if (bigFive.extraversion > 60 && bigFive.agreeableness < 50) best.push('High-ticket sales')
  else if (bigFive.extraversion > 40) ok.push('High-ticket sales')
  else avoid.push('High-ticket sales')

  if (founderRole === 1 || bigFive.openness > 60) best.push('Product-led growth')
  else ok.push('Product-led growth')

  // Business types
  if (scalePreference <= 2 && bigFive.conscientiousness > 50) best.push('Bootstrapped/profitable')
  else ok.push('Bootstrapped/profitable')

  if (riskTolerance >= 4 && scalePreference >= 4) best.push('VC-backed startup')
  else if (riskTolerance >= 3) ok.push('VC-backed startup')
  else avoid.push('VC-backed startup')

  if (bigFive.extraversion > 60) best.push('Agency/services')
  else if (bigFive.extraversion > 40) ok.push('Agency/services')
  else avoid.push('Agency/services')

  // Customer types
  if (bigFive.conscientiousness > 60 && bigFive.extraversion > 40) best.push('B2B Enterprise')
  else if (bigFive.conscientiousness > 50) ok.push('B2B Enterprise')
  else avoid.push('B2B Enterprise')

  if (bigFive.openness > 60) best.push('B2C Consumer')
  else ok.push('B2C Consumer')

  return { best, ok, avoid }
}

function analyzeWorkStyle(answers: Answers): Profile['workStyle'] {
  const focusStyle = answers['w1'] || 3
  const multiTasking = answers['w2'] || 3
  const decisionMode = answers['w3'] || 3
  const decisionSpeed = answers['w4'] || 3

  const energySources: string[] = []
  const energyDrains: string[] = []

  if (focusStyle <= 2) {
    energySources.push('Deep, uninterrupted work blocks')
    energyDrains.push('Constant context switching')
  } else if (focusStyle >= 4) {
    energySources.push('Variety and quick wins')
    energyDrains.push('Long monotonous tasks')
  }

  if (multiTasking <= 2) {
    energySources.push('Single-project focus')
    energyDrains.push('Juggling too many things')
  } else if (multiTasking >= 4) {
    energySources.push('Multiple projects in flight')
    energyDrains.push('Being limited to one thing')
  }

  const decisionStyle = decisionMode <= 2
    ? 'Data-driven - you want evidence before committing'
    : decisionMode >= 4
      ? 'Intuition-led - you trust your gut and adjust'
      : 'Balanced - you use both data and intuition'

  const focusPattern = focusStyle <= 2
    ? 'Deep work - long uninterrupted sessions'
    : focusStyle >= 4
      ? 'Sprint work - short intense bursts'
      : 'Flexible - adapts to the task'

  return {
    energySources,
    energyDrains,
    decisionStyle,
    focusPattern,
  }
}

function determineCofounderNeeds(bigFive: BigFiveScores, founderType: Profile['founderType']): string[] {
  const needs: string[] = []

  if (bigFive.conscientiousness < 50) {
    needs.push('Someone highly organized to handle ops and process')
  }
  if (bigFive.extraversion < 40) {
    needs.push('An outgoing partner for sales and partnerships')
  }
  if (bigFive.openness < 40) {
    needs.push('A creative thinker for product vision and innovation')
  }
  if (bigFive.agreeableness > 70) {
    needs.push('Someone comfortable with tough decisions and conflict')
  }
  if (bigFive.neuroticism < 40) {
    needs.push('A detail-oriented partner who catches risks early')
  }

  // Based on founder type gaps
  if (founderType.type === 'Visionary') {
    needs.push('An execution-focused COO or operator')
  }
  if (founderType.type === 'Craftsman') {
    needs.push('A sales/marketing partner to get the word out')
  }
  if (founderType.type === 'Analyst') {
    needs.push('A bias-to-action partner who moves fast')
  }

  return needs.slice(0, 3) // Top 3 needs
}

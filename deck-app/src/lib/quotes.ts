// Funny startup & fundraising quotes for loading screens
// Add more anytime - they rotate randomly

export const LOADING_QUOTES = [
  // === FOUNDER QUOTES (Real) ===
  { text: "Starting a company is like eating glass and staring into the abyss of death.", author: "Elon Musk" },
  { text: "If you're not embarrassed by the first version, you launched too late.", author: "Reid Hoffman" },
  { text: "The way to get startup ideas is not to try to think of startup ideas.", author: "Paul Graham" },
  { text: "Ideas are easy. Implementation is hard.", author: "Guy Kawasaki" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { text: "Make something people want.", author: "Y Combinator" },
  { text: "It's fine to celebrate success but it is more important to heed the lessons of failure.", author: "Bill Gates" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },

  // === YC WISDOM ===
  { text: "Talk to users and build product. That's basically all you need to do.", author: "YC Mantra" },
  { text: "Do things that don't scale.", author: "Paul Graham" },
  { text: "Launch early and iterate.", author: "Y Combinator" },
  { text: "Make a small number of users love you rather than a large number kind of like you.", author: "Paul Graham" },
  { text: "Startups don't die, they commit suicide.", author: "Paul Graham" },
  { text: "The best way to predict the future is to create it.", author: "YC Philosophy" },
  { text: "Work on hard problems. If you're solving an easy problem, you'll have lots of competition.", author: "Sam Altman" },
  { text: "Growth solves everything.", author: "YC Wisdom" },
  { text: "The most important thing is to not die.", author: "Paul Graham" },
  { text: "Default alive or default dead?", author: "Paul Graham" },

  // === PITCH SPECIFIC ===
  { text: "The best pitch decks are written while crying into cold coffee at 2am.", author: "Every Founder Ever" },
  { text: "10 slides. 20 minutes. 30-point font. 0 chance you'll follow these rules.", author: "Guy Kawasaki" },
  { text: "Your TAM slide is a lie and everyone knows it. Make it a beautiful lie.", author: "Honest Advisors" },
  { text: "If you can explain it to your grandmother, you can explain it to investors.", author: "The Mom Test" },
  { text: "A good deck is like a miniskirt: short enough to be interesting, long enough to cover the essentials.", author: "Allegedly Churchill" },

  // === VC REALITY ===
  { text: "Investors say 'interesting' when they mean 'I'm going to pass but politely'.", author: "Decoded VC-Speak" },
  { text: "Your projections are wrong. But at least make them confidently wrong.", author: "Every VC" },
  { text: "Behind every successful pitch is 99 that got ghosted.", author: "The Math" },
  { text: "VCs have 100 reasons to say no and only need one.", author: "Bitter Experience" },
  { text: "'We're excited to pass' is the fundraising equivalent of 'it's not you, it's me'.", author: "Rejection Letters" },
  { text: "A warm intro is just a cold email with extra steps.", author: "Networking 101" },

  // === ELON MUSK COLLECTION ===
  { text: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk" },
  { text: "Failure is an option here. If things are not failing, you are not innovating enough.", author: "Elon Musk" },
  { text: "I think it's possible for ordinary people to choose to be extraordinary.", author: "Elon Musk" },
  { text: "Persistence is very important. You should not give up unless you are forced to give up.", author: "Elon Musk" },
  { text: "If you get up in the morning and think the future is going to be better, it's a bright day.", author: "Elon Musk" },

  // === STARTUP LIFE (Humor) ===
  { text: "The first rule of Pitch Club: always be fundraising. The second rule: pretend you're not.", author: "Fight Club for Founders" },
  { text: "In the startup world, 'we're pre-revenue' is Latin for 'we have no money'.", author: "Startup Latin" },
  { text: "Pivoting is just failing with better PR.", author: "Honest Founder" },
  { text: "Product-market fit is like love: hard to define, but you know it when you find it.", author: "Startup Wisdom" },
  { text: "The only thing that spreads faster than a startup's burn rate is its founder's optimism.", author: "CFO Reality" },
  { text: "Move fast and break things. Except your pitch deck. Don't break that.", author: "Modified Zuck" },

  // === MILITARY WISDOM APPLIED ===
  { text: "No pitch survives first contact with a partner meeting.", author: "Startup von Moltke" },
  { text: "In preparing for fundraising, plans are useless, but planning is indispensable.", author: "Startup Eisenhower" },
  { text: "We shall pitch on the beaches, we shall never surrender our cap table.", author: "Startup Churchill" },

  // === TECH INDUSTRY ===
  { text: "Software is eating the world. VCs are eating the software companies.", author: "Modified Andreessen" },
  { text: "The best time to raise was 2021. The second best time is now, I guess.", author: "Post-ZIRP Wisdom" },
  { text: "We're not a tech company, we're a tech-enabled... okay fine, we're a tech company.", author: "Every D2C Brand" },

  // === FUNDRAISING MATH ===
  { text: "Raising at a $10M valuation means convincing someone your napkin math is worth $10M.", author: "Angel Math" },
  { text: "Pre-money, post-money, no-money - the three stages of fundraising.", author: "Finance 101" },
  { text: "Your runway is always 18 months. Even when it's 6.", author: "Founder Optimism" },

  // === SELF-AWARE ===
  { text: "This loading screen is brought to you by someone who should be working on product.", author: "The Developer" },
  { text: "Every second you wait here, an AI is getting slightly more powerful.", author: "Anthropic, Probably" },
  { text: "Making your pitch deck is like making sausage. Don't show them how.", author: "Kitchen Wisdom" },
]

// Get a random quote
export const getRandomQuote = () => {
  return LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]
}

// Get quotes in random order (for cycling)
export const getShuffledQuotes = () => {
  return [...LOADING_QUOTES].sort(() => Math.random() - 0.5)
}

/**
 * Navis Health P13nAI Pitch Deck - Google Apps Script
 *
 * INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Paste this entire script
 * 4. Click Run → Run function → createNavisPitchDeck
 * 5. Authorize the script when prompted
 * 6. The deck will be created in your Google Drive
 *
 * Note: Images are loaded from navis.health - make sure they're publicly accessible
 */

function createNavisPitchDeck() {
  // Create a new presentation
  const presentation = SlidesApp.create('Navis Health - P13nAI Pitch Deck');
  const slides = presentation.getSlides();

  // Remove the default blank slide
  if (slides.length > 0) {
    slides[0].remove();
  }

  // Base URL for images
  const baseUrl = 'https://navis.health/pitchAssets/';

  // Color palette
  const colors = {
    navyBlue: '#0057FF',
    darkNavy: '#003399',
    darkestNavy: '#001a4d',
    slate800: '#1e293b',
    slate700: '#334155',
    slate600: '#475569',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate100: '#f1f5f9',
    slate50: '#f8fafc',
    white: '#FFFFFF',
    emerald400: '#34d399',
    emerald600: '#059669',
    blue400: '#60a5fa',
    blue600: '#2563eb',
    purple400: '#a78bfa',
    purple600: '#9333ea',
    amber400: '#fbbf24',
    red400: '#f87171',
    orange400: '#fb923c',
    yellow400: '#facc15',
    cyan400: '#22d3d1',
    green400: '#4ade80',
  };

  // ========== SLIDE 1: Title ==========
  createTitleSlide(presentation, colors, baseUrl);

  // ========== SLIDE 2: Problem (Human) ==========
  createProblemHumanSlide(presentation, colors, baseUrl);

  // ========== SLIDE 3: Problem (Market Gap) ==========
  createMarketGapSlide(presentation, colors, baseUrl);

  // ========== SLIDE 4: 10x Better ==========
  create10xBetterSlide(presentation, colors);

  // ========== SLIDE 5: Why Now ==========
  createWhyNowSlide(presentation, colors);

  // ========== SLIDE 6: Solution ==========
  createSolutionSlide(presentation, colors, baseUrl);

  // ========== SLIDE 7: Before/After ==========
  createBeforeAfterSlide(presentation, colors, baseUrl);

  // ========== SLIDE 8: Live Product ==========
  createLiveProductSlide(presentation, colors, baseUrl);

  // ========== SLIDE 9: Trust Architecture ==========
  createTrustArchitectureSlide(presentation, colors);

  // ========== SLIDE 10: Why Navis Wins ==========
  createWhyNavisWinsSlide(presentation, colors);

  // ========== SLIDE 11: Market ==========
  createMarketSlide(presentation, colors);

  // ========== SLIDE 12: GTM Strategy ==========
  createGTMStrategySlide(presentation, colors);

  // ========== SLIDE 13: GTM Step 1 ==========
  createGTMStep1Slide(presentation, colors, baseUrl);

  // ========== SLIDE 14: GTM Step 2 ==========
  createGTMStep2Slide(presentation, colors);

  // ========== SLIDE 15: Distribution ==========
  createDistributionSlide(presentation, colors, baseUrl);

  // ========== SLIDE 16: Partner Value ==========
  createPartnerValueSlide(presentation, colors);

  // ========== SLIDE 17: Team ==========
  createTeamSlide(presentation, colors, baseUrl);

  // ========== SLIDE 18: Traction & Ask ==========
  createTractionAskSlide(presentation, colors);

  // ========== APPENDIX DIVIDER ==========
  createAppendixDivider(presentation, colors);

  // ========== APPENDIX SLIDES ==========
  createAppendixCommunities(presentation, colors, baseUrl);
  createAppendixNetworkEffects(presentation, colors, baseUrl);
  createAppendixTractionDetails(presentation, colors);
  createAppendixTestimonials(presentation, colors, baseUrl);

  Logger.log('Presentation created: ' + presentation.getUrl());
  return presentation.getUrl();
}

// ========== SLIDE CREATION FUNCTIONS ==========

function createTitleSlide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);

  // Background gradient (solid color approximation)
  slide.getBackground().setSolidFill(colors.navyBlue);

  // Logo - use JPEG version (SVGs don't work with Google Slides)
  try {
    const logoUrl = baseUrl + 'navisLogo-better.jpeg';
    slide.insertImage(logoUrl, 220, 100, 280, 280);
  } catch (e) {
    Logger.log('Could not load logo: ' + e);
    // Fallback: add text placeholder
    const logoPlaceholder = slide.insertTextBox('NAVIS', 200, 150, 320, 100);
    logoPlaceholder.getText().getTextStyle()
      .setForegroundColor(colors.white)
      .setFontSize(72)
      .setBold(true)
      .setFontFamily('Inter');
    logoPlaceholder.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // Title
  const title = slide.insertTextBox('Navis Health AI', 50, 420, 620, 80);
  title.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(48)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Subtitle
  const subtitle = slide.insertTextBox('The Trusted Navigation Layer\nfor Cancer Care', 50, 500, 620, 80);
  subtitle.getText().getTextStyle()
    .setForegroundColor('#93c5fd')
    .setFontSize(24)
    .setBold(true)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

function createProblemHumanSlide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate800);

  // Title
  const title = slide.insertTextBox('A Cancer Diagnosis Changes Everything', 30, 20, 660, 50);
  title.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(32)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Image
  try {
    slide.insertImage(baseUrl + 'prob2.jpg', 30, 80, 360, 270);
  } catch (e) {
    Logger.log('Could not load image: ' + e);
  }

  // Stats
  const stats = [
    { value: '20M', color: colors.red400, text: 'Americans living with cancer' },
    { value: '40%', color: colors.orange400, text: "can't name their diagnosis" },
    { value: '70%', color: colors.yellow400, text: 'search online within 24 hours' }
  ];

  let yPos = 90;
  stats.forEach(stat => {
    const statBox = slide.insertTextBox(stat.value + ' ' + stat.text, 410, yPos, 290, 50);
    statBox.getText().getTextStyle()
      .setForegroundColor(colors.white)
      .setFontSize(16)
      .setFontFamily('Inter');
    yPos += 60;
  });

  // Quote box
  const quote = slide.insertTextBox('"My doctor gave me 10 minutes. Google gave me 10 million results. Who do I trust?"', 410, 280, 290, 70);
  quote.getText().getTextStyle()
    .setForegroundColor('#94a3b8')
    .setFontSize(14)
    .setItalic(true)
    .setFontFamily('Inter');

  // Slide number
  addSlideNumber(slide, '2', colors.white);
}

function createMarketGapSlide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate100);

  // Title
  const title = slide.insertTextBox('Drowning in Information, Starving for Clarity', 20, 30, 680, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.slate800)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Four cards - adjusted for better vertical distribution
  const cards = [
    { label: 'Rabbit holes', pct: '77%', title: '"Dr. Google"', desc: 'Primary first step for symptom validation' },
    { label: 'Messy, Jargon', pct: '68%', title: 'Patient Portals', desc: 'Trusted hub for test results' },
    { label: 'Noisy, Anecdotal', pct: '45%', title: 'Social Support', desc: 'Critical for lived experience advice' },
    { label: 'Black box', pct: '21%', title: 'AI & Chatbots', desc: 'Emerging tool to translate jargon' }
  ];

  let xPos = 25;
  cards.forEach(card => {
    // Card background - shorter height (200 instead of 260)
    const cardBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, 90, 160, 200);
    cardBg.getFill().setSolidFill(colors.white);
    cardBg.getBorder().setWeight(1).getLineFill().setSolidFill('#e2e8f0');

    // Label
    const label = slide.insertTextBox(card.label, xPos + 10, 100, 140, 25);
    label.getText().getTextStyle()
      .setForegroundColor(colors.red400)
      .setFontSize(12)
      .setBold(true)
      .setFontFamily('Inter');
    label.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Percentage
    const pct = slide.insertTextBox(card.pct, xPos + 10, 130, 140, 50);
    pct.getText().getTextStyle()
      .setForegroundColor(colors.slate800)
      .setFontSize(36)
      .setBold(true)
      .setFontFamily('Inter');
    pct.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Title
    const cardTitle = slide.insertTextBox(card.title, xPos + 10, 185, 140, 30);
    cardTitle.getText().getTextStyle()
      .setForegroundColor(colors.slate700)
      .setFontSize(14)
      .setBold(true)
      .setFontFamily('Inter');
    cardTitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Description
    const desc = slide.insertTextBox(card.desc, xPos + 10, 220, 140, 50);
    desc.getText().getTextStyle()
      .setForegroundColor(colors.slate500)
      .setFontSize(10)
      .setFontFamily('Inter');
    desc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    xPos += 170;
  });

  addSlideNumber(slide, '3', colors.slate500);
}

function create10xBetterSlide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate700);

  // Title
  const title = slide.insertTextBox('Navis is 10x better', 50, 80, 620, 60);
  title.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(48)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Subtitle
  const subtitle = slide.insertTextBox('Clear guidance in minutes.', 50, 150, 620, 40);
  subtitle.getText().getTextStyle()
    .setForegroundColor(colors.emerald400)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Four pillars
  const pillars = [
    { title: 'Patient-first', desc: 'Built for patients, not portals', color: colors.yellow400 },
    { title: 'Trustable', desc: 'NCCN guidelines + MD oversight', color: colors.green400 },
    { title: 'Organic growth', desc: 'Via communities, advocacy orgs', color: colors.blue400 },
    { title: 'Personalized', desc: 'Your case, your context', color: colors.purple400 }
  ];

  let xPos = 40;
  pillars.forEach(pillar => {
    const pillarTitle = slide.insertTextBox(pillar.title, xPos, 220, 150, 30);
    pillarTitle.getText().getTextStyle()
      .setForegroundColor(pillar.color)
      .setFontSize(20)
      .setBold(true)
      .setFontFamily('Inter');
    pillarTitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const pillarDesc = slide.insertTextBox(pillar.desc, xPos, 255, 150, 40);
    pillarDesc.getText().getTextStyle()
      .setForegroundColor('#cbd5e1')
      .setFontSize(14)
      .setFontFamily('Inter');
    pillarDesc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    xPos += 160;
  });

  addSlideNumber(slide, '4', colors.white);
}

function createWhyNowSlide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('The Trusted Layer Above All AI Models', 30, 30, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(32)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Subtitle
  const subtitle = slide.insertTextBox('Delivering value from accelerating innovation: safely, privately, clinically grounded.', 30, 75, 660, 30);
  subtitle.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(16)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Stats box background
  const statsBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 80, 120, 560, 130);
  statsBg.getFill().setSolidFill('#eff6ff');
  statsBg.getBorder().setWeight(2).getLineFill().setSolidFill('#93c5fd');

  // 1 in 5 stat
  const stat1 = slide.insertTextBox('1 in 5', 100, 140, 180, 50);
  stat1.getText().getTextStyle()
    .setForegroundColor(colors.blue600)
    .setFontSize(48)
    .setBold(true)
    .setFontFamily('Inter');
  stat1.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const stat1Desc = slide.insertTextBox('cancer patients use AI today', 100, 190, 180, 30);
  stat1Desc.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(14)
    .setFontFamily('Inter');
  stat1Desc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Arrow
  const arrow = slide.insertTextBox('→', 300, 150, 40, 40);
  arrow.getText().getTextStyle()
    .setForegroundColor(colors.slate500)
    .setFontSize(36)
    .setFontFamily('Inter');

  // 4 in 5 stat
  const stat2 = slide.insertTextBox('4 in 5', 360, 140, 180, 50);
  stat2.getText().getTextStyle()
    .setForegroundColor(colors.purple600)
    .setFontSize(48)
    .setBold(true)
    .setFontFamily('Inter');
  stat2.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const stat2Desc = slide.insertTextBox('expected within 3 years', 360, 190, 180, 30);
  stat2Desc.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(14)
    .setFontFamily('Inter');
  stat2Desc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Source
  const source = slide.insertTextBox('JAMA Oncology 2024, McKinsey Healthcare AI Survey', 80, 225, 560, 20);
  source.getText().getTextStyle()
    .setForegroundColor(colors.slate500)
    .setFontSize(10)
    .setItalic(true)
    .setFontFamily('Inter');
  source.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Bottom banner
  const banner = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 80, 280, 560, 50);
  banner.getFill().setSolidFill(colors.slate800);

  const bannerText = slide.insertTextBox('No one owns the trust layer with patients. Yet.', 80, 292, 560, 30);
  bannerText.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(20)
    .setBold(true)
    .setFontFamily('Inter');
  bannerText.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  addSlideNumber(slide, '5', colors.slate500);
}

function createSolutionSlide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Navis: The Patient Navigation System', 30, 20, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(32)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Subtitle
  const subtitle = slide.insertTextBox('Upload → Understand → Decide → Act', 30, 60, 660, 30);
  subtitle.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(18)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Navis Wheel image
  try {
    slide.insertImage(baseUrl + 'navisWheel.jpg', 110, 100, 500, 250);
  } catch (e) {
    Logger.log('Could not load navisWheel: ' + e);
    const placeholder = slide.insertTextBox('[Navis Wheel Diagram]', 110, 180, 500, 60);
    placeholder.getText().getTextStyle()
      .setForegroundColor(colors.slate500)
      .setFontSize(24)
      .setFontFamily('Inter');
    placeholder.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  addSlideNumber(slide, '6', colors.slate500);
}

function createBeforeAfterSlide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('From Confusion to Clarity in Minutes', 30, 15, 660, 35);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Left label
  const leftLabel = slide.insertTextBox('1. Personalize', 30, 55, 250, 25);
  leftLabel.getText().getTextStyle()
    .setForegroundColor(colors.blue600)
    .setFontSize(14)
    .setBold(true)
    .setFontFamily('Inter');
  leftLabel.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Left image
  try {
    slide.insertImage(baseUrl + 'p13n1b.jpg', 30, 85, 250, 180);
  } catch (e) {
    Logger.log('Could not load p13n1b: ' + e);
  }

  // Arrow
  const arrow = slide.insertTextBox('→', 295, 160, 40, 40);
  arrow.getText().getTextStyle()
    .setForegroundColor(colors.slate400)
    .setFontSize(36)
    .setFontFamily('Inter');

  // Right label
  const rightLabel = slide.insertTextBox('2. Get personalized gaps, opportunities, education', 350, 55, 350, 25);
  rightLabel.getText().getTextStyle()
    .setForegroundColor(colors.emerald600)
    .setFontSize(14)
    .setBold(true)
    .setFontFamily('Inter');
  rightLabel.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Right image
  try {
    slide.insertImage(baseUrl + 'p13nf.jpg', 350, 85, 350, 200);
  } catch (e) {
    Logger.log('Could not load p13nf: ' + e);
  }

  addSlideNumber(slide, '7', colors.slate500);
}

function createLiveProductSlide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate50);

  // Title
  const title = slide.insertTextBox("Live Today, Already in Patients' Hands", 30, 20, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(32)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Screenshot - use chatAINavis.jpg
  try {
    slide.insertImage(baseUrl + 'chatAINavis.jpg', 80, 70, 560, 200);
  } catch (e) {
    Logger.log('Could not load screenshot: ' + e);
  }

  // Demo button/link
  const demoBtn = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 220, 285, 280, 45);
  demoBtn.getFill().setSolidFill(colors.blue600);

  const demoText = slide.insertTextBox('▶ Watch 5-Minute Demo', 220, 295, 280, 30);
  demoText.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(16)
    .setBold(true)
    .setFontFamily('Inter');
  demoText.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Demo link note
  const linkNote = slide.insertTextBox('loom.com/share/365b963e781e485d90a700709c54147c', 80, 340, 560, 20);
  linkNote.getText().getTextStyle()
    .setForegroundColor(colors.slate500)
    .setFontSize(10)
    .setFontFamily('Inter');
  linkNote.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  addSlideNumber(slide, '8', colors.slate500);
}

function createTrustArchitectureSlide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Trust Stack: Why Patients Believe Us', 30, 20, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Four trust cards
  const cards = [
    { title: 'Guideline Engine', desc: 'NCCN + ASCO grounded', bgColor: '#eff6ff', borderColor: '#93c5fd' },
    { title: 'Retrieval-First', desc: 'No hallucinations, RAG architecture', bgColor: '#ecfdf5', borderColor: '#6ee7b7' },
    { title: 'MD Oversight', desc: 'Safety rails + clinical review', bgColor: '#faf5ff', borderColor: '#c4b5fd' },
    { title: 'Secure Vault', desc: 'Encrypted, HIPAA, de-identified PHI', bgColor: '#fffbeb', borderColor: '#fcd34d' }
  ];

  let xPos = 30;
  cards.forEach(card => {
    const cardBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, xPos, 75, 155, 110);
    cardBg.getFill().setSolidFill(card.bgColor);
    cardBg.getBorder().setWeight(2).getLineFill().setSolidFill(card.borderColor);

    const cardTitle = slide.insertTextBox(card.title, xPos + 10, 95, 135, 30);
    cardTitle.getText().getTextStyle()
      .setForegroundColor(colors.slate800)
      .setFontSize(14)
      .setBold(true)
      .setFontFamily('Inter');
    cardTitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const cardDesc = slide.insertTextBox(card.desc, xPos + 10, 130, 135, 40);
    cardDesc.getText().getTextStyle()
      .setForegroundColor(colors.slate600)
      .setFontSize(11)
      .setFontFamily('Inter');
    cardDesc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    xPos += 165;
  });

  // Model Router box
  const routerBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 180, 210, 360, 80);
  routerBg.getFill().setSolidFill('#eff6ff');
  routerBg.getBorder().setWeight(3).getLineFill().setSolidFill('#93c5fd');

  const routerTitle = slide.insertTextBox('Model Router', 180, 225, 360, 30);
  routerTitle.getText().getTextStyle()
    .setForegroundColor(colors.slate800)
    .setFontSize(18)
    .setBold(true)
    .setFontFamily('Inter');
  routerTitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const routerDesc = slide.insertTextBox('Frontier-model-agnostic layer: best model per query', 180, 255, 360, 25);
  routerDesc.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(12)
    .setFontFamily('Inter');
  routerDesc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  addSlideNumber(slide, '9', colors.slate500);
}

function createWhyNavisWinsSlide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Patient-First Is Our Moat', 30, 20, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(32)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Four pillars
  const pillars = [
    { emoji: '🏥', title: "Incumbents Can't Follow", desc: 'Epic serves hospitals. We serve patients.', bgColor: '#eff6ff', borderColor: '#93c5fd' },
    { emoji: '📚', title: 'Clinical Grounding', desc: 'NCCN + ASCO guidelines, not hallucinations', bgColor: '#ecfdf5', borderColor: '#6ee7b7' },
    { emoji: '🔗', title: 'Cross-System', desc: 'Patients own their data. Works across any health system.', bgColor: '#faf5ff', borderColor: '#c4b5fd' },
    { emoji: '🤝', title: 'Community Trust', desc: 'Embedded in advocacy orgs patients already trust', bgColor: '#fffbeb', borderColor: '#fcd34d' }
  ];

  let xPos = 30;
  pillars.forEach(pillar => {
    const cardBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, xPos, 75, 155, 130);
    cardBg.getFill().setSolidFill(pillar.bgColor);
    cardBg.getBorder().setWeight(2).getLineFill().setSolidFill(pillar.borderColor);

    const emoji = slide.insertTextBox(pillar.emoji, xPos + 10, 85, 135, 30);
    emoji.getText().getTextStyle().setFontSize(24);
    emoji.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const cardTitle = slide.insertTextBox(pillar.title, xPos + 10, 115, 135, 35);
    cardTitle.getText().getTextStyle()
      .setForegroundColor(colors.slate800)
      .setFontSize(12)
      .setBold(true)
      .setFontFamily('Inter');
    cardTitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const cardDesc = slide.insertTextBox(pillar.desc, xPos + 10, 150, 135, 45);
    cardDesc.getText().getTextStyle()
      .setForegroundColor(colors.slate600)
      .setFontSize(9)
      .setFontFamily('Inter');
    cardDesc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    xPos += 165;
  });

  // Bottom banner
  const banner = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 30, 225, 660, 50);
  banner.getFill().setSolidFill(colors.slate800);
  banner.getBorder().setWeight(2).getLineFill().setSolidFill(colors.blue400);

  const bannerText = slide.insertTextBox('Every patient interaction makes Navis smarter and harder to replicate', 30, 238, 660, 30);
  bannerText.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(16)
    .setBold(true)
    .setFontFamily('Inter');
  bannerText.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  addSlideNumber(slide, '10', colors.slate500);
}

function createMarketSlide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate800);

  // Title
  const title = slide.insertTextBox('$120B Market: Navis Sits at the Moment of Decision', 20, 15, 680, 35);
  title.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(24)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Subtitle
  const subtitle = slide.insertTextBox('Trusted guidance unlocks every major cancer decision', 20, 50, 680, 25);
  subtitle.getText().getTextStyle()
    .setForegroundColor('#94a3b8')
    .setFontSize(14)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Market segments
  const segments = [
    { value: '$30B', title: 'Out-of-Pocket Care', desc: 'Second opinions, integrative care', color: colors.emerald400 },
    { value: '$20B', title: 'Diagnostics', desc: 'Testing, biomarkers', color: colors.blue400 },
    { value: '$15B', title: 'Navigation', desc: 'Trials, care coordination', color: colors.purple400 },
    { value: '$80B', title: 'Treatment Decisions', desc: 'Therapy choices, protocols', color: colors.amber400 }
  ];

  let xPos = 30;
  segments.forEach(seg => {
    const cardBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, xPos, 85, 155, 120);
    cardBg.getFill().setSolidFill('#334155');
    cardBg.getBorder().setWeight(2).getLineFill().setSolidFill(seg.color);

    const value = slide.insertTextBox(seg.value, xPos + 10, 95, 135, 35);
    value.getText().getTextStyle()
      .setForegroundColor(seg.color)
      .setFontSize(28)
      .setBold(true)
      .setFontFamily('Inter');
    value.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const segTitle = slide.insertTextBox(seg.title, xPos + 10, 130, 135, 25);
    segTitle.getText().getTextStyle()
      .setForegroundColor('#e2e8f0')
      .setFontSize(12)
      .setFontFamily('Inter');
    segTitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const desc = slide.insertTextBox(seg.desc, xPos + 10, 155, 135, 35);
    desc.getText().getTextStyle()
      .setForegroundColor('#94a3b8')
      .setFontSize(10)
      .setItalic(true)
      .setFontFamily('Inter');
    desc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    xPos += 165;
  });

  // Insight box
  const insightBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 80, 220, 560, 40);
  insightBg.getFill().setSolidFill('#1e3a5f');
  insightBg.getBorder().setWeight(1).getLineFill().setSolidFill('#60a5fa');

  const insight = slide.insertTextBox('Navis is where patients choose treatments, services, and providers', 80, 230, 560, 25);
  insight.getText().getTextStyle()
    .setForegroundColor('#e2e8f0')
    .setFontSize(14)
    .setFontFamily('Inter');
  insight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Sources
  const sources = slide.insertTextBox('Sources: CMS, KFF, IQVIA, Grand View Research, ASCO, Deloitte, JAMA (2023-2024)', 20, 275, 680, 20);
  sources.getText().getTextStyle()
    .setForegroundColor('#64748b')
    .setFontSize(8)
    .setFontFamily('Inter');
  sources.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  addSlideNumber(slide, '11', colors.white);
}

function createGTMStrategySlide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate800);

  // Title
  const title = slide.insertTextBox('Our GTM Strategy', 50, 50, 620, 50);
  title.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(36)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Three steps
  const steps = [
    { num: '1', title: 'Prove Patient Value', desc: 'Deliver clarity, trust, and meaningful help', color: colors.blue400 },
    { num: '2', title: 'Prove Patient Adoption', desc: 'LLM tailwinds, advocacy communities, caregiver virality', color: colors.emerald400 },
    { num: '3', title: 'Prove Partner Value', desc: 'Qualified patient actions at near-zero CAC', color: colors.purple400 }
  ];

  let xPos = 50;
  steps.forEach((step, idx) => {
    const cardBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, xPos, 130, 180, 150);
    cardBg.getFill().setSolidFill('#334155');
    cardBg.getBorder().setWeight(2).getLineFill().setSolidFill(step.color);

    const num = slide.insertTextBox(step.num, xPos + 10, 145, 160, 40);
    num.getText().getTextStyle()
      .setForegroundColor(step.color)
      .setFontSize(32)
      .setBold(true)
      .setFontFamily('Inter');
    num.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const stepTitle = slide.insertTextBox(step.title, xPos + 10, 185, 160, 30);
    stepTitle.getText().getTextStyle()
      .setForegroundColor('#e2e8f0')
      .setFontSize(14)
      .setBold(true)
      .setFontFamily('Inter');
    stepTitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const desc = slide.insertTextBox(step.desc, xPos + 10, 215, 160, 50);
    desc.getText().getTextStyle()
      .setForegroundColor('#94a3b8')
      .setFontSize(10)
      .setItalic(true)
      .setFontFamily('Inter');
    desc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Arrow between steps
    if (idx < 2) {
      const arrow = slide.insertTextBox('→', xPos + 190, 190, 30, 30);
      arrow.getText().getTextStyle()
        .setForegroundColor('#64748b')
        .setFontSize(24)
        .setFontFamily('Inter');
    }

    xPos += 210;
  });

  addSlideNumber(slide, '12', colors.white);
}

function createGTMStep1Slide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Patients Trust Us', 30, 20, 660, 35);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // GTM nav indicator
  const navBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 250, 55, 180, 28);
  navBg.getFill().setSolidFill('#dbeafe');
  navBg.getBorder().setWeight(2).getLineFill().setSolidFill('#60a5fa');

  const navText = slide.insertTextBox('1. Prove Patient Value', 250, 59, 180, 22);
  navText.getText().getTextStyle()
    .setForegroundColor(colors.blue600)
    .setFontSize(11)
    .setBold(true)
    .setFontFamily('Inter');
  navText.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Testimonials image - larger and better positioned
  try {
    slide.insertImage(baseUrl + 'testimonialPatients.jpg', 30, 100, 420, 220);
  } catch (e) {
    Logger.log('Could not load testimonials: ' + e);
  }

  // Right side stats - repositioned
  const stat1Bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 470, 100, 220, 70);
  stat1Bg.getFill().setSolidFill('#dbeafe');
  stat1Bg.getBorder().setWeight(2).getLineFill().setSolidFill('#93c5fd');

  const stat1 = slide.insertTextBox('60%', 470, 108, 220, 35);
  stat1.getText().getTextStyle()
    .setForegroundColor(colors.blue600)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  stat1.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const stat1Desc = slide.insertTextBox('Adoption intent from pilot users (n=20)', 470, 143, 220, 22);
  stat1Desc.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(10)
    .setFontFamily('Inter');
  stat1Desc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Quote box - repositioned
  const quoteBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 470, 185, 220, 135);
  quoteBg.getFill().setSolidFill('#eff6ff');
  quoteBg.getBorder().setWeight(2).getLineFill().setSolidFill('#93c5fd');

  const quote = slide.insertTextBox('"I\'ve been using Navis AI almost daily... All [my doctors] seem to be in agreement with this current treatment."', 480, 195, 200, 80);
  quote.getText().getTextStyle()
    .setForegroundColor(colors.slate700)
    .setFontSize(11)
    .setItalic(true)
    .setFontFamily('Inter');

  const quoteSrc = slide.insertTextBox('— Cancer Patient, Daily Active User', 480, 285, 200, 25);
  quoteSrc.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(10)
    .setBold(true)
    .setFontFamily('Inter');

  addSlideNumber(slide, '13', colors.slate500);
}

function createGTMStep2Slide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate50);

  // Title
  const title = slide.insertTextBox('Cancer Is Communal. Growth Is Organic.', 30, 20, 660, 35);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(26)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const subtitle = slide.insertTextBox("Today's tools treat cancer as single-player. Navis makes it a team sport.", 30, 55, 660, 22);
  subtitle.getText().getTextStyle()
    .setForegroundColor(colors.slate500)
    .setFontSize(13)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // GTM nav indicator
  const navBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 250, 85, 160, 28);
  navBg.getFill().setSolidFill('#d1fae5');
  navBg.getBorder().setWeight(2).getLineFill().setSolidFill('#6ee7b7');

  const navText = slide.insertTextBox('2. Prove Adoption', 250, 89, 160, 22);
  navText.getText().getTextStyle()
    .setForegroundColor(colors.emerald600)
    .setFontSize(11)
    .setBold(true)
    .setFontFamily('Inter');
  navText.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Three steps - taller boxes to fill space
  const steps = [
    { title: '1. Ride the LLM Wave', desc: '20% of patients use AI today; 80% expected within 3-5 years.', bgColor: '#dbeafe', borderColor: '#93c5fd' },
    { title: '2. Embed into Trusted Communities', desc: 'Co-branded AI support through advocacy orgs patients already trust.', bgColor: '#d1fae5', borderColor: '#6ee7b7' },
    { title: '3. Organic Sharing', desc: 'Patients share Navis with spouses, children, siblings. Every trusted share is growth at zero CAC.', bgColor: '#f3e8ff', borderColor: '#c4b5fd' }
  ];

  let yPos = 125;
  steps.forEach(step => {
    const stepBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 50, yPos, 620, 65);
    stepBg.getFill().setSolidFill(step.bgColor);
    stepBg.getBorder().setWeight(2).getLineFill().setSolidFill(step.borderColor);

    const stepTitle = slide.insertTextBox(step.title, 65, yPos + 10, 590, 22);
    stepTitle.getText().getTextStyle()
      .setForegroundColor(colors.slate800)
      .setFontSize(15)
      .setBold(true)
      .setFontFamily('Inter');

    const stepDesc = slide.insertTextBox(step.desc, 65, yPos + 35, 590, 25);
    stepDesc.getText().getTextStyle()
      .setForegroundColor(colors.slate600)
      .setFontSize(12)
      .setFontFamily('Inter');

    yPos += 75;
  });

  addSlideNumber(slide, '14', colors.slate500);
}

function createDistributionSlide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate50);

  // Title
  const title = slide.insertTextBox('Access to 30K-50K Patients via Current Partners', 20, 15, 680, 30);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(24)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Partner cards
  const partners = [
    { name: 'Cancer Patient Lab', type: 'Community', reach: '5K+ members', status: 'Pilot Live', statusColor: colors.emerald600, borderColor: '#93c5fd' },
    { name: 'AnCan', type: 'Community', reach: '10K+ reach', status: 'LOI', statusColor: colors.blue600, borderColor: '#6ee7b7' },
    { name: 'Cancer Commons', type: 'Navigation', reach: '15K+ patients', status: 'LOI', statusColor: colors.blue600, borderColor: '#c4b5fd' },
    { name: 'Protean', type: 'Precision Testing', reach: '10K+ tests/yr', status: 'Pilot Live', statusColor: colors.emerald600, borderColor: '#fcd34d' },
    { name: 'Viitals', type: 'Provider / EMR', reach: '10K+ patients', status: 'LOI', statusColor: colors.blue600, borderColor: '#5eead4' }
  ];

  let xPos = 30;
  partners.forEach(partner => {
    const cardBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, xPos, 60, 125, 130);
    cardBg.getFill().setSolidFill(colors.white);
    cardBg.getBorder().setWeight(2).getLineFill().setSolidFill(partner.borderColor);

    const name = slide.insertTextBox(partner.name, xPos + 5, 70, 115, 30);
    name.getText().getTextStyle()
      .setForegroundColor(colors.slate800)
      .setFontSize(11)
      .setBold(true)
      .setFontFamily('Inter');
    name.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const type = slide.insertTextBox(partner.type, xPos + 5, 98, 115, 18);
    type.getText().getTextStyle()
      .setForegroundColor(colors.slate500)
      .setFontSize(9)
      .setFontFamily('Inter');
    type.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const reach = slide.insertTextBox(partner.reach, xPos + 5, 118, 115, 18);
    reach.getText().getTextStyle()
      .setForegroundColor(colors.slate600)
      .setFontSize(10)
      .setFontFamily('Inter');
    reach.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const status = slide.insertTextBox(partner.status, xPos + 5, 145, 115, 18);
    status.getText().getTextStyle()
      .setForegroundColor(partner.statusColor)
      .setFontSize(10)
      .setBold(true)
      .setFontFamily('Inter');
    status.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    xPos += 135;
  });

  // Logos image
  try {
    slide.insertImage(baseUrl + 'logos.jpg', 180, 210, 360, 60);
  } catch (e) {
    Logger.log('Could not load logos: ' + e);
  }

  addSlideNumber(slide, '15', colors.slate500);
}

function createPartnerValueSlide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Why Partners Pay Us', 30, 20, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(32)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // GTM nav indicator
  const navBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 250, 60, 180, 28);
  navBg.getFill().setSolidFill('#f3e8ff');
  navBg.getBorder().setWeight(2).getLineFill().setSolidFill('#c4b5fd');

  const navText = slide.insertTextBox('3. Prove Partner Value', 250, 64, 180, 22);
  navText.getText().getTextStyle()
    .setForegroundColor(colors.purple600)
    .setFontSize(11)
    .setBold(true)
    .setFontFamily('Inter');
  navText.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Left column - Value Exchange - larger
  const valueBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 30, 105, 330, 130);
  valueBg.getFill().setSolidFill('#ecfdf5');
  valueBg.getBorder().setWeight(2).getLineFill().setSolidFill('#6ee7b7');

  const valueTitle = slide.insertTextBox('The Value Exchange', 45, 115, 300, 25);
  valueTitle.getText().getTextStyle()
    .setForegroundColor(colors.emerald600)
    .setFontSize(16)
    .setBold(true)
    .setFontFamily('Inter');

  const valueDesc = slide.insertTextBox('Personalized guidance + patient-initiated decisions = high-quality referrals at near-zero CAC', 45, 145, 300, 45);
  valueDesc.getText().getTextStyle()
    .setForegroundColor(colors.slate700)
    .setFontSize(12)
    .setFontFamily('Inter');

  const formula = slide.insertTextBox('↑Volume × ↑Conversion − ↓Costs', 45, 195, 300, 28);
  formula.getText().getTextStyle()
    .setForegroundColor(colors.slate700)
    .setFontSize(16)
    .setBold(true)
    .setFontFamily('Inter');

  // Right column - Revenue by Scale - larger
  const revBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 375, 105, 315, 130);
  revBg.getFill().setSolidFill(colors.white);
  revBg.getBorder().setWeight(2).getLineFill().setSolidFill('#e2e8f0');

  const revTitle = slide.insertTextBox('Revenue by Scale', 390, 115, 285, 25);
  revTitle.getText().getTextStyle()
    .setForegroundColor(colors.slate800)
    .setFontSize(16)
    .setBold(true)
    .setFontFamily('Inter');

  const revTable = slide.insertTextBox(
    '1K-10K: Trial leads ($1-2K/lead)\n' +
    '10K-50K: + Sponsored content → $10-25K/mo\n' +
    '100K+: + CPM ads ($15-30) → $20-60K/mo',
    390, 145, 285, 80
  );
  revTable.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(12)
    .setFontFamily('Inter');

  // Bottom banner - repositioned
  const banner = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 30, 255, 660, 50);
  banner.getFill().setSolidFill(colors.purple600);

  const bannerText = slide.insertTextBox('Same formula, multiple revenue streams — all patient-initiated, high-intent', 30, 268, 660, 28);
  bannerText.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(14)
    .setBold(true)
    .setFontFamily('Inter');
  bannerText.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  addSlideNumber(slide, '16', colors.slate500);
}

function createTeamSlide(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate50);

  // Title
  const title = slide.insertTextBox('Survivors × Clinical Experts × Product Leaders', 30, 15, 660, 35);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(26)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Team image
  try {
    slide.insertImage(baseUrl + 'teamslide.jpg', 40, 60, 640, 240);
  } catch (e) {
    Logger.log('Could not load team slide: ' + e);
    const placeholder = slide.insertTextBox('[Team Photo/Slide]', 40, 150, 640, 60);
    placeholder.getText().getTextStyle()
      .setForegroundColor(colors.slate500)
      .setFontSize(24)
      .setFontFamily('Inter');
    placeholder.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  addSlideNumber(slide, '17', colors.slate500);
}

function createTractionAskSlide(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('From Early Proof to Series A Ready', 30, 10, 660, 32);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Ask
  const ask = slide.insertTextBox('$500K SAFE @ $5M cap', 30, 42, 660, 25);
  ask.getText().getTextStyle()
    .setForegroundColor(colors.blue600)
    .setFontSize(18)
    .setBold(true)
    .setFontFamily('Inter');
  ask.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Three milestone boxes
  const milestones = [
    { title: '1. Prove Patient Value', metrics: ['10K-15K', 'registered patients', '5K+', 'monthly active users'], bgColor: '#dbeafe', borderColor: '#60a5fa', titleColor: colors.blue600 },
    { title: '2. Prove Adoption', metrics: ['50K+', 'patient access via partners', '', 'Organic adoption via LLM tailwinds, advocacy orgs'], bgColor: '#d1fae5', borderColor: '#34d399', titleColor: colors.emerald600 },
    { title: '3. Prove Partner Value', metrics: ['5-7', 'live, revenue-linked partners', '', 'Line of sight to $1M+ ARR'], bgColor: '#f3e8ff', borderColor: '#a78bfa', titleColor: colors.purple600 }
  ];

  let xPos = 25;
  milestones.forEach(m => {
    const cardBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, xPos, 75, 220, 130);
    cardBg.getFill().setSolidFill(m.bgColor);
    cardBg.getBorder().setWeight(2).getLineFill().setSolidFill(m.borderColor);

    const mTitle = slide.insertTextBox(m.title, xPos + 10, 82, 200, 20);
    mTitle.getText().getTextStyle()
      .setForegroundColor(m.titleColor)
      .setFontSize(11)
      .setBold(true)
      .setFontFamily('Inter');

    const metric1 = slide.insertTextBox(m.metrics[0], xPos + 10, 105, 200, 28);
    metric1.getText().getTextStyle()
      .setForegroundColor(colors.slate800)
      .setFontSize(22)
      .setBold(true)
      .setFontFamily('Inter');

    const metric1Desc = slide.insertTextBox(m.metrics[1], xPos + 10, 130, 200, 18);
    metric1Desc.getText().getTextStyle()
      .setForegroundColor(colors.slate600)
      .setFontSize(10)
      .setFontFamily('Inter');

    if (m.metrics[2]) {
      const metric2 = slide.insertTextBox(m.metrics[2], xPos + 10, 150, 200, 22);
      metric2.getText().getTextStyle()
        .setForegroundColor(colors.slate800)
        .setFontSize(18)
        .setBold(true)
        .setFontFamily('Inter');
    }

    const metric2Desc = slide.insertTextBox(m.metrics[3], xPos + 10, 168, 200, 30);
    metric2Desc.getText().getTextStyle()
      .setForegroundColor(colors.slate600)
      .setFontSize(9)
      .setFontFamily('Inter');

    xPos += 230;
  });

  // Use of funds
  const funds = slide.insertTextBox('Use of funds: Product depth · Team expansion · Distribution partnerships', 30, 215, 660, 20);
  funds.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(12)
    .setFontFamily('Inter');
  funds.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Investors
  const investors = slide.insertTextBox('Backed by operators from: Greylock · PayPal · Figma · Flurry · Outlier AI · TBD Angels', 30, 245, 660, 22);
  investors.getText().getTextStyle()
    .setForegroundColor(colors.slate500)
    .setFontSize(14)
    .setFontFamily('Inter');
  investors.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  addSlideNumber(slide, '18', colors.slate500);
}

function createAppendixDivider(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.slate800);

  const title = slide.insertTextBox('Appendix', 50, 140, 620, 80);
  title.getText().getTextStyle()
    .setForegroundColor(colors.white)
    .setFontSize(64)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const subtitle = slide.insertTextBox('Additional context & technical details', 50, 220, 620, 40);
  subtitle.getText().getTextStyle()
    .setForegroundColor('#94a3b8')
    .setFontSize(20)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  addSlideNumber(slide, 'A', colors.white);
}

function createAppendixCommunities(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Trusted Communities Drive Low-Cost Acquisition', 30, 15, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Left image placeholder - CPL Distribution
  try {
    slide.insertImage(baseUrl + 'CPLdistribution.jpg', 30, 70, 380, 260);
  } catch (e) {
    Logger.log('Could not load CPLdistribution: ' + e);
    const placeholder = slide.insertTextBox('[CPL Distribution Strategy]', 30, 150, 380, 60);
    placeholder.getText().getTextStyle().setForegroundColor(colors.slate500).setFontSize(18);
    placeholder.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // Right side - Invite flow
  try {
    slide.insertImage(baseUrl + 'invite.jpg', 430, 70, 270, 120);
  } catch (e) {
    Logger.log('Could not load invite: ' + e);
  }

  // Right side - CPL feed
  try {
    slide.insertImage(baseUrl + 'cpl-feed.jpg', 430, 200, 270, 130);
  } catch (e) {
    Logger.log('Could not load cpl-feed: ' + e);
  }

  addSlideNumber(slide, 'A2', colors.slate500);
}

function createAppendixNetworkEffects(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Each Patient Makes Navis Smarter', 30, 15, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(32)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Quote box
  const quoteBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 60, 65, 600, 60);
  quoteBg.getFill().setSolidFill('#f3e8ff');
  quoteBg.getBorder().setWeight(3).getLineFill().setSolidFill('#c4b5fd');

  const quote = slide.insertTextBox('"Every record uploaded increases precision and engagement to build a compounding data network."', 70, 80, 580, 40);
  quote.getText().getTextStyle()
    .setForegroundColor(colors.slate800)
    .setFontSize(16)
    .setFontFamily('Inter');
  quote.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Flywheel image
  try {
    slide.insertImage(baseUrl + 'loop2.jpg', 100, 140, 520, 200);
  } catch (e) {
    Logger.log('Could not load flywheel: ' + e);
    const placeholder = slide.insertTextBox('[Flywheel / Network Effects Diagram]', 100, 200, 520, 60);
    placeholder.getText().getTextStyle().setForegroundColor(colors.slate500).setFontSize(20);
    placeholder.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  addSlideNumber(slide, 'A3', colors.slate500);
}

function createAppendixTractionDetails(presentation, colors) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Traction Details', 30, 10, 660, 35);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(28)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Subtitle
  const subtitle = slide.insertTextBox('5 Partners, 60% Adoption Intent, Daily Usage', 30, 42, 660, 22);
  subtitle.getText().getTextStyle()
    .setForegroundColor(colors.slate500)
    .setFontSize(14)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Left column - Metrics
  const metrics = [
    { value: '60%', desc: 'Adoption intent from pilot users', bgColor: '#dbeafe', borderColor: '#93c5fd', textColor: colors.blue600 },
    { value: '5 Partners in 3 Months', desc: 'From cold start to live pilots', bgColor: '#d1fae5', borderColor: '#6ee7b7', textColor: colors.emerald600 },
    { value: 'Bootstrapped', desc: 'Shipping daily, weekly patient webinars', bgColor: '#f3e8ff', borderColor: '#c4b5fd', textColor: colors.purple600 }
  ];

  let yPos = 75;
  metrics.forEach(metric => {
    const metricBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 30, yPos, 310, 60);
    metricBg.getFill().setSolidFill(metric.bgColor);
    metricBg.getBorder().setWeight(2).getLineFill().setSolidFill(metric.borderColor);

    const value = slide.insertTextBox(metric.value, 40, yPos + 8, 290, 28);
    value.getText().getTextStyle()
      .setForegroundColor(metric.textColor)
      .setFontSize(20)
      .setBold(true)
      .setFontFamily('Inter');

    const desc = slide.insertTextBox(metric.desc, 40, yPos + 35, 290, 20);
    desc.getText().getTextStyle()
      .setForegroundColor(colors.slate600)
      .setFontSize(11)
      .setFontFamily('Inter');

    yPos += 70;
  });

  // Right column - Testimonials
  const quote1Bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 360, 75, 330, 100);
  quote1Bg.getFill().setSolidFill('#dbeafe');
  quote1Bg.getBorder().setWeight(3).getLineFill().setSolidFill('#60a5fa');

  const quote1 = slide.insertTextBox('"I\'ve been using Navis AI almost daily... All [my doctors] seem to be in agreement with this current treatment."', 370, 82, 310, 55);
  quote1.getText().getTextStyle()
    .setForegroundColor(colors.slate800)
    .setFontSize(11)
    .setItalic(true)
    .setFontFamily('Inter');

  const quote1Src = slide.insertTextBox('— Cancer Patient, Daily Active User', 370, 140, 310, 20);
  quote1Src.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(10)
    .setBold(true)
    .setFontFamily('Inter');

  const quote2Bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 360, 185, 330, 90);
  quote2Bg.getFill().setSolidFill('#f1f5f9');
  quote2Bg.getBorder().setWeight(2).getLineFill().setSolidFill('#6ee7b7');

  const quote2 = slide.insertTextBox('"NAVIS brings all documents into one place where multiple experts can communicate and support the patient."', 370, 192, 310, 50);
  quote2.getText().getTextStyle()
    .setForegroundColor(colors.slate800)
    .setFontSize(11)
    .setItalic(true)
    .setFontFamily('Inter');

  const quote2Src = slide.insertTextBox('— Kaumudi Bhawe, PhD, CancerCommons', 370, 245, 310, 20);
  quote2Src.getText().getTextStyle()
    .setForegroundColor(colors.slate600)
    .setFontSize(10)
    .setBold(true)
    .setFontFamily('Inter');

  addSlideNumber(slide, 'A4', colors.slate500);
}

function createAppendixTestimonials(presentation, colors, baseUrl) {
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(colors.white);

  // Title
  const title = slide.insertTextBox('Patient Testimonials', 30, 15, 660, 40);
  title.getText().getTextStyle()
    .setForegroundColor(colors.navyBlue)
    .setFontSize(32)
    .setBold(true)
    .setFontFamily('Inter');
  title.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Subtitle
  const subtitle = slide.insertTextBox('Patients with Cancer Trust Navis', 30, 55, 660, 25);
  subtitle.getText().getTextStyle()
    .setForegroundColor(colors.slate500)
    .setFontSize(16)
    .setFontFamily('Inter');
  subtitle.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Full testimonials image
  try {
    slide.insertImage(baseUrl + 'testimonialPatients.jpg', 60, 90, 600, 250);
  } catch (e) {
    Logger.log('Could not load testimonials: ' + e);
    const placeholder = slide.insertTextBox('[Patient Testimonials Image]', 60, 180, 600, 60);
    placeholder.getText().getTextStyle().setForegroundColor(colors.slate500).setFontSize(20);
    placeholder.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  addSlideNumber(slide, 'A5', colors.slate500);
}

// Helper function to add slide numbers
function addSlideNumber(slide, number, color) {
  const slideNum = slide.insertTextBox(number, 670, 360, 30, 20);
  slideNum.getText().getTextStyle()
    .setForegroundColor(color)
    .setFontSize(12)
    .setFontFamily('Inter');
}

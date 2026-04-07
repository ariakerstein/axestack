/**
 * Navis Deck Sync - Figma Slides Plugin
 *
 * Imports JSON deck content from HTML source into Figma Slides.
 * Preserves design while updating content.
 */

// Show the UI
figma.showUI(__html__, { width: 450, height: 600 });

// Theme colors from Navis deck
const COLORS = {
  white: { r: 1, g: 1, b: 1 },
  slate900: { r: 0.12, g: 0.14, b: 0.18 },
  slate800: { r: 0.18, g: 0.20, b: 0.25 },
  slate600: { r: 0.42, g: 0.45, b: 0.51 },
  slate400: { r: 0.58, g: 0.62, b: 0.69 },
  emerald500: { r: 0.06, g: 0.73, b: 0.51 },
  emerald400: { r: 0.20, g: 0.83, b: 0.60 },
  blue500: { r: 0.23, g: 0.51, b: 0.96 },
  blue400: { r: 0.38, g: 0.65, b: 0.96 },
  red500: { r: 0.94, g: 0.27, b: 0.27 },
  amber500: { r: 0.96, g: 0.62, b: 0.04 },
  purple500: { r: 0.66, g: 0.33, b: 0.97 },
};

// Font styles
const FONTS = {
  heading: { family: "Inter", style: "Bold" },
  body: { family: "Inter", style: "Regular" },
  semibold: { family: "Inter", style: "Semi Bold" },
};

interface DeckContent {
  metadata: {
    id: string;
    title: string;
    version: string;
  };
  theme: {
    colors: Record<string, string>;
    fonts: Record<string, string>;
  };
  slides: SlideContent[];
}

interface SlideContent {
  id: number;
  type: string;
  label?: string;
  background: "light" | "dark" | "gradient";
  content: {
    headline?: string;
    subheadline?: string;
    body?: string;
    bullets?: string[];
    stats?: Array<{ value: string; label: string; sublabel?: string }>;
    images?: Array<{ src: string; alt: string }>;
    team?: Array<{ name: string; title: string; credentials: string; photo: string }>;
  };
}

// Handle messages from UI
figma.ui.onmessage = async (msg: { type: string; content?: DeckContent; slideId?: number }) => {
  if (msg.type === "import-deck" && msg.content) {
    await importDeck(msg.content);
  } else if (msg.type === "update-slide" && msg.content && msg.slideId) {
    await updateSlide(msg.content, msg.slideId);
  } else if (msg.type === "cancel") {
    figma.closePlugin();
  }
};

async function importDeck(deck: DeckContent) {
  // Check if we're in Slides
  if (figma.editorType !== "slides") {
    figma.notify("This plugin only works in Figma Slides", { error: true });
    return;
  }

  await figma.loadFontAsync(FONTS.heading);
  await figma.loadFontAsync(FONTS.body);
  await figma.loadFontAsync(FONTS.semibold);

  figma.notify(`Importing ${deck.slides.length} slides...`);

  for (const slideContent of deck.slides) {
    await createSlide(slideContent);
  }

  figma.notify(`Imported ${deck.slides.length} slides from "${deck.metadata.title}"`, { timeout: 3000 });

  figma.ui.postMessage({ type: "import-complete", slideCount: deck.slides.length });
}

async function createSlide(content: SlideContent): Promise<SlideNode> {
  const slide = figma.createSlide();

  // Set background color based on theme
  if (content.background === "dark" || content.background === "gradient") {
    slide.fills = [{ type: "SOLID", color: COLORS.slate900 }];
  } else {
    slide.fills = [{ type: "SOLID", color: COLORS.white }];
  }

  const textColor = content.background === "light" ? COLORS.slate900 : COLORS.white;
  const mutedColor = content.background === "light" ? COLORS.slate600 : COLORS.slate400;

  // Layout positions (1920x1080 slide)
  const MARGIN = 80;
  const TOP_MARGIN = 100;
  let yOffset = TOP_MARGIN;

  // Add section label if present
  if (content.label) {
    const label = figma.createText();
    label.fontName = FONTS.semibold;
    label.fontSize = 14;
    label.characters = content.label.toUpperCase();
    label.fills = [{ type: "SOLID", color: mutedColor }];
    label.letterSpacing = { value: 4, unit: "PIXELS" };
    label.x = MARGIN;
    label.y = 50;
    slide.appendChild(label);
  }

  // Add headline
  if (content.content.headline) {
    const headline = figma.createText();
    headline.fontName = FONTS.heading;
    headline.fontSize = getHeadlineFontSize(content.type);
    headline.characters = content.content.headline;
    headline.fills = [{ type: "SOLID", color: textColor }];
    headline.textAutoResize = "WIDTH_AND_HEIGHT";
    headline.x = MARGIN;
    headline.y = yOffset;

    // Center title slides
    if (content.type === "title" || content.type === "ask") {
      headline.textAlignHorizontal = "CENTER";
      headline.x = (1920 - headline.width) / 2;
      headline.y = 400;
      yOffset = headline.y + headline.height + 20;
    } else {
      yOffset = headline.y + headline.height + 30;
    }

    slide.appendChild(headline);
  }

  // Add subheadline
  if (content.content.subheadline) {
    const subheadline = figma.createText();
    subheadline.fontName = FONTS.body;
    subheadline.fontSize = 24;
    subheadline.characters = content.content.subheadline;
    subheadline.fills = [{ type: "SOLID", color: content.type === "title" ? COLORS.emerald400 : mutedColor }];
    subheadline.x = MARGIN;
    subheadline.y = yOffset;

    if (content.type === "title") {
      subheadline.textAlignHorizontal = "CENTER";
      subheadline.x = (1920 - subheadline.width) / 2;
    }

    slide.appendChild(subheadline);
    yOffset = subheadline.y + subheadline.height + 40;
  }

  // Add stats
  if (content.content.stats && content.content.stats.length > 0) {
    const statsFrame = figma.createFrame();
    statsFrame.layoutMode = "HORIZONTAL";
    statsFrame.primaryAxisSizingMode = "AUTO";
    statsFrame.counterAxisSizingMode = "AUTO";
    statsFrame.itemSpacing = 60;
    statsFrame.fills = [];
    statsFrame.x = MARGIN;
    statsFrame.y = yOffset;

    for (const stat of content.content.stats) {
      const statBlock = createStatBlock(stat, content.background);
      statsFrame.appendChild(statBlock);
    }

    slide.appendChild(statsFrame);
    yOffset = statsFrame.y + statsFrame.height + 40;
  }

  // Add bullets
  if (content.content.bullets && content.content.bullets.length > 0) {
    let bulletY = yOffset;
    for (const bullet of content.content.bullets) {
      const bulletText = figma.createText();
      bulletText.fontName = FONTS.body;
      bulletText.fontSize = 20;
      bulletText.characters = `• ${bullet}`;
      bulletText.fills = [{ type: "SOLID", color: textColor }];
      bulletText.x = MARGIN + 20;
      bulletText.y = bulletY;
      slide.appendChild(bulletText);
      bulletY += 36;
    }
  }

  // Add slide number
  const slideNum = figma.createText();
  slideNum.fontName = FONTS.body;
  slideNum.fontSize = 14;
  slideNum.characters = String(content.id);
  slideNum.fills = [{ type: "SOLID", color: mutedColor }];
  slideNum.x = 1920 - MARGIN - 20;
  slideNum.y = 1080 - 50;
  slide.appendChild(slideNum);

  return slide;
}

function getHeadlineFontSize(slideType: string): number {
  switch (slideType) {
    case "title":
      return 72;
    case "ask":
      return 96;
    case "appendix":
      return 80;
    default:
      return 48;
  }
}

function createStatBlock(stat: { value: string; label: string; sublabel?: string }, background: string): FrameNode {
  const block = figma.createFrame();
  block.layoutMode = "VERTICAL";
  block.primaryAxisSizingMode = "AUTO";
  block.counterAxisSizingMode = "AUTO";
  block.itemSpacing = 8;
  block.fills = [];

  const textColor = background === "light" ? COLORS.slate900 : COLORS.white;

  // Value
  const valueText = figma.createText();
  valueText.fontName = FONTS.heading;
  valueText.fontSize = 48;
  valueText.characters = stat.value;
  valueText.fills = [{ type: "SOLID", color: COLORS.emerald400 }];
  block.appendChild(valueText);

  // Label
  const labelText = figma.createText();
  labelText.fontName = FONTS.body;
  labelText.fontSize = 18;
  labelText.characters = stat.label;
  labelText.fills = [{ type: "SOLID", color: textColor }];
  block.appendChild(labelText);

  // Sublabel
  if (stat.sublabel) {
    const sublabelText = figma.createText();
    sublabelText.fontName = FONTS.body;
    sublabelText.fontSize = 14;
    sublabelText.characters = stat.sublabel;
    sublabelText.fills = [{ type: "SOLID", color: COLORS.slate400 }];
    block.appendChild(sublabelText);
  }

  return block;
}

async function updateSlide(deck: DeckContent, slideId: number) {
  const slideContent = deck.slides.find((s) => s.id === slideId);
  if (!slideContent) {
    figma.notify(`Slide ${slideId} not found in deck`, { error: true });
    return;
  }

  // Find existing slide by index
  const slideGrid = figma.getSlideGrid();
  if (!slideGrid || slideGrid.length === 0 || !slideGrid[0] || slideGrid[0].length < slideId) {
    figma.notify(`Slide ${slideId} not found in presentation`, { error: true });
    return;
  }

  const existingSlide = slideGrid[0][slideId - 1];
  if (!existingSlide) {
    figma.notify(`Slide ${slideId} not found`, { error: true });
    return;
  }

  // Update text nodes in the slide
  const textNodes = existingSlide.findAll((node) => node.type === "TEXT") as TextNode[];

  for (const textNode of textNodes) {
    // Match and update based on font size (rough heuristic)
    if (textNode.fontSize >= 48 && slideContent.content.headline) {
      await figma.loadFontAsync(textNode.fontName as FontName);
      textNode.characters = slideContent.content.headline;
    } else if (textNode.fontSize >= 20 && textNode.fontSize < 48 && slideContent.content.subheadline) {
      await figma.loadFontAsync(textNode.fontName as FontName);
      textNode.characters = slideContent.content.subheadline;
    }
  }

  figma.notify(`Updated slide ${slideId}`);
}

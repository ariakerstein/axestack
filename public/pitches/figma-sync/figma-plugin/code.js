/**
 * Navis Deck Sync - Figma Slides Plugin v2
 * Full content rendering: stats, team, tables, bullets, images
 */

figma.showUI(__html__, { width: 450, height: 600 });

// Theme colors
const COLORS = {
  white: { r: 1, g: 1, b: 1 },
  slate900: { r: 0.06, g: 0.09, b: 0.16 },
  slate800: { r: 0.12, g: 0.14, b: 0.18 },
  slate700: { r: 0.20, g: 0.25, b: 0.33 },
  slate600: { r: 0.42, g: 0.45, b: 0.51 },
  slate400: { r: 0.58, g: 0.62, b: 0.69 },
  slate300: { r: 0.80, g: 0.83, b: 0.86 },
  slate100: { r: 0.95, g: 0.96, b: 0.97 },
  emerald500: { r: 0.06, g: 0.73, b: 0.51 },
  emerald400: { r: 0.20, g: 0.83, b: 0.60 },
  blue500: { r: 0.23, g: 0.51, b: 0.96 },
  blue400: { r: 0.38, g: 0.65, b: 0.96 },
  purple500: { r: 0.55, g: 0.36, b: 0.97 },
  purple400: { r: 0.66, g: 0.47, b: 0.98 },
  red500: { r: 0.94, g: 0.27, b: 0.27 },
  red400: { r: 0.95, g: 0.41, b: 0.41 },
  amber500: { r: 0.96, g: 0.62, b: 0.04 },
  amber400: { r: 0.98, g: 0.72, b: 0.20 },
};

const FONTS = {
  heading: { family: "Inter", style: "Bold" },
  semibold: { family: "Inter", style: "Semi Bold" },
  medium: { family: "Inter", style: "Medium" },
  body: { family: "Inter", style: "Regular" },
};

// Slide dimensions
const SLIDE_W = 1920;
const SLIDE_H = 1080;
const MARGIN = 80;

figma.ui.onmessage = async (msg) => {
  if (msg.type === "import-deck" && msg.content) {
    await importDeck(msg.content);
  } else if (msg.type === "cancel") {
    figma.closePlugin();
  }
};

async function loadFonts() {
  try {
    await figma.loadFontAsync(FONTS.heading);
    await figma.loadFontAsync(FONTS.semibold);
    await figma.loadFontAsync(FONTS.medium);
    await figma.loadFontAsync(FONTS.body);
  } catch (e) {
    console.warn("Font loading issue:", e);
  }
}

async function importDeck(deck) {
  if (figma.editorType !== "slides") {
    figma.notify("This plugin only works in Figma Slides", { error: true });
    return;
  }

  await loadFonts();
  figma.notify(`Importing ${deck.slides.length} slides...`);

  for (const slideContent of deck.slides) {
    await createSlide(slideContent);
  }

  figma.notify(`Imported ${deck.slides.length} slides!`, { timeout: 3000 });
  figma.ui.postMessage({ type: "import-complete", slideCount: deck.slides.length });
}

async function createSlide(content) {
  const slide = figma.createSlide();
  const isDark = content.background === "dark" || content.background === "gradient";

  // Background
  if (isDark) {
    slide.fills = [{ type: "SOLID", color: COLORS.slate900 }];
  } else {
    slide.fills = [{ type: "SOLID", color: COLORS.white }];
  }

  const textColor = isDark ? COLORS.white : COLORS.slate900;
  const mutedColor = isDark ? COLORS.slate400 : COLORS.slate600;

  let yOffset = 100;

  // Section label
  if (content.label) {
    const label = createText(content.label.toUpperCase(), 14, FONTS.semibold, mutedColor);
    label.letterSpacing = { value: 3, unit: "PIXELS" };
    label.x = MARGIN;
    label.y = 50;
    slide.appendChild(label);
  }

  // Headline
  if (content.content.headline) {
    const fontSize = getHeadlineFontSize(content.type);
    const headline = createText(content.content.headline, fontSize, FONTS.heading, textColor);

    if (content.type === "title" || content.type === "ask") {
      headline.textAlignHorizontal = "CENTER";
      headline.x = MARGIN;
      headline.y = SLIDE_H / 2 - 100;
      headline.resize(SLIDE_W - MARGIN * 2, headline.height);
    } else {
      headline.x = MARGIN;
      headline.y = yOffset;
    }
    slide.appendChild(headline);
    yOffset = headline.y + headline.height + 30;
  }

  // Subheadline
  if (content.content.subheadline) {
    const sub = createText(content.content.subheadline, 24, FONTS.body,
      content.type === "title" ? COLORS.emerald400 : mutedColor);

    if (content.type === "title") {
      sub.textAlignHorizontal = "CENTER";
      sub.x = MARGIN;
      sub.resize(SLIDE_W - MARGIN * 2, sub.height);
      sub.y = yOffset;
    } else {
      sub.x = MARGIN;
      sub.y = yOffset;
    }
    slide.appendChild(sub);
    yOffset = sub.y + sub.height + 40;
  }

  // Stats
  if (content.content.stats && content.content.stats.length > 0) {
    const statsFrame = createStatsRow(content.content.stats, isDark);
    statsFrame.x = MARGIN;
    statsFrame.y = yOffset;
    slide.appendChild(statsFrame);
    yOffset = statsFrame.y + statsFrame.height + 40;
  }

  // Team members
  if (content.content.team && content.content.team.length > 0) {
    const teamFrame = createTeamRow(content.content.team, isDark);
    teamFrame.x = MARGIN;
    teamFrame.y = yOffset;
    slide.appendChild(teamFrame);
    yOffset = teamFrame.y + teamFrame.height + 40;
  }

  // Table
  if (content.content.table) {
    const tableFrame = createTable(content.content.table, isDark);
    tableFrame.x = MARGIN;
    tableFrame.y = yOffset;
    slide.appendChild(tableFrame);
    yOffset = tableFrame.y + tableFrame.height + 40;
  }

  // Bullets
  if (content.content.bullets && content.content.bullets.length > 0) {
    const bulletsFrame = createBullets(content.content.bullets, isDark);
    bulletsFrame.x = MARGIN;
    bulletsFrame.y = yOffset;
    slide.appendChild(bulletsFrame);
    yOffset = bulletsFrame.y + bulletsFrame.height + 40;
  }

  // Quotes
  if (content.content.quotes && content.content.quotes.length > 0) {
    const quotesFrame = createQuotes(content.content.quotes, isDark);
    quotesFrame.x = MARGIN;
    quotesFrame.y = yOffset;
    slide.appendChild(quotesFrame);
    yOffset = quotesFrame.y + quotesFrame.height + 40;
  }

  // Body text
  if (content.content.body && content.content.body.length > 0) {
    for (const bodyText of content.content.body) {
      const body = createText(bodyText, 24, FONTS.semibold, textColor);
      body.x = MARGIN;
      body.y = yOffset;
      body.resize(SLIDE_W - MARGIN * 2, body.height);
      slide.appendChild(body);
      yOffset = body.y + body.height + 20;
    }
  }

  // Images (placeholders with alt text)
  if (content.content.images && content.content.images.length > 0) {
    const imagesFrame = createImagePlaceholders(content.content.images, isDark);
    imagesFrame.x = MARGIN;
    imagesFrame.y = yOffset;
    slide.appendChild(imagesFrame);
  }

  // Slide number
  const slideNum = createText(String(content.id), 14, FONTS.body, mutedColor);
  slideNum.x = SLIDE_W - MARGIN - 20;
  slideNum.y = SLIDE_H - 50;
  slide.appendChild(slideNum);

  return slide;
}

function createText(text, fontSize, fontName, color) {
  const node = figma.createText();
  try {
    node.fontName = fontName;
  } catch (e) {}
  node.fontSize = fontSize;
  node.characters = text || "";
  node.fills = [{ type: "SOLID", color: color }];
  node.textAutoResize = "WIDTH_AND_HEIGHT";
  return node;
}

function getHeadlineFontSize(type) {
  switch (type) {
    case "title": return 72;
    case "ask": return 96;
    case "appendix": return 80;
    default: return 48;
  }
}

function createStatsRow(stats, isDark) {
  const frame = figma.createFrame();
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 60;
  frame.fills = [];

  const statColors = [COLORS.blue400, COLORS.emerald400, COLORS.purple400, COLORS.amber400];

  stats.forEach((stat, i) => {
    const statBlock = figma.createFrame();
    statBlock.layoutMode = "VERTICAL";
    statBlock.primaryAxisSizingMode = "AUTO";
    statBlock.counterAxisSizingMode = "AUTO";
    statBlock.itemSpacing = 4;
    statBlock.fills = [];

    const valueColor = statColors[i % statColors.length];
    const value = createText(stat.value || "", 48, FONTS.heading, valueColor);
    statBlock.appendChild(value);

    if (stat.label) {
      const label = createText(stat.label, 18, FONTS.body, isDark ? COLORS.slate300 : COLORS.slate600);
      statBlock.appendChild(label);
    }

    frame.appendChild(statBlock);
  });

  return frame;
}

function createTeamRow(team, isDark) {
  const frame = figma.createFrame();
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 40;
  frame.fills = [];

  team.forEach((member) => {
    const memberBlock = figma.createFrame();
    memberBlock.layoutMode = "VERTICAL";
    memberBlock.primaryAxisSizingMode = "AUTO";
    memberBlock.counterAxisSizingMode = "AUTO";
    memberBlock.itemSpacing = 8;
    memberBlock.counterAxisAlignItems = "CENTER";
    memberBlock.fills = [];

    // Photo placeholder (circle)
    const photo = figma.createEllipse();
    photo.resize(100, 100);
    photo.fills = [{ type: "SOLID", color: isDark ? COLORS.slate700 : COLORS.slate300 }];
    memberBlock.appendChild(photo);

    // Name
    const name = createText(member.name || "", 16, FONTS.semibold, isDark ? COLORS.white : COLORS.slate900);
    name.textAlignHorizontal = "CENTER";
    memberBlock.appendChild(name);

    // Title
    if (member.title) {
      const title = createText(member.title, 12, FONTS.body, isDark ? COLORS.slate400 : COLORS.slate600);
      title.textAlignHorizontal = "CENTER";
      memberBlock.appendChild(title);
    }

    frame.appendChild(memberBlock);
  });

  return frame;
}

function createTable(table, isDark) {
  const frame = figma.createFrame();
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 0;
  frame.fills = [];
  frame.cornerRadius = 8;
  frame.clipsContent = true;

  const cellWidth = 180;
  const cellHeight = 44;

  // Headers
  if (table.headers && table.headers.length > 0) {
    const headerRow = figma.createFrame();
    headerRow.layoutMode = "HORIZONTAL";
    headerRow.primaryAxisSizingMode = "AUTO";
    headerRow.counterAxisSizingMode = "FIXED";
    headerRow.resize(cellWidth * table.headers.length, cellHeight);
    headerRow.fills = [{ type: "SOLID", color: isDark ? COLORS.slate800 : COLORS.slate100 }];

    table.headers.forEach((header) => {
      const cell = figma.createFrame();
      cell.resize(cellWidth, cellHeight);
      cell.layoutMode = "HORIZONTAL";
      cell.primaryAxisAlignItems = "CENTER";
      cell.counterAxisAlignItems = "CENTER";
      cell.fills = [];

      const text = createText(header || "", 14, FONTS.semibold, isDark ? COLORS.slate300 : COLORS.slate700);
      cell.appendChild(text);
      headerRow.appendChild(cell);
    });

    frame.appendChild(headerRow);
  }

  // Data rows
  table.rows.forEach((row, rowIdx) => {
    const dataRow = figma.createFrame();
    dataRow.layoutMode = "HORIZONTAL";
    dataRow.primaryAxisSizingMode = "AUTO";
    dataRow.counterAxisSizingMode = "FIXED";
    dataRow.resize(cellWidth * row.length, cellHeight);
    dataRow.fills = [{ type: "SOLID", color: rowIdx % 2 === 0
      ? (isDark ? COLORS.slate900 : COLORS.white)
      : (isDark ? COLORS.slate800 : COLORS.slate100) }];

    row.forEach((cellValue, colIdx) => {
      const cell = figma.createFrame();
      cell.resize(cellWidth, cellHeight);
      cell.layoutMode = "HORIZONTAL";
      cell.primaryAxisAlignItems = colIdx === 0 ? "MIN" : "CENTER";
      cell.counterAxisAlignItems = "CENTER";
      cell.paddingLeft = colIdx === 0 ? 16 : 0;
      cell.fills = [];

      let displayValue = cellValue;
      let cellColor = isDark ? COLORS.slate300 : COLORS.slate700;

      // Handle yes/partial/no indicators
      if (cellValue === "yes") {
        displayValue = "●";
        cellColor = COLORS.emerald400;
      } else if (cellValue === "partial") {
        displayValue = "●";
        cellColor = COLORS.amber400;
      } else if (cellValue === "no") {
        displayValue = "●";
        cellColor = COLORS.red400;
      }

      const text = createText(displayValue || "", cellValue === "yes" || cellValue === "partial" || cellValue === "no" ? 24 : 14, FONTS.body, cellColor);
      cell.appendChild(text);
      dataRow.appendChild(cell);
    });

    frame.appendChild(dataRow);
  });

  return frame;
}

function createBullets(bullets, isDark) {
  const frame = figma.createFrame();
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 12;
  frame.fills = [];

  bullets.forEach((bullet) => {
    const row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.itemSpacing = 12;
    row.fills = [];

    const dot = createText("•", 20, FONTS.body, COLORS.emerald400);
    row.appendChild(dot);

    const text = createText(bullet, 20, FONTS.body, isDark ? COLORS.slate300 : COLORS.slate700);
    row.appendChild(text);

    frame.appendChild(row);
  });

  return frame;
}

function createQuotes(quotes, isDark) {
  const frame = figma.createFrame();
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 20;
  frame.fills = [];

  const quoteColors = [COLORS.blue500, COLORS.emerald500, COLORS.purple500];

  quotes.forEach((quote, i) => {
    const quoteBlock = figma.createFrame();
    quoteBlock.layoutMode = "VERTICAL";
    quoteBlock.primaryAxisSizingMode = "AUTO";
    quoteBlock.counterAxisSizingMode = "AUTO";
    quoteBlock.itemSpacing = 8;
    quoteBlock.paddingLeft = 16;
    quoteBlock.paddingRight = 16;
    quoteBlock.paddingTop = 12;
    quoteBlock.paddingBottom = 12;
    quoteBlock.cornerRadius = 12;
    quoteBlock.fills = [{ type: "SOLID", color: quoteColors[i % quoteColors.length] }];

    const text = createText(`"${quote.text}"`, 16, FONTS.medium, COLORS.white);
    quoteBlock.appendChild(text);

    const attr = createText(`— ${quote.attribution}`, 12, FONTS.body, { r: 1, g: 1, b: 1 });
    attr.opacity = 0.7;
    quoteBlock.appendChild(attr);

    frame.appendChild(quoteBlock);
  });

  return frame;
}

function createImagePlaceholders(images, isDark) {
  const frame = figma.createFrame();
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 20;
  frame.fills = [];

  images.forEach((img) => {
    const placeholder = figma.createFrame();
    placeholder.resize(200, 150);
    placeholder.cornerRadius = 12;
    placeholder.fills = [{ type: "SOLID", color: isDark ? COLORS.slate700 : COLORS.slate200 }];

    // Alt text label
    const label = createText(img.alt || "Image", 12, FONTS.body, isDark ? COLORS.slate400 : COLORS.slate500);
    label.x = 10;
    label.y = 130;
    placeholder.appendChild(label);

    frame.appendChild(placeholder);
  });

  return frame;
}

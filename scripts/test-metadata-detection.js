function detectMetadataQuery(question) {
  const lower = question.toLowerCase();

  const titleInQuotesPattern = /["""''']([^"""'']+)["""'']\s*(?:webinar|learning\s+session)?/i;
  const titleQuotesMatch = question.match(titleInQuotesPattern);

  const titleWithWebinarPattern = /^(.+?)\s+(?:webinar|learning\s+session)/i;
  const titleWebinarMatch = !titleQuotesMatch ? question.match(titleWithWebinarPattern) : null;

  const speakerPatterns = [
    /(?:dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:learning\s+)?(?:sessions?|webinars?)/i,
    /(?:find|show|get)\s+(?:the\s+)?(?:two\s+)?(?:dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:learning\s+)?(?:sessions?|webinars?)/i,
  ];

  let speakerMatch = null;
  for (const pattern of speakerPatterns) {
    speakerMatch = question.match(pattern);
    if (speakerMatch) break;
  }

  const webinarPattern = /(?:webinar|learning\s+session)\s*#?\s*(\d+)/i;
  const webinarMatch = question.match(webinarPattern);

  let webinarTitle = titleQuotesMatch?.[1] || titleWebinarMatch?.[1];

  if (webinarTitle) {
    webinarTitle = webinarTitle.replace(/["""'']/g, "").trim();
  }

  const isMetadataQuery = !!(speakerMatch || webinarMatch || webinarTitle);

  return {
    isMetadataQuery,
    speaker: speakerMatch?.[1],
    webinarNumber: webinarMatch ? parseInt(webinarMatch[1]) : undefined,
    webinarTitle: webinarTitle
  };
}

// Test various query formats
const queries = [
  "Dr. Chandra Kota radiation treatment webinar",
  "Chandra Kota webinar",
  "Dr Kota webinars",
  "show me Dr. Chandra Kota webinars",
  "What is the webinar by Dr. Chandra Kota about?",
  "Tell me about radiation from Dr. Kota",
  "Navigating Radiation Treatments webinar"
];

queries.forEach(q => {
  const result = detectMetadataQuery(q);
  console.log("\nQuery:", q);
  console.log("  isMetadataQuery:", result.isMetadataQuery);
  console.log("  speaker:", result.speaker || "none");
  console.log("  webinarTitle:", result.webinarTitle || "none");
});

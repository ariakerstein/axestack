#!/bin/bash
# Check what PDF splitting tools are available on this system

echo "🔍 Checking for PDF splitting tools..."
echo ""

# Check for qpdf
if command -v qpdf &> /dev/null; then
    echo "✅ qpdf is installed"
    qpdf --version
    echo "   Usage: qpdf input.pdf --pages . 1-50 -- output.pdf"
    echo ""
else
    echo "❌ qpdf is NOT installed"
    echo "   Install: brew install qpdf"
    echo ""
fi

# Check for pdftk
if command -v pdftk &> /dev/null; then
    echo "✅ pdftk is installed"
    pdftk --version 2>&1 | head -1
    echo "   Usage: pdftk input.pdf cat 1-50 output part1.pdf"
    echo ""
else
    echo "❌ pdftk is NOT installed"
    echo "   Install: brew install pdftk-java"
    echo ""
fi

# Check for ghostscript (gs)
if command -v gs &> /dev/null; then
    echo "✅ ghostscript (gs) is installed"
    gs --version
    echo "   Can be used for splitting PDFs"
    echo ""
else
    echo "❌ ghostscript is NOT installed"
    echo "   Install: brew install ghostscript"
    echo ""
fi

# Check if this is macOS (Preview available)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✅ macOS detected - Preview app is available"
    echo "   This is the easiest option:"
    echo "   1. Open PDF in Preview"
    echo "   2. View → Thumbnails"
    echo "   3. Select page ranges"
    echo "   4. File → Print → PDF → Save"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Recommendation:"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Use Preview (easiest, built-in):"
    echo "1. Open 'My Health Summary.PDF' in Preview"
    echo "2. View → Thumbnails (⌘⌥3)"
    echo "3. Select pages 1-50"
    echo "4. File → Print → Save as PDF"
    echo "5. Repeat for other sections"
elif command -v qpdf &> /dev/null; then
    echo "Use qpdf (command line):"
    echo "qpdf 'My Health Summary.PDF' --pages . 1-50 -- 'Part1.pdf'"
elif command -v pdftk &> /dev/null; then
    echo "Use pdftk (command line):"
    echo "pdftk 'My Health Summary.PDF' cat 1-50 output 'Part1.pdf'"
else
    echo "Install a tool first:"
    echo "brew install qpdf"
    echo ""
    echo "Or use an online tool:"
    echo "https://www.ilovepdf.com/split_pdf"
fi

echo ""

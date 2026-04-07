"""Test reprocessing with just brain-gliomas-patient.pdf"""
import sys
sys.path.insert(0, '.')

from reprocess_guidelines_2025 import process_guideline

# Test with just Glioma PDF
pdf_path = "NCCN_pdf/brain-gliomas-patient.pdf"
filename = "brain-gliomas-patient.pdf"

print("🧪 Testing with single PDF: brain-gliomas-patient.pdf\n")
process_guideline(pdf_path, filename)
print("\n✅ Test complete! Check database for results.")

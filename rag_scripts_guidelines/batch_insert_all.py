import os
import subprocess

pdf_dir = "NCCN_pdf"
for filename in os.listdir(pdf_dir):
    if filename.endswith(".pdf"):
        pdf_path = os.path.join(pdf_dir, filename)
        cancer_type = filename.replace("-patient.pdf", "").replace("_", "-").upper()
        print(f"📦 Processing {pdf_path} → {cancer_type}")
        subprocess.run(["python", "process_and_insert_pdf.py", pdf_path, cancer_type])


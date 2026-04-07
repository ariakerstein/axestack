
import os
import re
import csv
import uuid
import fitz  # PyMuPDF

CHUNK_SIZE = 800
CHUNK_OVERLAP = 200
PDF_DIR = "NCCN_pdf"
OUTPUT_CSV = "guideline_chunks_upload.csv"

def flush_section(writer, sec_heading, cancer_type, guideline_source, guideline_title,
                  version_date, file_path, words_with_pages, chunk_index,
                  section_start_page, section_end_page, chunk_size=800, overlap=200):
    if not words_with_pages:
        return chunk_index

    step = chunk_size - overlap
    total_words = len(words_with_pages)

    for start in range(0, total_words, step):
        end = min(start + chunk_size, total_words)
        chunk_words = [w for (w, _) in words_with_pages[start:end]]
        if not chunk_words:
            continue

        chunk_text = " ".join(chunk_words).strip()
        page_start = words_with_pages[start][1]
        page_end = words_with_pages[end - 1][1]
        token_count = len(chunk_words)

        writer.writerow([
            str(uuid.uuid4()),
            cancer_type,
            guideline_source,
            guideline_title,
            version_date,
            sec_heading,
            chunk_index,
            page_start,
            page_end,
            chunk_text,
            token_count,
            file_path
        ])
        chunk_index += 1

    return chunk_index

with open(OUTPUT_CSV, mode="w", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow([
        "id", "cancer_type", "guideline_source", "guideline_title",
        "version_date", "section_heading", "chunk_index",
        "page_start", "page_end", "chunk_text", "token_count", "url"
    ])

    for filename in os.listdir(PDF_DIR):
        if not filename.lower().endswith(".pdf"):
            continue

        file_path = os.path.join(PDF_DIR, filename)
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            print(f"❌ Failed to open {filename}: {e}")
            continue

        meta = doc.metadata
        title_meta = (meta.get("title") or "").strip() if meta else ""
        first_page = doc.load_page(0)
        first_text = first_page.get_text("text")

        guideline_source = "ASCO" if "asco" in filename.lower() else "NCCN"
        if "american society of clinical oncology" in first_text.lower() or "asco" in first_text.lower():
            guideline_source = "ASCO"
        elif "national comprehensive cancer network" in first_text.lower() or "nccn" in first_text.lower():
            guideline_source = "NCCN"

        guideline_title = title_meta
        if not guideline_title or len(guideline_title) < 5 or guideline_title.lower() in filename.lower():
            page_dict = first_page.get_text("dict")
            max_font_size = 0.0
            title_candidates = []
            for block in page_dict.get("blocks", []):
                if block.get("type") == 0:
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            size = span.get("size", 0)
                            text = span.get("text", "").strip()
                            if text:
                                if size > max_font_size:
                                    max_font_size = size
                                    title_candidates = [text]
                                elif abs(size - max_font_size) < 0.1:
                                    title_candidates.append(text)
            if title_candidates:
                guideline_title = " ".join(title_candidates).strip()
            else:
                for line in first_text.splitlines():
                    if line.strip():
                        guideline_title = line.strip()
                        break

        base_name = re.sub(r"\.pdf$", "", filename, flags=re.IGNORECASE)
        base_name = re.sub(r"(?i)(asco|nccn|guidelines?|patients?)", "", base_name)
        base_name = re.sub(r"(\d{4}|v\d+|version\s*\d+)", "", base_name)
        base_name = re.sub(r"[_\-]+", " ", base_name)
        cancer_type = base_name.strip().title()

        version_date = ""
        if meta:
            raw_date = meta.get("modDate") or meta.get("creationDate") or ""
            m = re.match(r"D:(\d{4})(\d{2})(\d{2})", raw_date)
            if m:
                version_date = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        if not version_date:
            m = re.search(r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\b\s*\d{0,2},?\s*\d{4}", first_text)
            if m:
                version_date = m.group(0).strip().strip(",")

        chunk_index = 0
        section_heading = ""
        section_start_page = None
        section_text_words = []
        last_page_in_section = None

        for page_number in range(doc.page_count):
            page = doc.load_page(page_number)
            page_num = page_number + 1
            page_dict = page.get_text("dict")
            for block in page_dict.get("blocks", []):
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    span_texts = []
                    all_bold = True
                    all_caps = True
                    for span in line.get("spans", []):
                        text = span.get("text", "")
                        if not text:
                            continue
                        span_texts.append(text)
                        font_name = span.get("font", "").lower()
                        if "bold" not in font_name:
                            all_bold = False
                        if re.search(r"[a-z]", text):
                            all_caps = False
                    if not span_texts:
                        continue
                    line_text = "".join(span_texts).strip()
                    if not line_text:
                        continue

                    is_heading = False
                    if len(line_text) < 120:
                        if all_caps and len(line_text) > 1:
                            is_heading = True
                        elif all_bold and line_text.isalpha() and not line_text.istitle():
                            is_heading = True

                    if is_heading:
                        if section_text_words:
                            chunk_index = flush_section(writer, section_heading, cancer_type, guideline_source,
                                                         guideline_title, version_date, file_path,
                                                         section_text_words, chunk_index, section_start_page,
                                                         last_page_in_section)
                        section_heading = line_text
                        section_start_page = page_num
                        section_text_words = []
                        last_page_in_section = None
                    else:
                        words = line_text.split()
                        for w in words:
                            section_text_words.append((w, page_num))
                        last_page_in_section = page_num

        if section_text_words:
            chunk_index = flush_section(writer, section_heading, cancer_type, guideline_source,
                                         guideline_title, version_date, file_path,
                                         section_text_words, chunk_index,
                                         section_start_page or 1,
                                         last_page_in_section or doc.page_count)

        doc.close()

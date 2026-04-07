#!/usr/bin/env python3
"""
Re-ingest Missing Webinar PDFs
- Downloads from Supabase storage
- Creates chunks with correct URLs
- Checks for duplicates before inserting
Date: December 8, 2025
"""

import os
import re
import time
import json
import tempfile
import urllib.request
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize clients
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL not set")
if not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY not set")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Configuration
CHUNK_SIZE = 3000
CHUNK_OVERLAP = 300
STORAGE_BUCKET = "guideline-pdfs"
STORAGE_FOLDER = "webinars"

# Missing webinars list
MISSING_WEBINARS = [
    "Adaptive-Therapy-Brad-Power-10.pdf",
    "An-MD-PhD-Navigates-Breast-Cancer-Catalina-Lopez-Correa-MD-PhD-155.pdf",
    "Cancer-Vaccines-Lisa-Butterfield-50.pdf",
    "Getting-a-Better-Diagnostic-DPYD-into-the-Standard-of-Care-Karen-Merritt-137.pdf",
    "Getting-Access-to-Your-Cancer-Treatment-Chris-Beardmore-73.pdf",
    "Guiding-Personalized-Treatment-for-Advanced-Prostate-Cancer-Round-Two-Andrew-Armstrong-70.pdf",
    "Hacking-Cancer-0.1-and-the-Endgame-Strategy-for-Cancer-Mark-Taylor-and-Gabriele-Gavazzi-156.pdf",
    "Hacking-the-Proteome-for-Cancer-Treatment-Karin-Rodland-12.pdf",
    "Healing-the-Cancer-Journey-Tools-for-Emotional-Wellness-Savio-P.-Clemente-87.pdf",
    "Helping-Patients-Navigate-Cancer-Manta-Cares-93.pdf",
    "How-Advocacy-Leads-to-Better-Patient-Outcomes-and-Experiences-Steven-Merlin-126.pdf",
    "How-AI-Is-Shifting-the-Dynamics-of-Your-Next-Doctor-Visit-Ezra-Cohen-MD-121.pdf",
    "How-a-Particular-Protein-Tumor-Necrosis-Factor-Might-Control-the-Immune-Response-in-Prostate-Cancer-Ida-Deichaite-PhD-118.pdf",
    "How-Daily-Lifestyle-Interventions-Improve-Your-Cancer-Outcomes-Amanda-Grilli-158.pdf",
    "How-Disparities-and-Workforce-Diversity-Impact-Cancer-Patients-and-Caregivers-Eugene-Manley-PhD-111.pdf",
    "How-Do-You-Choose-Your-Diagnostics-A-Guide-Richard-Anders-and-Brad-Power-100.pdf",
    "How-Hormone-Receptors-Affect-Prostate-Cancer-Ed-Friedman-59.pdf",
    "How-I-Am-Running-Experiments-on-Myself-to-Control-My-Prostate-Cancer-Using-Bipolar-Androgen-Therapy-Russ-Hollyer-58.pdf",
    "How-I-Help-Patients-Access-New-Diagnostics-Joanne-Weidhaas-MD-PhD-MS-138.pdf",
    "How-I-Use-Hemp-to-Manage-My-Cancer-Pain-Jeff-Dwyer-152.pdf",
    "How-MSI-and-Other-Tests-Can-Guide-Immunotherapies-for-Cancer-Treatment-Heather-Tomlinson-43.pdf",
    "How-Proteomics-and-RNA-Sequencing-Are-Guiding-My-Treatment-Mike-Yancey-51.pdf",
    "How-to-Survive-the-Health-System-and-Get-Good-Care-Philip-Leming-MD-and-Jillian-Hunt-AOCNP-150.pdf",
    "Identifying-Personalized-Treatment-Recommendations-for-Gastro-Intestinal-Cancers-Laura-Towart-and-Nahuel-Villegas-PhD-131.pdf",
    "Identifying-the-Most-Effective-Treatment-on-the-Tumor-Rather-than-Trying-It-Out-on-the-Patient-Dr.-Chris-Apfel-84.pdf",
    "Illuminating-the-Path-of-Cancer-Care-with-a-Chatbot-Vanessa-Liu-CareBud-82.pdf",
    "Immunotherapy-in-Prostate-Cancer-CAR-T-and-the-Tumor-Microenvironment-Andrew-Rech-63.pdf",
    "Integrative-Cancer-Care-Donald-Abrams-MD-102.pdf",
    "Introducing-an-App-for-Navigating-Cancer-Care-Berries-67.pdf",
    "Latest-Insights-from-Applying-Evolutionary-Theory-to-the-Treatment-Strategies-of-Cancer-Patients-Bob-Gatenby-MD-154.pdf",
    "Launch-Meeting-Introductions-and-Purpose-Brian-McCloskey-Rick-Stanton-Brad-Power-1.pdf",
    "Liquid-Biopsies-Peter-Kuhn-and-Stephanie-Shishido-231.pdf",
    "Liquid-Biopsies-Peter-Kuhn-and-Stephanie-Shishido-23.pdf",
    "Making-Decisions-in-the-Complexity-of-Healthcare-Michael-Liebman-PhD-144.pdf",
    "Modeling-Disease-Michael-Liebman-24.pdf",
    "Molecular-Integrative-Oncology-In-Addition-to-Not-instead-of-Conventional-Oncology-Treatment-William-LaValley-MD-134.pdf",
    "More-than-60-of-the-Cancer-Journey-Happens-at-Home-Why-No-Comprehensive-Support-Katie-Quintas-115.pdf",
    "Multi-omic-Analysis-Guides-the-Decisions-of-Brian-McCloskey-Rana-McKay-MD-and-BostonGene-98.pdf",
    "My-Journey-to-Becoming-the-CEO-of-My-Health-Jeff-Holtmeier-162.pdf",
    "Navigating-Brain-Cancer-Al-Musella-80.pdf",
    "Navigating-Cancer-Survivorship-Caroline-Knudsen-and-Chasse-Bailey-Dorton-MD-140.pdf",
    "Navigating-Cancer-with-the-Mind-as-Your-Ally-Sheryl-Anjanette-124.pdf",
    "Navigating-Pancreatic-Cancer-John-Strickler-MD-91.pdf",
    "Navigating-Radiation-Treatments-Chandra-Kota-PhD-97.pdf",
    "Navigating-Relational-Health-Through-the-Challenges-of-Cancer-Jason-Binder-127.pdf",
    "New-Metabolic-Approaches-to-Cancer-Treatment-Ahmed-Elsakka-MD-120.pdf",
    "Novel-Testing-to-Guide-Personalized-Cancer-Treatment-RGCC-61.pdf",
    "Novel-Therapies-and-New-Directions-in-Pancreas-Cancer-2024-Eileen-OReilly-MD-106.pdf",
    "Nutrition-and-Gut-Health-after-Cancer-Robert-Thomas-MD-163.pdf",
    "Opening-up-Access-to-Cancer-Data-for-Patients-Frank-Nothaft-76.pdf",
    "Palliative-and-Psychosocial-Services-for-Cancer-Patients-James-Tulsky-85.pdf",
    "Palliative-Care-for-Advanced-Cancer-Tom-Smith-32.pdf",
    "Patient-Navigators-Your-Guide-through-the-Clinical-Trial-Journey-Madeleine-Carrier-PharmD-and-Dennis-Akkaya-104.pdf",
    "Patients-Are-Having-Toxicity-and-Effectiveness-Concerns-with-Pluvicto-Brian-McCloskey-55.pdf",
    "Starving-Cancer-beyond-the-Metro-Map-Jane-McLelland-113.pdf",
    "Starving-Tumors-with-a-Therapeutic-Diet-John-Chant-36.pdf",
    "Target-Your-Molecular-Vulnerabilities-with-Personalized-Cancer-Treatment-Padman-Vamadevan-MD-and-Travis-Christofferson-MS-159.pdf",
    "Terrain-and-the-Whole-Person-in-Cancer-Care-Nasha-Winters-ND-FABNO-95.pdf",
    "Testing-and-Treatment-Options-for-Ian-Lewington-Ian-Lewington-78.pdf",
    "Testing-and-Treatment-Options-Review-for-Robert-Ellis-Robert-Ellis-39.pdf",
    "Testing-and-Treatment-Roadmap-NCCN-Guidelines-Rick-Stanton-6.pdf",
    "The-Current-and-Future-Landscape-of-Metastatic-Castrate-Resistant-Prostate-Cancer-Oliver-Sartor-62.pdf",
    "The-Gut-Microbiome-and-Cancer-Michael-Liss-MD-PhD-128.pdf",
    "The-Latest-Tests-for-Personalized-CancerCare-Tony-Magliocco-89.pdf",
    "The-Personalization-Conundrum-Brad-Power-16.pdf",
    "The-Potential-of-Personalized-Cancer-Vaccines-Starting-with-Brain-Cancer-Saskia-Biskup-MD-PhD-141.pdf",
    "Translating-Patient-Data-into-Clinical-Use-Eli-Van-Allen-81.pdf",
    "Treating-My-Osteoporosis-and-My-Prostate-Cancer-Jeff-Dwyer-65.pdf",
    "Twice-kicker-of-Cancer-s-Butt-Shares-Knowledge-that-Oncologists-Won-t-Tell-You-Richard-Bagdonas-161.pdf",
    "Update-on-Immunotherapies-CARs-and-BiTEs-for-Solid-Tumors-Saul-Priceman-PhD-117.pdf",
    "Update-on-Immunotherapies-for-Metastatic-Castrate-Resistant-Prostate-Cancer-Sumit-Subudhi-66.pdf",
    "Update-on-Prostate-Cancer-Treatments-Especially-Radiopharmaceuticals-Oliver-Sartor-MD-122.pdf",
    "Updates-on-Patients-Tests-and-Treatments-Brian-McCloskey-Rick-Stanton-and-Brad-Power-2.pdf",
]


def extract_metadata_from_filename(filename: str) -> dict:
    """Extract metadata from webinar filename"""
    name = filename.replace('.pdf', '')

    # Extract webinar number (last number in filename)
    webinar_num_match = re.search(r'-(\d+)$', name)
    webinar_num = webinar_num_match.group(1) if webinar_num_match else None

    # Remove number from end
    if webinar_num:
        name = name.rsplit('-', 1)[0]

    # Split into title and speaker (speaker is usually after last dash followed by name patterns)
    # Try to identify speaker by looking for MD, PhD, etc
    speaker_match = re.search(r'-([A-Z][a-z]+-[A-Z][a-z]+(?:-(?:MD|PhD|RN|DVM|DO|MS|MSc|MBA|FABNO|AOCNP|PharmD)(?:-[A-Z]+)?)*(?:-and-[A-Z][a-z]+-[A-Z][a-z]+(?:-(?:MD|PhD|RN|DVM|DO|MS|MSc|MBA|FABNO|AOCNP|PharmD)(?:-[A-Z]+)?)*)?)$', name)

    if speaker_match:
        speaker = speaker_match.group(1).replace('-', ' ')
        title = name[:speaker_match.start()].replace('-', ' ')
    else:
        # Fallback: use everything as title
        title = name.replace('-', ' ')
        speaker = None

    return {
        'title': f'"{title}"',
        'speaker': speaker,
        'webinar_number': webinar_num,
        'guideline_source': 'CancerPatientLab Webinars'
    }


def download_pdf_from_storage(filename: str) -> str:
    """Download PDF from Supabase storage to temp file"""
    storage_path = f"{STORAGE_FOLDER}/{filename}"
    url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_path}"

    try:
        with urllib.request.urlopen(url) as response:
            content = response.read()
    except urllib.error.HTTPError as e:
        raise Exception(f"Failed to download {filename}: {e.code}")

    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_file.write(content)
    temp_file.close()

    return temp_file.name


def extract_text_from_pdf(pdf_path: str) -> tuple:
    """Extract text from PDF using PyPDF2"""
    import PyPDF2

    text_parts = []

    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            page_count = len(reader.pages)

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

        full_text = "\n\n".join(text_parts)
        word_count = len(full_text.split())

        return full_text, {'page_count': page_count, 'word_count': word_count}
    except Exception as e:
        print(f"  Error extracting text: {str(e)}")
        return None, None


def create_chunks(text: str) -> list:
    """Split text into overlapping chunks"""
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + CHUNK_SIZE
        chunk_text = text[start:end]

        if end < len(text):
            last_period = chunk_text.rfind('.')
            last_newline = chunk_text.rfind('\n')
            boundary = max(last_period, last_newline)

            if boundary > CHUNK_SIZE * 0.8:
                end = start + boundary + 1
                chunk_text = text[start:end]

        chunks.append({
            'chunk_index': chunk_index,
            'chunk_text': chunk_text.strip()
        })

        chunk_index += 1
        start = end - CHUNK_OVERLAP

    return chunks


def generate_embedding(text: str) -> list:
    """Generate OpenAI embedding for text"""
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
            dimensions=1536
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"  Error generating embedding: {str(e)}")
        return None


def check_duplicate(url: str) -> bool:
    """Check if chunks with this URL already exist"""
    result = supabase.table('guideline_chunks').select('id').eq('url', url).limit(1).execute()
    return len(result.data) > 0


def insert_chunks_to_db(chunks: list, metadata: dict, url: str):
    """Insert chunks into guideline_chunks table"""
    inserted_count = 0
    failed_count = 0

    for chunk in chunks:
        embedding = generate_embedding(chunk['chunk_text'])

        if not embedding:
            failed_count += 1
            continue

        chunk_data = {
            'guideline_title': metadata['title'],
            'guideline_source': metadata['guideline_source'],
            'cancer_type': 'General',
            'chunk_text': chunk['chunk_text'],
            'chunk_index': chunk['chunk_index'],
            'chunk_embedding_vec': embedding,
            'content_tier': 'tier_3',
            'content_type': 'webinar',
            'section_heading': metadata.get('speaker'),
            'url': url,
            'status': 'active',
            'author': metadata.get('speaker')
        }

        try:
            result = supabase.table('guideline_chunks').insert(chunk_data).execute()
            inserted_count += 1

            if inserted_count % 5 == 0:
                print(f"    Progress: {inserted_count}/{len(chunks)} chunks")

        except Exception as e:
            print(f"  Error inserting chunk {chunk['chunk_index']}: {str(e)}")
            failed_count += 1

    return inserted_count, failed_count


def process_single_webinar(filename: str) -> dict:
    """Process a single webinar PDF"""
    print(f"\n{'='*70}")
    print(f"Processing: {filename[:60]}...")
    print(f"{'='*70}")

    start_time = time.time()

    # Build storage URL
    storage_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{STORAGE_FOLDER}/{filename}"

    # Check for duplicates
    if check_duplicate(storage_url):
        print(f"  SKIPPED: Already exists in database")
        return {
            'filename': filename,
            'success': True,
            'skipped': True,
            'reason': 'Already exists',
            'elapsed_time': time.time() - start_time
        }

    # Extract metadata
    metadata = extract_metadata_from_filename(filename)
    print(f"  Title: {metadata['title'][:50]}...")
    print(f"  Speaker: {metadata['speaker']}")
    print(f"  Webinar #: {metadata['webinar_number']}")

    # Download PDF
    print(f"  Downloading from storage...")
    try:
        temp_pdf = download_pdf_from_storage(filename)
    except Exception as e:
        print(f"  ERROR downloading: {e}")
        return {
            'filename': filename,
            'success': False,
            'error': str(e),
            'elapsed_time': time.time() - start_time
        }

    # Extract text
    print(f"  Extracting text...")
    full_text, pdf_metadata = extract_text_from_pdf(temp_pdf)

    # Clean up temp file
    os.unlink(temp_pdf)

    if not full_text:
        return {
            'filename': filename,
            'success': False,
            'error': 'Failed to extract text',
            'elapsed_time': time.time() - start_time
        }

    print(f"  Extracted {pdf_metadata['word_count']:,} words from {pdf_metadata['page_count']} pages")

    # Create chunks
    chunks = create_chunks(full_text)
    print(f"  Created {len(chunks)} chunks")

    # Insert to database
    print(f"  Inserting chunks...")
    inserted, failed = insert_chunks_to_db(chunks, metadata, storage_url)

    elapsed_time = time.time() - start_time

    result = {
        'filename': filename,
        'success': True,
        'skipped': False,
        'title': metadata['title'],
        'speaker': metadata['speaker'],
        'webinar_number': metadata['webinar_number'],
        'pages': pdf_metadata['page_count'],
        'words': pdf_metadata['word_count'],
        'chunks_created': len(chunks),
        'chunks_inserted': inserted,
        'chunks_failed': failed,
        'elapsed_time': elapsed_time
    }

    print(f"  Completed in {elapsed_time:.1f}s ({inserted} chunks inserted)")
    return result


def main():
    """Main execution"""
    print(f"\n{'#'*70}")
    print(f"# RE-INGESTING MISSING WEBINARS")
    print(f"# Total to process: {len(MISSING_WEBINARS)}")
    print(f"# Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*70}\n")

    results = []

    for i, filename in enumerate(MISSING_WEBINARS):
        result = process_single_webinar(filename)
        results.append(result)

        # Progress
        print(f"\n  Progress: {i + 1}/{len(MISSING_WEBINARS)} ({(i + 1) / len(MISSING_WEBINARS) * 100:.1f}%)")

        # Small pause between PDFs to avoid rate limits
        if i < len(MISSING_WEBINARS) - 1:
            time.sleep(1)

    # Summary
    successful = [r for r in results if r.get('success') and not r.get('skipped')]
    skipped = [r for r in results if r.get('skipped')]
    failed = [r for r in results if not r.get('success')]

    total_chunks = sum(r.get('chunks_inserted', 0) for r in successful)
    total_words = sum(r.get('words', 0) for r in successful)
    total_time = sum(r.get('elapsed_time', 0) for r in results)

    print(f"\n{'='*70}")
    print(f"PROCESSING COMPLETE!")
    print(f"{'='*70}")
    print(f"Total webinars: {len(results)}")
    print(f"Successfully ingested: {len(successful)}")
    print(f"Skipped (duplicates): {len(skipped)}")
    print(f"Failed: {len(failed)}")
    print(f"Total chunks inserted: {total_chunks:,}")
    print(f"Total words processed: {total_words:,}")
    print(f"Total time: {total_time / 60:.1f} minutes")
    print(f"{'='*70}\n")

    if failed:
        print("Failed webinars:")
        for r in failed:
            print(f"  - {r['filename']}: {r.get('error', 'Unknown')}")

    # Save results
    results_file = os.path.join(
        os.path.dirname(__file__),
        f"reingest_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )

    with open(results_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total': len(results),
            'successful': len(successful),
            'skipped': len(skipped),
            'failed': len(failed),
            'total_chunks': total_chunks,
            'results': results
        }, f, indent=2)

    print(f"Results saved to: {results_file}\n")


if __name__ == "__main__":
    main()

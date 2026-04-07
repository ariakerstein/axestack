import os
import shutil
import re
from collections import defaultdict

# === CONFIG ===
VAULT_ROOT = '/Users/ariakerstein/accelerate'
DAILY_JOURNAL_FOLDER = os.path.join(VAULT_ROOT, '01-periodic/dailyJournal🪓')
ARCHIVE_FOLDER = os.path.join(VAULT_ROOT, '01-periodic/dailyArchived')

# === Create archive folder if it doesn't exist
os.makedirs(ARCHIVE_FOLDER, exist_ok=True)

# === Helper: Basic normalize (remove trailing space+number, or -number)
def normalize_filename(filename):
    name = filename.rsplit('.', 1)[0]  # remove ".md"
    name = re.sub(r'[\s\-]\d+$', '', name)  # remove trailing " 2" or "-2"
    return name

# === Group files by normalized base name
files_by_base = defaultdict(list)

for filename in os.listdir(DAILY_JOURNAL_FOLDER):
    if filename.endswith('.md'):
        full_path = os.path.join(DAILY_JOURNAL_FOLDER, filename)
        base_name = normalize_filename(filename)
        files_by_base[base_name].append(full_path)

# === For each group, keep the biggest file and archive others
for base_name, files in files_by_base.items():
    if len(files) > 1:
        # Sort by file size (biggest first)
        files = sorted(files, key=lambda f: os.path.getsize(f), reverse=True)
        master = files[0]
        duplicates = files[1:]

        print(f"\n🛡️ Keeping master: {os.path.basename(master)}")
        for dup in duplicates:
            print(f"📦 Archiving duplicate: {os.path.basename(dup)}")
            shutil.move(dup, os.path.join(ARCHIVE_FOLDER, os.path.basename(dup)))

print("\n🎯 Simple filename-based deduplication complete!")


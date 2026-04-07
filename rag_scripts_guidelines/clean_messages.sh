#!/bin/bash

set -e

BACKUP_PATH=~/Desktop/MessagesBackup.zip
SOURCE_DIR=~/Library/Messages
ATTACHMENTS_DIR="$SOURCE_DIR/Attachments"

echo "🔒 Backing up Messages to: $BACKUP_PATH..."
sudo ditto -c -k --sequesterRsrc --keepParent "$SOURCE_DIR" "$BACKUP_PATH"
echo "✅ Backup complete."

echo
echo "📦 Current local Messages size:"
du -sh "$SOURCE_DIR"

read -p "❗ Are you sure you want to delete local Messages cache and attachments? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "❌ Cancelled. No files deleted."
  exit 0
fi

echo "🧹 Deleting local message attachments..."
sudo rm -rf "$ATTACHMENTS_DIR"
sudo rm -f "$SOURCE_DIR/chat.db" "$SOURCE_DIR/chat.db-shm" "$SOURCE_DIR/chat.db-wal"

echo "✅ Local cache removed. Messages will re-download from iCloud as needed."

echo
echo "📉 New Messages folder size:"
du -sh "$SOURCE_DIR"

echo "🎉 Done! You’ve just freed up a huge chunk of space."


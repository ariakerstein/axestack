#!/bin/bash

echo "🔍 Forcing Spotlight to reindex your drive..."
sudo mdutil -E /

echo "🧹 Clearing system caches (safe ones)..."
sudo rm -rfv ~/Library/Caches/*
sudo rm -rfv /Library/Caches/*
sudo rm -rfv /System/Library/Caches/* 2>/dev/null || echo "✅ Skipped protected cache."

echo "📦 Checking space on / (main disk):"
df -h /

echo
echo "📦 Messages folder size:"
du -sh ~/Library/Messages

echo "📦 Developer folder status:"
if [ -d ~/Library/Developer ]; then
  du -sh ~/Library/Developer
else
  echo "✅ Developer folder already deleted"
fi

echo
echo "🔄 Storage should reflect changes shortly. Reboot recommended to fully flush UI."


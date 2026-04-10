#!/bin/bash
# Usage: download.sh <downloadUrl> <download_dir> <filename>

URL="$1"
DIR="$2"
FILENAME="${3:-download}"

LOG_DIR="$HOME/.claude/torrent_logs"
mkdir -p "$LOG_DIR"

SAFE_NAME=$(echo "$FILENAME" | tr ' /\\:*?"<>|' '_')
LOG_FILE="$LOG_DIR/${SAFE_NAME}.log"

# Resolve downloadUrl → magnet link via 301 redirect
MAGNET=$(curl -s -o /dev/null -D - "$URL" | grep -i "^location:" | tr -d '\r' | sed 's/^[Ll]ocation: //')

if [ -z "$MAGNET" ]; then
  echo "ERROR: 无法获取 magnet 链接" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$DIR/$SAFE_NAME"
mkdir -p "$DEST"

(aria2c \
  --dir="$DEST" \
  --seed-time=0 \
  --summary-interval=5 \
  --console-log-level=notice \
  --file-allocation=none \
  "$MAGNET" 2>&1 | python3 "$SCRIPT_DIR/format_progress.py" > "$LOG_FILE") &

echo "LOG:$LOG_FILE"

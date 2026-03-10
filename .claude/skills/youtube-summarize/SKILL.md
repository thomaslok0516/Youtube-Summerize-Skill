---
name: youtube-summarize
description: This skill should be used when the user asks to "summarize youtube channels", "fetch new youtube videos", "get latest videos from channels", "summarize videos since last fetch", or wants a digest of recent YouTube content from tracked channels.
---

# YouTube Channel Summarizer

Fetch and summarize new videos from tracked YouTube channels using the YouTube Data API and Gemini.

## Pre-check

Run all checks upfront and report any issues at once before proceeding.

### Dependencies

Check if `@google/genai` is available:
```bash
! node -e "require('@google/genai')" 2>&1
```

If it fails, the package is not installed. Add it to the root `package.json` using the Edit tool (create one with `pnpm init` if it doesn't exist), then install:
```bash
! pnpm add @google/genai && pnpm add -D tsx typescript @types/node
```

### API Keys

Load env vars and validate:
```bash
! export $(grep -v '^#' .env | xargs) && echo "YOUTUBE_API_KEY=${YOUTUBE_API_KEY}" && echo "GEMINI_API_KEY=${GEMINI_API_KEY}"
```

If anything is wrong, report **all issues at once** and stop:
- `YOUTUBE_API_KEY` is missing or placeholder → ask the user to provide it; paste here or fill in `.env` themselves
- `GEMINI_API_KEY` is missing or placeholder → ask the user to provide it; if they don't have one, proceed without summarization and show raw video list instead
- `data/youtube-channels.json` is empty or missing → ask the user which channels to track and write the entries

### Step 1: Resolve Channel IDs

```bash
! pnpm tsx .claude/skills/youtube-summarize/scripts/resolve-channel.ts
```

Resolves `channelId` and `uploadsPlaylistId` for any channel missing them. Already-resolved channels are skipped.

### Step 2: Fetch New Videos

```bash
! pnpm tsx .claude/skills/youtube-summarize/scripts/fetch-videos.ts
```

Fetches videos published after `lastFetchTime`. If no new videos are found, inform the user and stop.

### Step 3: Summarize with Gemini

> **Note:** Summarize in the same language as the video titles and descriptions. Do not translate unless the user explicitly asks.

```bash
! pnpm tsx .claude/skills/youtube-summarize/scripts/summarize.ts
```

After the script completes, echo the full output back to the user in your response.

### Step 4: Update Config and Clean Up

1. Update each channel's `lastFetchTime` to the current UTC datetime in `.claude/skills/youtube-summarize/data/youtube-channels.json` using the Edit tool.
2. Delete the temporary output file:
```bash
! rm .claude/skills/youtube-summarize/data/new-videos.json
```

---

## Scripts Reference

| Script | Purpose |
|---|---|
| `scripts/resolve-channel.ts` | Resolves `channelId` + `uploadsPlaylistId` from handle via YouTube API |
| `scripts/fetch-videos.ts` | Fetches new videos from uploads playlist, filters by `lastFetchTime` |
| `scripts/summarize.ts` | Calls Gemini to summarize new videos grouped by channel |
| `scripts/types.ts` | Shared TypeScript types for YouTube API responses |

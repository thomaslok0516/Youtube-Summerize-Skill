---
name: torrent
description: Search and download licensed media files from local database. Use when the user provides a search query (title, code, keyword) or a direct download URL and wants to download it.
user-invocable: true
allowed-tools:
  - Bash(curl *)
  - Bash(aria2c *)
  - Bash(bash *)
  - Bash(transmission-cli *)
  - Bash(webtorrent *)
  - Bash(which *)
  - Bash(mkdir -p *)
  - Bash(ls *)
  - Bash(python3 *)
  - Read
  - Write
---

# /torrent — Licensed Media Search & Downloader

Arguments passed: `$ARGUMENTS`

---

### `setdir <path>` — 修改保存目录

If `$ARGUMENTS` starts with `setdir`, extract the path, expand `~`, write it to `.claude/torrent_dir.txt`, and confirm. Do not start a download.

---

## Step -1 — Environment Check

Run the following checks. If any fail, report the issue and stop.

### 1. Python3

```
which python3
```

If not found:
> 请先安装 Python3：`brew install python3`

### 2. Torrent client

```
which aria2c || which transmission-cli || which webtorrent
```

If none found, ask the user:
> 未检测到 torrent 客户端，是否现在安装 aria2？（推荐，直接回车确认）

If the user confirms, run:
```
brew install aria2
```
Then re-check with `which aria2c`. If still not found, stop and report the error.
If the user declines, stop.

### 3. Search service

```
curl -s --max-time 3 http://localhost:9696/api/v1/indexer?apikey=<QUERY_REQUEST_QPI_KEY> -o /dev/null -w "%{http_code}"
```

Read `.env` to get `QUERY_REQUEST_QPI_KEY` first. If the response code is not `200`:
> 本地搜索服务未运行，请确认服务已启动（端口 9696）

---

## Step 0 — Classify input

Check `$ARGUMENTS`:

- If it starts with `magnet:` or is an `http(s)://` URL → skip to **Step 2** directly, use it as `downloadUrl`.
- Otherwise → treat as a **search query**, continue to **Step 1**.

---

## Step 1 — Search

Read `.env` to get `QUERY_REQUEST_QPI_KEY`.

Run:

```
python3 .claude/skills/torrent/search.py "<query>" "<QUERY_REQUEST_QPI_KEY>"
```

The script prints a formatted table followed by a `JSON:` line containing all results.

Parse the `JSON:` line to get the results array. Each item has:
`title`, `size`, `format`, `seeders`, `indexer`, `downloadUrl`

If output is `NO_RESULTS`, tell the user and stop.

If exactly 1 result, use it directly.

If multiple results, show the printed table to the user and ask: `下载哪个？（输入编号）`

Wait for the user to pick, then use that result's `downloadUrl`.

---

## Step 2 — Determine download directory

Check `.claude/torrent_dir.txt` (relative to project root):

- If **exists and non-empty**: read it, tell the user which directory will be used.
- If **missing or empty**: ask:

  > 下载到哪个目录？（直接回车使用默认：`~/Public`）

  Default to `~/Downloads` if no input. Expand `~` to actual home path.

Save the chosen path to `.claude/torrent_dir.txt`.

---

## Step 3 — Ensure download directory exists

```
mkdir -p <download_dir>
```

---

## Step 4 — Detect torrent client

Check in order:
1. `which aria2c`
2. `which transmission-cli`
3. `which webtorrent`

Use the first found. If none:

> 未检测到 torrent 客户端，请先安装一个：
> - `brew install aria2`  ← 推荐
> - `brew install transmission-cli`
> - `npm install -g webtorrent-cli`

Then stop.

---

## Step 5 — Run the download

```
bash .claude/skills/torrent/download.sh "<downloadUrl>" "<download_dir>" "<title>"
```

The script runs aria2c in the background and prints `LOG:<log_path>`.

Parse the `LOG:` line and tell the user:

> 下载已在后台启动，实时查看进度：
> `tail -f <log_path>`

---

## Notes

- Always expand `~` in directory paths before running commands.
- Do not retry automatically on failure — report the error and let the user decide.

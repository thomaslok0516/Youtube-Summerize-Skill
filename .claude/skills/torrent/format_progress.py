#!/usr/bin/env python3
"""Read aria2c stdout line by line, reformat progress lines, pass through others."""

import re
import sys

# With percentage: [#abc 123MiB/456MiB(27%) CN:3 SD:1 DL:1.2MiB ETA:3m20s]
PROGRESS_RE = re.compile(
    r"\[#\w+\s+(\S+)/(\S+)\((\d+)%\).*?DL:(\S+)(?:.*?ETA:(\S+))?\]"
)
# No percentage yet (metadata phase): [#abc 0B/0B CN:0 SD:0 DL:0B]
META_RE = re.compile(r"\[#\w+\s+\S+/\S+\s+CN:(\d+)\s+SD:(\d+)\s+DL:(\S+)\]")

import io

for line in io.TextIOWrapper(sys.stdin.buffer, newline=''):
    line = line.rstrip('\r\n')

    m = PROGRESS_RE.search(line)
    if m:
        downloaded, total, pct, speed, eta = m.groups()
        eta_str = f" | 剩余: {eta}" if eta else ""
        print(f"速度: {speed:<12} 进度: {pct}%  已下载: {downloaded}/{total}{eta_str}", flush=True)
        continue

    m2 = META_RE.search(line)
    if m2:
        cn, sd, dl = m2.groups()
        print(f"获取元数据中... 连接: {cn}  做种: {sd}  速度: {dl}", flush=True)
        continue

    # Pass through other lines (errors, completion, summaries)
    if line.strip():
        print(line, flush=True)

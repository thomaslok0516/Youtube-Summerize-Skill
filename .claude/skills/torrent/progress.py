#!/usr/bin/env python3
"""Tail a torrent log file and print clean progress output."""

import re
import sys
import time

# Matches aria2c progress lines like:
# [#abc123 123MiB/456MiB(27%) CN:3 SD:1 DL:1.2MiB ETA:3m20s]
PROGRESS_RE = re.compile(
    r"\[#\w+\s+(\S+)/(\S+)\((\d+)%\).*?DL:(\S+).*?ETA:(\S+)\]"
)
# Matches download complete
COMPLETE_RE = re.compile(r"下载完成：(.+)")
ERROR_RE = re.compile(r"\[ERROR\](.+)")


def follow(path: str):
    with open(path, "r") as f:
        f.seek(0, 2)  # seek to end
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.5)
                continue
            yield line


def main():
    if len(sys.argv) < 2:
        print("Usage: progress.py <log_file>", file=sys.stderr)
        sys.exit(1)

    log_file = sys.argv[1]

    print(f"{'速度':<12} {'已下载':<12} {'总大小':<12} {'进度':<8} {'剩余时间'}")
    print("-" * 60)

    try:
        for line in follow(log_file):
            m = PROGRESS_RE.search(line)
            if m:
                downloaded, total, pct, speed, eta = m.groups()
                print(
                    f"\r{speed:<12} {downloaded:<12} {total:<12} {pct+' %':<8} {eta}",
                    end="",
                    flush=True,
                )

            c = COMPLETE_RE.search(line)
            if c:
                print(f"\n\n下载完成：{c.group(1)}")
                sys.exit(0)

            e = ERROR_RE.search(line)
            if e:
                print(f"\n下载出错：{e.group(1)}")
                sys.exit(1)

    except KeyboardInterrupt:
        print("\n已退出监控，下载仍在后台运行。")


if __name__ == "__main__":
    main()

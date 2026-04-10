#!/usr/bin/env python3
"""Search local media database and return formatted results."""

import json
import sys
import urllib.request


def search(query: str, apikey: str, host: str = "http://localhost:9696") -> list[dict]:
    url = f"{host}/api/v1/search?query={urllib.parse.quote(query)}&apikey={apikey}"
    with urllib.request.urlopen(url) as resp:
        data = json.load(resp)

    results = []
    for r in data:
        size_gb = r.get("size", 0) / (1024**3)

        cats = r.get("categories", [])
        subcats = []
        for c in cats:
            for sc in c.get("subCategories", []):
                name = sc["name"].split("/")[-1]
                if name not in subcats:
                    subcats.append(name)
        fmt = "/".join(subcats) if subcats else (cats[0]["name"] if cats else "-")

        results.append(
            {
                "title": r.get("title", ""),
                "size": f"{size_gb:.2f} GB",
                "format": fmt,
                "seeders": r.get("seeders", 0),
                "indexer": r.get("indexer", ""),
                "downloadUrl": r.get("downloadUrl", ""),
            }
        )

    results.sort(key=lambda x: x["seeders"], reverse=True)
    return results


def main():
    if len(sys.argv) < 3:
        print("Usage: search.py <query> <apikey>", file=sys.stderr)
        sys.exit(1)

    query = sys.argv[1]
    apikey = sys.argv[2]

    try:
        results = search(query, apikey)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    if not results:
        print("NO_RESULTS")
        sys.exit(0)

    # Print formatted table
    print(f"{'#':<3} {'title':<30} {'size':<10} {'format':<12} {'seeders':<8} indexer")
    print("-" * 80)
    for i, r in enumerate(results, 1):
        print(f"{i:<3} {r['title']:<30} {r['size']:<10} {r['format']:<12} {r['seeders']:<8} {r['indexer']}")

    print()
    # Output JSON for machine parsing
    print("JSON:" + json.dumps(results))


import urllib.parse

if __name__ == "__main__":
    main()

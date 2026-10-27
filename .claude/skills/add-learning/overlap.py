"""Finds where a learning page's words run alongside its source's.

Every run of six or more words that a page shares with the source is
printed, longest first. Most short ones are common phrases ("a fraction of
the way toward"); a run of eight or more is a sentence taken or closely
paraphrased, and has to be rewritten. The exit status is 1 if there is one.

    python3 -I .claude/skills/add-learning/overlap.py <source> <slug> [<slug> ...] [--pages 23-48]

<source> is the book or paper, a PDF (read with pdftotext, which poppler
has) or a text file; --pages picks a PDF's pages, so a chapter is compared
with its own pages. A page's `sources` list (titles, authors, chapter
names) is left out, since it quotes them on purpose. Standard library only.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

SHORTEST = 6  # words in the shortest run reported
TOO_LONG = 8  # words in the shortest run that fails

PAGES = Path(__file__).resolve().parents[3] / "src" / "learnings"


def source_text(path: Path, pages: str | None) -> str:
    if path.suffix.lower() != ".pdf":
        return path.read_text(errors="ignore")
    command = ["pdftotext"]
    if pages:
        first, _, last = pages.partition("-")
        command += ["-f", first, "-l", last or first]
    return subprocess.run([*command, str(path), "-"], capture_output=True, text=True, check=True).stdout


def page_text(slug: str) -> str:
    folder = PAGES / slug
    if not folder.is_dir():
        sys.exit(f"No page at {folder}")
    text = "\n".join(file.read_text() for file in sorted(folder.glob("*.tsx")))
    # The sources list names titles and chapters on purpose
    return re.sub(r"sources=\{\[.*?\]\}", " ", text, flags=re.DOTALL)


def words(text: str) -> list[str]:
    # A word broken over two lines in the PDF ("environ-\nment") is one word
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)
    return re.findall(r"[a-z0-9]+", text.lower().replace("’", "'"))


def shared_runs(page: list[str], source: list[str]) -> list[str]:
    """Each longest stretch of the page whose every SHORTEST-word window is
    in the source."""
    windows = {tuple(source[i : i + SHORTEST]) for i in range(len(source) - SHORTEST + 1)}
    hits = [tuple(page[i : i + SHORTEST]) in windows for i in range(len(page) - SHORTEST + 1)]
    runs, i = [], 0
    while i < len(hits):
        if not hits[i]:
            i += 1
            continue
        start = i
        while i < len(hits) and hits[i]:
            i += 1
        runs.append(" ".join(page[start : i - 1 + SHORTEST]))
    return sorted(set(runs), key=lambda run: -len(run.split()))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", type=Path)
    parser.add_argument("slugs", nargs="+")
    parser.add_argument("--pages", help="a PDF's pages to compare with, like 23-48")
    args = parser.parse_args()

    source = words(source_text(args.source, args.pages))
    failed = False
    for slug in args.slugs:
        runs = shared_runs(words(page_text(slug)), source)
        long = [run for run in runs if len(run.split()) >= TOO_LONG]
        failed |= bool(long)
        print(f"{slug}: {len(runs)} shared runs, {len(long)} of {TOO_LONG}+ words")
        for run in runs:
            mark = "REWRITE" if len(run.split()) >= TOO_LONG else "       "
            print(f"  {mark} {len(run.split()):>2}  {run}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

"""Generate an American-English MP3 for every word, into public/audio/.

Run once from the project folder:   python scripts/generate_audio.py
Needs internet and:                 pip install edge-tts
Safe to re-run: words that already have a file are skipped.
"""
import asyncio
import json
import re
from pathlib import Path

import edge_tts

VOICE = "en-US-AriaNeural"  # American English. For a male voice try "en-US-GuyNeural".
RATE = "-10%"               # slightly slower than normal, easier to catch each sound

root = Path(__file__).resolve().parent.parent
words = json.loads((root / "src/data/words.json").read_text(encoding="utf-8"))
out = root / "public/audio"
out.mkdir(parents=True, exist_ok=True)


def slug(w: str) -> str:
    # Must match the slug() function in src/pronounce.js
    return re.sub(r"[^a-z0-9]+", "-", w.lower()).strip("-")


async def make(word: str, sem: asyncio.Semaphore) -> None:
    path = out / f"{slug(word)}.mp3"
    if path.exists() and path.stat().st_size > 1000:
        return
    async with sem:
        for _ in range(3):
            try:
                await edge_tts.Communicate(word, VOICE, rate=RATE).save(str(path))
                return
            except Exception:
                path.unlink(missing_ok=True)
                await asyncio.sleep(2)
        print("FAILED:", word)


async def main() -> None:
    unique = sorted({w["word"] for w in words})
    sem = asyncio.Semaphore(5)
    await asyncio.gather(*(make(w, sem) for w in unique))
    print("Done.", len(list(out.glob("*.mp3"))), "audio files in", out)


asyncio.run(main())
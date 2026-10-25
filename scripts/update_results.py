#!/usr/bin/env python3
"""Fetch and validate the current-year El Gordo de la Primitiva results from SELAE."""
from __future__ import annotations

import json
import re
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "sorteos.json"
META_PATH = ROOT / "data" / "metadata.json"
YEAR = datetime.now(timezone.utc).year
BASE = "https://www.loteriasyapuestas.es"
RESULTS_URL = BASE + "/es/gordo-primitiva/resultados"
# SELAE pagination endpoint; each page lists 20 draw-detail links.
PAGINATION = BASE + "/vgn-ext-templating/render/component?lang=es_ES&page={page}&vgnextcomponentid=480bbe14bb6e8310VgnVCM100000e044a8c0RCRD&vgnextdisplayincontextedit=false&vgnextoid=86da52c9116ba310VgnVCM100000c7ab1eacRCRD&vgnextxhr=true"
MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}
HEADERS = {"User-Agent": "GordoGPT-results-bot/1.0 (public lottery results verification)"}


class TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text = []
        self.links = []

    def handle_data(self, data):
        clean = " ".join(data.split())
        if clean:
            self.text.append(clean)

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


def fetch(url: str) -> str:
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"SELAE devolvió HTTP {response.status}: {url}")
        return response.read().decode("utf-8", errors="replace")


def listing_urls(page_html: str) -> list[str]:
    parser = TextParser()
    parser.feed(page_html)
    found = []
    for href in parser.links:
        absolute = urljoin(BASE, href)
        if "/gordo-primitiva/resultados/el-gordo-de-la-primitiva-resultados-del-" in absolute:
            if absolute not in found:
                found.append(absolute)
    return found


def parse_draw(html: str) -> dict:
    parser = TextParser()
    parser.feed(html)
    text = " ".join(parser.text)
    pattern = re.compile(
        r"del\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4}),?\s+la combinación ganadora ha correspondido a los siguientes números:\s*"
        r"(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s+"
        r"Número clave\s*\(reintegro\):\s*R\s*\(\s*(\d)\s*\)",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        raise ValueError("No se pudo extraer la combinación oficial; el formato de SELAE puede haber cambiado.")
    day, month_name, year, *tail = match.groups()
    month = MONTHS[month_name.lower()]
    numbers = [int(x) for x in tail[:5]]
    key = int(tail[5])
    date = f"{int(year):04d}-{month:02d}-{int(day):02d}"
    parsed = datetime.strptime(date, "%Y-%m-%d")
    if parsed.year != int(year) or len(set(numbers)) != 5 or any(n < 1 or n > 54 for n in numbers) or not 0 <= key <= 9:
        raise ValueError(f"Resultado oficial con valores no válidos para {date}.")
    return {"date": date, "numbers": sorted(numbers), "clave": key}


def validate_history(draws: list[dict]) -> list[dict]:
    if not draws:
        raise ValueError("SELAE no devolvió sorteos del año en curso.")
    by_date = {}
    for draw in draws:
        date = draw["date"]
        if not date.startswith(f"{YEAR}-"):
            continue
        if date in by_date and by_date[date] != draw:
            raise ValueError(f"SELAE devolvió resultados contradictorios para {date}.")
        by_date[date] = draw
    ordered = sorted(by_date.values(), key=lambda item: item["date"])
    if not ordered:
        raise ValueError(f"No se encontraron sorteos del año {YEAR}.")
    # Gordo de la Primitiva is ordinarily drawn weekly. Stop rather than publish
    # a suspiciously incomplete scrape; 10 is a safe lower bound for any point in the year.
    if len(ordered) < min(10, datetime.now(timezone.utc).timetuple().tm_yday // 7):
        raise ValueError(f"Historial incompleto: solo se recuperaron {len(ordered)} sorteos de {YEAR}.")
    return ordered


def update():
    urls = []
    for page, url in enumerate([RESULTS_URL, PAGINATION.format(page=1), PAGINATION.format(page=2)]):
        html = fetch(url)
        for detail_url in listing_urls(html):
            if re.search(rf"-de-\d{{1,2}}-de-[a-z-]+-de-{YEAR}(?:$|[?#])", detail_url) and detail_url not in urls:
                urls.append(detail_url)
        time.sleep(0.15)
    if not urls:
        raise ValueError("No se encontraron enlaces de resultados de SELAE para el año actual.")
    draws = []
    for index, url in enumerate(urls, 1):
        try:
            draw = parse_draw(fetch(url))
            if draw["date"].startswith(f"{YEAR}-"):
                draws.append(draw)
        except (ValueError, URLError, TimeoutError) as error:
            raise RuntimeError(f"Fallo verificando resultado oficial {index}/{len(urls)} ({url}): {error}") from error
        if index < len(urls):
            time.sleep(0.15)
    history = validate_history(draws)
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata = {
        "source": "SELAE",
        "sourceUrl": RESULTS_URL,
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "year": YEAR,
        "drawCount": len(history),
        "latestDraw": history[-1]["date"],
        "verification": "Cada sorteo incluido se obtuvo y validó desde su página de resultados oficial.",
    }
    META_PATH.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Actualizado desde SELAE: {len(history)} sorteos de {YEAR}; último {history[-1]['date']}.")


if __name__ == "__main__":
    try:
        update()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

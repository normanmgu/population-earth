"""Retrieve the audited source; fail rather than silently accepting a revision."""
import hashlib
import json
from pathlib import Path
import urllib.request

root = Path(__file__).resolve().parents[2]
source = json.loads((root / 'data/source-manifests/cities.json').read_text())['sources'][0]
target = root / 'data/raw/WUP2025-F21-DEGURBA-Cities_Pop.xlsx'
target.parent.mkdir(parents=True, exist_ok=True)
if target.exists():
    data = target.read_bytes()
else:
    with urllib.request.urlopen(source['url'], timeout=90) as response:
        data = response.read()
if hashlib.sha256(data).hexdigest() != source['sha256']:
    raise SystemExit('Source checksum differs: audit the revision before replacing the manifest.')
target.write_bytes(data)
print('Verified source:', target.name)

"""Independent M3 comparison against the original XLSX using openpyxl."""
import hashlib
import json
from pathlib import Path
import openpyxl
root = Path(__file__).resolve().parents[2]
release = root / 'public/data/m3-2025-v1'
source = root / 'data/raw/WUP2025-F21-DEGURBA-Cities_Pop.xlsx'
manifest = json.loads((release / 'manifest.json').read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest() == manifest['sources'][0]['sha256']
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
data = json.loads((release / 'cities.json').read_text())
by_id = {c['sourceRecordId']: c for c in data['cities']}
provenance = json.loads((release / 'provenance.json').read_text())
excluded = json.loads((release / 'exclusions.json').read_text())
seen, expected_exclusions = set(), []
for index, row in enumerate(workbook['Data'].iter_rows(min_row=2, values_only=True), 2):
    code = str(row[6])
    assert code not in seen
    seen.add(code)
    if row[61] is None or round(row[61] * 1000) < 50000:
        expected_exclusions.append({'sourceRecordId': code, 'row': index, 'reason': 'No published 2025 value' if row[61] is None else 'Below 50,000 in 2025'})
        assert code not in by_id
        continue
    city = by_id.pop(code)
    assert city['nameEn'] == row[7]
    assert city['countryOrArea']['code'] == row[4] and city['countryOrArea']['name'] == row[1]
    assert city['population'] == round(row[61] * 1000)
    assert city['longitude'] == row[9] and city['latitude'] == row[10]
    origin = provenance[city['id']]
    assert origin['row'] == index and origin['populationCell'] == f'BJ{index}'
    assert float(origin['populationThousandsRaw']) == row[61]
assert not by_id and expected_exclusions == excluded
assert len(provenance) == len(data['cities']) == 12138
report = {'method': 'Independent openpyxl XLSX reader compared all eligible IDs, names, countries, coordinates, populations and row/cell provenance; verified exact excluded membership and reasons.', 'openpyxl': openpyxl.__version__, 'sourceRows': len(seen), 'checked': len(data['cities']), 'excludedChecked': len(excluded), 'sourceSha256': manifest['sources'][0]['sha256'], 'passed': True}
(root / 'docs/m3/independent-verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

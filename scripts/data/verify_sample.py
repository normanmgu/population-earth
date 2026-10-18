"""Independent audit reader. Requires openpyxl==3.1.5; not needed for normal builds."""
import hashlib
import json
import platform
from pathlib import Path
import openpyxl

root = Path(__file__).resolve().parents[2]
source = root / 'data/raw/WUP2025-F21-DEGURBA-Cities_Pop.xlsx'
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
rows = list(workbook['Data'].values)
by_id = {str(row[6]): (index, row) for index, row in enumerate(rows[1:], 2)}
data = json.loads((root / 'public/data/m0-2025-v1/cities.json').read_text())
checks = []
for city in data['cities']:
    index, row = by_id[city['sourceRecordId']]
    assert city['nameEn'] == row[7] and city['countryOrArea']['code'] == row[4]
    assert city['population'] == round(row[61] * 1000)
    assert city['longitude'] == row[9] and city['latitude'] == row[10]
    checks.append({'id': city['id'], 'row': index, 'populationThousands': row[61],
                   'populationPeople': city['population'], 'passed': True})
report = {
    'method': 'Independent openpyxl reader compared every sample name, country code, source ID, population conversion and coordinate to original XLSX; importer uses XML stdlib reader.',
    'python': platform.python_version(), 'openpyxl': openpyxl.__version__,
    'checked': len(checks), 'passed': True,
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'records': checks,
}
(root / 'data/source-manifests/independent-verification.json').write_text(json.dumps(report, indent=2) + '\n')
print('Independent source comparisons passed:', len(checks))

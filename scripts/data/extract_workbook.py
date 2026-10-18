"""Read the pinned XLSX into a lossless JSON intermediate (Python stdlib only)."""
import hashlib
import json
from pathlib import Path
import posixpath
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'data/raw/WUP2025-F21-DEGURBA-Cities_Pop.xlsx'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def extract():
    with ZipFile(SOURCE) as z:
        strings = [''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        sheets = {}
        for s in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet', NS):
            target = rels[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
            path = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
            rows = []
            for row in ET.fromstring(z.read(path)).findall('s:sheetData/s:row', NS):
                cells = {}
                for c in row.findall('s:c', NS):
                    v = c.find('s:v', NS)
                    value = None if v is None else v.text
                    if c.attrib.get('t') == 's' and value is not None:
                        value = strings[int(value)]
                    elif c.attrib.get('t') == 'inlineStr':
                        value = ''.join(c.find('s:is', NS).itertext())
                    # Retain numeric XML text exactly, especially thousand-person values.
                    cells[c.attrib['r']] = value
                rows.append({'row': int(row.attrib['r']), 'cells': cells})
            sheets[s.attrib['name']] = rows
    output = {'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'sheets': sheets}
    dest = ROOT / 'data/intermediate/workbook.json'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(output, ensure_ascii=False), encoding='utf-8')
    print('Extracted', len(sheets['Data']) - 1, 'source rows; SHA256', output['sha256'])

if __name__ == '__main__':
    extract()

import { spawnSync } from 'node:child_process';
// Set PYTHON to a working Python 3 executable if the system Python is broken.
const result = spawnSync(process.env.PYTHON || 'python3', ['scripts/data/extract_workbook.py'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);

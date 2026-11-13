import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const python = fileURLToPath(new URL(process.platform === 'win32' ? '../backend/.venv/Scripts/python.exe' : '../backend/.venv/bin/python', import.meta.url));
const child = spawn(python, ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'], { cwd: fileURLToPath(new URL('../backend/', import.meta.url)), stdio: 'inherit' });
child.on('error', error => { console.error('Create backend/.venv and install backend dependencies first.', error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });

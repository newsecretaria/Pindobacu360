#!/usr/bin/env bash
# Newsroom GTA VI — sobe o painel local em http://127.0.0.1:8787
cd "$(dirname "$0")"
command -v python3 >/dev/null || { echo "Python 3 não encontrado."; exit 1; }
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -q --disable-pip-version-check
command -v ffmpeg >/dev/null || echo "AVISO: ffmpeg não encontrado (mac: brew install ffmpeg | ubuntu: sudo apt install ffmpeg)"
echo "Painel em http://127.0.0.1:8787  (Ctrl+C para parar)"
python app.py

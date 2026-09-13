@echo off
title Newsroom GTA VI
cd /d "%~dp0"
where python >nul 2>nul || (echo Python nao encontrado. Instale em https://python.org (marque "Add to PATH"). & pause & exit /b 1)
if not exist .venv ( echo Criando ambiente... & python -m venv .venv )
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q --disable-pip-version-check
where ffmpeg >nul 2>nul || echo AVISO: ffmpeg nao encontrado. Instale com:  winget install Gyan.FFmpeg   (e reabra este terminal)
echo.
echo Painel em http://127.0.0.1:8787  (feche esta janela para parar)
python app.py
pause

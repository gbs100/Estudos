@echo off
chcp 65001 >nul
title Rich Pig Finanças - Inicializador
echo ========================================================
echo        🐷 RICH PIG FINANÇAS - CONTROLE PESSOAL
echo ========================================================
echo.

set AGY_NODE="C:\Users\LeiaSilva\AppData\Roaming\Antigravity\bin\agy-node.cmd"

if exist %AGY_NODE% (
    echo Iniciando servidor local do Rich Pig Finanças...
    start "" http://localhost:3000
    %AGY_NODE% server.js
) else (
    where node >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo Iniciando servidor Node.js...
        start "" http://localhost:3000
        node server.js
    ) else (
        echo Abrindo Rich Pig Finanças diretamente no navegador...
        start "" "%~dp0index.html"
    )
)
pause

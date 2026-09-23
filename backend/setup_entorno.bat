@echo off
setlocal enabledelayedexpansion

rem Deja el entorno local del backend listo: crea el .venv, instala requirements.txt
rem y copia .env.example a .env si todavia no existe. Correr una sola vez desde
rem esta carpeta (backend\), con doble clic o con:
rem
rem   setup_entorno.bat

set "BACKEND_DIR=%~dp0"
cd /d "%BACKEND_DIR%"

echo === Emanuel_Obras: preparando entorno local ===

if not exist ".venv\Scripts\python.exe" (
    echo Creando entorno virtual .venv ...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: no se pudo crear el .venv. Verifica que "python" este en el PATH.
        exit /b 1
    )
) else (
    echo .venv ya existe, se reutiliza.
)

echo Instalando dependencias de requirements.txt ...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: fallo la instalacion de dependencias.
    exit /b 1
)

if not exist ".env" (
    echo No existe .env, se copia desde .env.example ^(ajusta DATABASE_URL y SECRET_KEY^) ...
    copy /y ".env.example" ".env" >nul
) else (
    echo .env ya existe, no se toca.
)

echo.
echo === Listo ===
echo Antes de arrancar el backend:
echo   1. Revisa backend\.env: reemplaza TU_CLAVE_POSTGRES por la clave real del usuario postgres.
echo   2. Crea la base de datos si no existe:  psql -U postgres -c "CREATE DATABASE emanuel_obras;"
echo   3. Crea el primer usuario administrador:  .venv\Scripts\python.exe -m scripts.crear_usuario_admin
echo   4. Arranca el backend:  .venv\Scripts\python.exe -m uvicorn app.main:app --reload
echo.

endlocal

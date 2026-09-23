@echo off
setlocal

rem Tarea programada: genera alertas de retraso (alertas_service.generar_alertas_retraso).
rem Pensada para registrarse en el Programador de tareas de Windows (Task Scheduler).
rem No se expone por la API a proposito (regla R9 del Estandar): las alertas nunca
rem se crean por un POST del usuario, solo por esta tarea periodica.
rem
rem Registro (una sola vez, en cmd o PowerShell normal, sin permisos de administrador):
rem
rem   schtasks /create /tn "EmanuelObras - Alertas de retraso" ^
rem     /tr "\"%~f0\"" /sc daily /st 06:00 /rl LIMITED /f
rem
rem Ver el historial:   type "%~dp0..\logs\alertas.log"
rem Eliminar la tarea:  schtasks /delete /tn "EmanuelObras - Alertas de retraso" /f

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%.."
set "LOG_DIR=%BACKEND_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\alertas.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

cd /d "%BACKEND_DIR%"

echo ==== %DATE% %TIME% ==== >> "%LOG_FILE%"

if exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    "%BACKEND_DIR%\.venv\Scripts\python.exe" -m scripts.generar_alertas >> "%LOG_FILE%" 2>&1
) else (
    python -m scripts.generar_alertas >> "%LOG_FILE%" 2>&1
)

echo(>> "%LOG_FILE%"

endlocal

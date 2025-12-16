@echo off
echo ============================================
echo   DSpace Services Startup Script
echo ============================================
echo.

REM Start PostgreSQL
echo [1/5] Starting PostgreSQL...
net start postgresql-x64-18 2>nul
if %errorlevel%==0 (
    echo       PostgreSQL started successfully
) else (
    echo       PostgreSQL already running or failed to start
)
echo.

REM Start Solr
echo [2/5] Starting Solr...
cd /d C:\solr-9.9.0\bin
call solr.cmd start -p 8983
echo       Waiting for Solr to be ready...
timeout /t 10 /nobreak >nul

REM Check if Solr is running
:check_solr
curl -s http://localhost:8983/solr/admin/cores?action=STATUS >nul 2>&1
if %errorlevel%==0 (
    echo       Solr is ready!
) else (
    echo       Waiting for Solr...
    timeout /t 5 /nobreak >nul
    goto check_solr
)
echo.

REM Start Tomcat (DSpace API)
echo [3/5] Starting Tomcat (DSpace API Server)...
set "CATALINA_HOME=C:\Program Files\Apache Software Foundation\Tomcat 10.1"
net start Tomcat10 2>nul
if %errorlevel%==0 (
    echo       Tomcat started successfully
) else (
    echo       Tomcat already running, restarting DSpace webapp...
    curl -s -u root:root "http://localhost:8080/manager/text/stop?path=/server" >nul 2>&1
    curl -s -u root:root "http://localhost:8080/manager/text/start?path=/server"
)

echo.
echo       Waiting for DSpace API to be ready...
timeout /t 30 /nobreak >nul

REM Check if DSpace API is running
:check_dspace
curl -s http://localhost:8080/server/api >nul 2>&1
if %errorlevel%==0 (
    echo       DSpace API is ready!
) else (
    echo       Waiting for DSpace API...
    timeout /t 10 /nobreak >nul
    goto check_dspace
)
echo.

REM Start Nginx
echo [4/5] Starting Nginx...
cd /d C:\nginx-1.28.0
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL
if %errorlevel%==0 (
    echo       Nginx already running, reloading config...
    nginx.exe -s reload
) else (
    start /B nginx.exe
    echo       Nginx started successfully
)
echo.

REM Start DSpace Angular UI
echo [5/5] Starting DSpace Angular UI...
cd /d C:\dspace-angular
tasklist /FI "WINDOWTITLE eq DSpace Angular" 2>NUL | find /I /N "node.exe">NUL
if %errorlevel%==0 (
    echo       Angular already running
) else (
    start "DSpace Angular" /B node simple-server.js
    echo       Angular started successfully
)

echo       Waiting for Angular to be ready...
timeout /t 5 /nobreak >nul

REM Check if Angular is running
:check_angular
curl -s http://localhost:5000 >nul 2>&1
if %errorlevel%==0 (
    echo       Angular is ready!
) else (
    echo       Waiting for Angular...
    timeout /t 3 /nobreak >nul
    goto check_angular
)

echo.
echo ============================================
echo   All DSpace Services Started Successfully!
echo ============================================
echo.
echo   PostgreSQL:     Running
echo   Solr:           http://localhost:8983/solr
echo   DSpace API:     http://localhost:8080/server/api
echo   Angular UI:     http://localhost:5000
echo   Nginx Proxy:    http://localhost (port 80)
echo.
pause

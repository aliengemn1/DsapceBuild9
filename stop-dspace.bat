@echo off
echo ============================================
echo   DSpace Services Shutdown Script
echo ============================================
echo.

REM Stop Angular
echo [1/5] Stopping DSpace Angular UI...
taskkill /FI "WINDOWTITLE eq DSpace Angular" /F 2>nul
if %errorlevel%==0 (
    echo       Angular stopped successfully
) else (
    echo       Angular was not running or already stopped
)
echo.

REM Stop Nginx
echo [2/5] Stopping Nginx...
cd /d C:\nginx-1.28.0
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL
if %errorlevel%==0 (
    nginx.exe -s stop
    echo       Nginx stopped successfully
) else (
    echo       Nginx was not running
)
echo.

REM Stop Tomcat (DSpace API)
echo [3/5] Stopping Tomcat (DSpace API Server)...
net stop Tomcat10 2>nul
if %errorlevel%==0 (
    echo       Tomcat stopped successfully
) else (
    echo       Tomcat was not running
)
echo.

REM Stop Solr
echo [4/5] Stopping Solr...
cd /d C:\solr-9.9.0\bin
call solr.cmd stop -all
echo       Solr stopped
echo.

REM Stop PostgreSQL (optional - uncomment if needed)
REM echo [5/5] Stopping PostgreSQL...
REM net stop postgresql-x64-18 2>nul
echo [5/5] PostgreSQL left running (usually needed for other apps)
echo.

echo ============================================
echo   All DSpace Services Stopped
echo ============================================
echo.
pause

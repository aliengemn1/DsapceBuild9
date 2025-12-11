@echo off
echo ========================================
echo Starting DSpace Services (IPv4 Only)
echo ========================================

:: Set Java Home
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

:: Set Tomcat Home
set "CATALINA_HOME=C:\Tomcat 10.1"

:: Force IPv4 for Java
set "CATALINA_OPTS=-Djava.net.preferIPv4Stack=true -Xms512m -Xmx2048m"

echo.
echo [1] Starting Apache Tomcat (IPv4)...
cd /d "%CATALINA_HOME%\bin"
call startup.bat

echo.
echo [2] Starting Nginx...
cd /d "C:\nginx-1.28.0"
start nginx.exe

echo.
echo [3] Starting Angular (DSpace Frontend - IPv4)...
cd /d "C:\dspace-angular"
start cmd /k "set NODE_OPTIONS=--dns-result-order=ipv4first && npm run start"

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Tomcat (Backend): http://localhost:8080/server/api
echo Angular (Frontend): http://localhost:4200
echo.
pause

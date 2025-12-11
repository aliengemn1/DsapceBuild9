@echo off
:: Run as Administrator to start Tomcat service
echo Starting Apache Tomcat 10.1 service...
net start Tomcat10
if %errorlevel% == 0 (
    echo Tomcat started successfully!
) else (
    echo Failed to start Tomcat. Error code: %errorlevel%
    pause
)

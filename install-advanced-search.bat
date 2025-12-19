@echo off
mkdir "C:\dspace-angular\src\app\advanced-search" 2>nul
xcopy /Y "dspace-angular-advanced-search\*.ts" "C:\dspace-angular\src\app\advanced-search\"
xcopy /Y "dspace-angular-advanced-search\*.html" "C:\dspace-angular\src\app\advanced-search\"
xcopy /Y "dspace-angular-advanced-search\*.scss" "C:\dspace-angular\src\app\advanced-search\"
echo Done!
dir "C:\dspace-angular\src\app\advanced-search"

@echo off
cd /d "%~dp0"
echo Starting local server for St. Mary's Sanctuary site...
echo Open the URL shown below (usually http://localhost:3000)
echo.
npx --yes serve "."

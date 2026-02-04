@echo off

echo Checking Node.js version...

where nvm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo NVM not found. Please install NVM for Windows from https://github.com/coreybutler/nvm-windows
  exit /b 1
)

set NODE_VERSION=22

for /f "tokens=*" %%i in ('nvm current') do nvm set CURRENT_NODE=%%i

if not "%CURRENT_NODE%"=="v%NODE_VERSION%" (
  echo Installing and using Node.js %NODE_VERSION%...
  call nvm install %NODE_VERSION%
  call nvm use %NODE_VERSION%
) else (
  echo Node.js %NODE_VERSION% is already active.
)

where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Installing pnpm...
  call npm install -g pnpm
) else (
  echo pnpm is already installed.
)

if not exist "node_modules" (
  echo Installing dependencies...
  call pnpm install
) else (
  echo Dependencies are already installed.
)

echo Setup complete! You can now run 'pnpm run dev' to start the server.

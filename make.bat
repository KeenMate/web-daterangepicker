@echo off
REM Windows batch file alternative to Makefile
REM Usage: make.bat <command>

setlocal enabledelayedexpansion

if "%1"=="" goto :help
if "%1"=="help" goto :help
if "%1"=="setup" goto :setup
if "%1"=="dev" goto :dev
if "%1"=="build" goto :build
if "%1"=="package" goto :package
if "%1"=="publish-dry" goto :publish-dry
if "%1"=="publish" goto :publish
if "%1"=="clean" goto :clean
if "%1"=="clean-dist" goto :clean-dist
if "%1"=="preview" goto :preview
if "%1"=="check-version" goto :check-version
if "%1"=="test" goto :test-e2e
if "%1"=="test-e2e" goto :test-e2e
if "%1"=="test-e2e-ui" goto :test-e2e-ui
if "%1"=="test-e2e-headed" goto :test-e2e-headed
if "%1"=="test-e2e-install" goto :test-e2e-install
goto :unknown

:help
echo.
echo Available commands:
echo   setup         - Install dependencies
echo   dev           - Start development server
echo   build         - Build for production
echo   package       - Create npm package
echo   publish-dry   - Publish dry-run
echo   publish       - Publish to npm
echo   clean         - Clean all build artifacts
echo   clean-dist    - Clean only dist folder
echo   preview       - Preview production build
echo   check-version - Show current version
echo.
echo Testing (Playwright e2e):
echo   test          - Run e2e tests (alias for test-e2e)
echo   test-e2e      - Run Playwright e2e tests (headless)
echo   test-e2e-ui   - Run Playwright e2e tests in interactive UI mode
echo   test-e2e-headed  - Run Playwright e2e tests headed
echo   test-e2e-install - One-time: install chromium browser binary
echo.
goto :end

:setup
echo Installing dependencies...
call npm install
echo Setup complete!
goto :end

:dev
echo Starting development server...
call npm run dev
goto :end

:build
echo Building for production...
call npm run build
echo Build complete! Files in ./dist
goto :end

:package
echo Creating package...
call npm run package
echo Package created!
dir /b *.tgz
goto :end

:publish-dry
echo Running publish dry-run...
call npm run publish:dry
echo Dry-run complete!
goto :end

:publish
echo WARNING: This will publish to npm registry!
set /p confirm="Press Enter to continue or Ctrl+C to cancel..."
echo Publishing to npm...
call npm publish
echo Published successfully!
goto :end

:clean
echo Cleaning build artifacts...
call npm run clean
echo Clean complete!
goto :end

:clean-dist
echo Cleaning dist folder...
call npm run clean:dist
echo Dist cleaned!
goto :end

:preview
echo Starting preview server...
call npm run preview
goto :end

:check-version
echo Current version:
call node -p "require('./package.json').version"
goto :end

:test-e2e
echo Running Playwright e2e tests...
call npm run test:e2e
goto :end

:test-e2e-ui
call npm run test:e2e:ui
goto :end

:test-e2e-headed
call npm run test:e2e:headed
goto :end

:test-e2e-install
echo Installing chromium browser binary...
call npm run test:e2e:install
goto :end

:unknown
echo Unknown command: %1
echo Run "make.bat help" to see available commands
goto :end

:end
endlocal

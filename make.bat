@echo off
REM Windows batch file alternative to Makefile
REM Usage: make.bat <command>

setlocal enabledelayedexpansion

REM Container image config (override via environment variables before calling).
if not defined DOCKER_RUNNER set DOCKER_RUNNER=podman
if not defined IMAGE_NAME set IMAGE_NAME=registry.km8.es/web-daterangepicker-examples:prod
if not defined CONTAINER_NAME set CONTAINER_NAME=web-daterangepicker-examples
if not defined IMAGE_PORT set IMAGE_PORT=12310

if "%1"=="" goto :help
if "%1"=="help" goto :help
if "%1"=="setup" goto :setup
if "%1"=="dev" goto :dev
if "%1"=="kill-port" goto :kill-port
if "%1"=="build" goto :build
if "%1"=="package" goto :package
if "%1"=="publish-dry" goto :publish-dry
if "%1"=="publish" goto :publish
if "%1"=="publish-rc" goto :publish-rc
if "%1"=="clean" goto :clean
if "%1"=="clean-dist" goto :clean-dist
if "%1"=="preview" goto :preview
if "%1"=="check-version" goto :check-version
if "%1"=="test" goto :test-e2e
if "%1"=="test-e2e" goto :test-e2e
if "%1"=="test-e2e-ui" goto :test-e2e-ui
if "%1"=="test-e2e-headed" goto :test-e2e-headed
if "%1"=="test-e2e-install" goto :test-e2e-install
if "%1"=="image-build" goto :image-build
if "%1"=="image-run" goto :image-run
if "%1"=="image-stop" goto :image-stop
if "%1"=="image-clean" goto :image-clean
goto :unknown

:help
echo.
echo Available commands:
echo   setup         - Install dependencies
echo   dev           - Start development server
echo   build         - Build for production
echo   package       - Create npm package
echo   publish-dry   - Publish dry-run
echo   publish       - Publish to npm (latest tag)
echo   publish-rc    - Publish to npm under the 'rc' dist-tag
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
echo Dev server / container image:
echo   kill-port     - Free the vite dev-server ports (12300-12305)
echo   image-build   - Build the examples container image
echo   image-run     - Run the examples image (serves on %IMAGE_PORT%)
echo   image-stop    - Stop and remove the examples container
echo   image-clean   - Remove the examples container and image
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
echo WARNING: This will publish to npm registry as 'latest'!
set /p confirm="Press Enter to continue or Ctrl+C to cancel..."
echo Publishing to npm...
call npm publish
echo Published successfully!
goto :end

:publish-rc
echo WARNING: This will publish to npm registry under the 'rc' dist-tag!
echo (consumers running 'npm install' will NOT pick this up; they opt in via @rc)
set /p confirm="Press Enter to continue or Ctrl+C to cancel..."
echo Publishing to npm with --tag rc...
call npm publish --tag rc
echo Published successfully under the 'rc' dist-tag!
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

:kill-port
echo Freeing ports 12300-12305...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R ":1230[0-5] " ^| findstr LISTENING') do (
    taskkill /F /PID %%p >nul 2>&1
)
echo Ports 12300-12305 are free
goto :end

:image-build
echo Building %IMAGE_NAME% with %DOCKER_RUNNER%...
call %DOCKER_RUNNER% build -t %IMAGE_NAME% .
echo Image built: %IMAGE_NAME%
goto :end

:image-run
echo Starting %CONTAINER_NAME% on http://localhost:%IMAGE_PORT% ...
call %DOCKER_RUNNER% rm -f %CONTAINER_NAME% >nul 2>&1
call %DOCKER_RUNNER% run -d --name %CONTAINER_NAME% -p %IMAGE_PORT%:80 %IMAGE_NAME%
echo Serving examples at http://localhost:%IMAGE_PORT%
goto :end

:image-stop
echo Stopping %CONTAINER_NAME%...
call %DOCKER_RUNNER% rm -f %CONTAINER_NAME% >nul 2>&1
echo Stopped
goto :end

:image-clean
echo Removing container and image %IMAGE_NAME%...
call %DOCKER_RUNNER% rm -f %CONTAINER_NAME% >nul 2>&1
call %DOCKER_RUNNER% rmi %IMAGE_NAME% >nul 2>&1
echo Image removed
goto :end

:unknown
echo Unknown command: %1
echo Run "make.bat help" to see available commands
goto :end

:end
endlocal

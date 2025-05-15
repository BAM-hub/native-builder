@echo off
setlocal

:: Arguments
:: %1 = NATIVE_TEMPLATE path
:: %2 = Android ZIP filename
:: %3 = iOS ZIP filename

:: Validate inputs
if "%~1"=="" (
  echo ❌ Error: NATIVE_TEMPLATE path is missing.
  exit /b 1
)
if "%~2"=="" (
  echo ❌ Error: Android zip filename is missing.
  exit /b 1
)
if "%~3"=="" (
  echo ❌ Error: iOS zip filename is missing.
  exit /b 1
)

set NATIVE_TEMPLATE=%~1
set ANDROID_FILE=%~2
set IOS_FILE=%~3

:: Create temp folders
mkdir "%NATIVE_TEMPLATE%\tempandroid"
mkdir "%NATIVE_TEMPLATE%\tempios"

:: Unzip Android and iOS
tar -xf "%NATIVE_TEMPLATE%\%ANDROID_FILE%" -C "%NATIVE_TEMPLATE%\tempandroid"
tar -xf "%NATIVE_TEMPLATE%\%IOS_FILE%" -C "%NATIVE_TEMPLATE%\tempios"

rm "%NATIVE_TEMPLATE%\%ANDROID_FILE%"
rm "%NATIVE_TEMPLATE%\%ANDROID_FILE%"


:: Move extracted bundles
move /Y "%NATIVE_TEMPLATE%\tempandroid\assets\index.android.bundle" "%NATIVE_TEMPLATE%\android\app\src\main\assets"
move /Y "%NATIVE_TEMPLATE%\tempios\index.ios.bundle" "%NATIVE_TEMPLATE%\ios\Bundle"

:: Cleanup temp folders
rmdir /S /Q "%NATIVE_TEMPLATE%\tempandroid"
rmdir /S /Q "%NATIVE_TEMPLATE%\tempios"

cd /d "%NATIVE_TEMPLATE%"

echo 🔧 Adding Android bundle
git add ".\android\app\src\main\assets\index.android.bundle"

echo 🔧 Adding iOS bundle
git add ".\ios\Bundle\index.ios.bundle"


echo 📝 Committing changes
git commit -m "Create New bundle"

echo 🚀 Pushing to remote
git push

endlocal

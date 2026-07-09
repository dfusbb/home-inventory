# Build APK

Android SDK was not found on this computer during packaging.

## Option A: Android Studio (local)
1. Install Android Studio from https://developer.android.com/studio
2. After deploying to cloud, set your site URL:
   ```powershell
   $env:CAPACITOR_SERVER_URL="https://YOUR-SITE.netlify.app"
   npm run cap:sync
   npm run apk:build
   ```
3. In Android Studio: Build -> Build APK(s)
4. Output: `android\app\build\outputs\apk\debug\app-debug.apk`

## Option B: GitHub Actions (free cloud build)
1. Upload project to GitHub
2. Go to Actions -> "Build Android APK" -> Run workflow
3. Download `home-inventory-apk` artifact

## Login credentials
- Family name: admin
- Address: admin
- Code: 1234

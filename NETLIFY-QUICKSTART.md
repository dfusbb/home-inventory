# Netlify Quick Deploy

## 1. Database (Neon - free)
- Sign up at https://neon.tech
- Create a project and copy DATABASE_URL

## 2. Update prisma/schema.prisma for cloud
Change provider from sqlite to postgresql:
```
provider = "postgresql"
```

## 3. Netlify
- Go to https://app.netlify.com
- Add site -> Import from Git (upload this ZIP to GitHub first)
- Build command: `npx prisma generate && npx prisma db push && npm run build`
- Publish directory: `.next`

## 4. Environment variables in Netlify
```
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-secret
ADMIN_FAMILY_NAME=admin
ADMIN_ADDRESS=admin
ADMIN_CODE=1234
```

## 5. After deploy
- Open your site URL
- Login: admin / admin / 1234

## 6. APK for phone
After you have a live URL:
```powershell
$env:CAPACITOR_SERVER_URL="https://YOUR-SITE.netlify.app"
npm install
npm run cap:sync
npm run apk:build
```
Requires Android Studio, or use GitHub Actions workflow in `.github/workflows/build-apk.yml`

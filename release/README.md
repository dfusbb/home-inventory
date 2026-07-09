# חבילת פריסה - ניהול מלאי הבית

## קבצים בתיקייה זו

| קובץ | שימוש |
|------|--------|
| **home-inventory-cloud.zip** | העלאה לענן (Netlify / GitHub) |
| **NETLIFY-QUICKSTART.md** | הוראות פריסה מהירה |
| **BUILD-APK.md** | הוראות בניית APK לטלפון |

## כניסת מנהל
- שם משפחה: `admin`
- כתובת: `admin`
- קוד: `1234`

## סדר עבודה מומלץ

1. העלו את ה-ZIP ל-GitHub (או חברו ל-Netlify)
2. צרו מסד PostgreSQL ב-Neon (חינם)
3. פרסמו ב-Netlify עם משתני הסביבה
4. בנו APK עם כתובת האתר (ראו BUILD-APK.md)

## בניית APK במחשב זה
Android SDK לא מותקן - לא ניתן לבנות APK אוטומטית.
התקינו **Android Studio** והריצו:
```
npm run release
```

או השתמשו ב-GitHub Actions (קובץ `.github/workflows/build-apk.yml` בתוך ה-ZIP).

# מדריך העלאה לענן – Netlify / Firebase

## חשוב לדעת לפני שמתחילים

האפליקציה שלך היא **Next.js מלא** (עם שרת, מסד נתונים ו-API).
לכן:

| פלטפורמה | האם מתאימה? | הערה |
|-----------|-------------|------|
| **Netlify** | ✅ מומלץ | תומך ב-Next.js מלא |
| **Firebase Hosting** (רגיל) | ❌ לא מתאים | רק לאתרים סטטיים |
| **Firebase App Hosting** | ⚠️ אפשרי | דורש GitHub + הגדרות נוספות |

**המלצה: העלו ל-Netlify** – הכי פשוט לאפליקציה הזו.

---

## שלב 0 – מסד נתונים בענן (חובה!)

SQLite עובד רק במחשב שלך. בענן צריך PostgreSQL חינמי.

### יצירת מסד ב-Neon (5 דקות, חינם)

1. היכנסו ל-[neon.tech](https://neon.tech) והירשמו
2. לחצו **New Project**
3. העתיקו את ה-**Connection String** (נראה כך):
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. שמרו אותו – תצטרכו אותו ב-Netlify

### מעבר ל-PostgreSQL בפרויקט

פתחו `prisma/schema.prisma` ושנו את השורות:

```prisma
datasource db {
  provider = "postgresql"    // ← שנה מ-sqlite
  url      = env("DATABASE_URL")
}
```

בקובץ `.env` שימו את ה-Connection String מ-Neon:
```
DATABASE_URL="postgresql://..."
```

הריצו בטרמינל:
```bash
npm run db:push
npm run db:seed
```

---

## אפשרות א' – Netlify (מומלץ)

### דרך 1: דרך האתר (הכי קל)

#### 1. התקינו Git
הורידו מ-[git-scm.com](https://git-scm.com/download/win) והתקינו.

#### 2. העלו ל-GitHub
```bash
cd "c:\Users\USER\Documents\אפליקצייה לקניות"
git init
git add .
git commit -m "אפליקציית ניהול מלאי הבית"
```

צרו repository חדש ב-[github.com/new](https://github.com/new) (שם באנגלית, למשל `home-inventory`).

```bash
git remote add origin https://github.com/YOUR_USERNAME/home-inventory.git
git branch -M main
git push -u origin main
```

#### 3. חברו ל-Netlify
1. היכנסו ל-[app.netlify.com](https://app.netlify.com)
2. לחצו **Add new site** → **Import an existing project**
3. בחרו **GitHub** ואשרו גישה
4. בחרו את ה-repository שיצרתם
5. הגדרות Build (Netlify יזהה אוטומטית מ-`netlify.toml`):
   - Build command: `npx prisma generate && npx prisma db push && npm run build`
   - Publish directory: `.next`

#### 4. הגדירו משתני סביבה
ב-Netlify: **Site settings** → **Environment variables** → **Add a variable**

| משתנה | ערך |
|--------|-----|
| `DATABASE_URL` | ה-Connection String מ-Neon |
| `JWT_SECRET` | מחרוזת אקראית ארוכה (למשל: `my-super-secret-key-2026-xyz`) |
| `ADMIN_FAMILY_NAME` | `מנהל` |
| `ADMIN_ADDRESS` | `מערכת` |
| `ADMIN_CODE` | קוד חזק שתבחרו |

#### 5. פרסמו
לחצו **Deploy site**. אחרי 2–3 דקות האתר יהיה באוויר!

כתובת האתר תיראה כך: `https://random-name-123.netlify.app`

ניתן לשנות שם תחת **Domain settings**.

---

### דרך 2: Netlify CLI (בלי GitHub)

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set DATABASE_URL "postgresql://..."
netlify env:set JWT_SECRET "your-secret"
netlify env:set ADMIN_FAMILY_NAME "מנהל"
netlify env:set ADMIN_ADDRESS "מערכת"
netlify env:set ADMIN_CODE "your-admin-code"
netlify deploy --prod
```

---

## אפשרות ב' – Firebase

### Firebase Hosting רגיל – לא יעבוד
Firebase Hosting רגיל מיועד לאתרים סטטיים בלבד.
האפליקציה שלך צריכה שרת (API, מסד נתונים) – לכן זה לא מתאים.

### Firebase App Hosting – אפשרי אבל מורכב יותר

1. היכנסו ל-[console.firebase.google.com](https://console.firebase.google.com)
2. צרו פרויקט חדש (למשל `home-inventory`)
3. עדכנו `.firebaserc` – החליפו `YOUR_FIREBASE_PROJECT_ID` בשם הפרויקט
4. ודאו ש-`prisma/schema.prisma` משתמש ב-`postgresql` (ראו שלב 0)
5. העלו את הקוד ל-GitHub (כמו בשלב 1 של Netlify)
6. ב-Firebase Console: **App Hosting** → **Get started**
7. חברו את ה-GitHub repository
8. הגדירו משתני סביבה (`DATABASE_URL`, `JWT_SECRET`, וכו')
9. לחצו **Deploy**

> **שים לב:** Firebase App Hosting דורש חשבון Blaze (תשלום לפי שימוש, יש מכסה חינמית).
> לרוב המשפחות, Netlify + Neon מספיקים בחינם לגמרי.

---

## אחרי ההעלאה – בדיקה

1. פתחו את כתובת האתר
2. התחברו כמנהל:
   - שם משפחה: `מנהל`
   - כתובת: `מערכת`
   - קוד: מה שהגדרתם ב-`ADMIN_CODE`
3. הוסיפו משפחה ראשונה
4. בדקו מהטלפון שהכול עובד

---

## תמונות מוצרים בענן

כרגע תמונות נשמרות בשרת – בענן הן עלולות להימחק.
לשימוש קבוע, מומלץ בעתיד לחבר [Cloudinary](https://cloudinary.com) (חינמי).

---

## סיכום מהיר

```
1. צרו מסד ב-Neon          → קבלו DATABASE_URL
2. שנהו schema ל-postgresql
3. העלו ל-GitHub
4. Netlify → Import project → הגדירו משתנים → Deploy
5. פתחו את האתר ותתחילו לעבוד!
```

---

## עזרה נפוצה

**שגיאת build ב-Netlify?**
- ודאו ש-`DATABASE_URL` מוגדר ב-Environment variables
- ודאו ש-schema.prisma משתמש ב-`postgresql`

**לא מצליח להתחבר?**
- הריצו `npm run db:seed` מקומית עם אותו DATABASE_URL לפני ה-deploy
- או הוסיפו ל-build command: `&& npx tsx prisma/seed.ts`

**Git לא מותקן?**
- הורידו מ-[git-scm.com](https://git-scm.com/download/win)

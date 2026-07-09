# ניהול מלאי הבית

אפליקציה לניהול מלאי מוצרים ורשימת קניות לכל משפחה, עם ממשק בעברית (RTL).

## תכונות

- **מנהל מערכת** – יכול להוסיף משתמשים (משפחות)
- **כניסה** – שם משפחה + כתובת + קוד
- **זיהוי משתמש** – לאחר כניסה, כל בן משפחה מזין את שמו
- **מלאי** – ניהול מוצרים עם תמונות, כמויות, וסימון חסר
- **רשימת קניות** – עדכון אוטומטי כשמוצר חסר
- **יציאה לקניות** – הורדת PDF להדפסה
- **דוחות** – שבועי / חודשי / שנתי עם תאריכים ושעות

## התקנה מקומית

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

פתחו: http://localhost:3000

### פרטי כניסה למנהל (ברירת מחדל)

| שדה | ערך |
|-----|-----|
| שם משפחה | מנהל |
| כתובת | מערכת |
| קוד | admin123 |

**חשוב:** שנו את הקוד ב-production!

## העלאה לענן (Vercel + PostgreSQL)

### 1. מסד נתונים

צרו מסד PostgreSQL חינמי ב-[Neon](https://neon.tech) או [Supabase](https://supabase.com).

עדכנו `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. משתני סביבה

```
DATABASE_URL=postgresql://...
JWT_SECRET=מחרוזת-אקראית-ארוכה
ADMIN_FAMILY_NAME=מנהל
ADMIN_ADDRESS=מערכת
ADMIN_CODE=קוד-חזק-למנהל
```

### 3. פריסה ב-Vercel

```bash
npm i -g vercel
vercel
```

הגדירו את משתני הסביבה ב-Vercel Dashboard.

לאחר הפריסה הראשונה:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. תמונות בענן

בסביבת production, העלאת תמונות נשמרת בתיקיית `public/uploads`. ב-Vercel זה זמני (נמחק בכל deploy).

לשימוש קבוע, מומלץ לחבר שירות אחסון כמו [Cloudinary](https://cloudinary.com) או [Uploadthing](https://uploadthing.com).

## מבנה האפליקציה

```
src/
  app/
    page.tsx          # מסך כניסה
    dashboard/        # ממשק משפחה (3 עמודות)
    admin/            # ניהול משתמשים
    api/              # API routes
  components/         # רכיבי UI
  lib/                # auth, prisma, pdf, activity
prisma/
  schema.prisma       # מודל נתונים
```

## שימוש

1. המנהל נכנס ומוסיף משפחות (שם + כתובת + קוד)
2. כל משפחה נכנסת עם הפרטים שלה
3. בן המשפחה מזין את שמו
4. מנהלים מלאי, מסמנים חסר, ומורידים PDF לקניות
5. צופים בדוחות פעילות לפי תקופה

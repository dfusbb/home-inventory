# מדריך בניית APK לאנדרוד

## חשוב – נתיב בעברית

הפרויקט נמצא בתיקייה עם שם בעברית. הוספנו `android.overridePathCheck=true` ב-`gradle.properties`.
אם עדיין יש שגיאות build, העתיקו את הפרויקט לנתיב באנגלית, למשל:
`C:\Projects\home-inventory`

---
כך כל המשפחות משתמשות באותו שרת מעודכן.

---

## דרישות מוקדמות

1. **האתר חי בענן** (Netlify) – ראו `DEPLOY.md`
2. **Android Studio** – הורידו מ-[developer.android.com/studio](https://developer.android.com/studio)
3. **Node.js** – כבר מותקן אצלכם

---

## שלב 1 – הגדירו את כתובת האתר

לפני בניית ה-APK, הגדירו את כתובת האתר בענן.

ב-PowerShell (החליפו בכתובת האמיתית שלכם מ-Netlify):

```powershell
$env:CAPACITOR_SERVER_URL="https://your-app-name.netlify.app"
```

> **חשוב:** בלי שלב זה ה-APK ינסה להתחבר לשרת מקומי שלא קיים בטלפון.

---

## שלב 2 – התקינו תלויות ואנדרואיד

```powershell
cd "c:\Users\USER\Documents\אפליקצייה לקניות"
npm install
npm run cap:sync
```

---

## שלב 3 – פתחו ב-Android Studio

```powershell
npm run cap:open:android
```

או: Android Studio → **Open** → בחרו את התיקייה `android`

---

## שלב 4 – בנו את ה-APK

ב-Android Studio:

1. המתינו ש-Gradle יסיים (פס תחתון)
2. תפריט: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. כשמוכן, לחצו **locate** בחלון ההודעה

**מיקום הקובץ:**
```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## שלב 5 – התקנה בטלפון

### אפשרות א': USB
1. הפעילו **מצב מפתח** בטלפון (Settings → About → לחיצה 7 פעמים על Build number)
2. הפעילו **USB debugging**
3. חברו למחשב → Android Studio → **Run** (▶)

### אפשרות ב': שליחת הקובץ
1. שלחו את `app-debug.apk` לעצמכם ב-WhatsApp / אימייל
2. בטלפון: פתחו את הקובץ → **התקן**
3. אם נדרש: Settings → אפשר התקנה ממקורות לא ידועים

---

## APK לפרסום (חתום) – Google Play / הפצה

לבניית APK חתום לפרסום:

1. Android Studio → **Build** → **Generate Signed Bundle / APK**
2. בחרו **APK**
3. צרו Keystore חדש (שמרו את הסיסמה!)
4. בחרו **release**
5. הקובץ יישמר ב:
   ```
   android\app\build\outputs\apk\release\app-release.apk
   ```

---

## עדכון האפליקציה אחרי שינויים באתר

אם שיניתם רק את **האתר** (Netlify) – **אין צורך לבנות APK מחדש**.
ה-APK טוען את האתר מהענן.

בנו APK מחדש רק אם שיניתם:
- שם האפליקציה / אייקון
- כתובת השרת (`CAPACITOR_SERVER_URL`)
- הגדרות Capacitor

---

## פקודות שימושיות

| פקודה | מה עושה |
|--------|---------|
| `npm run cap:sync` | מסנכרן שינויים לפרויקט אנדרואיד |
| `npm run cap:open:android` | פותח Android Studio |
| `npm run apk:build` | מסנכרן ופותח Android Studio לבנייה |

---

## בדיקה מקומית (לפני העלאה לענן)

אם רוצים לבדוק APK מול השרת המקומי:

1. הריצו `npm run dev`
2. מצאו את כתובת ה-IP של המחשב (למשל `192.168.1.10`)
3. הגדירו:
   ```powershell
   $env:CAPACITOR_SERVER_URL="http://192.168.1.10:3000"
   npm run cap:sync
   ```
4. בנו APK והתקינו – הטלפון והמחשב חייבים להיות באותה רשת WiFi

---

## פתרון בעיות

**מסך לבן באפליקציה?**
- ודאו ש-`CAPACITOR_SERVER_URL` מצביע לכתובת נכונה
- ודאו שהאתר עובד בדפדפן הטלפון

**שגיאת Gradle?**
- פתחו Android Studio → יתקין אוטומטית SDK חסר
- File → Sync Project with Gradle Files

**התחברות לא עובדת ב-APK?**
- ודאו שהאתר ב-HTTPS (Netlify נותן HTTPS אוטומטית)
- Cookies עובדים עם HTTPS בלבד ב-production

# The Bucket List — אפיון מוצר וטכני

**שפה:** עברית, RTL · **פלטפורמה:** Next.js, mobile-first PWA · **תשתית:** Supabase Auth / Postgres / Storage  
**גרסת מסמך:** 1.0 · **תאריך כתיבת המסמך:** 24 בספטמבר 2026 · **סטטוס:** בסיס מוצע למימוש ולבדיקות

## 1. מקור, גבולות והנחות

המוצר מיועד לשני בני זוג שאינם גרים יחד: לשמור דברים שמתחשק לעשות, לגלות רצון משותף, לבחור חוויה, לתכנן אותה ולשמור זיכרון. מהשיחה הזמינה עולה שהבעיה העיקרית היא רעיונות שעולים בשיחות ונשכחים.

**מגבלת המקור:** השיחה „רעיונות למערכת זוגית” נקראה באמצעות כלי קריאת השיחות. הודעות המשתמש היו זמינות, אך תשובות האפיון הוחזרו כהפניות פנימיות ללא הטקסט. לכן מסמך זה אינו שחזור מאומת של האפיון המפורט הקודם. הדרישות המפורשות בבקשה הנוכחית הן הבסיס; פרטי המסכים, הסכמה והכללים שלא הופיעו בה הם החלטות תכנון מוצעות. אפשר לממש לפיהן, ולהשוות לתוכן המקורי אם יהיה זמין בהמשך.

**כל מחיר, תקציב, משך, תאריך אירוע, שם מקום או רעיון לדוגמה הוא נתון המחשה בלבד.** אין כאן מחירי ספקים, זמינות, הזמנות או אירועים אמיתיים. תאריך כתיבת המסמך הוא מטא־דאטה של המסמך בלבד. באפליקציה ייווצרו תאריכים ומחירים רק מהזנת משתמש; נתוני demo יסומנו ויישארו מחוץ לסביבת production.

### 1.1 החלטות מוצעות ל-MVP

| נושא | החלטה |
|---|---|
| מרחב | חשבון יכול להשתייך למרחב זוגי אחד; עד שני חברים, ללא תפקיד מנהל מעל בן הזוג |
| לשון | ברירת המחדל מתאימה לשני בני זוג גברים; שמות תצוגה ניתנים לשינוי |
| פרטיות רעיונות | רעיון שנשמר במאגר גלוי לשני חברי המרחב; אין „רעיון סודי” ב-MVP |
| תגובות | רצון אישי פרטי: `yes`, `maybe`, `no`; היעדר שורה = טרם הגיב |
| מאצ׳ | רק שני `yes` נוכחיים; לא חושפים תגובת בן זוג אחרת, גם לאחר ששניהם הגיבו |
| תכנון | כל אחד יכול להציע או לערוך; אישור שני הצדדים נדרש להצגת „מאושר לשנינו” |
| תמונות | תמונות זיכרון בלבד ב-MVP, ללא תמונות פרופיל או תמונות רעיון |
| בחירה | מנוע דטרמיניסטי ופשוט, ללא AI וללא חיבור לספקים |
| חיבור | כניסה באימייל עם קישור מאובטח; הזמנת בן זוג קשורה לאימייל מאומת |
| שימוש ללא רשת | מעטפת ומסך offline; אין שמירה או סנכרון של מידע זוגי ללא רשת ב-MVP |
| התראות | משוב בתוך האפליקציה בלבד; Push, מיילים תפעוליים מותאמים ויומן חיצוני בהמשך |

ההפרדה בין בתים משתקפת בשדה „איפה נפגשים”, זמן נסיעה משוער בהערה וקישורים לניווט. אין צורך בכתובת מגורים, גישה למיקום בזמן אמת או יומן אישי.

## 2. מטרות והיקף

### 2.1 התוצאה הרצויה

1. לשמור רעיון בטלפון באמצעות כותרת בלבד, בתוך מספר אינטראקציות קצר.
2. להבין אילו רעיונות שנינו רוצים בלי ליצור לחץ להגיב בחיוב.
3. לצמצם התלבטות באמצעות הצעה המתאימה לזמן, לתקציב ולסגנון שבחרנו.
4. להפוך רעיון לתוכנית עם מועד, מקום ואישור משותף.
5. לשמור זיכרונות משותפים באופן פרטי.

### 2.2 בתוך ה-MVP

הרשמה וכניסה; יצירת מרחב והזמנה; בית; מאגר עם חיפוש וסינון; הוספה מהירה ועריכה; תגובות ומאצ׳ים; בחירת חוויה; תוכניות ואישורים; השלמה וארכיון זיכרונות עם תמונות; הגדרות, יציאה, סגירת מרחב ובקשת מחיקת חשבון; התקנת PWA ומסך offline; הרשאות ובדיקות אבטחה.

### 2.3 מחוץ ל-MVP

תשלומים, הזמנה אצל ספקים, מחירים חיים, scraping של קישורים, AI, שיתוף ציבורי, feed חברתי, צ׳אט, משימות בית, מעקב מיקום, יומנים אישיים, כתיבה offline, Push, import/export אוטומטי, החלפת בן זוג בתוך אותו מרחב, מספר מרחבים לחשבון. פריטי תשתית רגישים כגון ביטול גישה ומחיקה אינם נדחים לשלב עתידי.

### 2.4 מדדי הצלחה

מדדים מוצעים ללא יעדים כמותיים מומצאים: הצלחת הצטרפות; זמן עד רעיון ראשון; זמן הוספה; שיעור בחירות שהופכות לתוכנית; תוכניות שהושלמו; שגיאות שמירה. ב-MVP ניתן למדוד בבדיקות שימוש ידניות. אם תתווסף אנליטיקה, היא לא תאסוף כותרות, תגובות, תוכן, תמונות, כתובות אימייל או מזהי הזמנה.

## 3. מילון וישויות

| מונח | משמעות |
|---|---|
| מרחב זוגי (`space`) | גבול הרשאה ומידע עבור שני חשבונות |
| רעיון (`idea`) | משהו שאפשר לעשות, גם אם עדיין אין מועד |
| תגובת רצון (`reaction`) | העדפת משתמש נוכחית לרעיון; אינה תגובת טקסט |
| מאצ׳ (`match`) | מצב מחושב: שני חברים פעילים בחרו `yes` |
| תוכנית (`plan`) | מופע מתוכנן של רעיון; ניתן לחזור לאותו רעיון במועד אחר |
| אישור (`confirmation`) | הסכמה של משתמש לגרסה מסוימת של תוכנית |
| זיכרון (`memory`) | תיעוד משותף של תוכנית שהושלמה |
| תגובת טקסט (`comment`) | מסר משותף קצר על רעיון, נפרד מהעדפה אישית |

## 4. ניווט, עיצוב ונגישות

- ניווט תחתון: **בית**, **רעיונות**, **תוכניות**, **זיכרונות**. כפתור „מה עושים?” בבית מוביל למנוע הבחירה; כפתור הוספה גלובלי פותח הוספה מהירה.
- `lang="he"`, `dir="rtl"` ברמת המסמך. אימייל, כתובות URL וקוד ב-`dir="ltr"`; שימוש ב-CSS logical properties.
- מובייל תחילה מרוחב 320px, התאמה לטאבלט ולמחשב; כפתורים בגודל נגיעה מינימלי 44×44px, תמיכה ב-safe area ובמקלדת וירטואלית.
- טון חם וקצר ללא מסרים שיפוטיים על `no` או על חוסר פעילות; אין מדד „מי משקיע יותר”.
- ניגודיות ברמת WCAG AA, focus נראה, label לכל שדה, ניווט מקלדת, `aria-live` לתוצאות שמירה, reduced motion. צבע או לב לבדם אינם מסמנים סטטוס.
- כרטיסים מציגים כותרת, קטגוריה, עלות/זמן אם הוזנו, תגובה אישית וסימון מאצ׳. מידע חסר מוצג „לא הוגדר”, לא כאפס.
- טקסט ותמונות הם מידע פרטי: כותרת tab ו-Open Graph כלליים, ללא כותרת רעיון או תמונת זיכרון.

## 5. User flows

### F1 — יצירת מרחב

כניסה → קישור לאימייל → callback מאומת → שם תצוגה → „יצירת הרשימה שלנו” → יצירת מרחב וחברות slot 1 בטרנזקציה → הזנת אימייל בן הזוג → יצירת הזמנה → העתקה/שיתוף דרך מערכת ההפעלה → בית במצב „מחכים להצטרפות”. אפשר להוסיף רעיונות לפני ההצטרפות; אין מאצ׳ים או אישור זוגי עד שיש שני חברים.

### F2 — הצטרפות

פתיחת קישור → שמירת token זמנית ב-cookie חתום, מוצפן, HttpOnly עם תפוגה קצרה → ניקוי הכתובת → כניסה/יצירת חשבון → אימות האימייל → מסך הסכמה עם מינימום מידע → לחיצה „הצטרף” → קבלה אטומית → בית.

פתיחת GET לעולם אינה מקבלת הזמנה. token לא תקין, פג תוקף או מבוטל מוביל להודעה אחידה. חשבון עם אימייל שונה מקבל הנחיה להתחבר עם האימייל שהוזמן, בלי לחשוף את האימייל המלא. כבר חבר באותו מרחב: הצלחה idempotent; חבר במרחב אחר: חסימה, ללא העברת חברות אוטומטית.

### F3 — תפיסת רעיון בזמן שיחה

„+” → כותרת חובה → „שמור” → אישור עם קישור לפרטים. שדות נוספים תחת „הוסף פרטים”. הרעיון משותף מיד אחרי שמירה. שמירה אינה מסמנת אוטומטית `yes`; המשתמש יכול להגיב מיד אחריה.

### F4 — רצון ומאצ׳

מאגר/פרטי רעיון → `בא לי` / `אולי` / `לא כרגע` → שמירת תגובה אישית → חישוב מאצ׳ בשרת → אם שניהם `yes`, סימון „שנינו בעניין”. שינוי תגובה מסיר מאצ׳ מיד. לא שולחים התראה שחושפת שינוי ל-`no`. תוכנית קיימת אינה מתבטלת אוטומטית.

### F5 — בחירת חוויה

„מה עושים?” → זמן, תקציב כולל לשנינו, קטגוריה/מיקום ואפשרות „כולל עלות או זמן לא ידועים” → ברירת מחדל „מהמאצ׳ים שלנו” → הצעה והסבר התאמה → „עוד הצעה” / „לתכנון”. אם אין מאצ׳ מתאים, מציעים להרחיב מסננים או לבחור במפורש „מכל הרעיונות”. לא מרחיבים בלי הסכמה.

### F6 — תכנון ואישור

רעיון/תוצאת בחירה → טופס תוכנית → שמירה כ-`proposed` → בן הזוג נכנס ומאשר → שני אישורים לגרסה הנוכחית → `confirmed` מחושב. שינוי פרטי תוכנית מעלה version ומבטל תוקף של אישורים קודמים. „נדחה למועד אחר” הוא עריכת תוכנית, לא מחיקתה.

### F7 — השלמה וזיכרון

תוכנית פעילה → „עשינו את זה” → תאריך ביצוע, טקסט אופציונלי → יצירת זיכרון והשלמת תוכנית בטרנזקציה → העלאת תמונות בנפרד → זיכרון בארכיון. כשל תמונה לא מבטל זיכרון. אין חובה לתמונה או דירוג.

### F8 — יציאה וסגירת מרחב

יציאה מהחשבון מנקה session ומידע מקומי בלבד. סגירת מרחב היא פעולה נפרדת: הסבר + אישור מפורש → מצב `closed` → חסימת גישה לשני הצדדים → תהליך מחיקה. אין צרוף בן זוג אחר לאותו מרחב. מדיניות מוצעת: מחיקת נתונים פעילים בתוך 30 יום, בכפוף לתהליך תפעולי מוגדר; זמני מחיקה מגיבויים ייקבעו לפי ספק ותצורה ויוצגו לפני השקה. אין להבטיח מחיקה מיידית מגיבויים.

## 6. מסכים ומצבי מערכת

| מסך / נתיב | תוכן ופעולות | Empty | Loading | Error / קצה |
|---|---|---|---|---|
| כניסה `/login` | אימייל, שליחת קישור, הודעת בדיקת דואר | הסבר קצר על המוצר | מניעת שליחה חוזרת בזמן בקשה | הודעה כללית; retry מבוקר; ללא גילוי קיום חשבון |
| callback `/auth/callback` | אימות session וניתוב פנימי מותר בלבד | אין | „מתחברים…” | קישור פג/נוצל: שליחה חדשה; `next` חיצוני נדחה |
| התחלה `/onboarding` | שם תצוגה; יצירה או קבלת הזמנה | עדיין אין מרחב | שלד קצר | כפל לחיצה מחזיר אותו מרחב; סגירה קודמת מפנה להסבר |
| הזמנה `/invite` | הסכמה, תוקף כללי, חיבור לחשבון הנכון | אין הזמנה זמינה | בדיקה בלי קבלה אוטומטית | token שגוי/פג/מבוטל; מרחב מלא; חשבון שגוי |
| בית `/` | ברכה, החוויה הקרובה, מאצ׳ים, רעיונות אחרונים, „מה עושים?”, „+” | CTA לרעיון ראשון; אם לבד CTA לשיתוף הזמנה | שלדים לפי אזורים | הודעה מקומית לאזור שכשל, retry; אין מחיקת תוכן שכבר נטען |
| מאגר `/ideas` | חיפוש, פילטר קטגוריה/מאצ׳ים/תגובה שלי, מיון, pagination | „מה הדבר הראשון שבא לכם לעשות?” | שלדי כרטיסים; טעינת עוד נפרדת | „אין תוצאות” מציע איפוס פילטר; כשל רשת שומר חיפוש |
| הוספה `/ideas/new` או sheet | כותרת, הרחבת פרטים, שמירה | טופס ריק הוא המצב הרגיל | כפתור busy; אין יצירה כפולה | שגיאות ליד שדות; טיוטה נשמרת בזיכרון הדף בלבד |
| פרטי רעיון `/ideas/[id]` | פרטים, תגובה אישית, מאצ׳, תגובות טקסט, תכנון, עריכה/ארכוב | אין תגובות טקסט: הזמנה להוסיף | שלד פרטים | פריט זר/חסר: 404 זהה; שינוי מקביל: הצעת רענון |
| בחירה `/choose` | מסננים, כרטיס תוצאה, הסבר, עוד הצעה | אין מועמדים: הרחבת תנאים | animation קצר התומך reduced motion | מידע השתנה: חישוב מחדש; אין יצירה אוטומטית של רעיון |
| תוכניות `/plans` | מוצעות/מאושרות/עבר; סדר כרונולוגי; מועד לא נקבע בסוף | CTA לבחור רעיון | שלד רשימה | retry; תוכנית שעברה אינה מסומנת כהושלמה אוטומטית |
| תוכנית `/plans/[id]` | מועד, אזור זמן, מקום מפגש, הערות, אישורים, עריכה/ביטול/השלמה | מועד/מקום חסר מסומן | שלד; busy לכל פעולה | גרסה השתנתה: 409 ורענון לפני אישור; תאריך סיום לפני התחלה נדחה |
| ארכיון `/memories` | ציר זמן, תמונה ראשית אם קיימת, חיפוש | „הזיכרון הראשון עוד לפנינו” | תמונות lazy + שלדי טקסט | placeholder לתמונה שנכשלה; הטקסט נשאר |
| זיכרון `/memories/[id]` | תאריך, סיפור משותף, גלריה, הוספה, עריכה | ללא תמונות: CTA; טקסט אופציונלי | progress לכל העלאה | קובץ פסול/גדול; retry; חתימה שפגה מחודשת לאחר הרשאה |
| הגדרות `/settings` | שם שלי, שם בן זוג, ניהול הזמנה, פרטיות, יציאה וסגירה | רק חבר אחד: הזמנה | busy לכל פעולה | שגיאת שליחה/ביטול; שגיאת סגירה אינה מוחקת UI בהצלחה מדומה |
| ללא רשת `/offline` | הסבר וחיבור מחדש | לא מציג נתונים פרטיים | בדיקת חיבור יזומה | אין שמירה בתור; חזרה למסך המקורי אחרי התחברות |
| מרחב סגור `/space-closed` | סטטוס סגירה, מחיקה ותמיכה | אין תוכן זוגי | בדיקת סטטוס חשבון | אין הצגת עותק cached של המרחב |

### 6.1 פרטי טפסים

- רעיון: כותרת 1–120 תווים לאחר trim; תיאור עד 3,000; קטגוריה מתוך enum; מקום חופשי עד 200; קישור `https` עד 2,048; עלות כוללת משוערת באגורות, אופציונלית; מטבע ILS ב-MVP; משך בדקות, אופציונלי. `0` פירושו חינם, `NULL` לא ידוע. אין הנחה שמחיר הוא לאדם.
- תוכנית: כותרת snapshot מתוך הרעיון; תאריך/שעה אופציונליים לשלב הצעה; מקום מפגש עד 200; הערות עד 3,000; תקציב אופציונלי; IANA timezone. אישור שני הצדדים נדרש רק לאחר שנקבע מועד.
- זיכרון: תאריך ביצוע חובה מסוג `date`; טקסט עד 5,000; עד 20 תמונות לזיכרון בהחלטת MVP; תמונה עד 10MiB לפני עיבוד. אפשר לשנות גבולות בקונפיג, תוך אכיפה בשרת.
- תגובת טקסט: 1–1,000 תווים; גלויה לשניהם; רק המחבר עורך/מוחק. אין HTML/Markdown עשיר ב-MVP.
- מחיקה/ארכוב: רעיון עובר ארכוב, ואינו נמחק פיזית דרך UI. תוכנית מבוטלת נשמרת. תוכן זיכרון משותף ניתן לעריכה; מחיקת תמונה על ידי המעלה; מחיקת זיכרון/נתוני מרחב דרך זרימת מחיקה מפורשת.

## 7. כללי מצב ומקביליות

| ישות | מצבים ומעברים |
|---|---|
| מרחב | `open` → `closed`; מספר חברים 1 או 2 הוא נתון נפרד |
| הזמנה | `pending` → `accepted` / `revoked`; פקיעה מחושבת מ-`expires_at`; מנפיקים חדשה במקום להאריך token קיים |
| רעיון | `active` ↔ `archived`; השלמת חוויה אינה מארכבת רעיון אוטומטית |
| תגובה | ללא שורה ↔ `yes` / `maybe` / `no`; שינוי מותר בכל עת לרעיון פעיל |
| תוכנית | `proposed` → `completed` / `cancelled`; „confirmed” נגזר מאישורים, אינו ערך שמור |
| תמונה | `pending` → `ready` / `failed` → `deleting`; זיכרון מציג רק `ready` |

כל עדכון רעיון, תוכנית או זיכרון מקבל `expectedVersion`. כתיבה מתבצעת עם תנאי version; חוסר התאמה מחזיר `409 VERSION_CONFLICT`, ולא „האחרון מנצח”. UI מציג את הגרסה החדשה ומאפשר למשתמש להחיל את שינוייו מחדש. אין מיזוג שקט של מועד או מקום מפגש.

פעולות מרובות טבלאות מתבצעות בטרנזקציית DB אחת. קריאה ל-Supabase כמה פעמים ברצף מתוך Server Action אינה טרנזקציה. נעילה בסדר קבוע: `spaces` → ישות הורה → ישות ילד; סגירה, הזמנות וכתיבות נועלות את אותו מרחב כדי למנוע כתיבה אחרי סגירתו.

יצירת מרחב, רעיון ותוכנית משתמשת ב-ID UUID קבוע לבקשה וב-key idempotency. השלמה מוגנת גם ב-unique על `memories.plan_id`; הצטרפות מוגנת גם ב-unique על user וב-slot. העלאה משתמשת ב-photo ID ונתיב קבוע, עם `upsert=false`.

## 8. מנוע בחירת חוויה

### 8.1 קלט

`scope: matches | all`, `maxBudgetMinor?`, `maxDurationMinutes?`, `category?`, `locationText?`, `allowUnknown: boolean`, `excludedIdeaIds: UUID[]` עד 50. מטבע ב-MVP ILS. „מכל הרעיונות” נבחר במפורש ומסומן כתוצאה שטרם אושרה על ידי שניהם.

### 8.2 אלגוריתם MVP

1. אימות חברות וקבלת רעיונות פעילים של המרחב בלבד.
2. ב-`matches` להשתמש רק בתוצאת חישוב מאצ׳ שרתית. ב-`all` לא לקרוא תגובות פרטיות של בן הזוג ולא לשקלל אותן.
3. סינון לפי התנאים שהוגדרו. ערכים חסרים נכללים רק כאשר `allowUnknown=true`; ללא תקרת תקציב/זמן אין צורך בערך המתאים.
4. סינון רעיונות שכבר יש להם תוכנית `proposed`, כדי שלא להציע חוויה שכבר מתוכננת. אי אפשר להסיק מכך שהרעיון הושלם בעבר.
5. ניקוד מוצע: `+20` אם מעולם לא הושלם; אחרת `+min(daysSinceLastCompletion, 90)/9`; `+min(daysSinceIdeaCreation, 30)/3`. שימוש רק בתוכן משותף. אין ניקוד שונה ל-`no` מול `maybe` של האחר.
6. סדר לפי ניקוד, ואחריו ID לשבירת שוויון יציבה. הצעה ראשונה מתוך הרשימה; „עוד הצעה” מדלג על IDs שכבר הוצגו בסבב. כשהרשימה נגמרת מוצעת התחלה מחדש.
7. החזרת הסבר עובדתי: „בתקציב שהגדרתם”, „עוד לא עשיתם”, „משך לא ידוע”. אין להציג התאמה לתקציב כאשר העלות חסרה.

בחירה אינה שומרת תוכנית. לפני יצירתה השרת בודק שוב שהרעיון פעיל, שייך למרחב ושאין תוכנית פעילה עבורו. אין הבטחה שמחיר או מקום עדיין זמינים; אלה נתוני המשתמש בלבד.

## 9. ארכיטקטורה

```text
דפדפן / PWA
    ├── Next.js App Router: מסכים ו-Server Components
    ├── Server Actions / Route Handlers: אימות, validation, קצב, DTO
    │      ├── Supabase Auth: אימות זהות
    │      ├── Postgres RPC: טרנזקציות והרשאות עסקיות
    │      └── Storage: העלאה מבוקרת והזרמת תמונה פרטית
    └── Service Worker: קבצים סטטיים ומסך offline בלבד
```

### 9.1 בחירת טכנולוגיות

- Next.js App Router + TypeScript strict; רכיבי לקוח רק לאינטראקציות, טפסים והעלאה. Zod או ספרייה מקבילה לאימות קלט; שכבת DAL מסוג `server-only`.
- Supabase SSR עם clients נפרדים לדפדפן ולשרת. אימות JWT בשרת באמצעות מנגנון מאומת מה-SDK (`getClaims` או `getUser` לפי התצורה), ולא הסתמכות על session לא מאומת. פרטי refresh/cookies לפי התיעוד העדכני בעת המימוש. [תיעוד SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- גרסאות stable תואמות נבחרות בתחילת המימוש וננעלות ב-lockfile; המסמך אינו קובע מספר גרסה „אחרון”.
- reads דרך client עם JWT המשתמש ו-RLS. writes דרך RPC מוגדרות בשרת עם הרשאות שירות; אין generic CRUD endpoint עם service role.
- כל Server Action היא גבול אבטחה: אימות, בדיקת הרשאה ו-validation מחדש, גם אם נקראת מתוך מסך מוגן. [תיעוד אבטחת Next.js](https://nextjs.org/docs/app/guides/data-security)
- Auth email redirect allowlist לדומיינים המדויקים. כתובות חזרה פנימיות בלבד. אין auto-fetch לקישור רעיון; כך נמנעת גם בעיית SSRF.

### 9.2 מבנה מוצע

```text
app/
  (auth)/login/  auth/callback/  invite/
  (app)/page.tsx  ideas/  choose/  plans/  memories/  settings/
  api/photos/  api/invitations/  offline/  manifest.ts
components/    features/{ideas,reactions,plans,memories}/
lib/{auth,dal,validation,errors,rate-limit}/
supabase/migrations/  supabase/tests/
tests/{unit,integration,e2e}/
public/{icons,offline-assets}/
docs/
```

### 9.3 קונפיג ותפעול

משתני לקוח: URL ומפתח publishable של Supabase בלבד. סודות שרת: secret/service role key, סוד cookie להזמנה, חיבור DB לתהליכי תחזוקה אם נדרש. לעולם אין קידומת `NEXT_PUBLIC_` לסוד. `.env.example` מכיל placeholders בלבד.

סביבות local/staging/production נפרדות עם Storage ו-Auth redirects נפרדים. נתוני seed סינתטיים בלבד. staging מוגנת ואינה עותק אוטומטי של תמונות פרטיות. אירוח חייב לתמוך בשרת Next.js, HTTPS, מגבלות העלאה נדרשות ותהליך תחזוקה; export סטטי לבדו אינו מספיק.

## 10. מודל נתונים SQL

### 10.1 כללי יישום

ה-SQL הבא הוא **בסיס סכמה ומדיניות לקריאה**, בתוספת מימוש קונקרטי לקבלת הזמנה. הוא אינו migration מוצר מלא שנבדק בהרצה. פונקציות הכתיבה האחרות מתוארות בחוזים בסעיף 13 וחייבות להיכתב ולהיבדק לפני שימוש. אין לפתוח הרשאות כתיבה ישירות כדי לעקוף פונקציה חסרה.

כל המפתחות הם UUID. כסף נשמר במספר שלם ביחידות המטבע הקטנות; זמן מדויק ב-`timestamptz`; יום זיכרון ב-`date`. timezone נשמר בנפרד. `created_by` ו-`user_id` מגיעים מהזהות המאומתת בשרת, לעולם לא מהטופס.

```sql
-- Migration 001: schema. מיועד ל-Supabase Postgres.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open','closed')),
  timezone text not null default 'Asia/Jerusalem',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check ((status = 'open' and closed_at is null)
      or (status = 'closed' and closed_at is not null))
);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  slot smallint not null check (slot in (1,2)),
  joined_at timestamptz not null default now(),
  primary key (space_id,user_id),
  unique (user_id),
  unique (space_id,slot)
);

-- לא נגיש ב-Data API; אין raw token בשום טבלה.
create table private.invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  target_email text not null check (target_email = lower(btrim(target_email))),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (expires_at > created_at),
  check ((status = 'accepted' and accepted_by is not null and accepted_at is not null)
      or (status <> 'accepted' and accepted_by is null and accepted_at is null))
);
create unique index one_pending_invite_per_space
  on private.invitations(space_id) where status = 'pending';

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 3000),
  category text not null default 'other' check
    (category in ('food','outdoors','culture','trip','home','learning','other')),
  location_text text check (char_length(location_text) <= 200),
  source_url text check (char_length(source_url) <= 2048 and source_url ~ '^https://'),
  cost_minor bigint check (cost_minor between 0 and 100000000),
  currency text not null default 'ILS' check (currency = 'ILS'),
  duration_minutes integer check (duration_minutes between 1 and 525600),
  status text not null default 'active' check (status in ('active','archived')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,space_id),
  foreign key (space_id,created_by) references public.space_members(space_id,user_id)
);

create table public.idea_reactions (
  space_id uuid not null,
  idea_id uuid not null,
  user_id uuid not null,
  preference text not null check (preference in ('yes','maybe','no')),
  updated_at timestamptz not null default now(),
  primary key (idea_id,user_id),
  foreign key (idea_id,space_id) references public.ideas(id,space_id) on delete cascade,
  foreign key (space_id,user_id) references public.space_members(space_id,user_id)
);

create table public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  idea_id uuid not null,
  created_by uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (idea_id,space_id) references public.ideas(id,space_id) on delete cascade,
  foreign key (space_id,created_by) references public.space_members(space_id,user_id)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  idea_id uuid not null,
  created_by uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status text not null default 'proposed' check (status in ('proposed','completed','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'Asia/Jerusalem',
  meeting_place text check (char_length(meeting_place) <= 200),
  notes text not null default '' check (char_length(notes) <= 3000),
  budget_minor bigint check (budget_minor between 0 and 100000000),
  currency text not null default 'ILS' check (currency = 'ILS'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,space_id),
  check (ends_at is null or (starts_at is not null and ends_at > starts_at)),
  foreign key (idea_id,space_id) references public.ideas(id,space_id),
  foreign key (space_id,created_by) references public.space_members(space_id,user_id)
);
create unique index one_active_plan_per_idea on public.plans(idea_id)
  where status = 'proposed';

create table public.plan_confirmations (
  space_id uuid not null,
  plan_id uuid not null,
  user_id uuid not null,
  plan_version integer not null check (plan_version > 0),
  confirmed_at timestamptz not null default now(),
  primary key (plan_id,user_id),
  foreign key (plan_id,space_id) references public.plans(id,space_id) on delete cascade,
  foreign key (space_id,user_id) references public.space_members(space_id,user_id)
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  plan_id uuid not null unique,
  created_by uuid not null,
  happened_on date not null,
  story text not null default '' check (char_length(story) <= 5000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,space_id),
  foreign key (plan_id,space_id) references public.plans(id,space_id),
  foreign key (space_id,created_by) references public.space_members(space_id,user_id)
);

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  memory_id uuid not null,
  uploaded_by uuid not null,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  status text not null default 'pending' check (status in ('pending','ready','failed','deleting')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (id,space_id),
  foreign key (memory_id,space_id) references public.memories(id,space_id) on delete cascade,
  foreign key (space_id,uploaded_by) references public.space_members(space_id,user_id),
  check (object_path = space_id::text || '/' || memory_id::text || '/' || id::text)
);

create table private.mutation_keys (
  actor_id uuid not null references public.profiles(id),
  operation text not null,
  request_id uuid not null,
  payload_hash text not null,
  resource_id uuid,
  created_at timestamptz not null default now(),
  primary key (actor_id,operation,request_id)
);

create table private.audit_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index ideas_feed on public.ideas(space_id,status,created_at desc,id desc);
create index comments_feed on public.idea_comments(idea_id,created_at,id);
create index plans_feed on public.plans(space_id,status,starts_at,id);
create index memories_feed on public.memories(space_id,happened_on desc,id desc);
create index photos_by_memory on public.memory_photos(memory_id,status,sort_order);
create index reactions_by_space on public.idea_reactions(space_id,user_id);
create index confirmations_by_space on public.plan_confirmations(space_id);
```

ה-FK המורכבים מונעים חיבור ילד למרחב אחר. `unique(user_id)` מונע חברות כפולה; שתי משבצות עם unique מונעות חבר שלישי גם במירוץ. מחיקת חשבון אינה `DELETE auth.users` עיוור: חלק מה-FK בכוונה מונעים מחיקה לפני טיפול מסודר במרחב ובנתונים המשותפים.

### 10.2 RLS — קריאה בלבד ללקוחות

```sql
-- פונקציות עזר בבעלות תפקיד migration מהימן, עם search_path קבוע.
create or replace function private.is_member(p_space uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.space_members m
    join public.spaces s on s.id = m.space_id
    where m.space_id = p_space and m.user_id = auth.uid() and s.status = 'open'
  );
$$;

create or replace function private.can_read_profile(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user = auth.uid() or exists (
    select 1 from public.space_members mine
    join public.space_members other on other.space_id = mine.space_id
    join public.spaces s on s.id = mine.space_id
    where mine.user_id = auth.uid() and other.user_id = p_user and s.status = 'open'
  );
$$;
revoke all on function private.is_member(uuid) from public, anon, authenticated;
revoke all on function private.can_read_profile(uuid) from public, anon, authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.can_read_profile(uuid) to authenticated;

-- אין DML grants ואין INSERT/UPDATE/DELETE policies ל-anon/authenticated.
do $$
declare t text;
begin
  foreach t in array array['profiles','spaces','space_members','ideas',
    'idea_reactions','idea_comments','plans','plan_confirmations','memories','memory_photos']
  loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
  foreach t in array array['invitations','mutation_keys','audit_events'] loop
    execute format('alter table private.%I enable row level security',t);
    execute format('revoke all on private.%I from public, anon, authenticated',t);
  end loop;
end $$;

create policy profiles_read on public.profiles for select to authenticated
  using (private.can_read_profile(id));
create policy spaces_read on public.spaces for select to authenticated
  using (private.is_member(id));

do $$
declare t text;
begin
  foreach t in array array['space_members','ideas','idea_comments','plans',
    'plan_confirmations','memories'] loop
    execute format('create policy member_read on public.%I for select to authenticated
      using (private.is_member(space_id))',t);
  end loop;
end $$;

create policy own_reaction_read on public.idea_reactions for select to authenticated
  using (user_id = auth.uid() and private.is_member(space_id));
create policy photos_ready_read on public.memory_photos for select to authenticated
  using (status = 'ready' and private.is_member(space_id));

-- RPC מחושבת: חושפת רק מאצ׳ים, ללא שורות או ערכי תגובה של האחר.
create or replace function public.list_my_matches(p_space uuid)
returns table (idea_id uuid)
language sql stable security definer set search_path = ''
as $$
  select i.id from public.ideas i
  where i.space_id = p_space and i.status = 'active'
    and private.is_member(p_space)
    and (select count(*) from public.space_members m where m.space_id = p_space) = 2
    and (select count(*) from public.idea_reactions r
         join public.space_members m on m.space_id = r.space_id and m.user_id = r.user_id
         where r.idea_id = i.id and r.preference = 'yes') = 2;
$$;
revoke all on function public.list_my_matches(uuid) from public, anon, authenticated;
grant execute on function public.list_my_matches(uuid) to authenticated;
```

RLS חלה גם בגישה ישירה ל-Data API; מסנן `space_id` ב-UI אינו תחליף למדיניות. תפקיד service role עוקף RLS ולכן כל RPC כתיבה חייבת לבצע את בדיקות החברות והבעלות בעצמה. [תיעוד RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

**השלמות migration מחייבות:** יצירת כל RPC בחוזים להלן; `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` לכל RPC שירות ורק `GRANT ... TO service_role`; הקשחת default privileges עבור תפקיד יצירת הפונקציות; סקירת grants בפועל אחרי migration. פונקציות עזר security definer חייבות להישאר בבעלות תפקיד מהימן עם גישה לטבלאות, ללא SQL דינמי המבוסס על קלט.

### 10.3 דוגמה קונקרטית לקבלת הזמנה אטומית

השרת מאמת משתמש, מחשב SHA-256 של token אקראי ומעביר **רק** את user ID מה-session המאומת ואת ה-hash. אין endpoint המקבל `p_actor` מהדפדפן. כתובת האימייל נבדקת מול `auth.users`, לא מול שדה form או metadata שהמשתמש יכול לערוך.

```sql
create or replace function public.accept_invitation_internal(
  p_actor uuid, p_token_hash text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_existing uuid;
  v_status text;
  v_email text;
  v_inv private.invitations%rowtype;
begin
  select lower(btrim(email)) into v_email from auth.users
    where id = p_actor and email_confirmed_at is not null;
  if v_email is null then raise exception 'INVITE_UNAVAILABLE'; end if;

  select space_id into v_space from private.invitations where token_hash = p_token_hash;
  if v_space is null then raise exception 'INVITE_UNAVAILABLE'; end if;

  -- סדר נעילות זהה להנפקה, ביטול וסגירת מרחב.
  select status into v_status from public.spaces where id = v_space for update;
  if v_status is distinct from 'open' then raise exception 'INVITE_UNAVAILABLE'; end if;
  select * into v_inv from private.invitations where token_hash = p_token_hash for update;
  if not found then raise exception 'INVITE_UNAVAILABLE'; end if;
  if v_inv.target_email <> v_email then raise exception 'INVITE_UNAVAILABLE'; end if;

  select space_id into v_existing from public.space_members where user_id = p_actor;
  if v_inv.status = 'accepted' and v_inv.accepted_by = p_actor
     and v_existing = v_space then
    return v_space;
  end if;
  if v_inv.status <> 'pending' or v_inv.expires_at <= clock_timestamp()
     or v_inv.created_by = p_actor then raise exception 'INVITE_UNAVAILABLE'; end if;
  if v_existing is not null then raise exception 'ALREADY_IN_SPACE'; end if;
  if (select count(*) from public.space_members where space_id = v_space) <> 1 then
    raise exception 'INVITE_UNAVAILABLE';
  end if;
  if not exists (select 1 from public.space_members
      where space_id = v_space and user_id = v_inv.created_by and slot = 1) then
    raise exception 'INVITE_UNAVAILABLE';
  end if;

  insert into public.space_members(space_id,user_id,slot) values (v_space,p_actor,2);
  update private.invitations set status = 'accepted', accepted_by = p_actor,
    accepted_at = now() where id = v_inv.id;
  insert into private.audit_events(space_id,actor_id,event_type)
    values (v_space,p_actor,'invitation.accepted');
  return v_space;
end;
$$;
revoke all on function public.accept_invitation_internal(uuid,text)
  from public, anon, authenticated;
grant execute on function public.accept_invitation_internal(uuid,text) to service_role;
```

יש ליצור profile לפני הקבלה. unique violation עקב שתי הזמנות למרחבים שונים לאותו משתמש ממופה ל-409 כללי; הטרנזקציה כולה מתבטלת. חריגות SQL אינן מוחזרות גולמיות ללקוח. תוקף ההזמנה המוצע הוא 48 שעות; זוהי החלטת מוצר, לא תאריך אירוע אמיתי.

## 11. פרטיות, הזמנות ותמונות

### 11.1 מטריצת הרשאות

| משאב | אורח | חבר במרחב | חבר במרחב אחר | כותב/מעלה |
|---|---|---|---|---|
| רעיונות ותוכניות | אין | קריאה ופעולות משותפות מורשות | אין | אין בעלות בלעדית על רעיון |
| תגובת רצון | אין | רק תגובתו האישית | אין | רק הוא משנה/מסיר |
| מאצ׳ | אין | boolean/IDs מחושבים במרחב שלו | אין | לא נחשפים raw reactions |
| תגובות טקסט | אין | קורא ומוסיף | אין | עורך ומוחק את שלו |
| זיכרונות | אין | קורא ועורך משותף | אין | מחיקה בזרימה מפורשת |
| תמונה | אין | צפייה ב-ready בלבד | אין | מחיקת תמונה שהעלה |
| הזמנה | token לבדו לא מקנה חברות | המנפיק רואה סטטוס מצומצם | אין | רק המנפיק יכול לבטל לפני קבלה |
| אימייל חשבון | אין | אינו גלוי לבן הזוג ב-profile | אין | מופיע רק בהגדרות החשבון שלו |

**משמעות פרטיות התגובות:** כשמוצג מאצ׳, כל צד יודע שהאחר בחר `yes`. גם היעלמותו עשויה לאפשר הסקה. זו תוצאה מכוונת של הפיצ׳ר; אין להבטיח סודיות מוחלטת של הרצון. מחוץ למאצ׳ לא נחשף אם האחר טרם הגיב, בחר `maybe` או `no`. אין מנוע המאפשר להסיק העדפה באמצעות שינוי filters.

### 11.2 הגנת הזמנות

- token נוצר באמצעות CSPRNG עם לפחות 32 bytes אקראיים ומקודד base64url. רק SHA-256 נשמר; אין צורך בהאש איטי לסיסמאות עבור token בעל אנטרופיה זו.
- הזמנה קשורה לאימייל ספציפי מאומת. normalization הוא trim + lowercase בלבד; אין מחיקת נקודות/סיומות `+` לפי ניחוש ספק אימייל.
- המנפיק חייב להיות חבר יחיד במרחב פתוח; הנפקה חדשה נועלת מרחב ומבטלת pending קודמת, גם אם פגה. רק אז נוצרת הזמנה חדשה.
- URL מוצע: `/invite#token=...`. ה-fragment אינו נשלח אוטומטית לשרת; לקוח קטן קורא אותו, מנקה מיד ב-`history.replaceState`, ושולח POST מאותו origin להחלפתו ב-cookie זמני. אין analytics או scripts צד שלישי במסך זה.
- לאחר callback, cookie זמני מאפשר המשך. אם הוא חסר או פג, מבקשים לפתוח שוב את ההזמנה. ה-cookie וה-token אינם מקנים הרשאה לקבלה ללא אימות זהות.
- `Referrer-Policy: no-referrer`, ללא logging של גוף בקשת exchange, ללא token ב-query string, breadcrumbs, errors או כלי ניטור. קישור עדיין יכול להיחשף בהעתקה; מחייבים את האימייל המוזמן כדי לצמצם שימוש בידי אחר.
- הגבלת קצב מבוזרת לפי משתמש/IP: ברירות מחדל מוצעות 5 הנפקות לשעה למשתמש ו-20 ניסיונות בדיקה ב-15 דקות ל-IP. ערכים מכווננים לאחר שימוש; אין הסתמכות על זיכרון תהליך בודד.
- GET אינו מאשר; רק POST מפורש אחרי הצגת הסכמה. Preview אינו חושף רשימות, תמונות או פרטי קשר של המנפיק.

### 11.3 תמונות ו-Storage

```sql
-- Migration: bucket פרטי; אין מדיניות כתיבה ללקוחות.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('memories-private','memories-private',false,10485760,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- הגנה נוספת גם אם בהמשך תתאפשר קריאה ישירה עם JWT.
create policy memory_object_read on storage.objects
for select to authenticated using (
  bucket_id = 'memories-private' and exists (
    select 1 from public.memory_photos p
    where p.object_path = storage.objects.name and p.status = 'ready'
      and private.is_member(p.space_id)
  )
);
```

בפרויקט קיים יש לוודא שה-bucket נשאר פרטי ושהגדרותיו מתאימות; `ON CONFLICT DO NOTHING` אינו מתקן bucket ציבורי. בנוסף חובה לבדוק שאין policies רחבות קודמות על `storage.objects`: policies permissive מצטרפות ב-OR ועלולות לפתוח גישה. אין שינוי גלובלי שרירותי בהרשאות טבלאות Storage.

גישה ל-Storage נשלטת באמצעות מדיניות על `storage.objects`; מפתחות שירות יכולים לעקוף אותה ולכן נשארים בשרת. [תיעוד Storage](https://supabase.com/docs/guides/storage/security/access-control)

**זרימת העלאה נבחרת ל-MVP:**

1. `createPhotoUpload`: אימות משתמש, זיכרון ומרחב; נעילת הזיכרון, בדיקת quota של 20 כולל pending, יצירת photo ID ונתיב שרתי קבוע. הבקשה idempotent.
2. העלאה ל-Route Handler באותו origin, לאחר בדיקת origin ו-session. מגבלת גוף/stream של 10MiB נאכפת לפני buffering מלא; אירוח נבחר חייב לתמוך בכך.
3. אימות magic bytes, decoder תקין ומגבלת פיקסלים (למשל 24MP). הסרת EXIF, GPS ושם קובץ מקורי באמצעות decode/re-encode לפורמט מאושר; אין SVG/GIF/HTML. HEIC נדחה עם הנחיה להמרה ב-MVP, עד שיוסף decoder בדוק.
4. העלאת התוצר המעובד ל-bucket הפרטי ב-service role, בנתיב המדויק ובלי upsert. כשל DB לאחר אחסון משאיר קובץ orphan שמטופל בתהליך ניקוי.
5. טרנזקציית finalize בודקת שוב שהמרחב פתוח ושה-photo שייך למעלה ולזיכרון, מעדכנת mime/size אמיתיים ו-`ready`. אין הסתמכות על metadata של הלקוח.
6. אם המרחב נסגר במהלך העלאה, finalize נכשל והתוצר נמחק/נרשם לניקוי. תהליך תחזוקה מוחק pending ישנים ו-orphans לאחר שעה, ובודק שאין בקשה פעילה לפני מחיקה.

**צפייה נבחרת:** `/api/photos/[id]/content` מאמת בכל בקשה, בודק חברות ו-ready ומזרים קובץ עם `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` ו-Content-Type אמיתי. אין public URL. אין להעביר תמונות פרטיות דרך cache משותף של image optimizer; ב-MVP משתמשים בתמונה דרך הנתיב הפרטי ללא optimization משותף.

חלופה עתידית: signed URLs קצרות, למשל 60 שניות. URL חתום הוא הרשאת bearer עד פקיעה, וגם לאחר סגירת מרחב הוא עלול לעבוד עד אז; אין להציגו כגישה שניתנת לביטול מיידי. נתיב proxy נבחר כדי לבדוק מחדש הרשאה בבקשות חדשות. אף מנגנון אינו מוחק צילום מסך או קובץ שכבר הורד.

מחיקה: סימון `deleting` לפני מחיקת האובייקט חוסם צפייה חדשה; מחיקת Storage בשרת; מחיקת metadata לאחר הצלחה. כשל אחסון נשאר ל-retry בלי להחזיר תמונה לצפייה. עקב היעדר טרנזקציה משותפת ל-DB ול-Storage נדרש worker עם פעולות idempotent.

### 11.4 פרטיות כללית

- אין E2EE ב-MVP. תשתית המוצר ומפעילים בעלי הרשאה טכנית עשויים לגשת לנתונים. יש לומר זאת במדיניות הפרטיות, ולא לכנות את המוצר „מוצפן מקצה לקצה”.
- אין תוכן זוגי ב-localStorage, IndexedDB, cache של Service Worker, התראות lock screen או לוגים. טיוטה זמנית בזיכרון הדף יכולה להיעלם ברענון; להזהיר רק אם יש שינוי שלא נשמר.
- לא מתעדים token, אימייל, כותרת, story, הערות, תגובות או URL תמונה. לוגים: request ID, operation, duration, error code מצומצם.
- סגירת מרחב חוסמת את כל קריאות RLS. גם client state מתנקה ברענון/403, וביציאה. בקשה חדשה נבדקת תמיד; לא ניתן לבטל תוכן שכבר נמסר למכשיר.
- Realtime נדחה ב-MVP: refetch בחזרה ל-tab ולאחר mutation. אם נוסף בהמשך, אין broadcast של תגובות פרטיות; אירוע כללי בלבד ו-refetch מאומת.
- בקשת מחיקת חשבון דורשת אימות מחדש וסגירה/טיפול במרחב לפני מחיקת Auth. יש להציג את השפעת המחיקה על המידע המשותף ולתת אפשרות הורדה ידנית לפני אישור סופי.

## 12. PWA, ביצועים ו-UX טכני

- Manifest: שם The Bucket List, `start_url: /`, `display: standalone`, אייקונים 192/512 ו-maskable, צבעי theme/background. ההתקנה מותאמת לתמיכת הדפדפן; ב-iOS מציגים הוראות לפי היכולת בפועל, בלי להבטיח prompt אוטומטי.
- HTTPS בייצור. Service Worker מצומצם לקבצים סטטיים עם hash ו-offline shell. מסלולי Auth, invite, API, HTML/RSC עם נתוני משתמש וכל תמונות פרטיות הם network-only ואינם נכנסים ל-cache.
- HTML ותשובות פרטיות אינם נשמרים ב-CDN משותף. יש לבחון את התנהגות caching בגרסת Next.js שנבחרה, כולל prefetch ונתיבי תמונות.
- יציאה מנקה query cache בזיכרון ו-caches פרטיים אם נוצרו בגרסה קודמת. אין שמירה offline של mutation; כשל חיבור מציג שהשינוי לא נשמר.
- שינוי גרסה מציג הצעת רענון לאחר שמירת טופס. אין רענון כפוי שמאבד טיוטה.
- רשימות ב-cursor pagination עם סדר יציב `(created_at,id)`; 20 פריטים בעמוד. חיפוש `ILIKE` מוגבל למרחב ומנקה wildcard input; כמות קטנה מאפשרת MVP ללא מנוע עברית. להוסיף אינדקס חיפוש רק לפי צורך מוכח.
- יעדי בדיקה מוצעים: LCP עד 2.5s בנתוני בדיקת מובייל מוגדרים; תגובת UI מקומית מיידית; לא מציגים הצלחת שמירה לפני אישור שרת. אין זו התחייבות SLA.

Manifest והתקנה הם חלק מ-PWA; caching ו-offline דורשים החלטות נפרדות. כאן הוחלט לשמור offline רק מעטפת ציבורית. [מדריך PWA של Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps)

## 13. API, Server Actions ו-RPC

### 13.1 חוזה משותף

```ts
type Result<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: {
      code: string; message: string;
      fieldErrors?: Record<string, string[]>;
    }; requestId: string };
```

ב-Route Handlers: `400` קלט, `401` ללא אימות, `404` משאב חסר/זר, `409` גרסה/מצב, `413` גודל, `415` סוג קובץ, `429` קצב, `500` שגיאה לא צפויה. Server Actions משתמשות באותם codes במעטפת ולא חייבות לשקף HTTP status. הודעה אנושית בעברית; SQL ושגיאות ספק אינן נחשפות.

כל פעולה: אימות JWT → validation → rate limit לפי צורך → actor מה-session → RPC → DTO מינימלי → invalidation/refetch של נתונים מורשים בלבד. Route Handlers משנים מצב מקבלים same-origin POST עם בדיקת Origin/CSRF. אין mutation ב-GET; אין אמון ב-`spaceId`, `createdBy` או `userId` של הלקוח לצורך הרשאה.

### 13.2 חוזי כתיבה מחייבים

| Action / נתיב | קלט עסקי | בדיקות וטרנזקציה | תוצאה |
|---|---|---|---|
| `updateMyProfile` | displayName | actor בלבד; profile נוצרת אחרי Auth, ללא משתמש שרירותי | profile DTO |
| `createSpace` | requestId, timezone | user ללא חברות; profile קיימת; space+slot1+mutation key באותה טרנזקציה | space ID |
| `createInvitation` | targetEmail | נעילת space; חבר יחיד; מנפיק slot1; revoke קודמת; hash+תוקף | raw link פעם אחת, expiry |
| `revokeInvitation` | invitationId | מנפיק; מרחב פתוח; pending בלבד; lock space קודם | status בלבד |
| `POST /api/invitations/exchange` | token | אורך/קידוד, rate limit, cookie זמני; אין קבלת הזמנה | יעד כניסה פנימי |
| `acceptInvitation` | ללא actor/token בטופס | token מה-cookie; actor מאומת; RPC מסעיף 10.3; ניקוי cookie | space ID |
| `createIdea` | requestId, idea fields | חברות; active; createdBy מה-actor; key+insert | idea DTO/version |
| `updateIdea` | id, expectedVersion, patch מותר | חבר; lock; space/id/createdBy בלתי משתנים; version+1, updatedAt | idea DTO |
| `archiveIdea` / `restoreIdea` | id, expectedVersion | חבר; archive חסום כל עוד קיימת תוכנית proposed; בלי מחיקה פיזית | status/version |
| `setReaction` | ideaId, preference או null | חבר; רעיון פעיל; upsert/delete רק עבור actor; אין userId בקלט | התגובה שלי + isMatch |
| `addComment` | requestId, ideaId, body | חבר; רעיון קיים; createdBy actor | comment DTO |
| `editComment` / `deleteComment` | id, expectedVersion, body? | המחבר בלבד; מרחב פתוח | comment/אישור |
| `chooseExperience` | filters, excludedIds | read-only; כללי סעיף 8; ללא דליפת תגובות | candidate + reasons |
| `createPlan` | requestId, ideaId, plan fields | רעיון פעיל; unique תוכנית פעילה; snapshot כותרת; ללא אישור אוטומטי | plan/version |
| `updatePlan` | id, expectedVersion, patch | proposed בלבד; timezone חוקי; version+1; אישורים קודמים לא תקפים | plan DTO |
| `confirmPlan` | id, expectedVersion | proposed; startsAt קיים; שני חברים; upsert אישור actor לגרסה הנעולה | confirmations + derived status |
| `unconfirmPlan` | id, expectedVersion | actor בלבד; תוכנית פעילה | derived status |
| `cancelPlan` | id, expectedVersion | חבר; proposed; status cancelled ו-version+1 | plan DTO |
| `completePlan` | id, expectedVersion, happenedOn, story | חבר; proposed; lock; מצב completed+version וזיכרון באותה טרנזקציה; retry מחזיר קיים | memory ID |
| `updateMemory` | id, expectedVersion, story, happenedOn | חבר; version check; לא משנה plan/space/creator | memory DTO |
| `createPhotoUpload` | memoryId, photoId, type/size מוצהרים | הרשאה+quota; metadata הם preliminary; pending | photo ID |
| `POST /api/photos/[id]/upload` | binary | בעל pending בלבד; סעיף 11.3; finalize עם בדיקת הרשאה חוזרת | ready DTO |
| `GET /api/photos/[id]/content` | photo ID | ready וחברות בכל בקשה; no-store | stream |
| `deletePhoto` | photo ID | המעלה בלבד; mark deleting; Storage delete; finalize/retry | pending/success |
| `closeSpace` | expectedSpaceId, explicit confirmation | אימות מחדש; חברות; lock space; close+revoke invites+audit; enqueue purge | closed |
| `requestAccountDeletion` | explicit confirmation | אימות מחדש; סגירה אם צריך; job מחיקה מפורש | job receipt |

**השלמה ללא שני אישורים:** מותר לסמן תוכנית כבוצעה גם אם האישורים נשכחו; ההשלמה היא דיווח משתמש, לא הוכחת הגעה. אפשר להשלים תוכנית בלי מועד מתוכנן כל עוד הוזן `happenedOn`. זה אינו משנה את כלל האישור למסך „מאושר לשנינו”.

### 13.3 קריאות ו-DTO

`getHome`: תוכנית קרובה, מספר מאצ׳ים, מספר רעיונות, מצב המתנה לבן זוג.  
`listIdeas`: cursor, search, category, myReaction, matchedOnly; תמיד סינון מרחב בשרת/RLS.  
`getIdea`: תוכן, תגובתי, isMatch, תגובות טקסט; ללא תגובת האחר.  
`listPlans/getPlan`: אישורים לגרסה הנוכחית, שם התצוגה של כל מאשר; לא raw Auth user.  
`listMemories/getMemory`: טקסט ו-photo IDs; לא service URLs ולא paths נחוצים ללקוח.  
`getInvitationStatus`: למנפיק בלבד, email מוסווה, expiry וסטטוס; ללא token/hash.  
`getAccountState`: מאפשר להציג „מרחב סגור” גם כאשר RLS חוסמת תוכן; שירות מחזיר מצב החשבון עצמו בלבד.

### 13.4 חוזה RPC שירות

כל RPC שירות מקבלת `p_actor` מהשרת בלבד; מאמתת קיום משתמש ו-profile, נועלת מרחב ומוודאת `open` וחברות; אחר כך נועלת/קוראת משאב ומוודאת את `space_id`. פעולות המחבר מאמתות גם בעלות. עמודות בעלות וקישור הן immutable. עדכון version/timestamps נעשה ב-RPC, לא בלקוח.

key idempotency נכתב באותה טרנזקציה עם משאב. שימוש חוזר באותו key וב-payload שונה מחזיר 409. כשהמשאב עדיין קיים מחזירים DTO עדכני שלו. שמירת keys לפחות 7 ימים היא ברירת מחדל תפעולית מוצעת, עם cleanup; אין לשמור בהם payload פרטי שלם.

סגירה ומחיקה מחייבות worker תפעולי עם retries ורישום סטטוס. אין לבצע מחיקת מרחב גדולה כחלק מבקשת UI קצרה. טבלאות queue/jobs מפורטות במימוש לפני release; הן אינן כלולות בבסיס הסכמה לעיל. יש להוסיף להן RLS חסום ללקוחות והרשאות worker בלבד.

## 14. קריטריוני קבלה ובדיקות

### 14.1 תרחישי מוצר

| ID | Given / When | Then |
|---|---|---|
| AC01 | חשבון חדש יוצר מרחב פעמיים עם אותו key | מרחב אחד וחברות אחת |
| AC02 | בן זוג מוזמן ומאמת את האימייל הנכון | שני חברים בלבד, בית משותף, אותה רשימת רעיונות |
| AC03 | משתמש שומר כותרת בלבד | רעיון נוצר; עלות וזמן נשארים NULL; אין תגובת yes אוטומטית |
| AC04 | רק אחד בוחר yes | הוא רואה את תגובתו; אין מאצ׳ ואין גילוי תגובת האחר |
| AC05 | שני הצדדים בוחרים yes ואז אחד משנה | המאצ׳ מופיע ואז נעלם; תוכנית קיימת נשארת |
| AC06 | אין מועמדים לפי פילטר | empty state ופעולת הרחבה; אין בחירה שאינה עומדת בתנאי |
| AC07 | עלות חסרה ו-allowUnknown=false עם תקרה | הרעיון אינו מוצע; אפס כן נחשב עלות ידועה |
| AC08 | תוכנית אושרה בידי שניהם ואז נערכה | ה-version עולה; אינה מוצגת עוד כמאושרת לשניהם |
| AC09 | שני הצדדים עורכים אותה version | הראשון מצליח; השני מקבל conflict ללא אובדן שקט |
| AC10 | השלמה נשלחת שוב לאחר timeout | זיכרון אחד בלבד והפניה אליו |
| AC11 | תמונה נכשלת אחרי יצירת זיכרון | הטקסט והזיכרון נשמרים; retry אינו יוצר כפילות |
| AC12 | פתיחה ב-320px, RTL ומקלדת | אין גלילה אופקית; כל פעולה נגישה; כפתור שמירה אינו מוסתר |
| AC13 | משתמש עובר offline ומנסה לשמור | רואה שהמידע לא נשמר; אין הודעת הצלחה כוזבת |
| AC14 | תוכנית עברה בזמן אך לא הושלמה | מסומנת „המועד עבר”; לא נוצרת זיכרון אוטומטית |
| AC15 | מרחב נסגר | בקשות חדשות לכל התוכן והתמונות נדחות לשני הצדדים |

### 14.2 בדיקות הרשאות מחייבות לפני פריסה

Fixtures: משתמשים A ו-B במרחב ראשון; C ו-D בשני; E ללא חברות; anon. משתמש service רק לבדיקות תחזוקה. להריץ מול Postgres/Supabase אמיתיים מקומיים או staging, לא רק mocks.

1. A אינו קורא רעיונות, תוכניות, זיכרונות, תגובות טקסט או תמונות של C/D באמצעות UUID ידוע.
2. A אינו קורא raw reaction של B גם ב-REST ישיר, join או RPC; הוא כן קורא את שלו ואת מאצ׳י המרחב שלו.
3. anon ו-authenticated אינם יכולים לבצע DML ישיר או לקרוא private tables; אינם יכולים להפעיל service RPC עם actor מזויף.
4. כל service RPC נבדקת עם actor של מרחב אחר, משאב זר, child ממקום אחר ושינוי עמודות immutable. בדיקה רק דרך UI אינה מספיקה.
5. קבלת אותה הזמנה במקביל: חברות אחת; שתי קבלות למרחבים שונים מאותו חשבון: חברות אחת; אף מצב אינו מאפשר slot שלישי.
6. הזמנה פגה, מבוטלת, token אקראי, אימייל לא מאומת או אחר: כשל ללא דליפת פרטי מרחב. GET/link preview לא מצרף.
7. בדיקת התמונות כוללת URL ישיר ללא JWT, נתיב מזויף, metadata pending, קובץ מפוברק, EXIF GPS והעלאה בזמן סגירה.
8. סגירה מתחרה עם כתיבה: הטרנזקציות מסודרות, ואין כתיבה המתקבלת לאחר סגירה; העלאה חיצונית מאוחרת מנוקה.
9. לאחר יציאה, כפתור Back/רענון/service worker לא מציג תוכן שנשמר בדיסק על ידי האפליקציה. מידע שכבר בזיכרון מנוקה בזמן היציאה.
10. redirect זדוני, תוכן script בטקסט, URL לא https, CSRF, rate limit ושגיאות ספק נבדקים.
11. cache/CDN/image optimizer אינם מחזירים תמונה או HTML מחשבון A ל-C.
12. בדיקת restore מגיבוי בסביבה מבודדת; מדיניות מחיקה ו-cleanup נבדקות על רשומות וקבצים סינתטיים.

### 14.3 שכבות בדיקה ו-Definition of Done

- Unit: סינון/ניקוד בחירה, תקציב NULL/0, validation, המרת זמן ו-DST, derived confirmations.
- DB integration: RLS, constraints, RPC transactions, races, rollback ו-idempotency; pgTAP או runner תואם.
- E2E בשני browser contexts: כניסה/הזמנה, רעיון, תגובות, מאצ׳, בחירה, תכנון, שני אישורים, השלמה ותמונה.
- בדיקה ידנית: עברית וקורא מסך בסיסי, Android Chrome, Safari iOS, desktop; התקנה ו-offline בהתאם לתמיכה בפועל.
- לפני release: typecheck/lint/build, migrations על DB נקי, generated types, כל בדיקות האבטחה, `.env.example`, הוראות הפעלה, rollback תפעולי, bucket פרטי, לוגים נקיים מסודות, בדיקת מחיקה ותנאי פרטיות מדויקים.

SQL במסמך לא הורץ מול DB, והמוצר לא נבנה במסגרת כתיבת המסמך. הבדיקות כאן הן דרישות ביצוע ולא תוצאות בדיקה קיימות.

## 15. Roadmap

השלבים הם סדר תלות, ללא התחייבות ללוחות זמנים או מחירים.

| שלב | תכולה | שער יציאה |
|---|---|---|
| 0 — יסודות | אישור החלטות מוצר, מסכי RTL בסיסיים, repo, סביבות, Auth, schema, RLS, RPC pattern | בדיקות בידוד שני מרחבים + build |
| 1 — מרחב זוגי | onboarding, הזמנה/ביטול/קבלה, הגדרות, מצב המתנה וסגירה | מירוצי קבלה ואימייל שגוי נבדקו |
| 2 — מאגר | בית בסיסי, רעיונות, הוספה מהירה, חיפוש, תגובות אישיות וטקסט, מאצ׳ים | זרימה של שני משתמשים עובדת ללא דליפה |
| 3 — בחירה ותכנון | מנוע בחירה, תוכנית, גרסאות, אישורים, ביטול | תרחישי empty/conflict ואישורים נבדקו |
| 4 — זיכרונות ו-PWA | השלמה, ארכיון, תמונות פרטיות, manifest/offline, worker ניקוי ומחיקה | E2E מלא, בידוד Storage, מחיקה ו-PWA |
| 5 — השקת MVP פרטית | תיקוני שימושיות, בדיקת מכשירים, גיבוי/שחזור ותפעול | Definition of Done מלא; שימוש של שני בני הזוג |

### אחרי MVP

**שלב מתקדם א — נוחות:** עדכונים בזמן אמת עם refetch מוגן; Push opt-in ללא תוכן רגיש; ייצוא ICS של תוכנית בהסכמה; קטגוריות/תגיות נוספות; ייצוא מידע; תמיכה מבוקרת ב-HEIC.

**שלב מתקדם ב — תכנון עשיר:** הצעת מספר מועדים והצבעה, משימות לקראת חוויה, תזכורות, רמות תקציב, מספר מטבעות עם הצגה נפרדת וללא המרה לא מאומתת, מצב „עשינו ורוצים שוב”.

**שלב מתקדם ג — גילוי:** קטלוג רעיונות אופציונלי, המלצות AI רק בהסכמה ועם צמצום מידע שנשלח לספק; כל מחיר/זמינות עם מקור ותאריך אימות; אין שילוב תגובות פרטיות ב-prompt ללא הסכמה ייעודית.

**דורש תכנון אבטחה חדש:** רעיונות הפתעה סודיים, החלפת בן זוג, מספר מרחבים, שיתוף חיצוני, כתיבה offline או E2EE. אין להוסיף דגל UI ולהניח שההרשאות הקיימות מספיקות.

## 16. החלטות שנותרו לאישור מוצר

ברירות המחדל במסמך מספיקות לתחילת מימוש; אלו נקודות לבדיקה לפני שימוש אמיתי:

1. האם פרטיות תגובות עם חשיפת מאצ׳ בלבד מתאימה לשני המשתמשים?
2. האם כניסה באימייל וקבלת הזמנה קשורה לאימייל הן חוויית הכניסה הרצויה?
3. האם השלמה ועריכת זיכרון בידי אחד הצדדים מקובלות?
4. האם סגירת מרחב בידי אחד הצדדים, שחוסמת גם את האחר, היא המדיניות הרצויה? לפני השקה נדרשת החלטה מפורשת ושפה ברורה במסך.
5. ספק אירוח, דומיין, שליחת Auth emails, גיבוי ותקופת מחיקת גיבויים: נבחרים לפי התשתית בפועל, ללא מחיר משוער במסמך.

## 17. פרומפט פתיחה מוכן ל-Claude Code

יש לשמור מסמך זה בריפו תחת `docs/The-Bucket-List-Technical-Spec-HE.md` ולהדביק את הטקסט הבא. הנתיב כאן הוא נתיב יחסי מומלץ בתוך הפרויקט החדש.

```text
בנה את The Bucket List לפי docs/The-Bucket-List-Technical-Spec-HE.md.
קרא את כל המסמך ואת הוראות הריפו לפני כתיבת קוד. זה מוצר פרטי לשני בני זוג
שאינם גרים יחד: שומרים רעיונות, מסמנים רצון אישי, מגלים מאצ׳ים, בוחרים חוויה,
מתכננים אותה ושומרים זיכרונות.

עבוד ב-Next.js App Router, TypeScript strict, ממשק עברי RTL mobile-first ו-PWA,
עם Supabase Auth, Postgres ו-Storage. בחר גרסאות stable תואמות ונעל אותן.
אל תמציא פרטי פריסה, סודות, מחירים או תאריכים אמיתיים. כל demo הוא סינתטי,
מסומן ונפרד מ-production. האפיון הוא בסיס מוצע; אין לטעון שנבדק מול טקסט
השיחה המקורי שאינו זמין במלואו.

תחילה בדוק את מצב הריפו. אם הוא קיים, שמור על שינויים קיימים ואל תדרוס אותם.
צור תוכנית קצרה לפי שלבי ה-roadmap ואז התחל לממש את היסודות והזרימה האנכית
הראשונה: כניסה -> יצירת מרחב -> הזמנת בן זוג -> רעיון ראשון.
המשך את ה-MVP לפי התלויות בלי להסתפק במסכי mock.

כללים מחייבים:
1. שני חברים לכל היותר ומרחב אחד לחשבון. ההגבלה נאכפת במסד גם במירוצים.
2. תגובת רצון פרטית למשתמש; רק מאצ׳ של שני yes נחשף. אין דליפה ב-API,
   במנוע בחירה, ב-Realtime, בלוגים או דרך joins. אין yes אוטומטי בעת הוספה.
3. רעיון משותף; תגובת טקסט נפרדת מרצון אישי. אין רעיונות סודיים ב-MVP.
4. reads עם JWT ו-RLS; writes דרך RPC שירות צרות, לאחר אימות בשרת.
   כל RPC שירות בודקת actor, חברות, מרחב פתוח, בעלות לפי הצורך ו-version.
   אל תפתח DML ללקוחות כדי לעקוף RPC חסרה. service key נשאר server-only.
5. קבלת הזמנה אטומית, token אקראי עם hash בלבד במסד, אימייל מאומת,
   תפוגה וביטול. אין קבלה ב-GET. אין raw token ב-logs או query strings.
6. תוכנית confirmed רק כשיש שני אישורים ל-version הנוכחי ומועד התחלה.
   עריכה מבטלת תוקף אישורים; optimistic concurrency עם 409.
7. השלמת תוכנית ויצירת זיכרון בטרנזקציה, עם idempotency. תמונות מטופלות
   בנפרד עם pending/ready/failed/deleting, ניקוי orphans ו-retry.
8. bucket פרטי, בדיקת סוג קובץ אמיתי, הסרת EXIF, quota ומגבלות גודל.
   צפייה דרך endpoint מאומת no-store. אין תמונות פרטיות ב-cache משותף.
9. PWA שומרת offline רק מעטפת ציבורית. אין מידע זוגי או כתיבות ב-offline.
10. כתוב empty/loading/error לכל המסכים ונגישות מקלדת/RTL.

ה-SQL במסמך הוא בסיס שלא הורץ: הפוך אותו ל-migrations נבדקות, השלם את כל
RPC הכתיבה, grants, job queue, workers וסגירת/מחיקת מרחב. בדוק RLS והרשאות
בגישה ישירה ל-Supabase, לא רק דרך UI. השתמש בתיעוד הרשמי המעודכן בעת המימוש.
אל תציג את המסמך כ-migration מוכנה בלי להריץ בדיקות.

בנה בדיקות משמעותיות לפי סעיף 14: שני מרחבים מבודדים, תגובות פרטיות,
הזמנות מתחרות, version conflicts, אישורים, השלמה חוזרת, תמונות וסגירת גישה.
הרץ typecheck, lint, build, בדיקות DB ואחריהן E2E בשני משתמשים.
אם חסרים credentials, ספק .env.example והוראות מדויקות; בנה ובדוק מקומית
את מה שאפשר. אל תטען שחיבור או בדיקה הצליחו אם לא בוצעו.

תוצרים: קוד פועל, migrations ו-RPC, tests, seed demo מפורש, README להפעלה,
.env.example, הוראות פריסה/גיבוי/מחיקה ורשימת פערים אמיתית מול קריטריוני הקבלה.
בסיום דווח מה הושלם, אילו בדיקות הורצו ומה דורש פעולה שלי.
אל תפרסם ל-production ואל תשלח הזמנות אמיתיות בלי הוראה מפורשת שלי.
```

## 18. מקורות טכניים

המקורות נבדקו לצורך בחירות התשתית; כללי המוצר, הסכמה והאלגוריתם הם הצעת התכנון במסמך, ולא ציטוט של ספק.

- [Next.js — Progressive Web Apps](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js — Data Security](https://nextjs.org/docs/app/guides/data-security)
- [Supabase — Server-Side Auth Clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)

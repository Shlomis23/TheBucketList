# צילומי לפני/אחרי לעיצוב

כלי לבדיקת שינויי עיצוב בלי לגעת במסד האמיתי: Supabase מזויף ומקומי
(`fake-supabase.mjs` + נתוני דוגמה קבועים ב-`fixtures.mjs`), `next dev` מולו,
וצילום של כ-20 מסכים בהיר + כהה.

```bash
bash scripts/design-preview/run.sh /tmp/shots-before
# ... שינויים ...
bash scripts/design-preview/run.sh /tmp/shots-after
python3 scripts/design-preview/diff.py /tmp/shots-before /tmp/shots-after /tmp/shots-diff
```

ערכת צבע: `THEME=mango bash scripts/design-preview/run.sh /tmp/shots-mango`.

`diff.py` מדפיס כמה פיקסלים השתנו בכל מסך ושומר תמונה (לפני | אחרי | הבדלים
באדום). שינוי שלא אמור להיראות (רפקטור) צריך לצאת `0 changed`.
צריך Playwright (`PLAYWRIGHT_PATH` אם הוא מותקן גלובלית) ו-Pillow.

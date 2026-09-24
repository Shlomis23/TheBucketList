// הוספה `/ideas/new` — F3, spec סעיף 5, 6.1.
// TODO: טופס כותרת חובה (1-120 תווים) + "הוסף פרטים" להרחבה.
// שמירה דרך createIdea Server Action; אין yes אוטומטי בעת יצירה.
export default function NewIdeaPage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>רעיון חדש</h1>
      <p>טופס ההוספה המהירה יגיע כאן (שלב 2).</p>
    </div>
  );
}

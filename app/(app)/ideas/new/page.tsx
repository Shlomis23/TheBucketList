// הוספה `/ideas/new` — F3, spec סעיף 5, 6.1.
// TODO: טופס כותרת חובה (1-120 תווים) + "הוסף פרטים" להרחבה.
// שמירה דרך createIdea Server Action; אין yes אוטומטי בעת יצירה.
export default function NewIdeaPage() {
  return (
    <div className="page">
      <h1 className="page-title">רעיון חדש</h1>
      <p className="status-msg">טופס ההוספה המהירה יגיע כאן (שלב 2).</p>
    </div>
  );
}

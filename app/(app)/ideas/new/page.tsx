import { NewIdeaForm } from "./NewIdeaForm";

// הוספה `/ideas/new` — F3, spec סעיף 5, 6.1.
export default function NewIdeaPage() {
  return (
    <div className="page">
      <h1 className="page-title">רעיון חדש</h1>
      <p className="page-subtitle">כותרת מספיקה כדי להתחיל — שאר הפרטים אופציונליים.</p>
      <div className="card">
        <NewIdeaForm />
      </div>
    </div>
  );
}

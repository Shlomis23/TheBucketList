import { NewIdeaForm } from "./NewIdeaForm";
import { getPartnerName } from "@/lib/dal/profile";

// הוספה `/ideas/new` — F3, spec סעיף 5, 6.1.
export default async function NewIdeaPage() {
  const partnerName = await getPartnerName();
  return (
    <div className="page">
      <h1 className="page-title">רעיון חדש</h1>
      <p className="page-subtitle">כותרת מספיקה כדי להתחיל — שאר הפרטים אופציונליים.</p>
      <div className="card">
        <NewIdeaForm partnerName={partnerName} />
      </div>
    </div>
  );
}

import { NewMemoryForm } from "./NewMemoryForm";
import { PageTransition } from "@/components/PageTransition";

// זיכרון חדש בלי תוכנית `/memories/new` — למה שקרה באופן ספונטני.
export default function NewMemoryPage() {
  return (
    <PageTransition kind="detail">
      <div className="page">
        <h1 className="page-title">זיכרון חדש</h1>
        <p className="page-subtitle">שם ותאריך מספיקים — הסיפור והתמונות אפשר להוסיף אחר כך.</p>
        <div className="card">
          <NewMemoryForm />
        </div>
      </div>
    </PageTransition>
  );
}

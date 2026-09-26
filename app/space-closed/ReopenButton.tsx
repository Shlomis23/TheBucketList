"use client";

import { useState, useTransition } from "react";
import { reopenSpaceAction } from "@/app/account/actions";

export function ReopenButton() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const result = await reopenSpaceAction();
            if (result && !result.ok) setError(result.error.message);
          })
        }
      >
        {pending ? "פותח…" : "ביטול הסגירה"}
      </button>
      {error && (
        <p role="alert" className="alert-error mt-8">
          {error}
        </p>
      )}
    </>
  );
}

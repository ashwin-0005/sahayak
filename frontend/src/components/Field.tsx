import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

// Label + control + optional hint/error. The label stays wired to the input
// via htmlFor; the message line is announced when it changes. Uses the token
// control-gap between label and field.
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      <div className="mt-control">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={`${htmlFor}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
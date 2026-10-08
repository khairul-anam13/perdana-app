import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

const control =
  "w-full rounded-xl border border-garis-kuat bg-white px-3.5 text-base text-tinta placeholder:text-tinta-lembut/70 disabled:bg-daun-50 disabled:text-tinta-lembut aria-[invalid=true]:border-bata-600";

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
  className?: string;
};

/** Label + isian + pesan. Render-prop agar id/aria terpasang benar pada elemen isian apa pun. */
export function Field({ label, error, hint, children, className = "" }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-tinta">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? noteId : undefined,
      })}
      {(error || hint) && (
        <p
          id={noteId}
          className={`mt-1.5 text-sm ${error ? "font-medium text-bata-700" : "text-tinta-lembut"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} h-12 ${className}`} {...p} />;
}

export function Select({ className = "", ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} h-12 ${className}`} {...p} />;
}

export function Textarea({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-24 py-3 ${className}`} {...p} />;
}

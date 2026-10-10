import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { IconWarning } from "./icons";

const control =
  "w-full rounded-md border border-garis-kuat bg-lembar px-3.5 text-base text-tinta placeholder:text-tinta-pudar hover:border-tinta-pudar focus:border-pulpen-600 focus:outline-3 focus:outline-offset-1 focus:outline-pulpen-600 disabled:border-garis disabled:bg-kertas disabled:text-tinta-pudar aria-[invalid=true]:border-2 aria-[invalid=true]:border-merah-600";

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
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-tinta">
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
          className={`mt-1.5 flex items-center gap-1.5 text-sm ${error ? "font-bold text-merah-700" : "text-tinta-pudar"}`}
        >
          {error && <IconWarning className="size-4" />}
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

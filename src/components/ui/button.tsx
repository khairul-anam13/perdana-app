import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

/* Tepi bawah tebal = tombol timbul; saat ditekan tombol turun 1px. */
const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-md border-b-2 text-center font-bold leading-tight transition-[background-color,transform,opacity] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 aria-busy:cursor-progress ios:border-b-0 ios:font-semibold ios:active:translate-y-0 ios:active:opacity-60";

const variants: Record<Variant, string> = {
  primary: "border-pulpen-800 bg-pulpen-600 text-white hover:bg-pulpen-700 active:bg-pulpen-800",
  secondary:
    "border border-b-2 border-garis-kuat bg-lembar text-tinta hover:bg-pulpen-50 active:bg-pulpen-100 ios:border-0 ios:bg-pulpen-100 ios:text-pulpen-700 ios:hover:bg-pulpen-100 ios:active:bg-pulpen-100",
  ghost: "border-transparent text-pulpen-600 hover:bg-pulpen-50 active:bg-pulpen-100",
  danger: "border-merah-700 bg-merah-600 text-white hover:bg-merah-700 active:bg-merah-700",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-3 text-sm", // 47px: tetap di atas batas sentuh 44px
  md: "min-h-12 px-4 text-base",
  lg: "min-h-14 px-5 text-lg",
};

type Common = { variant?: Variant; size?: Size; block?: boolean };

export const buttonClass = ({ variant = "primary", size = "md", block }: Common = {}, extra = "") =>
  [base, variants[variant], sizes[size], block ? "w-full" : "", extra].filter(Boolean).join(" ");

export function Button({
  variant,
  size,
  block,
  loading,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Common & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="pemutar" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  ...props
}: ComponentProps<typeof Link> & Common) {
  return <Link className={buttonClass({ variant, size, block }, className)} {...props} />;
}

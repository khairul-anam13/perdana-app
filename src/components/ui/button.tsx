import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "padi";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-xl text-center font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-daun-700 text-white hover:bg-daun-800 active:bg-daun-900",
  secondary: "border border-garis-kuat bg-white text-tinta hover:bg-daun-50 active:bg-daun-100",
  ghost: "text-daun-700 hover:bg-daun-50 active:bg-daun-100",
  danger: "bg-bata-600 text-white hover:bg-bata-700 active:bg-bata-700",
  padi: "bg-padi-300 text-tinta hover:bg-padi-200 active:bg-padi-400",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-3 text-sm",
  md: "min-h-12 px-4 text-base", // 48px: nyaman disentuh
  lg: "min-h-14 px-5 text-lg",
};

type Common = { variant?: Variant; size?: Size; block?: boolean };

export const buttonClass = ({ variant = "primary", size = "md", block }: Common = {}, extra = "") =>
  [base, variants[variant], sizes[size], block ? "w-full" : "", extra].filter(Boolean).join(" ");

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Common) {
  return (
    <button type={type} className={buttonClass({ variant, size, block }, className)} {...props} />
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

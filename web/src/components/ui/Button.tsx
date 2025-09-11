"use client";
import clsx from "clsx";
export default function Button(
  {
    children,
    className,
    variant = "outline",
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "danger" | "accent";
  },
) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2 border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 active:translate-y-[1px] disabled:opacity-50";
  const styles = {
    primary:
      "border-transparent bg-indigo-600 text-white hover:bg-indigo-500",
    outline: "border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    danger:
      "border-transparent bg-rose-600 text-white hover:bg-rose-500",
    accent:
      "border-transparent bg-accent text-white hover:bg-accent/90",
  } as const;
  return (
    <button {...props} className={clsx(base, styles[variant], className)}>
      {children}
    </button>
  );
}

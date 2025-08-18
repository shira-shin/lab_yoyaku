"use client";
import clsx from "clsx";
export default function Button(
  {children, className, variant='outline', ...props}:
  React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?:'primary'|'outline'|'danger'}
){
  const base="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm transition";
  const styles={
    primary:"bg-neutral-900 text-white hover:bg-neutral-800",
    outline:"border hover:-translate-y-0.5 shadow-sm",
    danger:"bg-rose-600 text-white hover:bg-rose-500"
  };
  return <button {...props} className={clsx(base, styles[variant], className)}>{children}</button>
}

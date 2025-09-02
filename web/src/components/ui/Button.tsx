"use client";
import clsx from "clsx";
export default function Button(
  { children, className, variant = 'outline', ...props }:
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: 'primary' | 'outline' | 'danger' | 'accent';
    },
){
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    outline: 'border border-primary text-primary hover:bg-primary/10',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    accent: 'bg-accent text-white hover:bg-accent/90',
  } as const;
  return (
    <button {...props} className={clsx(base, styles[variant], className)}>
      {children}
    </button>
  );
}

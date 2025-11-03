"use client";
import Button from "@/components/ui/Button";
import clsx from "clsx";
import * as React from "react";

// 依存ゼロのスピナー
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx("mr-2 h-5 w-5 animate-spin", className)}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
    </svg>
  );
}

type Props = React.ComponentProps<typeof Button> & {
  loading?: boolean;
};

export default function PrimaryButton({ className, loading, children, ...rest }: Props) {
  return (
    <Button
      {...rest}
      className={clsx(
        "h-11 px-6 text-base font-semibold rounded-2xl shadow-md",
        "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white",
        "focus:outline-none focus:ring-4 focus:ring-blue-300/60",
        className
      )}
      disabled={loading || rest.disabled}
    >
      {loading && <Spinner />}
      {children}
    </Button>
  );
}

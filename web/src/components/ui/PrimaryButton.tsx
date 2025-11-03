"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import * as React from "react";

export type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function PrimaryButton({
  className,
  loading,
  children,
  disabled,
  type = "button",
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2", 
        "h-11 px-6 text-base font-semibold rounded-2xl shadow-md",
        "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white",
        "focus:outline-none focus:ring-4 focus:ring-blue-300/60",
        "disabled:opacity-70 disabled:cursor-not-allowed",
        className
      )}
      disabled={loading || disabled}
    >
      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

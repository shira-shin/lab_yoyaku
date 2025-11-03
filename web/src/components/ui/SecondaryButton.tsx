"use client";

import clsx from "clsx";
import * as React from "react";

export type SecondaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function SecondaryButton({ className, children, type = "button", ...rest }: SecondaryButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2",
        "h-11 px-5 text-base font-medium rounded-2xl",
        "text-slate-700 hover:bg-slate-100",
        "focus:outline-none focus:ring-4 focus:ring-slate-300/60",
        "disabled:opacity-60 disabled:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

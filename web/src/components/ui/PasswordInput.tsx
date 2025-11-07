"use client";

import clsx from "clsx";
import { forwardRef, useState, type InputHTMLAttributes } from "react";

export type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  containerClassName?: string;
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    { className, containerClassName, type: _type, autoComplete, ...rest },
    ref,
  ) => {
    const [visible, setVisible] = useState(false);

    const toggle = () => {
      setVisible((prev) => !prev);
    };
    const resolvedAutoComplete = autoComplete ?? "current-password";

    return (
      <div className={clsx("relative", containerClassName)}>
        <input
          {...rest}
          ref={ref}
          type={visible ? "text" : "password"}
          autoComplete={resolvedAutoComplete}
          className={clsx(
            "pr-12",
            className,
          )}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary"
          aria-label={`パスワードを${visible ? "隠す" : "表示"}`}
        >
          {visible ? "隠す" : "表示"}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;

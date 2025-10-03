'use client';

import { useState } from 'react';
import clsx from 'clsx';

type CopyButtonProps = {
  text: string;
  className?: string;
  title?: string;
};

export default function CopyButton({ text, className, title }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={clsx('ml-2 rounded border px-2 py-1 text-xs', className)}
      title={title ?? 'コピー'}
    >
      {copied ? 'コピーしました' : 'コピー'}
    </button>
  );
}

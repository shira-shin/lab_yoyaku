'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type BaseProps = {
  className?: string
  children: React.ReactNode
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  'aria-label'?: string
}

type LinkButtonProps =
  BaseProps &
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
      href: string
      prefetch?: boolean
    }

type ButtonProps =
  | (BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
  | LinkButtonProps

const stylesByVariant: Record<Variant, string> = {
  primary:
    'bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-400 shadow-sm',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400 shadow-sm',
  outline:
    'border border-slate-300 text-slate-800 hover:bg-slate-50 focus-visible:ring-violet-400',
  ghost:
    'text-slate-700 hover:bg-slate-100 focus-visible:ring-violet-400',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300 shadow-sm',
}

const stylesBySize: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-xl',
  md: 'text-base px-4 py-2.5 rounded-2xl',
  lg: 'text-base px-5 py-3 rounded-2xl',
}

export function Button(props: ButtonProps) {
  const {
    className,
    children,
    variant = 'primary',
    size = 'md',
    block,
    loading,
    leftIcon,
    rightIcon,
    ...rest
  } = props as any

  const isAriaDisabled =
    (rest && (rest['aria-disabled'] === true || rest['aria-disabled'] === 'true')) ||
    false

  const cn = clsx(
    'inline-flex select-none items-center justify-center gap-2 transition-colors',
    'focus-visible:outline-none focus-visible:ring-4',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    stylesByVariant[variant],
    stylesBySize[size],
    block && 'w-full',
    isAriaDisabled && 'pointer-events-none opacity-60',
    className
  )

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      <span className="whitespace-nowrap">{children}</span>
      {rightIcon}
    </>
  )

  if ('href' in props && props.href) {
    const { href, prefetch, ...anchorRest } = rest as LinkButtonProps
    return (
      <Link
        href={href as string}
        prefetch={prefetch ?? false}
        className={cn}
        {...(anchorRest as any)}
        role="button"
      >
        {content}
      </Link>
    )
  }
  return (
    <button className={cn} {...(rest as any)}>
      {content}
    </button>
  )
}

export default Button

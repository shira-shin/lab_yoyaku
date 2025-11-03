import * as React from 'react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  color?: string
  size?: string | number
  strokeWidth?: number
}

export const Loader2: React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>

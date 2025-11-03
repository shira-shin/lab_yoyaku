'use client';

import { Button } from '@/components/ui/Button';

type Props = {
  className?: string;
  variant?: 'outline' | 'ghost' | 'secondary' | 'primary';
  size?: 'sm' | 'md' | 'lg';
};

export default function PrintButton({ className, variant = 'outline', size = 'sm' }: Props) {
  return (
    <Button type="button" onClick={() => window.print()} className={className} variant={variant} size={size}>
      印刷
    </Button>
  );
}

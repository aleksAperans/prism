import { Pyramid } from 'lucide-react';

interface PrismIconProps {
  className?: string;
  size?: number;
}

export function PrismIcon({ className, size = 24 }: PrismIconProps) {
  return <Pyramid className={className} size={size} />;
}
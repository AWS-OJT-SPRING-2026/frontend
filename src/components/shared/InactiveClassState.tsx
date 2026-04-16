import { Lock } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

interface InactiveClassStateProps {
  status?: string | null;
  className?: string;
  children: ReactNode;
  showLock?: boolean;
  lockLabel?: string;
}

export function isInactiveStatus(status?: string | null): boolean {
  return String(status ?? '').toUpperCase() === 'INACTIVE';
}

export function InactiveClassState({
  status,
  className,
  children,
  showLock = true,
  lockLabel = 'Lớp đã ngưng hoạt động',
}: InactiveClassStateProps) {
  const inactive = isInactiveStatus(status);

  return (
    <div className={`relative ${inactive ? 'grayscale opacity-50' : ''} ${className ?? ''}`}>
      {inactive && showLock && (
        <span className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-extrabold text-white">
          <Lock className="h-3 w-3" weight="fill" />
          {lockLabel}
        </span>
      )}
      {children}
    </div>
  );
}


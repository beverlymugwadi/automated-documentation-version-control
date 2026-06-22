import type { ReactNode } from 'react';

export interface TooltipProps {
  label: ReactNode;
  side?: 'top' | 'bottom';
  children: ReactNode;
}

export function Tooltip({ label, side = 'top', children }: TooltipProps) {
  return (
    <span className="ui-tooltip">
      {children}
      <span className={`ui-tooltip__bubble ui-tooltip__bubble--${side}`} role="tooltip">
        {label}
      </span>
    </span>
  );
}
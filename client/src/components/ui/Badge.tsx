import type { HTMLAttributes } from 'react';

type Tone = 'neutral' | 'signal' | 'add' | 'remove' | 'amber';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  mono?: boolean;
  dot?: boolean;
}

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

export function Badge({ tone = 'neutral', mono = false, dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cx('ui-badge', tone !== 'neutral' && `ui-badge--${tone}`, mono && 'ui-badge--mono', className)}
      {...rest}
    >
      {dot && <span className="ui-badge__dot" />}
      {children}
    </span>
  );
}
import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: boolean;
  hover?: boolean;
  as?: 'div' | 'section' | 'article';
}

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

export function Card({ pad = true, hover = false, as = 'div', className, ...rest }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={cx('ui-card', pad && 'ui-card--pad', hover && 'ui-card--hover', className)}
      {...rest}
    />
  );
}
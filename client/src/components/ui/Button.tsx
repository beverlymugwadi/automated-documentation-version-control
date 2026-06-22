import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'github';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  iconOnly?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, block = false, iconOnly = false,
    leftIcon, rightIcon, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx('ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`,
        block && 'ui-btn--block', iconOnly && 'ui-btn--icon', loading && 'ui-btn--loading', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className="ui-btn__content">
        {leftIcon}{children}{rightIcon}
      </span>
      {loading && (
        <span className="ui-btn__spinner" aria-hidden>
          <Loader2 size={size === 'sm' ? 15 : 17} className="spin" />
        </span>
      )}
    </button>
  );
});
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const msgId = `${inputId}-msg`;

  return (
    <div className={cx('ui-field', Boolean(icon) && 'ui-field--with-icon', Boolean(error) && 'ui-field--error')}>
      <div className="ui-field__wrap">
        <input
          ref={ref}
          id={inputId}
          className={cx('ui-input', className)}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          {...rest}
        />
        <label htmlFor={inputId} className="ui-field__label">{label}</label>
        {icon && <span className="ui-field__icon">{icon}</span>}
      </div>
      {error ? (
        <div id={msgId} className="ui-field__msg" role="alert">
          <AlertCircle size={13} /><span>{error}</span>
        </div>
      ) : hint ? (
        <div id={msgId} className="ui-field__hint">{hint}</div>
      ) : null}
    </div>
  );
});
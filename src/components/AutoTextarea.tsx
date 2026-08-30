import type { TextareaHTMLAttributes } from 'react';

import { useAutoResize } from './hooks';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
};

export function AutoTextarea({ value, className, ...rest }: Props) {
  const ref = useAutoResize(value);

  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      rows={1}
      className={`${className ?? 'input-field'} resize-none overflow-hidden`}
    />
  );
}

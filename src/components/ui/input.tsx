import * as React from 'react';
import { cn } from '../../lib/utils';
type InputProps = React.ComponentProps<'input'>;
export function Input({ className, type = 'text', ...props }: InputProps) {
    return <input type={type} data-slot="input" className={cn('field', className)} {...props}/>;
}


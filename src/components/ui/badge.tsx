import * as React from 'react';
import { cn } from '../../lib/utils';
export function Badge({ className, ...props }: React.ComponentProps<'span'>) {
    return <span data-slot="badge" className={cn('nft-badge', className)} {...props}/>;
}


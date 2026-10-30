import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
export const buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:pointer-events-none disabled:opacity-50', {
    variants: { variant: { default: 'bg-[#d89550] text-[#1d130d] hover:bg-[#e8a762]', outline: 'border border-[#77533a] text-[#f4e9de] hover:bg-[#35241c]', ghost: 'text-[#f4e9de] hover:bg-[#35241c]' }, size: { default: 'h-11 px-5 py-2', sm: 'h-9 px-3', lg: 'h-12 px-8', icon: 'h-10 w-10' } },
    defaultVariants: { variant: 'default', size: 'default' }
});
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
}) {
    const Component = asChild ? Slot : 'button';
    return <Component data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}/>;
}


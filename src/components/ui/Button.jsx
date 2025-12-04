'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button Component - Enterprise Design System
 * 
 * Variants: primary, secondary, ghost, danger
 * Sizes: sm, md, lg
 * Features: loading state, icons, full-width option
 */
const Button = forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    ...props
}, ref) => {
    const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium cursor-pointer select-none
    transition-all duration-200 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    active:scale-[0.98]
  `;

    const variants = {
        primary: `
      bg-gray-900 text-white
      hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5
      focus-visible:ring-gray-900
    `,
        secondary: `
      bg-white text-gray-900 border border-gray-200
      hover:bg-gray-50 hover:border-gray-300
      focus-visible:ring-gray-400
    `,
        ghost: `
      bg-transparent text-gray-700
      hover:bg-gray-100 hover:text-gray-900
      focus-visible:ring-gray-400
    `,
        danger: `
      bg-red-600 text-white
      hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5
      focus-visible:ring-red-600
    `,
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs rounded-lg',
        md: 'h-10 px-4 text-sm rounded-xl',
        lg: 'h-11 px-6 text-sm rounded-xl',
    };

    const iconSizes = {
        sm: 'w-3.5 h-3.5',
        md: 'w-4 h-4',
        lg: 'w-4 h-4',
    };

    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className={`${iconSizes[size]} animate-spin`} />
                    <span>Loading...</span>
                </>
            ) : (
                <>
                    {Icon && iconPosition === 'left' && <Icon className={iconSizes[size]} strokeWidth={2} />}
                    {children}
                    {Icon && iconPosition === 'right' && <Icon className={iconSizes[size]} strokeWidth={2} />}
                </>
            )}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;

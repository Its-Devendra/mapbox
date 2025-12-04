'use client';

/**
 * Badge Component - Enterprise Design System
 * 
 * Variants: default, success, warning, error, info
 * Features: dot indicator, pill/square shapes
 */
export default function Badge({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
    className = '',
}) {
    const variants = {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-green-50 text-green-700',
        warning: 'bg-amber-50 text-amber-700',
        error: 'bg-red-50 text-red-700',
        info: 'bg-blue-50 text-blue-700',
        purple: 'bg-purple-50 text-purple-700',
    };

    const dotColors = {
        default: 'bg-gray-500',
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        purple: 'bg-purple-500',
    };

    const sizes = {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
    };

    if (dot) {
        return (
            <span className={`inline-flex items-center gap-1.5 ${className}`}>
                <span className={`w-2 h-2 rounded-full ${dotColors[variant]}`} />
                <span className="text-sm text-gray-600">{children}</span>
            </span>
        );
    }

    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-md
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
        >
            {children}
        </span>
    );
}

/**
 * Status Badge - Special variant for status indicators
 */
Badge.Status = function StatusBadge({ active, activeLabel = 'Active', inactiveLabel = 'Inactive' }) {
    return (
        <Badge variant={active ? 'success' : 'default'} dot>
            {active ? activeLabel : inactiveLabel}
        </Badge>
    );
};

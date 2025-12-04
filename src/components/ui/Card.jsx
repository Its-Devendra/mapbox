'use client';

/**
 * Card Component - Enterprise Design System
 * 
 * Features: hover lift effect, interactive variant, composable structure
 */
export default function Card({
    children,
    interactive = false,
    padding = 'md',
    className = '',
    onClick,
    ...props
}) {
    const paddingSizes = {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
    };

    const interactiveStyles = interactive
        ? 'cursor-pointer hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm'
        : '';

    return (
        <div
            onClick={onClick}
            className={`
        bg-white rounded-xl border border-gray-200 shadow-sm
        transition-all duration-200 ease-out
        ${paddingSizes[padding]}
        ${interactiveStyles}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
            {...props}
        >
            {children}
        </div>
    );
}

/**
 * Card subcomponents for composition
 */
Card.Header = function CardHeader({ children, className = '' }) {
    return (
        <div className={`pb-4 border-b border-gray-100 ${className}`}>
            {children}
        </div>
    );
};

Card.Title = function CardTitle({ children, className = '' }) {
    return (
        <h3 className={`text-base font-semibold text-gray-900 ${className}`}>
            {children}
        </h3>
    );
};

Card.Description = function CardDescription({ children, className = '' }) {
    return (
        <p className={`text-sm text-gray-500 mt-1 ${className}`}>
            {children}
        </p>
    );
};

Card.Body = function CardBody({ children, className = '' }) {
    return (
        <div className={`py-4 ${className}`}>
            {children}
        </div>
    );
};

Card.Footer = function CardFooter({ children, className = '' }) {
    return (
        <div className={`pt-4 border-t border-gray-100 ${className}`}>
            {children}
        </div>
    );
};

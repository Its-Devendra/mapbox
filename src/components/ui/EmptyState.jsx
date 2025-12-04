'use client';

/**
 * EmptyState Component - Enterprise Design System
 * 
 * Consistent empty state with icon, title, description, and action
 */
export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = '',
}) {
    return (
        <div className={`text-center py-12 px-6 ${className}`}>
            {Icon && (
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                </div>
            )}

            {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {title}
                </h3>
            )}

            {description && (
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {description}
                </p>
            )}

            {action && (
                <div className="flex justify-center">
                    {action}
                </div>
            )}
        </div>
    );
}

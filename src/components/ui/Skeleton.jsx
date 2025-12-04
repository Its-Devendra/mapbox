'use client';

/**
 * Skeleton Component - Enterprise Design System
 * 
 * Loading placeholder with shimmer animation
 */
export default function Skeleton({
    width,
    height,
    rounded = 'md',
    className = '',
    ...props
}) {
    const roundedStyles = {
        none: 'rounded-none',
        sm: 'rounded',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
    };

    const style = {
        width: width,
        height: height,
    };

    return (
        <div
            className={`
        bg-gray-200 animate-pulse
        ${roundedStyles[rounded]}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
            style={style}
            {...props}
        />
    );
}

/**
 * Skeleton presets for common use cases
 */
Skeleton.Text = function SkeletonText({ lines = 1, className = '' }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height="0.875rem"
                    width={i === lines - 1 && lines > 1 ? '75%' : '100%'}
                    rounded="sm"
                />
            ))}
        </div>
    );
};

Skeleton.Avatar = function SkeletonAvatar({ size = 40, className = '' }) {
    return (
        <Skeleton
            width={size}
            height={size}
            rounded="full"
            className={className}
        />
    );
};

Skeleton.Card = function SkeletonCard({ className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-5 space-y-4 ${className}`}>
            <div className="flex items-center gap-3">
                <Skeleton.Avatar size={40} />
                <div className="flex-1 space-y-2">
                    <Skeleton height="0.875rem" width="60%" rounded="sm" />
                    <Skeleton height="0.75rem" width="40%" rounded="sm" />
                </div>
            </div>
            <Skeleton.Text lines={2} />
            <div className="flex gap-2">
                <Skeleton height="2rem" width="5rem" rounded="lg" />
                <Skeleton height="2rem" width="5rem" rounded="lg" />
            </div>
        </div>
    );
};

Skeleton.Table = function SkeletonTable({ rows = 5, className = '' }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {/* Header */}
            <div className="flex gap-4 pb-3 border-b border-gray-100">
                <Skeleton height="0.75rem" width="20%" rounded="sm" />
                <Skeleton height="0.75rem" width="15%" rounded="sm" />
                <Skeleton height="0.75rem" width="25%" rounded="sm" />
                <Skeleton height="0.75rem" width="15%" rounded="sm" />
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 py-3">
                    <Skeleton height="0.875rem" width="20%" rounded="sm" />
                    <Skeleton height="0.875rem" width="15%" rounded="sm" />
                    <Skeleton height="0.875rem" width="25%" rounded="sm" />
                    <Skeleton height="0.875rem" width="15%" rounded="sm" />
                </div>
            ))}
        </div>
    );
};

Skeleton.List = function SkeletonList({ items = 3, className = '' }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
                    <Skeleton width={40} height={40} rounded="lg" />
                    <div className="flex-1 space-y-2">
                        <Skeleton height="0.875rem" width="50%" rounded="sm" />
                        <Skeleton height="0.75rem" width="30%" rounded="sm" />
                    </div>
                    <Skeleton width={24} height={24} rounded="md" />
                </div>
            ))}
        </div>
    );
};

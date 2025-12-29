'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Input Component - Enterprise Design System
 * 
 * Features: icons, validation states, password toggle
 */
const Input = forwardRef(({
    label,
    type = 'text',
    error,
    success,
    hint,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    containerClassName = '',
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const hasLeftIcon = Icon && iconPosition === 'left';
    const hasRightIcon = (Icon && iconPosition === 'right') || isPassword;

    const getStateStyles = () => {
        if (error) return 'border-red-300 focus:border-red-500 focus:ring-red-500/20';
        if (success) return 'border-green-300 focus:border-green-500 focus:ring-green-500/20';
        return 'border-gray-200 focus:border-gray-400 focus:ring-gray-900/5';
    };

    return (
        <div className={`space-y-1.5 ${containerClassName}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            <div className="relative">
                {hasLeftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                )}

                <input
                    ref={ref}
                    type={inputType}
                    onWheel={(e) => {
                        // Prevent scroll from changing number input values
                        if (type === 'number') {
                            e.target.blur();
                        }
                    }}
                    className={`
            w-full h-10 px-3 py-2
            bg-white border rounded-xl
            text-sm text-gray-900 placeholder:text-gray-400
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
            ${hasLeftIcon ? 'pl-10' : ''}
            ${hasRightIcon ? 'pr-10' : ''}
            ${getStateStyles()}
            ${className}
          `.replace(/\s+/g, ' ').trim()}
                    {...props}
                />

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showPassword ? (
                            <EyeOff className="w-4 h-4" strokeWidth={2} />
                        ) : (
                            <Eye className="w-4 h-4" strokeWidth={2} />
                        )}
                    </button>
                )}

                {!isPassword && Icon && iconPosition === 'right' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                )}

                {/* Validation icons */}
                {(error || success) && !hasRightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {error && <AlertCircle className="w-4 h-4 text-red-500" />}
                        {success && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                )}
            </div>

            {/* Hint/Error/Success text */}
            {(hint || error || success) && (
                <p className={`text-xs ${error ? 'text-red-600' :
                    success ? 'text-green-600' :
                        'text-gray-500'
                    }`}>
                    {error || success || hint}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;

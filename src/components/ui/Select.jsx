'use client';

import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Select Component - Enterprise Design System
 */
const Select = forwardRef(({
    label,
    options = [],
    placeholder = 'Select an option',
    error,
    hint,
    className = '',
    containerClassName = '',
    ...props
}, ref) => {
    const getStateStyles = () => {
        if (error) return 'border-red-300 focus:border-red-500 focus:ring-red-500/20';
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
                <select
                    ref={ref}
                    className={`
            w-full h-10 px-3 py-2 pr-10
            bg-white border rounded-xl
            text-sm text-gray-900
            appearance-none cursor-pointer
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
            ${getStateStyles()}
            ${className}
          `.replace(/\s+/g, ' ').trim()}
                    {...props}
                >
                    <option value="" disabled>
                        {placeholder}
                    </option>
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <ChevronDown className="w-4 h-4" strokeWidth={2} />
                </div>
            </div>

            {(hint || error) && (
                <p className={`text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
                    {error || hint}
                </p>
            )}
        </div>
    );
});

Select.displayName = 'Select';

export default Select;

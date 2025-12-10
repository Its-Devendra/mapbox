'use client';

import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Modal Component - Enterprise Design System
 * 
 * Features: backdrop blur, scale animation, focus trap, multiple sizes
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    className = '',
}) {
    const modalRef = useRef(null);
    const previousActiveElement = useRef(null);

    // Size variants
    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        full: 'max-w-[95vw] max-h-[95vh]',
    };

    // Handle escape key
    const handleKeyDown = useCallback((e) => {
        if (closeOnEscape && e.key === 'Escape') {
            onClose();
        }
    }, [closeOnEscape, onClose]);

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    };

    // Focus management and body scroll lock
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement;
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleKeyDown);

            // Only focus the modal on initial open, not on re-renders
            // We check if the currently focused element is not inside the modal
            const modalElement = modalRef.current;
            if (modalElement && !modalElement.contains(document.activeElement)) {
                // Focus the first focusable element inside the modal, or the modal itself
                const focusableElements = modalElement.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstFocusable = focusableElements[0];
                if (firstFocusable) {
                    setTimeout(() => firstFocusable.focus(), 0);
                } else {
                    setTimeout(() => modalElement.focus(), 0);
                }
            }
        } else {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);

            // Restore focus
            previousActiveElement.current?.focus();
        }

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className={`
          relative w-full ${sizes[size]}
          bg-white rounded-2xl shadow-2xl
          animate-[scaleUp_300ms_cubic-bezier(0.34,1.56,0.64,1)]
          max-h-[90vh] overflow-hidden flex flex-col
          ${className}
        `.replace(/\s+/g, ' ').trim()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-6 border-b border-gray-100">
                        <div>
                            {title && (
                                <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 -m-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" strokeWidth={2} />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * Modal subcomponents for composition
 */
Modal.Body = function ModalBody({ children, className = '' }) {
    return (
        <div className={`p-6 ${className}`}>
            {children}
        </div>
    );
};

Modal.Footer = function ModalFooter({ children, className = '' }) {
    return (
        <div className={`flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 ${className}`}>
            {children}
        </div>
    );
};

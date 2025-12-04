/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI with retry option
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // In production, send to error logging service
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });

        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI can be provided
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleReset);
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-red-600" strokeWidth={2} />
                            </div>

                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {this.props.title || 'Something went wrong'}
                            </h1>

                            <p className="text-gray-600 mb-6">
                                {this.props.message || 'An unexpected error occurred. Please try again.'}
                            </p>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="w-full mb-6 text-left">
                                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 mb-2">
                                        Error details
                                    </summary>
                                    <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono text-gray-800 overflow-auto max-h-40">
                                        <p className="text-red-600 font-semibold mb-2">
                                            {this.state.error.toString()}
                                        </p>
                                        {this.state.errorInfo && (
                                            <pre className="whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        )}
                                    </div>
                                </details>
                            )}

                            <button
                                onClick={this.handleReset}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-full transition-all hover:shadow-lg cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4" strokeWidth={2} />
                                Try Again
                            </button>

                            {this.props.showHomeButton && (
                                <a
                                    href="/admin"
                                    className="mt-3 text-sm text-gray-600 hover:text-gray-900 underline cursor-pointer"
                                >
                                    Go to Dashboard
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Functional Error Fallback Component
 * Can be used as a standalone component for error states
 */
export function ErrorFallback({
    error,
    resetError,
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.'
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" strokeWidth={2} />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
                    <p className="text-gray-600 mb-6">{message}</p>

                    {error && process.env.NODE_ENV === 'development' && (
                        <div className="w-full mb-6 bg-gray-100 rounded-lg p-4 text-left">
                            <p className="text-sm font-mono text-red-600">
                                {error.message || error.toString()}
                            </p>
                        </div>
                    )}

                    {resetError && (
                        <button
                            onClick={resetError}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-full transition-all hover:shadow-lg cursor-pointer"
                        >
                            <RefreshCw className="w-4 h-4" strokeWidth={2} />
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ErrorBoundary;

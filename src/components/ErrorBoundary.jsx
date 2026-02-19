import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[50vh] flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-2">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Something went wrong</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            An unexpected error occurred. Try refreshing the page.
                        </p>
                        <details className="text-left text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
                            <summary className="cursor-pointer font-medium mb-1">Error details</summary>
                            <pre className="whitespace-pre-wrap break-words mt-2">{this.state.error?.message || 'Unknown error'}</pre>
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle size={48} className="text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-500 max-w-md mb-2">
            {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <pre className="text-xs text-gray-600 max-w-lg overflow-x-auto bg-surface-card p-3 rounded mt-2 mb-4 text-left">
            {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
            }}
            className="px-4 py-2 bg-siemens-teal text-white text-sm rounded-md hover:bg-siemens-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

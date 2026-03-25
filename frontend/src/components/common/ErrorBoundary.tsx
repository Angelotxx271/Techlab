import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
        >
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-5 py-2.5 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

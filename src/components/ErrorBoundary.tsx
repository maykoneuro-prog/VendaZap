import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = (this as any).state;
    const { children } = (this as any).props;

    if (hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      try {
        const firestoreError = JSON.parse(error?.message || '');
        if (firestoreError.error.includes('Missing or insufficient permissions')) {
          errorMessage = 'Você não tem permissão para realizar esta ação ou acessar estes dados.';
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-4 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Ops! Algo deu errado.</h1>
          <p className="text-neutral-600 mb-6 max-w-md">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Recarregar página
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-neutral-100 rounded text-left text-xs overflow-auto max-w-full">
              {error?.stack}
            </pre>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl max-w-lg mx-auto my-6" id="error-boundary-container">
          <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-5 animate-pulse" id="error-boundary-icon-wrapper">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" id="error-boundary-svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold text-neutral-100 mb-2 font-sans tracking-tight" id="error-boundary-title">
            Oups, chargement partiel interrompu 👁️
          </h3>
          <p className="text-sm text-neutral-400 max-w-sm mb-6 leading-relaxed" id="error-boundary-description">
            Axis a détecté une anomalie technique temporaire. L'application reste active, cliquez sur le bouton ci-dessous pour recharger ce module ou continuez vers d'autres pages.
          </p>
          <div className="flex items-center gap-3 justify-center w-full">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold rounded-xl transition-all border border-neutral-700"
              id="error-boundary-retry-btn"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/20 transition-all"
              id="error-boundary-reload-btn"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

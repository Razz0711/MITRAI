'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', background: '#e11d48', zIndex: 99999, position: 'fixed', inset: 0, overflowY: 'auto', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>MitrRAI Runtime Crash</h1>
          <p style={{ marginBottom: '1rem' }}>Please copy this error message and show it to the AI:</p>
          <div style={{ background: 'black', padding: '1rem', borderRadius: '8px', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
            <span style={{ color: '#f87171', fontWeight: 'bold' }}>{this.state.error?.name}:</span> {this.state.error?.message}
            <br /><br />
            <span style={{ color: '#9ca3af' }}>{this.state.error?.stack}</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '2rem', padding: '0.5rem 1rem', background: 'white', color: 'black', fontWeight: 'bold', borderRadius: '8px' }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

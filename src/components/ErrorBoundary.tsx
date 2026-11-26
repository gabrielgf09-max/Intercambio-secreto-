import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage =
      'Ocurrió un error inesperado al cargar la información de la sala.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string };
      if (parsed && typeof parsed.error === 'string') {
        if (parsed.error.toLowerCase().includes('permission')) {
          displayMessage =
            'No tienes permiso para realizar esta acción o acceder a este recurso en la sala.';
        } else {
          displayMessage = parsed.error;
        }
      }
    } catch {
      if (error.message) {
        displayMessage = error.message;
      }
    }
    return { hasError: true, message: displayMessage };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto my-12 bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-3xl p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#9B2226]/10 dark:bg-[#9B2226]/20 text-[#9B2226] dark:text-[#F28B82] flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
            No se pudo completar la operación
          </h2>
          <p className="mt-2 text-sm text-[#57524A] dark:text-[#B5ADA1] leading-relaxed">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-6 min-h-[44px] px-5 py-2.5 bg-[#1B4332] hover:bg-[#143326] dark:bg-[#2D6A4F] dark:hover:bg-[#38805F] text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

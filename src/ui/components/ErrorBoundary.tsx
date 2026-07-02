import { Component, type ErrorInfo } from 'react';
import type { ErrorBoundaryProps } from './ErrorBoundaryProps';

type ErrorBoundaryState = { hasError: boolean };

/**
 * Última red de seguridad de la UI: si un componente lanza un error al renderizar, React desmonta
 * el árbol entero y el usuario quedaría ante una pantalla en blanco sin explicación. Este boundary
 * lo captura y ofrece recargar (los datos están a salvo en Firestore; recargar restaura la app).
 * Es un class component porque React solo expone la captura de errores de render por esta vía.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sin telemetría en el MVP: la consola es el único registro para diagnosticar.
    console.error('ErrorBoundary atrapó un error de render:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <span className="text-4xl" aria-hidden="true">
          😵
        </span>
        <h1 className="text-lg font-semibold text-slate-800">Algo salió mal</h1>
        <p className="max-w-sm text-sm text-slate-500">
          Ocurrió un error inesperado en la app. Tus datos están a salvo: recarga para continuar
          donde ibas.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-slate-800 px-6 py-3 font-medium text-white"
        >
          Recargar
        </button>
      </main>
    );
  }
}

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renderiza los hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido sano</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenido sano')).toBeInTheDocument();
  });

  it('muestra el fallback con botón de recargar si un hijo lanza al renderizar', () => {
    // React loguea el error igual (esperado); silenciamos la consola para no ensuciar la salida.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
    spy.mockRestore();
  });
});

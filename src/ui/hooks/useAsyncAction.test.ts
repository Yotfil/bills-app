import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAsyncAction } from './useAsyncAction';

describe('useAsyncAction', () => {
  it('éxito: devuelve true, sin error y busy vuelve a false', async () => {
    const { result } = renderHook(() => useAsyncAction());
    let ok = false;
    await act(async () => {
      ok = await result.current.run(async () => undefined);
    });
    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('fallo: devuelve false y expone el mensaje del error', async () => {
    const { result } = renderHook(() => useAsyncAction());
    let ok = true;
    await act(async () => {
      ok = await result.current.run(async () => {
        throw new Error('sin red');
      });
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('sin red');
    expect(result.current.busy).toBe(false);
  });

  it('un run nuevo limpia el error del intento anterior', async () => {
    const { result } = renderHook(() => useAsyncAction());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error('falló');
      });
    });
    expect(result.current.error).toBe('falló');
    await act(async () => {
      await result.current.run(async () => undefined);
    });
    expect(result.current.error).toBeNull();
  });
});

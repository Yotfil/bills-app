import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './sessionStore';

// Reinicia el store entre tests (es un singleton de módulo).
beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'loading' });
});

describe('sessionStore', () => {
  it('arranca en estado loading sin usuario', () => {
    const { user, status } = useSessionStore.getState();
    expect(user).toBeNull();
    expect(status).toBe('loading');
  });

  it('setUser marca la sesión como autenticada', () => {
    useSessionStore.getState().setUser({ uid: 'u1', email: 'a@b.co', displayName: 'Ana' });
    const { user, status } = useSessionStore.getState();
    expect(status).toBe('authenticated');
    expect(user?.uid).toBe('u1');
  });

  it('clearUser cierra la sesión', () => {
    useSessionStore.getState().setUser({ uid: 'u1', email: null, displayName: null });
    useSessionStore.getState().clearUser();
    const { user, status } = useSessionStore.getState();
    expect(user).toBeNull();
    expect(status).toBe('unauthenticated');
  });
});

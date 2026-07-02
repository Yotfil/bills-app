import { describe, expect, it } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { describeError } from './firebaseError';

describe('describeError', () => {
  it('traduce los códigos comunes de Firestore', () => {
    expect(describeError(new FirebaseError('permission-denied', 'x'))).toMatch(/permiso/i);
    expect(describeError(new FirebaseError('unavailable', 'x'))).toMatch(/conexión/i);
    expect(describeError(new FirebaseError('unauthenticated', 'x'))).toMatch(/sesión/i);
  });

  it('para un código desconocido incluye el código (diagnóstico)', () => {
    expect(describeError(new FirebaseError('aborted', 'x'))).toContain('aborted');
  });

  it('usa el mensaje de un Error normal y un genérico para lo demás', () => {
    expect(describeError(new Error('se rompió'))).toBe('se rompió');
    expect(describeError('cualquier cosa')).toMatch(/algo salió mal/i);
  });
});

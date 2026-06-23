import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';

// Mockeamos la capa de datos de auth: la pantalla no debe tocar Firebase directamente.
vi.mock('../../data/authRepository', () => ({
  loginWithEmail: vi.fn().mockResolvedValue({ uid: 'u1', email: 'a@b.co', displayName: null }),
  registerWithEmail: vi.fn().mockResolvedValue({ uid: 'u1', email: 'a@b.co', displayName: null }),
  loginWithGoogle: vi.fn().mockResolvedValue({ uid: 'u1', email: 'a@b.co', displayName: null }),
}));

import { loginWithEmail, loginWithGoogle, registerWithEmail } from '../../data/authRepository';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginScreen', () => {
  it('muestra Google y los campos de correo/contraseña', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Correo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
  });

  it('inicia sesión con correo y contraseña', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.type(screen.getByPlaceholderText('Correo'), 'a@b.co');
    await user.type(screen.getByPlaceholderText('Contraseña'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(loginWithEmail).toHaveBeenCalledWith('a@b.co', 'secret1');
  });

  it('inicia sesión con Google', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: /Google/i }));
    expect(loginWithGoogle).toHaveBeenCalledOnce();
  });

  it('alterna a registro y usa registerWithEmail', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: 'Regístrate' }));
    await user.type(screen.getByPlaceholderText('Correo'), 'new@b.co');
    await user.type(screen.getByPlaceholderText('Contraseña'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(registerWithEmail).toHaveBeenCalledWith('new@b.co', 'secret1');
  });

  it('muestra un mensaje claro cuando las credenciales son incorrectas', async () => {
    vi.mocked(loginWithEmail).mockRejectedValueOnce({ code: 'auth/invalid-credential' });
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.type(screen.getByPlaceholderText('Correo'), 'a@b.co');
    await user.type(screen.getByPlaceholderText('Contraseña'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });
});

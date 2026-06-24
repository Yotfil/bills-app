// Usuario autenticado, en términos del dominio de la app (no el objeto de Firebase).
export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

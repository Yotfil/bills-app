// Punto único de inicialización de Firebase (capa de datos, CLAUDE.md §13.3).
// La configuración llega por variables de entorno (ver .env.example); NO se hardcodea.
// Auth (Google + correo/contraseña) y Firestore con persistencia offline se conectan aquí.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Si faltan las claves (p.ej. dev/CI sin `.env.local`), NO inicializamos Firebase: así la
// app sigue renderizando (se ve el login) en vez de tumbarse con `auth/invalid-api-key`.
// Las acciones de auth/datos avisan con un mensaje claro hasta que se configuren las claves.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app: FirebaseApp | null = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth: Auth | null = app ? getAuth(app) : null;

// Persistencia offline obligatoria (CLAUDE.md §3): la app debe funcionar sin señal
// y sincronizar al reconectar.
export const db: Firestore | null = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : null;

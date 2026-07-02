// CRUD genérico sobre una colección de Firestore ya tipada con converter (CLAUDE.md §8, §9.2).
// Todas las entidades comparten `BaseDoc` (id + auditoría), así que esta capa evita repetir
// el mismo código por colección. La lógica de saldos NO vive aquí (ver transactionService).
import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type WithFieldValue,
} from 'firebase/firestore';
import { CURRENT_SCHEMA_VERSION } from './collections';
import type { Persisted } from './converters';
import type { Archivable, BaseDoc } from '../domain/types';

/** Datos para crear: el documento sin los campos que pone esta capa (id + auditoría). */
export type CreateInput<T extends BaseDoc> = Omit<T, keyof BaseDoc>;
/** Datos para editar: cualquier subconjunto, salvo id y auditoría. */
export type UpdateInput<T extends BaseDoc> = Partial<Omit<T, keyof BaseDoc>>;

type Col<T extends BaseDoc> = CollectionReference<T, Persisted<T>>;

/** Ref sin converter, para `updateDoc` con campos sueltos (FieldValue/serverTimestamp). */
function rawDoc<T extends BaseDoc>(col: Col<T>, id: string): DocumentReference {
  return doc(col, id) as unknown as DocumentReference;
}

/** Lista todos los documentos (una sola lectura). */
export async function listAll<T extends BaseDoc>(col: Col<T>): Promise<T[]> {
  const snap = await getDocs(col);
  return snap.docs.map((d) => d.data());
}

/** Se suscribe a los cambios en tiempo real. Devuelve la función para desuscribirse. */
export function subscribeAll<T extends BaseDoc>(
  col: Col<T>,
  onChange: (items: T[]) => void,
): () => void {
  return onSnapshot(col, (snap) => onChange(snap.docs.map((d) => d.data())));
}

/** Lee un documento por id; null si no existe. */
export async function getById<T extends BaseDoc>(col: Col<T>, id: string): Promise<T | null> {
  const snap = await getDoc(doc(col, id));
  return snap.exists() ? snap.data() : null;
}

/** Crea un documento; añade id (auto), schemaVersion y timestamps de auditoría. */
export async function create<T extends BaseDoc>(
  col: Col<T>,
  data: CreateInput<T>,
): Promise<string> {
  const payload = {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as WithFieldValue<T>;
  const ref = await addDoc(col, payload);
  return ref.id;
}

/**
 * Crea VARIOS documentos en UN batch atómico: o entran todos o ninguno. Evita siembras
 * parciales si algo falla a mitad (p.ej. quedar con 7 de 15 categorías base, o con la mitad de
 * los fijos del mes). Límite de Firestore: 500 escrituras por batch, de sobra para las siembras
 * de esta app. Devuelve los ids en el mismo orden de entrada.
 */
export async function createMany<T extends BaseDoc>(
  col: Col<T>,
  items: Array<CreateInput<T>>,
): Promise<string[]> {
  if (items.length === 0) return [];
  const batch = writeBatch(col.firestore);
  const ids = items.map((data) => {
    const ref = doc(col); // id autogenerado; el converter quita `id` al escribir
    const payload = {
      ...data,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as unknown as WithFieldValue<T>;
    batch.set(ref, payload);
    return ref.id;
  });
  await batch.commit();
  return ids;
}

/** Actualiza campos de un documento y refresca `updatedAt`. */
export async function update<T extends BaseDoc>(
  col: Col<T>,
  id: string,
  data: UpdateInput<T>,
): Promise<void> {
  await updateDoc(rawDoc(col, id), {
    ...(data as DocumentData),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Archiva (borrado lógico): regla CRUD del §8 — eliminar = archivar si hay histórico, para
 * no romper los reportes. Desaparece de las listas activas pero se conserva.
 */
export async function archive<T extends BaseDoc & Archivable>(
  col: Col<T>,
  id: string,
): Promise<void> {
  await updateDoc(rawDoc(col, id), {
    archived: true,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Deshace el archivado: vuelve a las listas activas. Inverso de `archive`. */
export async function unarchive<T extends BaseDoc & Archivable>(
  col: Col<T>,
  id: string,
): Promise<void> {
  await updateDoc(rawDoc(col, id), {
    archived: false,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** Borrado físico. Usar solo cuando NO hay histórico asociado (si lo hay, usar archive). */
export async function hardDelete<T extends BaseDoc>(col: Col<T>, id: string): Promise<void> {
  await deleteDoc(doc(col, id));
}

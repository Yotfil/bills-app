// Converters de Firestore (CLAUDE.md §9.2). Traducen dominio ↔ Firestore en UN SOLO lugar.
// Reglas del mapa de persistencia:
//   - `id` NO se guarda dentro del documento: es `doc.id`. Al leer se rehidrata en el objeto.
//   - Las fechas ya son `Timestamp` en el dominio (§9.1), así que pasan tal cual.
//   - Los campos derivados no viven en el dominio (son funciones, §derived), así que no hay
//     nada que excluir aquí; las cachés (`cachedBalance`/`cachedDebt`) SÍ se persisten.
import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore';
import type { BaseDoc } from '../domain/types';

/** Forma física en Firestore: el documento de dominio SIN su `id`. */
export type Persisted<T extends BaseDoc> = Omit<T, 'id'>;

/**
 * Converter genérico para cualquier documento con `BaseDoc`. Quita `id` al escribir y lo
 * rehidrata desde `snapshot.id` al leer. Esto mantiene la lógica de negocio sin tener que
 * saber que `id` es especial en Firestore.
 */
export function docConverter<T extends BaseDoc>(): FirestoreDataConverter<T, Persisted<T>> {
  return {
    toFirestore(model: WithFieldValue<T>): WithFieldValue<Persisted<T>> {
      // Excluimos `id`: en Firestore es la clave del documento, no un campo.
      const { id: _id, ...rest } = model as WithFieldValue<T> & { id?: unknown };
      return rest as WithFieldValue<Persisted<T>>;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>, options?: SnapshotOptions): T {
      const data = snapshot.data(options);
      return { id: snapshot.id, ...data } as T;
    },
  };
}

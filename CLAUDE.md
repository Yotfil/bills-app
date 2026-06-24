# CLAUDE.md — App Personal de Finanzas

> Documento maestro para construir la app con Claude Code.
> Es la fuente de verdad del proyecto: define **qué** se construye y **bajo qué reglas**.
> Léelo completo antes de generar código. Ante cualquier ambigüedad, prevalece este
> documento; si algo no está cubierto, pregúntale al usuario antes de asumir.

> ⚠️ **Antes de trabajar, revisa también `MEMORY.md`** (en la raíz del proyecto): es la
> bitácora viva con el **estado de avance** (qué está hecho, qué falta y las decisiones
> tomadas). `CLAUDE.md` define el **qué** y las **reglas**; `MEMORY.md`, el **dónde
> vamos**. Actualiza `MEMORY.md` al terminar cada paso.

---

## 1. Qué es esto

Una app **web personal** (de un solo usuario: el dueño) para llevar finanzas
personales con **mínima fricción**. Reemplaza un sistema en Excel que hoy solo controla
obligaciones fijas, y lo amplía para capturar también el gasto variable, los ingresos,
los saldos reales y las deudas.

La app debe responder, en todo momento y de un vistazo, tres preguntas:

1. ¿Cuánto tengo **realmente disponible**?
2. ¿En qué se me va el dinero?
3. ¿Qué obligaciones fijas me faltan este mes?

**Métrica de éxito:** que el usuario la siga usando a diario después de 30 días. Toda
decisión de diseño se subordina a eso.

**Visión a futuro (no MVP, pero condiciona la arquitectura):** la app podría abrirse al
público y sumar features e integración de IA. Por eso el código debe ser escalable y la
lógica de negocio independiente de la UI y de la base de datos. Ver §13 (convenciones).

---

## 2. Principios rectores (no negociables)

1. **Cero fricción al registrar.** Registrar un movimiento es la acción central y la más
   rápida de la app. Meta: ≤ 2 segundos de interacción para el caso común.
2. **Saldos derivados, nunca editados a mano.** El saldo de una cuenta es SIEMPRE la
   suma de sus movimientos. La única forma de "corregir" un saldo es la reconciliación
   (§5.7), que genera un movimiento de ajuste.
3. **Una pantalla, una respuesta clara.** Nada de dashboards saturados.
4. **Manual pero asistido.** No hay IA ni sync bancario. A cambio: valores por defecto
   inteligentes, medios de pago recordados, prellenado de montos.
5. **Calma, no culpa.** Verde/rojo para claridad, no para regañar.
6. **Configurable por el usuario.** Categorías, medios de pago, fijos y presupuestos se
   administran desde la app (CRUD). Nada quemado en el código.

### Fuera de alcance del MVP (no construir aún)
- ❌ IA / parseo de texto natural / sync bancario automático.
- ❌ Metas/objetivos de ahorro (van en Fase 2).
- ❌ Ciclo completo de tarjeta de crédito (corte/extracto). En MVP, tarjeta simple.
- ❌ Multiusuario / compartir / modo pareja.
- ❌ Multimoneda (solo COP).

---

## 3. Stack técnico

- **Frontend:** React + TypeScript + Vite.
- **Estilos:** Tailwind CSS.
- **PWA:** manifest + service worker. Instalable en móvil ("Agregar a pantalla de
  inicio"), pantalla completa, y caché offline básico. La misma base corre como web
  normal en escritorio. **Diseño mobile-first**, usable con una mano; debe verse bien
  también en pantalla de computador.
- **Backend / datos:** **Firebase**
  - **Firestore** para persistencia.
  - **Firebase Authentication**: Google Sign-In **y** correo/contraseña (ambos).
  - **Firebase Hosting** para desplegar (HTTPS gratis).
- **Charts:** una librería ligera (ej. Recharts) para dona de categorías y tendencias.
- **Estado:** algo ligero (Zustand o Context). La app no es grande.
- **Tests:** unit (ej. Vitest) y e2e (ej. Playwright o Cypress). Ver §12.

### Reglas de seguridad de Firestore (obligatorias)
- Todos los datos cuelgan del usuario autenticado, bajo `users/{uid}/...`.
- Regla de oro: **cada usuario solo puede leer y escribir sus propios datos**
  (`request.auth.uid == uid`). Ningún usuario, ni siquiera autenticado, accede a datos
  de otro.
- Toda operación requiere sesión iniciada.
- Aprovechar la **persistencia offline** de Firestore para que la app funcione sin señal
  y sincronice al reconectar.

### Moneda y formato
- Moneda única: **COP** (peso colombiano).
- Mostrar montos con separador de miles y sin decimales (ej. `1.650.000`).
- Guardar los montos como **número entero de pesos, siempre positivo** (el efecto suma o
  resta lo decide el tipo de movimiento, nunca el signo).

---

## 4. Modelo conceptual: las tres "capas" del dinero

Es clave no confundirlas; cada una responde una pregunta distinta y todas se mueven
solas con cada movimiento.

| Capa | Pregunta que responde | Cómo se mueve |
|------|----------------------|---------------|
| **Saldo de cuenta** | ¿Cuánto tengo realmente ahí? | Sube con ingresos, baja con gastos/transferencias salientes |
| **Cupo / deuda de tarjeta** | ¿Cuánto debo y cuánto me queda por usar? | La deuda sube al gastar con la tarjeta; baja (y libera cupo) al abonar |
| **Presupuesto de categoría** | ¿Cuánto me queda por gastar de lo que me permití este mes? | Baja con cada gasto de esa categoría en el mes |

Y por encima de todo, el **número-héroe**:

> **Disponible real = Σ(saldos de cuentas) − Σ(reservado)**

donde "reservado" es el dinero ya destinado a fijos pero aún no pagado (§5.2).

---

## 5. Reglas de negocio (el corazón del sistema)

### 5.1 Cuentas y sus tres números

Cada **cuenta** (no tarjeta de crédito) lleva tres valores:

- **Saldo total:** lo que el banco dice que hay. Derivado de los movimientos.
- **Reservado:** suma de lo destinado a fijos que saldrán de esa cuenta pero aún no se
  pagan.
- **Disponible:** `saldo total − reservado`. El dinero que de verdad se puede tocar.

Tipos de cuenta: ahorros/bancaria, efectivo (billetera), CDT/inversión a término.
(Las tarjetas de crédito se modelan aparte, §5.5.)

### 5.2 Obligaciones fijas y los TRES estados

El usuario tiene una **plantilla de obligaciones fijas mensuales** (lista en §10). Cada
mes, la app genera automáticamente la instancia del mes a partir de la plantilla (sin
copiar pestañas a mano como en el Excel actual).

Cada obligación fija del mes tiene **exactamente uno de tres estados**:

1. **Pendiente** (`pending`) — no se ha hecho nada. (En el Excel: valor completo.)
2. **Destinado** (`allocated`) — el dinero ya está apartado/comprometido, pero **aún no
   se ha pagado**. (En el Excel: 0 sin marco verde.)
3. **Pagado** (`paid`) — el pago ya se hizo. (En el Excel: 0 con marco verde.)

**Efecto de cada estado sobre el dinero:**

- **Pendiente → Destinado:** el **saldo total de la cuenta NO baja** (la plata no se ha
  movido). Pero ese monto se suma al **reservado** de la cuenta asignada → baja el
  **disponible** de la cuenta y baja el **disponible real** (número-héroe).
- **Destinado → Pagado:** se crea el movimiento real (§5.3). El **saldo total baja** y el
  monto se quita del **reservado**. El **disponible real NO cambia** (ya estaba contado):
  solo pasa de "comprometido" a "gastado".
- **Pendiente → Pagado** directo (sin pasar por destinado): se crea el movimiento, baja
  el saldo total. No hubo reservado que liberar.

> Importante: el estado es un dato real consultable (no un color). Debe poderse filtrar
> y contar: ej. "te faltan 3 fijos por pagar este mes".

Cada obligación fija tiene una **cuenta/medio de pago por defecto** (editable). Al
destinar o pagar, el usuario puede cambiar de qué cuenta sale ese mes.

### 5.3 Conexión fijo → registro (al marcar "Pagado")

Cuando una obligación fija pasa a **Pagado**, la app **crea automáticamente la
transacción** en el registro, con: fecha (hoy por defecto), concepto (nombre del fijo),
categoría (la del fijo), medio de pago (el asignado) e importe.

- El importe se **prellena con el monto presupuestado**, pero es **editable antes de
  confirmar** (el real puede diferir: presupuestas Luz en 230.000 y llega en 215.000).
  Se guarda el real.
- Esto evita doble digitación y mantiene cuadrados el checklist de fijos y el registro.
- Si el fijo es un abono a deuda (`payKind = 'debt_payment'`), el movimiento generado es
  de tipo `debt_payment`, no `expense`.

### 5.4 Registro de transacciones (libro unificado)

Un solo registro captura **todo**: pagos de fijos, gasto variable y movimientos.

Flujo de captura (cero fricción):
- Botón **+** siempre accesible (FAB o centro de la barra inferior).
- Abre por defecto en **gasto**, con teclado numérico activo en el monto.
- Orden de prioridad: **Monto → Categoría → (resto opcional)**.
- Medio de pago prellenado con el último usado. Fecha prellenada con hoy.
- Guardar en un toque; confirmación discreta; queda listo para el siguiente.

**Efecto de cada tipo sobre los saldos:**
- **Gasto (`expense`):** baja el saldo de la cuenta (o sube la deuda de la tarjeta,
  §5.5). Cuenta en reportes de "¿en qué se me va?".
- **Ingreso (`income`):** sube el saldo de la cuenta. No cuenta como gasto.
- **Transferencia (`transfer`):** baja el saldo de la cuenta origen y sube el de la
  destino, en **un solo registro**. **No cuenta como gasto.**
- **Abono a deuda (`debt_payment`):** baja el saldo de la cuenta origen y baja la deuda
  de la tarjeta/crédito destino. **No cuenta como gasto.**
- **Ajuste (`adjustment`):** ver reconciliación (§5.7).

> Regla de oro de reportes: transferencias, abonos a deuda y ajustes **nunca** aparecen
> en "¿en qué se me va el dinero?". Solo los gastos reales.

### 5.5 Tarjetas de crédito (versión simple del MVP)

En el MVP la tarjeta es un **medio de pago** con un **cupo** y una **deuda**:

- Atributos: nombre, **cupo total**, **deuda actual**. **Cupo disponible = cupo total −
  deuda**.
- Al registrar un **gasto con la tarjeta**: sube la deuda y baja el cupo disponible. (No
  toca el saldo de ninguna cuenta de ahorros: aún no se ha pagado nada de plata real.)
- Al registrar un **abono a la tarjeta** (`debt_payment`): baja la deuda (libera cupo) y
  baja el saldo de la cuenta desde la que se abona.
- **Fuera de alcance MVP:** fecha de corte, extracto, pago mínimo, intereses. Diseñar el
  modelo de modo que esto se pueda añadir después sin romper nada.

### 5.6 Créditos grandes (amortización con progreso)

Para créditos como el de AV Villas y el del carro:

- Atributos: nombre, **monto original**, **saldo actual**, **cuota mensual**, **tasa**
  (opcional).
- Mostrar **barra de progreso** ("vas en X de Y") y **fecha estimada de pago**.
  - Con tasa: proyección más precisa.
  - Sin tasa: el progreso funciona igual; la fecha estimada es aproximada (saldo / cuota).
- Pagar una cuota es un `debt_payment`: baja el saldo de la cuenta origen y baja el saldo
  del crédito.

### 5.7 Reconciliación (válvula de escape para saldos)

Los saldos no se editan directamente. Cada cuenta tiene un botón **"Reconciliar"**:

- El usuario indica **"el saldo real de esta cuenta es X"**.
- La app calcula el desfase contra el saldo registrado y **crea un movimiento de ajuste**
  por la diferencia (puede ser **positivo** o **negativo**).
- El ajuste usa una **categoría propia de sistema: "Ajuste / Reconciliación"**, para **no
  contaminar** los reportes de gasto.
- Permite una **nota corta opcional** (ej. "olvidé registrar efectivo").
- El movimiento queda con fecha, monto del desfase, categoría de ajuste y nota.

> Esto preserva el principio de saldos derivados: el saldo se corrige creando un
> movimiento, no sobrescribiendo un número.

### 5.8 Gasto hormiga (etiqueta transversal)

"Gasto hormiga" **no es una categoría**, es una **etiqueta** (entra en `tags` como
`'hormiga'`) que se puede marcar con un toque sobre cualquier gasto, en cualquier
categoría. Permite que la app reporte "este mes te fuiste $X en gastos hormiga" cruzando
todas las categorías. El array `tags` deja la puerta abierta a más etiquetas a futuro.

### 5.9 Presupuestos

- El usuario crea presupuestos **por categoría**, con un **tope mensual** (ej. Salidas,
  Comidas). Opcional: no hay que presupuestar todas las categorías.
- Cada gasto en esa categoría **consume** el presupuesto del mes; se muestra cuánto
  queda (barra de progreso).
- Avisos suaves al acercarse/superar el tope (sin alarmismo).
- Editables y archivables (CRUD).

### 5.10 Rollover mensual

- Al cambiar de mes, la app **genera la instancia de fijos del nuevo mes** desde la
  plantilla, todos en estado **Pendiente**.
- Los presupuestos por categoría se reinician al tope definido.
- Los saldos de cuentas, deudas y créditos **se conservan** (son acumulativos, no se
  reinician).

### 5.11 Tasa de cambio del dólar (USD/COP)

El usuario recibe ingresos en dólares, así que la app muestra la **tasa de referencia
USD→COP** (cuántos pesos vale un dólar hoy).

- **Solo lectura / informativo en el MVP:** se muestra la tasa como referencia (ej. en el
  dashboard o en la pantalla de "Más"). No convierte automáticamente los movimientos: la
  moneda interna sigue siendo única, COP (§3). Sirve para que el usuario sepa a cuánto
  está el dólar al planear o registrar un ingreso.
- **Fuente de datos — API gratuita, sin API key:** usar **Frankfurter**
  (`https://api.frankfurter.dev`), de código abierto y basada en datos de bancos
  centrales. Endpoint de ejemplo para la tasa del dólar al peso:
  `https://api.frankfurter.dev/v2/latest?base=USD&symbols=COP`.
- **Respaldo (fallback):** si Frankfurter falla, usar el endpoint abierto de
  **ExchangeRate-API** (sin key, requiere atribución discreta en la UI). Encapsular la
  fuente detrás de una interfaz para poder cambiarla sin tocar la UI.
- **Caché obligatoria:** la tasa de referencia se actualiza **una vez al día** (estos
  feeds publican una vez por día hábil, sin intradía ni fines de semana). Consultar la
  API **una vez y cachear** el resultado (con su fecha); no pedirla en cada apertura.
  Mostrar la fecha del dato ("tasa del DD/MM") y degradar con gracia si no hay conexión
  (mostrar la última cacheada).
- **Aislar en la capa de datos:** el acceso a la API va en un repositorio/servicio
  propio, igual que Firestore (§9, §13), para mantener la lógica y la UI desacopladas.

---

## 6. Categorías base (set limpio)

Lista plana de **14 categorías** (las agrupaciones son solo para lectura). Editables por
el usuario (CRUD).

- **Comidas** — comer fuera, café, antojos, domicilios
- **Mercado** — víveres y compras de mercado
- **Transporte** — Uber, peajes, gasolina/combustible, parqueadero, lavado
- **Ocio** — salidas, entretenimiento, libros, juguetes, souvenirs
- **Salud** — medicamentos, citas, prepagada
- **Hogar** — cosas y arreglos de la casa
- **Familia** — apoyos (mamá, Yulieth), cuotas, gastos de Luciana
- **Educación** — colegio, Kumon, cursos, teatro, Platzi
- **Vivienda** — arriendo
- **Servicios** — luz, agua, gas, internet, telefonía/celular
- **Suscripciones** — streaming y software (Netflix, HBO, Drive, ChatGPT, Claude, Cursor…)
- **Vehículo** — impuestos, seguro, mantenimiento mayor (tenencia del carro)
- **Seguridad social** — seguridad social y parafiscales
- **Otros**

Más la categoría de sistema **"Ajuste / Reconciliación"** (`isSystem: true`,
`includeInSpendReports: false`) y la **etiqueta** transversal **hormiga**.

---

## 7. Onboarding (primera vez)

Progresivo, lo mínimo para arrancar; el resto se completa con el uso. Pasos:

1. **Iniciar sesión** (Google o correo/contraseña).
2. **Sembrar cuentas** y su **saldo inicial** (ahorros, efectivo, CDT…).
3. **Tarjetas de crédito**: nombre, cupo total, deuda actual.
4. **Créditos grandes**: nombre, monto original, saldo actual, cuota, tasa (opcional).
5. **Plantilla de fijos**: precargar la lista de §10 (editable), cada uno con su monto y
   su cuenta/medio por defecto.
6. (Categorías y presupuestos ya vienen con el set base; se pueden ajustar luego.)

> El paso de sembrar saldos es importante: hoy el usuario no tiene sus saldos reales en
> ningún lado confiable.

---

## 8. Pantallas y navegación

**Barra inferior (máx. 5 destinos):**

1. **Inicio** (dashboard)
2. **Registro** (lista de transacciones)
3. **➕ Agregar** (botón central destacado)
4. **Fijos** (checklist mensual con los 3 estados)
5. **Más** (cuentas, tarjetas, créditos, categorías, presupuestos, reconciliar, ajustes)

### 8.1 Inicio (dashboard)
Jerarquía de arriba hacia abajo:
1. **Número-héroe:** Disponible real (§4).
2. **Resumen del mes:** Ingresos | Gastos | Flujo (con color).
3. **Fijos del mes:** progreso (ej. "5 de 12 pagados", X pendientes, Y destinados).
4. **Desglose por categoría:** dona/barras; tocar una filtra sus transacciones.
5. **Tasa del dólar (USD→COP):** referencia discreta (cuántos pesos vale un dólar hoy),
   con la fecha del dato (§5.11). Informativo, no convierte movimientos.
6. Acceso a la lista completa. Selector de periodo (mes actual por defecto).
   Debe entenderse en < 5 segundos.

### 8.2 Registro (transacciones)
- Orden cronológico inverso, agrupado por día con subtotal.
- Cada ítem: ícono de categoría, concepto, medio de pago, monto (color por tipo),
  marca de hormiga si aplica.
- Buscar/filtrar por categoría, cuenta/medio, tipo, rango de fechas, texto.
- Editar/eliminar (al tocar o deslizar). Editar un movimiento recalcula los saldos.

### 8.3 Fijos (checklist mensual)
- Lista de obligaciones del mes con su estado (Pendiente / Destinado / Pagado),
  claramente distinguibles.
- Acciones por ítem: marcar destinado, marcar pagado (abre confirmación con monto
  prellenado editable y medio de pago), cambiar de cuenta.
- Totales: cuánto falta por destinar, cuánto destinado sin pagar, cuánto pagado.

### 8.4 Más / administración (CRUD)
- **Cuentas:** crear/editar/archivar; ver saldo total, reservado, disponible; botón
  **Reconciliar**.
- **Tarjetas:** crear/editar/archivar; cupo, deuda, cupo disponible.
- **Créditos:** crear/editar; progreso de amortización y fecha estimada.
- **Categorías:** CRUD (archivar si tienen histórico).
- **Medios de pago:** CRUD.
- **Obligaciones fijas (plantilla):** CRUD; monto y cuenta por defecto.
- **Presupuestos:** CRUD por categoría con tope mensual.
- **Ajustes:** sesión, etc.

> Regla CRUD: **eliminar = archivar** si el elemento tiene movimientos asociados, para no
> romper el histórico. Desaparece de las listas activas pero el histórico se conserva.

---

## 9. Modelos de datos — dos capas

Se documentan **dos capas** a propósito, para escalabilidad y legibilidad:

- **Modelo de dominio:** los `interface` de TypeScript con los que trabaja la lógica de
  negocio. Limpios, sin detalles de Firestore.
- **Mapa de persistencia:** cómo se guardan realmente en Firestore (subcolecciones,
  campos derivados que NO se persisten, `id` en `doc.id`, fechas como `Timestamp`), más
  los **converters** que traducen dominio ↔ Firestore en un solo lugar.

### 9.1 Modelo de dominio (TypeScript)

```ts
// Firestore guarda Timestamp; la UI lo convierte a Date/ISO al mostrar.

interface BaseDoc {
  id: string;                  // = doc.id (NO se guarda dentro del documento)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;       // para migraciones futuras
}

interface Archivable {
  archived: boolean;
  archivedAt: Timestamp | null; // borrar = archivar si hay histórico
}

type LedgerEntityKind = 'account' | 'card' | 'loan';

interface EntityRef {
  kind: LedgerEntityKind;
  id: string;
}

// ---------- Cuentas ----------
type AccountType = 'savings' | 'cash' | 'term_deposit';

interface Account extends BaseDoc, Archivable {
  name: string;
  type: AccountType;
  initialBalance: number;      // semilla del onboarding
  cachedBalance: number;       // derivado de los movimientos (caché)
  color: string;
  icon: string;
  sortOrder: number;
  // DERIVADOS (no se guardan, se calculan al leer):
  //   reserved  = Σ fijos del mes en estado 'allocated' asignados a esta cuenta
  //   available = cachedBalance - reserved
}

// ---------- Tarjetas de crédito ----------
interface CreditCard extends BaseDoc, Archivable {
  name: string;
  creditLimit: number;         // cupo total
  cachedDebt: number;          // deuda actual (caché derivada)
  color: string;
  icon: string;
  sortOrder: number;
  // DERIVADO: availableCredit = creditLimit - cachedDebt
}

// ---------- Créditos grandes ----------
interface Loan extends BaseDoc, Archivable {
  name: string;
  originalAmount: number;
  cachedBalance: number;       // saldo actual (caché derivada de abonos)
  monthlyPayment: number;      // cuota mensual
  annualRate: number | null;   // tasa opcional; sin ella, la fecha estimada es aproximada
  startDate: Timestamp | null;
  // DERIVADO: progress = 1 - (cachedBalance / originalAmount)
}

// ---------- Categorías ----------
interface Category extends BaseDoc, Archivable {
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;             // p.ej. "Ajuste / Reconciliación": no editable
  includeInSpendReports: boolean;// false para sistema/ajuste
  sortOrder: number;
}

// ---------- Plantilla de obligaciones fijas ----------
type FixedPayKind = 'expense' | 'debt_payment';

interface FixedObligationTemplate extends BaseDoc, Archivable {
  name: string;                  // concepto
  budgetedAmount: number;
  categoryId: string;
  defaultPaymentMethod: EntityRef; // cuenta o tarjeta por defecto
  payKind: FixedPayKind;           // 'debt_payment' para abonos a tarjeta/crédito
  debtTargetId: string | null;     // tarjeta/crédito destino si es abono
  active: boolean;                 // si entra en el rollover mensual
  sortOrder: number;
}

// ---------- Instancia mensual de un fijo ----------
type FixedStatus = 'pending' | 'allocated' | 'paid'; // pendiente / destinado / pagado

interface FixedObligationMonthly extends BaseDoc {
  month: string;                 // 'YYYY-MM'
  templateId: string;
  // SNAPSHOTS (no se reescriben si la plantilla cambia luego):
  name: string;
  budgetedAmount: number;
  categoryId: string;
  payKind: FixedPayKind;
  debtTargetId: string | null;
  paymentMethod: EntityRef;      // medio asignado este mes (editable)
  status: FixedStatus;
  transactionId: string | null;  // se llena al marcar 'paid'
  allocatedAt: Timestamp | null;
  paidAt: Timestamp | null;
}

// ---------- Presupuestos ----------
interface Budget extends BaseDoc, Archivable {
  categoryId: string;
  monthlyLimit: number;          // tope
  active: boolean;
  // DERIVADO: lo consumido = Σ gastos de esa categoría en el mes
}

// ---------- Transacciones (libro unificado) ----------
type TransactionType =
  | 'expense'        // gasto real (cuenta -, o sube deuda de tarjeta)
  | 'income'         // entra a una cuenta
  | 'transfer'       // entre cuentas propias
  | 'debt_payment'   // abono a tarjeta/crédito
  | 'adjustment';    // reconciliación

interface Transaction extends BaseDoc {
  date: Timestamp;
  concept: string;
  type: TransactionType;
  amount: number;                // entero COP, SIEMPRE positivo
  categoryId: string | null;     // requerido en 'expense'; sistema/null en otros
  source: EntityRef | null;      // origen: expense/transfer/debt_payment/adjustment
  destination: EntityRef | null; // destino: transfer (account) / debt_payment (card|loan)
  adjustmentDirection: 'increase' | 'decrease' | null; // solo en 'adjustment'
  tags: string[];                // p.ej. ['hormiga']
  note: string | null;
  fixedMonthlyId: string | null; // enlace al fijo que lo generó (si aplica)
}

// ---------- Ajustes del usuario (doc del usuario) ----------
interface UserSettings {
  currency: 'COP';
  locale: string;                // 'es-CO'
  onboardingCompleted: boolean;
  schemaVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 9.2 Mapa de persistencia en Firestore

Forma física: todo cuelga del usuario en **subcolecciones**.

```
users/{uid}                          → UserSettings (campos en el doc del usuario)
users/{uid}/accounts/{accountId}     → Account
users/{uid}/cards/{cardId}           → CreditCard
users/{uid}/loans/{loanId}           → Loan
users/{uid}/categories/{categoryId}  → Category
users/{uid}/fixedTemplates/{id}      → FixedObligationTemplate
users/{uid}/fixedMonthly/{id}        → FixedObligationMonthly
users/{uid}/budgets/{budgetId}       → Budget
users/{uid}/transactions/{txnId}     → Transaction
```

Diferencias entre el modelo de dominio y lo que se guarda en Firestore:

- **`id` NO va dentro del documento.** Es el ID del documento (`doc.id`). En la capa de
  app se rehidrata dentro del objeto por comodidad.
- **Fechas = `Timestamp` de Firestore** (no `Date`). La conversión a `Date`/string ocurre
  en la UI.
- **Campos DERIVADOS no se persisten:** `Account.reserved`, `Account.available`,
  `CreditCard.availableCredit`, `Loan.progress`, lo consumido de un `Budget`. Se calculan
  al leer. Los `cachedBalance` / `cachedDebt` SÍ se guardan (caché de rendimiento), pero
  la **fuente de verdad** son los movimientos.
- `null` se guarda tal cual (Firestore lo soporta).

**Converters (obligatorio):** usar `withConverter` de Firestore para que la traducción
dominio ↔ Firestore viva en **un solo lugar** por colección (`toFirestore` /
`fromFirestore`). La lógica de negocio nunca manipula `Timestamp`, `doc.id` ni campos
derivados directamente: siempre trabaja con los objetos de dominio. Así, si algún día se
cambia de base de datos o se agrega una API para el público, solo se toca esta capa.

### 9.3 Saldos derivados y consistencia

- La **fuente de verdad** son los movimientos. `cachedBalance` / `cachedDebt` se
  actualizan en cada escritura mediante una **transacción atómica** de Firestore
  (`runTransaction`) para evitar carreras.
- El **reservado** de una cuenta = Σ montos de `fixedMonthly` del mes en estado
  `allocated` cuya `paymentMethod` apunte a esa cuenta.
- **Editar o eliminar** una transacción debe **recalcular** los saldos afectados.
- Debe existir una función de **recálculo total** (reconstruir cachés desde los
  movimientos) por si los cachés alguna vez divergen. Es además una buena prueba.

---

## 10. Plantilla de obligaciones fijas (precarga del onboarding)

Lista real del usuario (editable). Asignar a cada una su **categoría** y su **cuenta por
defecto** durante el onboarding.

| Concepto | Monto (COP) | Categoría sugerida | payKind |
|----------|------------|--------------------|---------|
| Arriendo | 1.650.000 | Vivienda | expense |
| Combustible | 200.000 | Transporte | expense |
| Luz | 230.000 | Servicios | expense |
| Agua | 45.000 | Servicios | expense |
| Gas | 80.000 | Servicios | expense |
| Internet hogar | 120.000 | Servicios | expense |
| Celular (tu línea) | 64.000 | Servicios | expense |
| Celular (Yulieth) | 41.000 | Servicios | expense |
| Mercado hogar | 1.600.000 | Mercado | expense |
| Cuota mercado Yulieth | 120.000 | Familia | expense |
| Comidas en casa | 400.000 | Mercado | expense |
| Salidas planificadas (tope) | 400.000 | Ocio | expense |
| Colegio Luciana | 500.000 | Educación | expense |
| Teatro Luciana | 160.000 | Educación | expense |
| Teatro Me | 200.000 | Educación | expense |
| Apoyo mensual a mamá | 650.000 | Familia | expense |
| Apoyo mensual a Yulieth | 120.000 | Familia | expense |
| Vehículo (impuestos/seguro/mtto) | 400.000 | Vehículo | expense |
| Pago fijo TC Davivienda | 350.000 | — | debt_payment |
| Netflix | 50.000 | Suscripciones | expense |
| Amazon Music | 20.000 | Suscripciones | expense |
| HBO Max | 15.000 | Suscripciones | expense |
| YouTube Premium | 21.000 | Suscripciones | expense |
| Google Drive (100 GB) | 79.000 | Suscripciones | expense |
| ChatGPT Plus | 0 | Suscripciones | expense |
| Claude | 90.000 | Suscripciones | expense |
| Cursor (IDE) | 250.000 | Suscripciones | expense |
| CapCut | 40.000 | Suscripciones | expense |
| Apple Music | 14.000 | Suscripciones | expense |
| Kumon | 370.000 | Educación | expense |
| Baile | 100.000 | Educación | expense |
| Préstamos AV Villas | 1.400.000 | — | debt_payment |
| Cuota Carro | 2.700.000 | — | debt_payment |
| Platzi | 250.000 | Suscripciones | expense |
| Nu | 500.000 | — | debt_payment |
| Seguridad social | 900.000 | Seguridad social | expense |
| Prepagada | 1.500.000 | Salud | expense |

> Los fijos con `payKind = debt_payment` son pagos a tarjetas/créditos: al marcarlos
> pagados, el movimiento generado es `debt_payment` (no gasto), bajando la deuda
> correspondiente. El usuario confirma a qué tarjeta/crédito aplica durante el onboarding
> (`debtTargetId`).

---

## 11. Reglas de validación por tipo de transacción

Estas reglas son obligatorias y alimentan los tests (§12). Una transacción inválida no
se debe poder guardar.

- **expense:** `source` = cuenta **o** tarjeta; `categoryId` **requerido**;
  `destination` = null; `adjustmentDirection` = null.
- **income:** `destination` = cuenta; `source` = null; `categoryId` opcional.
- **transfer:** `source` = cuenta; `destination` = cuenta **distinta**; sin categoría de
  gasto (`categoryId` = null o no se cuenta en reportes).
- **debt_payment:** `source` = cuenta; `destination` = tarjeta **o** crédito; sin
  categoría de gasto.
- **adjustment:** `source` = cuenta; `categoryId` = categoría de sistema "Ajuste";
  `adjustmentDirection` ∈ {increase, decrease}.
- En todos los tipos: `amount` entero **> 0**.

---

## 12. Tests (arrancar con esto antes de la lógica)

Generar primero el **catálogo de casos** a partir de las reglas de negocio, y luego el
código que los satisface. Mantener tanto **unit tests** (lógica de negocio pura) como
**e2e** (flujos críticos).

### 12.1 Unit tests (lógica de saldos, estados y validación)
- `expense` con cuenta → baja `cachedBalance` en `amount`.
- `expense` con tarjeta → sube `cachedDebt`; no toca cuentas; baja cupo disponible.
- `income` → sube `cachedBalance` de la cuenta destino.
- `transfer` → baja origen y sube destino por el mismo monto; neto cero.
- `debt_payment` a tarjeta → baja cuenta origen y baja deuda; libera cupo.
- `debt_payment` a crédito → baja cuenta origen y baja saldo del crédito; recalcula
  progreso.
- Fijo `pending → allocated` → no cambia `cachedBalance`; sube `reserved` de la cuenta;
  baja disponible real.
- Fijo `allocated → paid` → crea transacción, baja `cachedBalance`, libera `reserved`;
  disponible real **no cambia**.
- Fijo `pending → paid` directo → crea transacción y baja saldo; sin reservado previo.
- Marcar pagado con monto editado distinto al presupuestado → guarda el real.
- Reconciliación con saldo real mayor → ajuste `increase` por el desfase exacto.
- Reconciliación con saldo real menor → ajuste `decrease` por el desfase exacto.
- Reportes de gasto **excluyen** `transfer`, `debt_payment` y `adjustment`.
- Etiqueta `hormiga` → suma correcta del total de hormiga cruzando categorías.
- Presupuesto → consumo = Σ gastos de la categoría en el mes; restante correcto.
- Editar una transacción → recalcula saldos afectados.
- Eliminar una transacción → revierte su efecto en los saldos.
- Recálculo total → reconstruye cachés desde movimientos y coincide con los cachés.
- Validación: rechaza `amount <= 0`; rechaza `transfer` con origen = destino; rechaza
  `expense` sin categoría.
- Rollover mensual → genera fijos del nuevo mes en `pending`; conserva saldos.

### 12.2 E2E (flujos críticos)
- **Login** con Google y con correo/contraseña.
- **Onboarding** completo: sembrar cuentas, tarjetas, créditos y plantilla de fijos.
- **Registrar un gasto** en ≤ 2 toques y verlo reflejado en saldo y dashboard.
- **Marcar un fijo como destinado** → ver bajar el disponible real sin cambiar el saldo.
- **Marcar un fijo como pagado** → ver la transacción creada automáticamente y el saldo
  actualizado.
- **Reconciliar** una cuenta y ver el movimiento de ajuste creado.
- **Aislamiento de datos:** un usuario no puede leer datos de otro (reglas de Firestore).

---

## 13. Convenciones técnicas

### 13.1 Commits
- **Granulares:** un commit por cambio lógico/cohesivo. No mezclar features en un commit.
- El mensaje **describe solo lo que lleva ese commit**, de forma clara y concisa.
- **Sin** líneas de atribución generadas automáticamente (p.ej. `Co-authored-by: Claude`
  ni `Generated with Claude Code` ni similares). El mensaje es solo el contenido del
  cambio.

### 13.2 Calidad y legibilidad del código
- **Estándares altos pero legible:** debe poder leerlo y debuggearlo hasta un junior.
- Nombres descriptivos; funciones pequeñas con una sola responsabilidad; evitar
  "ingeniería ingeniosa" y abstracciones prematuras.
- **Lógica de negocio aislada de la UI y de Firestore:** las reglas de §5 y §11 viven en
  funciones puras y testeables (carpeta de dominio/servicios), independientes de React y
  de Firebase. La UI las invoca; el acceso a datos (converters/repositorios) las
  alimenta.
- TypeScript estricto (`strict: true`); sin `any` salvo justificación.
- Comentar el **porqué** de las reglas no obvias (especialmente saldos derivados,
  reservado y los efectos por tipo de movimiento).
- Linter + formateador (ESLint + Prettier) consistentes.

#### 13.2.1 Un componente / una interfaz por archivo (obligatorio)
- **Un solo componente React por archivo**, por pequeño que sea. Si un archivo tiene un
  componente "auxiliar" (p.ej. un sub-formulario o un campo), va a su propio archivo. Si
  varios componentes forman una familia, se pueden **agrupar en una carpeta** con un
  archivo por componente.
- **Cada `interface` en su propio archivo**, nombrado igual que la interfaz
  (p.ej. `ModalProps.ts`, `Account.ts`, `LedgerDelta.ts`). Esto incluye:
  - Interfaces del **modelo de dominio** (`src/domain/types/`, una por archivo + barrel
    `index.ts` que reexporta).
  - Interfaces de **props** de componentes (`XProps.ts`, junto al componente).
  - Interfaces de entrada/resultado de **servicios y repositorios** (reexportadas desde su
    módulo para no romper imports).
- **Los `type` alias / uniones van JUNTO a la interfaz con la que se relacionan** (p.ej.
  `AccountType` en `Account.ts`, `TransactionType` en `Transaction.ts`). No requieren
  archivo propio.
- **Las funciones helper** (no componentes, no interfaces) pueden convivir con el código
  que las usa o en un util compartido; no aplica "una por archivo".
- Para mantener estables los imports al separar, **reexportar** desde el módulo o barrel
  original (`export type { X } from './X'`).

### 13.3 Escalabilidad
- **Arquitectura por capas:** UI (React) → dominio/servicios (lógica pura) → acceso a
  datos (repositorios + converters de Firestore). Cada capa solo conoce la de abajo.
- **Versionado de esquema** (`schemaVersion`) para permitir migraciones cuando el modelo
  evolucione.
- Diseñar pensando en que más adelante habrá **más usuarios, más features e IA**: no
  acoplar la lógica de negocio a detalles de Firestore ni de la UI, de modo que abrir al
  público o cambiar de backend no obligue a reescribir el núcleo.
- **Multiusuario desde la base:** la estructura `users/{uid}/...` y las reglas de
  seguridad (§3) ya aíslan los datos por persona. Aunque el MVP es de un solo usuario,
  cada dato nace ligado a su `uid`, así que abrir al público **no exige rediseñar el
  modelo de datos**: cada persona verá únicamente sus propios estados. Mantener esta
  disciplina (nunca asumir "un solo usuario" en la lógica ni en las consultas) es lo que
  hace barata la apertura futura.

---

## 14. Orden de construcción sugerido (MVP)

Construir por capas, empezando por el flujo que define el éxito (registrar):

1. Proyecto base: Vite + React + TS + Tailwind + Firebase (Auth + Firestore + reglas) +
   ESLint/Prettier + setup de tests (unit y e2e).
2. **Catálogo de tests** (§12) escrito a partir de las reglas de negocio (TDD: primero
   los casos).
3. Login (Google + correo/contraseña) y estructura `users/{uid}`.
4. Capa de dominio: tipos (§9.1), reglas de validación (§11) y funciones puras de saldos
   y estados, con sus unit tests en verde.
5. Capa de datos: repositorios + converters de Firestore (§9.2).
6. Cuentas y tarjetas (CRUD) + saldos derivados.
7. **Registro de transacciones** (captura cero fricción) con sus efectos sobre saldos.
8. Dashboard (número-héroe + resumen + dona por categoría).
9. Obligaciones fijas: plantilla, instancia mensual, 3 estados, reservado, y conexión
   fijo→registro al pagar.
10. Reconciliación por cuenta.
11. Presupuestos por categoría.
12. Créditos con amortización y progreso.
13. Tasa del dólar USD→COP (servicio con caché diaria + fallback) en el dashboard (§5.11).
14. Onboarding que siembra todo lo anterior + PWA (manifest, service worker, instalable).
15. Suite e2e de los flujos críticos en verde.

Cada paso debe quedar usable y con sus tests en verde antes de pasar al siguiente.

---

## 15. Fases posteriores (no MVP)
- **Fase 2:** metas/objetivos de ahorro (monto + fecha + progreso); reportes e insights
  más ricos (tendencias mes a mes, top categorías, gasto hormiga histórico);
  recurrentes/suscripciones como módulo.
- **Fase 3:** ciclo completo de tarjeta (corte, extracto, pago); proyección de fin de
  mes ("a este ritmo terminarás en…"); notificaciones/recordatorios; multimoneda.
- **Fase 4 — Apertura al público (a futuro):**
  - **Cada persona ve solo sus propios estados.** El aislamiento por usuario ya está en
    la base (§3, §13.3); esta fase añade lo necesario alrededor: registro abierto de
    usuarios, gestión de cuenta/perfil, y verificación de las reglas de seguridad a
    escala.
  - **Carga de estados propios (import).** Hoy, la siembra inicial de datos se hace por
    fuera de la app (preparando los PDFs/Excel del usuario antes de arrancar). Para el
    público esto no escala: **cada persona deberá poder subir sus propios estados**
    (extractos bancarios en PDF, hojas de Excel) para sembrar sus cuentas, saldos y, si
    se desea, su histórico — sin depender de una preparación manual.
    - Recomendación de diseño para cuando se construya: empezar por un **import genérico
      simple** (CSV/JSON con un formato propio que controlamos) antes que un parser
      "inteligente" de cada banco, que es frágil y costoso de mantener. El parseo de
      formatos bancarios específicos se evalúa después, por demanda.
    - El import debe pasar por la **misma capa de dominio y validación** (§11): los datos
      subidos se convierten en movimientos/saldos válidos, nunca escriben saldos directo.
  - **Integración de IA** (sobre la base ya desacoplada): categorización sugerida,
    captura por texto natural, insights.

> Nota: nada de la Fase 4 se construye en el MVP. Se documenta aquí para que las
> decisiones de arquitectura del MVP (aislamiento por `uid`, lógica desacoplada, import
> que pasa por el dominio) no cierren la puerta a estos features.

---

*Fin del CLAUDE.md. Sugerencia para empezar en Claude Code: pídele que ejecute los pasos
1 y 2 de §14 (scaffold + auth + reglas + setup de tests, y el catálogo de tests), y de
ahí avanza paso a paso, manteniendo los tests en verde y commits granulares.*

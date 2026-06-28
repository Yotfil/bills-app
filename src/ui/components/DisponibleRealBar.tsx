import { Link } from 'react-router-dom';
import { useUserCollection } from '../hooks/useUserCollection';
import { subscribeAccounts } from '../../data/accountRepository';
import { subscribeAllocatedFixeds } from '../../data/fixedMonthlyRepository';
import { disponibleReal } from '../../domain/derived';
import { formatCop } from '../../lib/currency';
import type { Account, FixedObligationMonthly } from '../../domain/types';

// Barra compacta con el Disponible real (número-héroe, §4), para tenerlo a mano en Fijos y
// Registro. El grande vive en Inicio. Toca para ir al dashboard.
export function DisponibleRealBar() {
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  // Reservado = todo lo destinado y no pagado, de cualquier mes (§5.1, §5.2).
  const { items: allocatedFixeds } =
    useUserCollection<FixedObligationMonthly>(subscribeAllocatedFixeds);
  const available = disponibleReal(
    accounts.filter((a) => !a.archived),
    allocatedFixeds,
  );

  return (
    <Link
      to="/"
      className="flex items-center justify-between rounded-xl bg-white px-4 py-2 shadow-sm"
    >
      <span className="text-xs tracking-wide text-slate-400 uppercase">Disponible real</span>
      <span className={`text-sm font-bold ${available < 0 ? 'text-red-600' : 'text-slate-800'}`}>
        {formatCop(available)}
      </span>
    </Link>
  );
}

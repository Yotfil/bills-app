import { useNavigate } from 'react-router-dom';
import { TransactionForm } from './TransactionForm';

// Pantalla de captura (CLAUDE.md §5.4). Abre el formulario en modo gasto; al guardar, lleva
// al Registro para ver el movimiento reflejado.
export function AddTransactionScreen() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Nuevo movimiento</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-slate-400 underline"
        >
          Cancelar
        </button>
      </header>
      <TransactionForm onDone={() => navigate('/registro')} />
    </div>
  );
}

import { useSearchParams } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { FixedTemplatesTab } from './FixedTemplatesTab';
import { BudgetTemplatesTab } from './BudgetTemplatesTab';

type PlantillaTab = 'gastos' | 'presupuestos';

// Plantilla de los meses (CLAUDE.md §8.4): un solo lugar con dos tabs —Gastos (obligaciones fijas) y
// Presupuestos (topes por categoría)—, ambos como PLANTILLA (valores base con los que arranca cada
// mes, sin barras de consumo). El detalle y los ajustes POR MES se ven/editan en /fijos. El tab vive
// en la URL (`?tab=presupuestos`) para poder enlazar directo (p.ej. desde la ruta vieja).
export function PlantillaScreen() {
  const [params, setParams] = useSearchParams();
  const tab: PlantillaTab = params.get('tab') === 'presupuestos' ? 'presupuestos' : 'gastos';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <h1 className="text-xl font-bold text-slate-800">Plantilla</h1>

      <SegmentedTabs<PlantillaTab>
        value={tab}
        onChange={(next) => setParams(next === 'gastos' ? {} : { tab: next }, { replace: true })}
        tabs={[
          { value: 'gastos', label: 'Gastos' },
          { value: 'presupuestos', label: 'Presupuestos' },
        ]}
      />

      {tab === 'gastos' ? <FixedTemplatesTab /> : <BudgetTemplatesTab />}
    </div>
  );
}

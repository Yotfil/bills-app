import type { MonthlyInsight } from '../../../domain/insights';

export interface MonthlyTrendChartProps {
  data: MonthlyInsight[]; // un punto por mes, en orden cronológico ascendente
}

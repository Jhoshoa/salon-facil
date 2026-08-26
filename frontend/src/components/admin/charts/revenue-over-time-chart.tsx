'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { CHART_COLORS } from './chart-colors';

interface RevenueOverTimeChartProps {
  data: { month: string; total: number }[];
}

const monthTick = (isoMonth: string) =>
  new Date(isoMonth).toLocaleDateString('es-BO', { month: 'short' });

export const RevenueOverTimeChart = ({ data }: RevenueOverTimeChartProps) => (
  <ResponsiveContainer width="100%" height={260}>
    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="month" tickFormatter={monthTick} fontSize={12} />
      <YAxis fontSize={12} tickFormatter={(value: number) => formatCurrency(value)} width={80} />
      <Tooltip
        formatter={(value) => formatCurrency(Number(value))}
        labelFormatter={(label) => monthTick(String(label))}
      />
      <Area
        type="monotone"
        dataKey="total"
        stroke={CHART_COLORS.primary}
        fill={CHART_COLORS.primary}
        fillOpacity={0.15}
        strokeWidth={2}
      />
    </AreaChart>
  </ResponsiveContainer>
);

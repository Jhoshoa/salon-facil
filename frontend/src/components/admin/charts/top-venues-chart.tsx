'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { CHART_COLORS } from './chart-colors';

interface TopVenuesChartProps {
  data: { id: string; name: string; total: number }[];
}

export const TopVenuesChart = ({ data }: TopVenuesChartProps) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
    >
      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
      <XAxis type="number" fontSize={12} tickFormatter={(value: number) => formatCurrency(value)} />
      <YAxis type="category" dataKey="name" fontSize={12} width={120} />
      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
      <Bar dataKey="total" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

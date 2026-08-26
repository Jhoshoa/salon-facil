'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from './chart-colors';

interface NewUsersChartProps {
  data: { month: string; count: number }[];
}

const monthTick = (isoMonth: string) =>
  new Date(isoMonth).toLocaleDateString('es-BO', { month: 'short' });

export const NewUsersChart = ({ data }: NewUsersChartProps) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="month" tickFormatter={monthTick} fontSize={12} />
      <YAxis fontSize={12} allowDecimals={false} />
      <Tooltip labelFormatter={(label) => monthTick(String(label))} />
      <Bar dataKey="count" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

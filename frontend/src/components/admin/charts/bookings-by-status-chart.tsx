'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BOOKING_STATUS_LABELS, CHART_COLORS } from './chart-colors';

interface BookingsByStatusChartProps {
  data: { status: string; count: number }[];
}

export const BookingsByStatusChart = ({ data }: BookingsByStatusChartProps) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart
      data={data.map((row) => ({ ...row, label: BOOKING_STATUS_LABELS[row.status] ?? row.status }))}
      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
    >
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
      <YAxis fontSize={12} allowDecimals={false} />
      <Tooltip />
      <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

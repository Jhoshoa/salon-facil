import { apiRequest } from './client';
import type { AdminAnalyticsDashboard } from '@/types/api';

export const getAdminAnalyticsDashboard = async (): Promise<AdminAnalyticsDashboard> => {
  return apiRequest<AdminAnalyticsDashboard>('/admin/analytics/dashboard');
};

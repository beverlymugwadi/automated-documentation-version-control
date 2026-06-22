import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export interface HealthResponse {
  ok: boolean;
  service: string;
  mockMode: boolean;
  mockReason: string | null;
  timestamp: string;
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const { data } = await api.get<HealthResponse>('/health');
      return data;
    },
    refetchInterval: 10_000,
    retry: 1,
  });
}
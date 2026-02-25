// React Query hooks for fetching data from the API

import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { type MachineData, type Alert, type FleetSummary, type SensorReading } from './api';

// Query keys
export const queryKeys = {
  machines: ['machines'] as const,
  machine: (id: string) => ['machine', id] as const,
  alerts: ['alerts'] as const,
  fleetSummary: ['fleetSummary'] as const,
  prediction: (engineId: number) => ['prediction', engineId] as const,
  liveSensor: (machineId: string) => ['liveSensor', machineId] as const,
};

// Fetch all machines
export function useMachines() {
  return useQuery<MachineData[], Error>({
    queryKey: queryKeys.machines,
    queryFn: () => api.getMachines(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Fetch a single machine
export function useMachine(machineId: string) {
  return useQuery<MachineData, Error>({
    queryKey: queryKeys.machine(machineId),
    queryFn: () => api.getMachine(machineId),
    staleTime: 30 * 1000,
    enabled: !!machineId,
  });
}

// Fetch alerts
export function useAlerts() {
  return useQuery<Alert[], Error>({
    queryKey: queryKeys.alerts,
    queryFn: () => api.getAlerts(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

// Fetch fleet summary
export function useFleetSummary() {
  return useQuery<FleetSummary, Error>({
    queryKey: queryKeys.fleetSummary,
    queryFn: () => api.getFleetSummary(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Hook to refresh all data
export function useRefreshData() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.machines });
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    queryClient.invalidateQueries({ queryKey: queryKeys.fleetSummary });
  };
}

// Fetch live sensor data (polls every 2 seconds)
export function useLiveSensorData(machineId: string, enabled: boolean = true) {
  return useQuery<SensorReading, Error>({
    queryKey: queryKeys.liveSensor(machineId),
    queryFn: () => api.getLiveSensorData(machineId),
    staleTime: 1000, // 1 second
    refetchInterval: enabled ? 2000 : false, // Poll every 2 seconds when enabled
    enabled: !!machineId && enabled,
  });
}

// Re-export types
export type { SensorReading } from './api';

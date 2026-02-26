import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface MachineUpdate {
  machineId: string;
  healthStatus: 'NORMAL' | 'WARNING' | 'CRITICAL';
  healthScore: number;
  rul: number;
  confidence: number;
  sensors: {
    temperature: number;
    vibration: number;
    current: number;
    pressure: number;
  };
  timestamp: string;
}

interface Alert {
  machineId: string;
  machineName: string;
  alertType: 'WARNING' | 'CRITICAL';
  message: string;
  rul: number;
  timestamp: string;
}

interface SensorUpdate {
  temperature: number;
  vibration: number;
  current: number;
  pressure: number;
  prediction: {
    health_status: string;
    predicted_RUL: number;
    confidence: number;
  };
}

interface UseSocketReturn {
  isConnected: boolean;
  lastMachineUpdate: MachineUpdate | null;
  lastAlert: Alert | null;
  alerts: Alert[];
  subscribeMachine: (machineId: string) => void;
  unsubscribeMachine: (machineId: string) => void;
  clearAlerts: () => void;
}

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMachineUpdate, setLastMachineUpdate] = useState<MachineUpdate | null>(null);
  const [lastAlert, setLastAlert] = useState<Alert | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    // Machine update events
    socket.on('machine_update', (data: MachineUpdate) => {
      console.log('📡 Machine update:', data.machineId, data.healthStatus);
      setLastMachineUpdate(data);
    });

    // Alert events
    socket.on('new_alert', (data: Alert) => {
      console.log('🚨 New alert:', data.alertType, data.machineId);
      setLastAlert(data);
      setAlerts((prev) => [data, ...prev].slice(0, 50)); // Keep last 50 alerts
    });

    // Alert acknowledged
    socket.on('alert_acknowledged', ({ alertId }) => {
      console.log('✅ Alert acknowledged:', alertId);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribeMachine = useCallback((machineId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe_machine', machineId);
    }
  }, []);

  const unsubscribeMachine = useCallback((machineId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe_machine', machineId);
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setLastAlert(null);
  }, []);

  return {
    isConnected,
    lastMachineUpdate,
    lastAlert,
    alerts,
    subscribeMachine,
    unsubscribeMachine,
    clearAlerts,
  };
}

// Hook for subscribing to a specific machine's updates
export function useMachineSocket(machineId: string | null) {
  const [sensorData, setSensorData] = useState<SensorUpdate | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!machineId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe_machine', machineId);
    });

    socket.on('sensor_update', (data: SensorUpdate) => {
      setSensorData(data);
    });

    return () => {
      socket.emit('unsubscribe_machine', machineId);
      socket.disconnect();
    };
  }, [machineId]);

  return { sensorData };
}

export default useSocket;

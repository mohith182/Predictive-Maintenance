import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { MachineData } from "@/lib/api";
import type { SensorReading } from "@/lib/queries";
import { useLiveSensorData } from "@/lib/queries";
import HealthGauge from "./HealthGauge";
import SensorChart from "./SensorChart";
import InsightsPanel from "./InsightsPanel";
import { Cpu, MapPin, Calendar, Activity } from "lucide-react";

interface MachineDetailProps {
  machine: MachineData;
}

const MAX_HISTORY_POINTS = 72;

const MachineDetail = ({ machine }: MachineDetailProps) => {
  // Live sensor data state - starts with machine's sensor history
  const [liveHistory, setLiveHistory] = useState<SensorReading[]>(machine.sensorHistory);
  
  // Fetch live sensor data every 2 seconds
  const { data: liveSensorData } = useLiveSensorData(machine.machineId, true);
  
  // Update live history when new data comes in
  useEffect(() => {
    if (liveSensorData) {
      setLiveHistory(prev => {
        const newHistory = [...prev, liveSensorData];
        // Keep only the last MAX_HISTORY_POINTS
        if (newHistory.length > MAX_HISTORY_POINTS) {
          return newHistory.slice(-MAX_HISTORY_POINTS);
        }
        return newHistory;
      });
    }
  }, [liveSensorData]);
  
  // Reset history when machine changes
  useEffect(() => {
    setLiveHistory(machine.sensorHistory);
  }, [machine.machineId]);

  const statusLabel = {
    healthy: { text: "HEALTHY", class: "text-success bg-success/10 border-success/20" },
    warning: { text: "WARNING", class: "text-warning bg-warning/10 border-warning/20" },
    critical: { text: "CRITICAL", class: "text-destructive bg-destructive/10 border-destructive/20" },
  };

  const st = statusLabel[machine.status];

  return (
    <motion.div
      key={machine.machineId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-primary">{machine.machineId}</span>
              <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${st.class}`}>
                {st.text}
              </span>
            </div>
            <h2 className="font-mono text-lg font-bold text-foreground">{machine.name}</h2>
            <div className="flex items-center gap-4 mt-1.5 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                <span className="text-xs">{machine.type}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{machine.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">Last: {machine.lastMaintenance}</span>
              </div>
            </div>
          </div>
          <HealthGauge score={machine.healthScore} size={140} label="Health Score" />
        </div>
      </div>

      {/* Health Trend - Live */}
      <SensorChart
        data={liveHistory}
        dataKey="healthScore"
        label="Health Trend (Live)"
        unit="%"
        color="hsl(185, 80%, 50%)"
        isLive
      />

      {/* Sensor Charts - Live */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SensorChart
          data={liveHistory}
          dataKey="temperature"
          label="Temperature"
          unit="°C"
          color="hsl(0, 72%, 55%)"
          isLive
        />
        <SensorChart
          data={liveHistory}
          dataKey="vibration"
          label="Vibration"
          unit="mm/s"
          color="hsl(38, 92%, 55%)"
          isLive
        />
        <SensorChart
          data={liveHistory}
          dataKey="current"
          label="Electrical Current"
          unit="A"
          color="hsl(185, 80%, 50%)"
          isLive
        />
      </div>

      {/* Insights */}
      <InsightsPanel machine={machine} />
    </motion.div>
  );
};

export default MachineDetail;

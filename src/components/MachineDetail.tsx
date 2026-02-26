import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { MachineData } from "@/lib/api";
import type { SensorReading } from "@/lib/queries";
import { useLiveSensorData } from "@/lib/queries";
import HealthGauge from "./HealthGauge";
import SensorChart from "./SensorChart";
import InsightsPanel from "./InsightsPanel";
import DigitalTwin from "./DigitalTwin";
import SHAPChart from "./SHAPChart";
import FailureTimeline from "./FailureTimeline";
import CostEstimator from "./CostEstimator";
import SimulationPanel from "./SimulationPanel";
import RecommendationsPanel from "./RecommendationsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, MapPin, Calendar, Activity, BrainCircuit, Timer, IndianRupee, FlaskConical, Wrench, Box } from "lucide-react";

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

      {/* Advanced Features Tabs */}
      <div className="glass rounded-xl p-4">
        <Tabs defaultValue="twin" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 h-auto">
            <TabsTrigger value="twin" className="flex items-center gap-1 text-xs py-2">
              <Box className="h-3 w-3" />
              <span className="hidden sm:inline">Digital Twin</span>
            </TabsTrigger>
            <TabsTrigger value="shap" className="flex items-center gap-1 text-xs py-2">
              <BrainCircuit className="h-3 w-3" />
              <span className="hidden sm:inline">SHAP</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1 text-xs py-2">
              <Timer className="h-3 w-3" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="cost" className="flex items-center gap-1 text-xs py-2">
              <IndianRupee className="h-3 w-3" />
              <span className="hidden sm:inline">Cost</span>
            </TabsTrigger>
            <TabsTrigger value="simulate" className="flex items-center gap-1 text-xs py-2">
              <FlaskConical className="h-3 w-3" />
              <span className="hidden sm:inline">Simulate</span>
            </TabsTrigger>
            <TabsTrigger value="recommend" className="flex items-center gap-1 text-xs py-2">
              <Wrench className="h-3 w-3" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="twin" className="mt-4">
            <DigitalTwin
              machineId={machine.machineId}
              machineName={machine.name}
              machineType={machine.type}
              healthScore={machine.healthScore}
              sensorData={{
                temperature: liveHistory[liveHistory.length - 1]?.temperature || 65,
                vibration: liveHistory[liveHistory.length - 1]?.vibration || 2.5,
                current: liveHistory[liveHistory.length - 1]?.current || 15,
              }}
              status={machine.status}
            />
          </TabsContent>

          <TabsContent value="shap" className="mt-4">
            <SHAPChart
              contributions={[
                { 
                  feature: "temperature", 
                  contribution: machine.healthScore >= 70 ? 5 : -15, 
                  value: liveHistory[liveHistory.length - 1]?.temperature || 65, 
                  unit: "°C" 
                },
                { 
                  feature: "vibration", 
                  contribution: machine.healthScore >= 70 ? 3 : -10, 
                  value: liveHistory[liveHistory.length - 1]?.vibration || 2.5, 
                  unit: "mm/s" 
                },
                { 
                  feature: "current", 
                  contribution: machine.healthScore >= 70 ? 2 : -5, 
                  value: liveHistory[liveHistory.length - 1]?.current || 15, 
                  unit: "A" 
                },
                { 
                  feature: "pressure", 
                  contribution: machine.healthScore >= 70 ? 4 : -3, 
                  value: 95 + Math.random() * 10, 
                  unit: "PSI" 
                },
                { 
                  feature: "runtime_hours", 
                  contribution: machine.healthScore >= 70 ? 1 : -8, 
                  value: 2500 + Math.random() * 500, 
                  unit: "hrs" 
                },
              ]}
              baselineHealth={75}
              predictedHealth={machine.healthScore}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <FailureTimeline
              currentHealth={machine.healthScore}
              rul={machine.rul}
              startDate={new Date()}
            />
          </TabsContent>

          <TabsContent value="cost" className="mt-4">
            <CostEstimator
              downtimeCostPerHour={5000}
              estimatedRepairHours={machine.status === "critical" ? 8 : machine.status === "warning" ? 4 : 2}
              estimatedLoss={machine.status === "critical" ? 80000 : machine.status === "warning" ? 35000 : 15000}
              isHighCost={machine.status === "critical"}
              healthPercentage={machine.healthScore}
            />
          </TabsContent>

          <TabsContent value="simulate" className="mt-4">
            <SimulationPanel
              machineId={machine.machineId}
              currentHealth={machine.healthScore}
              currentSensors={{
                temperature: liveHistory[liveHistory.length - 1]?.temperature || 65,
                vibration: liveHistory[liveHistory.length - 1]?.vibration || 2.5,
                current: liveHistory[liveHistory.length - 1]?.current || 15,
              }}
            />
          </TabsContent>

          <TabsContent value="recommend" className="mt-4">
            <RecommendationsPanel
              machineId={machine.machineId}
              healthScore={machine.healthScore}
              status={machine.status}
            />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default MachineDetail;

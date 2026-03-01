import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, Play, RotateCcw, TrendingUp, TrendingDown, Minus, Thermometer, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { API_BASE_URL } from "@/lib/api";

interface SimulationPanelProps {
  machineId: string;
  currentHealth: number;
  currentSensors: {
    temperature: number;
    vibration: number;
    current: number;
  };
}

interface SimulationResult {
  original: {
    temperature: number;
    vibration: number;
    current: number;
    runtime_hours: number;
    health_status: string;
    health_percentage: number;
    predicted_rul: number;
    risk_level: string;
  };
  simulated: {
    temperature: number;
    vibration: number;
    current: number;
    runtime_hours: number;
    health_status: string;
    health_percentage: number;
    predicted_rul: number;
    risk_level: string;
  };
  health_change_percent: number;
  rul_change_cycles: number;
  risk_change: "improved" | "unchanged" | "worsened";
}

export default function SimulationPanel({
  machineId,
  currentHealth,
  currentSensors
}: SimulationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  
  // Adjustment values
  const [tempDelta, setTempDelta] = useState(0);
  const [loadDelta, setLoadDelta] = useState(0);
  const [runtimeDelta, setRuntimeDelta] = useState(0);

  const runSimulation = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        base_temperature: currentSensors.temperature.toString(),
        base_vibration: currentSensors.vibration.toString(),
        base_current: currentSensors.current.toString(),
        base_pressure: "100",
        base_runtime_hours: "2000",
        temperature_delta: tempDelta.toString(),
        load_delta_percent: loadDelta.toString(),
        runtime_hours_delta: runtimeDelta.toString()
      });

      const response = await fetch(`${API_BASE_URL}/api/simulate?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSimulation = () => {
    setTempDelta(0);
    setLoadDelta(0);
    setRuntimeDelta(0);
    setResult(null);
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold">What-If Simulation</span>
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-muted-foreground"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 space-y-4"
          >
            {/* Sliders */}
            <div className="space-y-4">
              {/* Temperature Adjustment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Thermometer className="h-3 w-3" /> Temperature
                  </span>
                  <span className="font-mono text-xs">
                    {tempDelta >= 0 ? '+' : ''}{tempDelta}
                  </span>
                </div>
                <Slider
                  value={[tempDelta]}
                  onValueChange={([v]) => setTempDelta(v)}
                  min={-30}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Load Adjustment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Load (Current)
                  </span>
                  <span className="font-mono text-xs">
                    {loadDelta >= 0 ? '+' : ''}{loadDelta}%
                  </span>
                </div>
                <Slider
                  value={[loadDelta]}
                  onValueChange={([v]) => setLoadDelta(v)}
                  min={-30}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Runtime Hours Adjustment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Additional Runtime
                  </span>
                  <span className="font-mono text-xs">
                    +{runtimeDelta} hrs
                  </span>
                </div>
                <Slider
                  value={[runtimeDelta]}
                  onValueChange={([v]) => setRuntimeDelta(v)}
                  min={0}
                  max={500}
                  step={10}
                  className="w-full"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={runSimulation}
                disabled={isLoading}
                className="flex-1 gap-2"
                size="sm"
              >
                <Play className="h-3 w-3" />
                {isLoading ? "Simulating..." : "Run Simulation"}
              </Button>
              <Button
                onClick={resetSimulation}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            {/* Results */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-secondary/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Simulation Results</span>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                    result.risk_change === "improved" ? "bg-green-500/20 text-green-400" :
                    result.risk_change === "worsened" ? "bg-red-500/20 text-red-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {result.risk_change === "improved" && <TrendingUp className="h-3 w-3" />}
                    {result.risk_change === "worsened" && <TrendingDown className="h-3 w-3" />}
                    {result.risk_change === "unchanged" && <Minus className="h-3 w-3" />}
                    {result.risk_change}
                  </span>
                </div>

                {/* Comparison Table */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div></div>
                  <div className="text-center text-muted-foreground">Original</div>
                  <div className="text-center text-muted-foreground">Simulated</div>
                  
                  <div className="text-muted-foreground">Health %</div>
                  <div className="text-center font-mono">{result.original.health_percentage.toFixed(1)}%</div>
                  <div className={`text-center font-mono font-bold ${
                    result.simulated.health_percentage > result.original.health_percentage
                      ? "text-green-400" : result.simulated.health_percentage < result.original.health_percentage
                      ? "text-red-400" : "text-foreground"
                  }`}>
                    {result.simulated.health_percentage.toFixed(1)}%
                  </div>

                  <div className="text-muted-foreground">RUL</div>
                  <div className="text-center font-mono">{result.original.predicted_rul.toFixed(0)}</div>
                  <div className={`text-center font-mono font-bold ${
                    result.simulated.predicted_rul > result.original.predicted_rul
                      ? "text-green-400" : result.simulated.predicted_rul < result.original.predicted_rul
                      ? "text-red-400" : "text-foreground"
                  }`}>
                    {result.simulated.predicted_rul.toFixed(0)}
                  </div>

                  <div className="text-muted-foreground">Status</div>
                  <div className="text-center font-mono">{result.original.health_status}</div>
                  <div className={`text-center font-mono font-bold ${
                    result.simulated.health_status === "NORMAL" ? "text-green-400" :
                    result.simulated.health_status === "WARNING" ? "text-yellow-400" :
                    "text-red-400"
                  }`}>
                    {result.simulated.health_status}
                  </div>
                </div>

                {/* Change Summary */}
                <div className="flex justify-between text-xs pt-2 border-t border-border">
                  <span className="text-muted-foreground">Health Change:</span>
                  <span className={`font-mono font-bold ${
                    result.health_change_percent > 0 ? "text-green-400" :
                    result.health_change_percent < 0 ? "text-red-400" : "text-foreground"
                  }`}>
                    {result.health_change_percent > 0 ? '+' : ''}{result.health_change_percent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">RUL Change:</span>
                  <span className={`font-mono font-bold ${
                    result.rul_change_cycles > 0 ? "text-green-400" :
                    result.rul_change_cycles < 0 ? "text-red-400" : "text-foreground"
                  }`}>
                    {result.rul_change_cycles > 0 ? '+' : ''}{result.rul_change_cycles.toFixed(0)} cycles
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

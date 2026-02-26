import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, Cpu, Database, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface ModelStatus {
  model_trained: boolean;
  model_type?: string;
  n_estimators?: number;
  n_features?: number;
  training_date?: string;
  model_size_mb?: number;
  algorithm?: string;
  max_rul: number;
  health_thresholds: {
    healthy: string;
    warning: string;
    critical: string;
  };
}

const ModelInfoPanel = () => {
  const { data: modelStatus, isLoading } = useQuery<ModelStatus>({
    queryKey: ["modelStatus"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/model/status`);
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-20 bg-secondary/50 rounded-lg" />
      </div>
    );
  }

  if (!modelStatus) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          ML Model Status
        </h3>
        {modelStatus.model_trained ? (
          <span className="ml-auto flex items-center gap-1 text-xs text-success">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" />
            Not Trained
          </span>
        )}
      </div>

      {modelStatus.model_trained && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Cpu className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Algorithm
              </span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              {modelStatus.algorithm || "RF Regressor"}
            </span>
          </div>

          <div className="rounded-lg bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Estimators
              </span>
            </div>
            <span className="font-mono text-lg font-bold text-primary">
              {modelStatus.n_estimators || 100}
            </span>
          </div>

          <div className="rounded-lg bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Features
              </span>
            </div>
            <span className="font-mono text-lg font-bold text-primary">
              {modelStatus.n_features || 14}
            </span>
          </div>
        </div>
      )}

      {/* Health Thresholds */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-success mr-1" />
          Healthy {modelStatus.health_thresholds.healthy}
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-warning mr-1" />
          Warning {modelStatus.health_thresholds.warning}
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-destructive mr-1" />
          Critical {modelStatus.health_thresholds.critical}
        </span>
      </div>
    </motion.div>
  );
};

export default ModelInfoPanel;

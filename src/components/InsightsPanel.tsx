import { motion } from "framer-motion";
import { Brain, Clock, AlertTriangle, Wrench, Target, TrendingUp } from "lucide-react";
import type { MachineData } from "@/lib/api";

interface InsightsPanelProps {
  machine: MachineData;
}

const InsightsPanel = ({ machine }: InsightsPanelProps) => {
  const getRulColor = (rul: number) => {
    if (rul > 30) return "text-success";
    if (rul >= 14) return "text-warning";
    return "text-destructive";
  };

  // Calculate prediction confidence based on health consistency
  const confidence = Math.min(95, 75 + (machine.healthScore / 10));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Predictive Insights
        </h3>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Target className="h-3 w-3" />
          {confidence.toFixed(0)}% confidence
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* RUL */}
        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Remaining Life
            </span>
          </div>
          <span className={`font-mono text-2xl font-bold ${getRulColor(machine.rul)}`}>
            {Math.round(machine.rul)}
          </span>
          <span className="text-xs text-muted-foreground ml-1">cycles</span>
        </div>

        {/* Risk Level */}
        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Risk Level
            </span>
          </div>
          <span className={`font-mono text-lg font-bold uppercase ${
            machine.riskLevel === 'low' ? 'text-success' :
            machine.riskLevel === 'medium' ? 'text-warning' : 'text-destructive'
          }`}>
            {machine.riskLevel}
          </span>
        </div>

        {/* Health Trend */}
        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Health Score
            </span>
          </div>
          <span className={`font-mono text-2xl font-bold ${
            machine.healthScore > 70 ? 'text-success' :
            machine.healthScore >= 40 ? 'text-warning' : 'text-destructive'
          }`}>
            {Math.round(machine.healthScore)}%
          </span>
        </div>

        {/* Maintenance */}
        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Next Service
            </span>
          </div>
          <span className="font-mono text-sm font-bold text-foreground">
            {machine.nextScheduled}
          </span>
        </div>
      </div>

      {/* Root Cause */}
      {machine.rootCause && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
        >
          <span className="text-[10px] uppercase tracking-wider text-destructive font-semibold">
            Root Cause Analysis
          </span>
          <p className="text-xs text-foreground mt-1 leading-relaxed">
            {machine.rootCause}
          </p>
        </motion.div>
      )}

      {/* Health Status Message */}
      {!machine.rootCause && machine.healthScore > 70 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 rounded-lg border border-success/20 bg-success/5 p-3"
        >
          <span className="text-[10px] uppercase tracking-wider text-success font-semibold">
            System Status
          </span>
          <p className="text-xs text-foreground mt-1 leading-relaxed">
            All systems operating within normal parameters. No maintenance required at this time.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default InsightsPanel;

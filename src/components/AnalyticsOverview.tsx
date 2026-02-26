import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Target, Shield } from "lucide-react";
import type { MachineData } from "@/lib/api";

interface AnalyticsOverviewProps {
  machines: MachineData[];
}

const AnalyticsOverview = ({ machines }: AnalyticsOverviewProps) => {
  // Calculate analytics
  const avgRul = machines.length > 0
    ? Math.round(machines.reduce((sum, m) => sum + m.rul, 0) / machines.length)
    : 0;

  const avgHealth = machines.length > 0
    ? Math.round(machines.reduce((sum, m) => sum + m.healthScore, 0) / machines.length)
    : 0;

  const machinesNeedingMaintenance = machines.filter(m => m.rul < 30).length;
  const criticalMachines = machines.filter(m => m.status === 'critical').length;
  const warningMachines = machines.filter(m => m.status === 'warning').length;
  
  // Calculate uptime (healthy percentage)
  const uptime = machines.length > 0
    ? Math.round((machines.filter(m => m.status === 'healthy').length / machines.length) * 100)
    : 0;

  // Get the machine with lowest RUL
  const lowestRulMachine = machines.length > 0
    ? machines.reduce((min, m) => m.rul < min.rul ? m : min, machines[0])
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fleet Analytics
        </h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Average RUL */}
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3 w-3 text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Avg RUL
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold text-primary">
              {avgRul}
            </span>
            <span className="text-xs text-muted-foreground">cycles</span>
          </div>
        </div>

        {/* Fleet Uptime */}
        <div className="rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="h-3 w-3 text-success" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Uptime
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold text-success">
              {uptime}%
            </span>
          </div>
        </div>

        {/* Maintenance Due */}
        <div className={`rounded-lg p-3 ${
          machinesNeedingMaintenance > 0
            ? 'bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20'
            : 'bg-secondary/50'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className={`h-3 w-3 ${machinesNeedingMaintenance > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Maintenance Due
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`font-mono text-2xl font-bold ${machinesNeedingMaintenance > 0 ? 'text-warning' : 'text-foreground'}`}>
              {machinesNeedingMaintenance}
            </span>
            <span className="text-xs text-muted-foreground">machines</span>
          </div>
        </div>
      </div>

      {/* Lowest RUL Machine Alert */}
      {lowestRulMachine && lowestRulMachine.rul < 50 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`mt-3 rounded-lg p-3 flex items-center justify-between ${
            lowestRulMachine.rul < 20
              ? 'bg-destructive/10 border border-destructive/20'
              : 'bg-warning/10 border border-warning/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {lowestRulMachine.rul < 20 ? (
              <TrendingDown className="h-4 w-4 text-destructive" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning" />
            )}
            <div>
              <span className={`text-xs font-semibold ${lowestRulMachine.rul < 20 ? 'text-destructive' : 'text-warning'}`}>
                Lowest RUL Alert
              </span>
              <p className="text-[10px] text-muted-foreground">
                {lowestRulMachine.name} - {Math.round(lowestRulMachine.rul)} cycles remaining
              </p>
            </div>
          </div>
          <Target className={`h-5 w-5 ${lowestRulMachine.rul < 20 ? 'text-destructive/50' : 'text-warning/50'}`} />
        </motion.div>
      )}

      {/* Status Distribution */}
      <div className="mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Status Distribution:</span>
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden flex">
            {machines.length > 0 && (
              <>
                <div
                  className="h-full bg-success"
                  style={{ width: `${((machines.length - warningMachines - criticalMachines) / machines.length) * 100}%` }}
                />
                <div
                  className="h-full bg-warning"
                  style={{ width: `${(warningMachines / machines.length) * 100}%` }}
                />
                <div
                  className="h-full bg-destructive"
                  style={{ width: `${(criticalMachines / machines.length) * 100}%` }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AnalyticsOverview;

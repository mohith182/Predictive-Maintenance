import { motion } from "framer-motion";
import { AlertTriangle, XCircle, Check } from "lucide-react";
import type { Alert } from "@/lib/mockData";

interface AlertsPanelProps {
  alerts: Alert[];
  onSelectMachine?: (id: string) => void;
}

const AlertsPanel = ({ alerts, onSelectMachine }: AlertsPanelProps) => {
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diff = Math.round((Date.now() - d.getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    return `${Math.round(diff / 60)}h ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass rounded-xl p-4"
    >
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Active Alerts
      </h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {alerts.filter(a => !a.acknowledged).length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/5 p-3">
            <Check className="h-4 w-4 text-success" />
            <span className="text-xs text-success">All clear — no active alerts</span>
          </div>
        ) : (
          alerts.filter(a => !a.acknowledged).map((alert, i) => (
            <motion.button
              key={alert.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelectMachine?.(alert.machineId)}
              className={`w-full text-left rounded-lg p-3 transition-colors ${
                alert.severity === 'critical'
                  ? 'bg-destructive/10 border border-destructive/20 hover:bg-destructive/15'
                  : 'bg-warning/10 border border-warning/20 hover:bg-warning/15'
              }`}
            >
              <div className="flex items-start gap-2">
                {alert.severity === 'critical' ? (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {alert.machineId}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(alert.timestamp)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {alert.message}
                  </p>
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default AlertsPanel;

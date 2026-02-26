import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle, XCircle, Wifi } from "lucide-react";

interface LiveStatusCardProps {
  machineId: string;
  machineName: string;
  healthStatus: "NORMAL" | "WARNING" | "CRITICAL";
  healthScore: number;
  rul: number;
  isLive?: boolean;
  lastUpdate?: string;
  onClick?: () => void;
}

const LiveStatusCard = ({
  machineId,
  machineName,
  healthStatus,
  healthScore,
  rul,
  isLive = false,
  lastUpdate,
  onClick,
}: LiveStatusCardProps) => {
  const statusConfig = {
    NORMAL: {
      bg: "bg-success/10",
      border: "border-success/30",
      text: "text-success",
      icon: CheckCircle,
      label: "NORMAL",
      glow: "glow-success",
    },
    WARNING: {
      bg: "bg-warning/10",
      border: "border-warning/30",
      text: "text-warning",
      icon: AlertTriangle,
      label: "WARNING",
      glow: "glow-warning",
    },
    CRITICAL: {
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      text: "text-destructive",
      icon: XCircle,
      label: "CRITICAL",
      glow: "glow-critical",
    },
  };

  const config = statusConfig[healthStatus];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-xl border p-4
        ${config.bg} ${config.border}
        transition-all duration-300 hover:shadow-lg
      `}
    >
      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Wifi className="h-3 w-3 text-success animate-pulse" />
          <span className="text-[10px] text-success font-mono">LIVE</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${config.bg} ${config.glow}`}>
          <StatusIcon className={`h-5 w-5 ${config.text}`} />
        </div>
        <div>
          <h3 className="font-mono text-sm font-semibold text-foreground">{machineId}</h3>
          <p className="text-xs text-muted-foreground">{machineName}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} mb-3`}>
        <span className={`h-2 w-2 rounded-full ${config.text.replace('text-', 'bg-')} animate-pulse`} />
        <span className={`text-xs font-mono font-semibold ${config.text}`}>{config.label}</span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-[10px] text-muted-foreground uppercase">Health</p>
          <p className={`text-lg font-mono font-bold ${config.text}`}>{healthScore.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-[10px] text-muted-foreground uppercase">RUL</p>
          <p className="text-lg font-mono font-bold text-foreground">{rul.toFixed(0)}</p>
        </div>
      </div>

      {/* Last update */}
      {lastUpdate && (
        <p className="mt-2 text-[10px] text-muted-foreground text-center">
          Updated: {new Date(lastUpdate).toLocaleTimeString()}
        </p>
      )}

      {/* Pulse animation for critical status */}
      {healthStatus === "CRITICAL" && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-destructive"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

export default LiveStatusCard;

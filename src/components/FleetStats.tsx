import { motion } from "framer-motion";
import { Activity, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: "border-border bg-card",
  success: "border-success/20 bg-success/5",
  warning: "border-warning/20 bg-warning/5",
  danger: "border-destructive/20 bg-destructive/5",
};

const variantText = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const StatCard = ({ label, value, icon, variant = 'default' }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`rounded-xl border p-4 ${variantStyles[variant]}`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      {icon}
    </div>
    <span className={`font-mono text-2xl font-bold ${variantText[variant]}`}>{value}</span>
  </motion.div>
);

interface FleetStatsProps {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  avgHealth: number;
}

const FleetStats = ({ total, healthy, warning, critical, avgHealth }: FleetStatsProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <StatCard
      label="Fleet Health"
      value={`${avgHealth}%`}
      icon={<Activity className="h-4 w-4 text-primary" />}
    />
    <StatCard
      label="Healthy"
      value={healthy}
      icon={<CheckCircle className="h-4 w-4 text-success" />}
      variant="success"
    />
    <StatCard
      label="Warning"
      value={warning}
      icon={<AlertTriangle className="h-4 w-4 text-warning" />}
      variant="warning"
    />
    <StatCard
      label="Critical"
      value={critical}
      icon={<XCircle className="h-4 w-4 text-destructive" />}
      variant="danger"
    />
  </div>
);

export default FleetStats;

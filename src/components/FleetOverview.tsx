import { motion } from "framer-motion";
import type { MachineData } from "@/lib/mockData";
import { MapPin, Cpu, Calendar } from "lucide-react";

interface FleetOverviewProps {
  machines: MachineData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusConfig = {
  healthy: { dot: "bg-success", border: "border-success/20", bg: "bg-success/5" },
  warning: { dot: "bg-warning", border: "border-warning/20", bg: "bg-warning/5" },
  critical: { dot: "bg-destructive animate-pulse", border: "border-destructive/20", bg: "bg-destructive/5" },
};

const FleetOverview = ({ machines, selectedId, onSelect }: FleetOverviewProps) => {
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Machine Fleet
      </h3>
      {machines.map((m, i) => {
        const cfg = statusConfig[m.status];
        const isSelected = m.machineId === selectedId;
        return (
          <motion.button
            key={m.machineId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(m.machineId)}
            className={`w-full text-left rounded-xl p-3 transition-all border ${
              isSelected
                ? "border-primary/40 bg-primary/5 glow-primary"
                : `${cfg.border} ${cfg.bg} hover:bg-secondary/50`
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                <span className="font-mono text-xs font-semibold text-foreground">{m.machineId}</span>
              </div>
              <span className="font-mono text-sm font-bold text-foreground">{m.healthScore}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{m.name}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{m.location}</span>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default FleetOverview;

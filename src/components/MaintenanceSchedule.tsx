import { motion } from "framer-motion";
import { Wrench, Calendar, Clock, ChevronRight } from "lucide-react";
import type { MachineData } from "@/lib/api";

interface MaintenanceScheduleProps {
  machines: MachineData[];
  onSelectMachine: (id: string) => void;
}

interface MaintenanceItem {
  machineId: string;
  name: string;
  nextScheduled: string;
  rul: number;
  urgency: 'overdue' | 'urgent' | 'upcoming' | 'scheduled';
  daysUntil: number;
}

const MaintenanceSchedule = ({ machines, onSelectMachine }: MaintenanceScheduleProps) => {
  // Calculate maintenance items with urgency
  const today = new Date();
  
  const maintenanceItems: MaintenanceItem[] = machines
    .map(m => {
      const nextDate = new Date(m.nextScheduled);
      const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgency: MaintenanceItem['urgency'] = 'scheduled';
      if (daysUntil < 0) urgency = 'overdue';
      else if (daysUntil <= 7 || m.rul < 20) urgency = 'urgent';
      else if (daysUntil <= 30 || m.rul < 50) urgency = 'upcoming';
      
      return {
        machineId: m.machineId,
        name: m.name,
        nextScheduled: m.nextScheduled,
        rul: m.rul,
        urgency,
        daysUntil,
      };
    })
    .sort((a, b) => {
      // Sort by urgency first, then by days until
      const urgencyOrder = { overdue: 0, urgent: 1, upcoming: 2, scheduled: 3 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return a.daysUntil - b.daysUntil;
    })
    .slice(0, 5); // Show top 5

  const urgencyStyles = {
    overdue: 'border-destructive/30 bg-destructive/5',
    urgent: 'border-warning/30 bg-warning/5',
    upcoming: 'border-primary/30 bg-primary/5',
    scheduled: 'border-border bg-secondary/30',
  };

  const urgencyBadge = {
    overdue: { text: 'OVERDUE', class: 'text-destructive bg-destructive/10' },
    urgent: { text: 'URGENT', class: 'text-warning bg-warning/10' },
    upcoming: { text: 'UPCOMING', class: 'text-primary bg-primary/10' },
    scheduled: { text: 'SCHEDULED', class: 'text-muted-foreground bg-secondary' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Maintenance Schedule
        </h3>
      </div>

      <div className="space-y-2">
        {maintenanceItems.map((item, index) => (
          <motion.div
            key={item.machineId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectMachine(item.machineId)}
            className={`rounded-lg border p-3 cursor-pointer transition-all hover:scale-[1.02] ${urgencyStyles[item.urgency]}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {item.machineId}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${urgencyBadge[item.urgency].class}`}>
                    {urgencyBadge[item.urgency].text}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground truncate">
                  {item.name}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Wrench className="h-2.5 w-2.5" />
                    {item.nextScheduled}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    RUL: {Math.round(item.rul)} cycles
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </motion.div>
        ))}

        {maintenanceItems.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No maintenance scheduled
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MaintenanceSchedule;

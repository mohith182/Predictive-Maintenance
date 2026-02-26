import { motion } from "framer-motion";
import { Wrench, AlertTriangle, AlertCircle, Clock, IndianRupee, CheckCircle2 } from "lucide-react";

interface Recommendation {
  priority: "urgent" | "high" | "medium" | "low";
  action: string;
  reason: string;
  estimated_time_hours: number;
  estimated_cost: number;
}

interface RecommendationsPanelProps {
  machineId: string;
  healthScore: number;
  status: 'healthy' | 'warning' | 'critical';
}

const priorityConfig = {
  urgent: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: AlertCircle,
    label: "URGENT"
  },
  high: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: AlertTriangle,
    label: "HIGH"
  },
  medium: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: Wrench,
    label: "MEDIUM"
  },
  low: {
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    icon: CheckCircle2,
    label: "LOW"
  }
};

export default function RecommendationsPanel({ 
  machineId,
  healthScore,
  status
}: RecommendationsPanelProps) {
  // Generate recommendations based on status and health score
  const recommendations: Recommendation[] = [];
  
  if (status === 'critical' || healthScore < 40) {
    recommendations.push({
      priority: 'urgent',
      action: 'Immediate shutdown and inspection required',
      reason: `Machine health at ${healthScore}% - critical failure risk`,
      estimated_time_hours: 8,
      estimated_cost: 75000
    });
    recommendations.push({
      priority: 'high',
      action: 'Replace worn bearings and seals',
      reason: 'Abnormal vibration patterns detected',
      estimated_time_hours: 4,
      estimated_cost: 25000
    });
  } else if (status === 'warning' || healthScore < 70) {
    recommendations.push({
      priority: 'high',
      action: 'Schedule preventive maintenance',
      reason: `Health declining - currently at ${healthScore}%`,
      estimated_time_hours: 4,
      estimated_cost: 20000
    });
    recommendations.push({
      priority: 'medium',
      action: 'Lubricate moving components',
      reason: 'Friction levels elevated',
      estimated_time_hours: 1,
      estimated_cost: 5000
    });
  } else {
    recommendations.push({
      priority: 'low',
      action: 'Continue routine monitoring',
      reason: `Machine operating normally at ${healthScore}%`,
      estimated_time_hours: 0.5,
      estimated_cost: 2000
    });
    recommendations.push({
      priority: 'medium',
      action: 'Schedule next regular maintenance',
      reason: 'Preventive maintenance due in 2 weeks',
      estimated_time_hours: 2,
      estimated_cost: 8000
    });
  }

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <h3 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        Maintenance Recommendations
        <span className="text-muted-foreground text-xs">• {machineId}</span>
      </h3>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const config = priorityConfig[rec.priority];
          const Icon = config.icon;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg border ${config.bg} ${config.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.bg}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {rec.estimated_time_hours}h
                      </span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        {rec.estimated_cost.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm font-medium text-foreground">
                    {rec.action}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {rec.reason}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total Estimate */}
      <div className="pt-3 border-t border-border flex justify-between text-xs">
        <span className="text-muted-foreground">Total Estimated Time:</span>
        <span className="font-mono font-semibold">
          {recommendations.reduce((sum, r) => sum + r.estimated_time_hours, 0).toFixed(1)}h
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Total Estimated Cost:</span>
        <span className="font-mono font-semibold flex items-center gap-1">
          <IndianRupee className="h-3 w-3" />
          {recommendations.reduce((sum, r) => sum + r.estimated_cost, 0).toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}

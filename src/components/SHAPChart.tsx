import { motion } from "framer-motion";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SHAPContribution {
  feature: string;
  contribution: number;
  value: number;
  unit: string;
  description?: string;
}

interface SHAPChartProps {
  contributions: SHAPContribution[];
  baselineHealth?: number;
  predictedHealth?: number;
}

export default function SHAPChart({
  contributions = [],
  baselineHealth = 75,
  predictedHealth = 65
}: SHAPChartProps) {
  // Sort contributions by absolute value
  const sortedContributions = [...contributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  // Calculate max contribution for scaling
  const maxContribution = Math.max(
    ...sortedContributions.map(c => Math.abs(c.contribution)),
    1
  );

  // Get feature icons and colors
  const getFeatureStyle = (feature: string) => {
    const styles: Record<string, { icon: string; color: string }> = {
      temperature: { icon: "🌡️", color: "bg-red-500" },
      vibration: { icon: "📳", color: "bg-purple-500" },
      current: { icon: "⚡", color: "bg-yellow-500" },
      pressure: { icon: "📊", color: "bg-blue-500" },
      runtime_hours: { icon: "⏱️", color: "bg-green-500" }
    };
    return styles[feature.toLowerCase()] || { icon: "📈", color: "bg-gray-500" };
  };

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="text-lg">🧠</span>
          Explainable AI (SHAP Values)
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                SHAP values show how each sensor reading contributes to the 
                health prediction. Positive values increase health, negative 
                values decrease it.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Baseline to Prediction Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Baseline</span>
          <div className="font-mono text-lg font-bold text-muted-foreground">
            {baselineHealth}%
          </div>
        </div>
        <motion.div
          className="flex-1 mx-4 h-1 bg-gray-700 rounded-full relative overflow-visible"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${
              predictedHealth >= baselineHealth
                ? "bg-gradient-to-r from-gray-500 to-green-500"
                : "bg-gradient-to-r from-gray-500 to-red-500"
            }`}
          />
          <motion.div
            initial={{ left: "0%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 0.8 }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          >
            <span className="text-lg">{predictedHealth >= baselineHealth ? "➡️" : "⬅️"}</span>
          </motion.div>
        </motion.div>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Predicted</span>
          <div className={`font-mono text-lg font-bold ${
            predictedHealth >= 70 ? "text-green-500" :
            predictedHealth >= 40 ? "text-yellow-500" : "text-red-500"
          }`}>
            {predictedHealth}%
          </div>
        </div>
      </div>

      {/* SHAP Contributions Chart */}
      <div className="space-y-3">
        <span className="text-xs text-muted-foreground">Feature Contributions</span>
        
        {sortedContributions.map((item, index) => {
          const style = getFeatureStyle(item.feature);
          const barWidth = (Math.abs(item.contribution) / maxContribution) * 100;
          const isPositive = item.contribution >= 0;
          
          return (
            <motion.div
              key={item.feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span>{style.icon}</span>
                  <span className="text-foreground capitalize">
                    {item.feature.replace('_', ' ')}
                  </span>
                  <span className="text-muted-foreground">
                    ({item.value.toFixed(1)}{item.unit})
                  </span>
                </div>
                <span className={`font-mono font-semibold ${
                  isPositive ? "text-green-500" : "text-red-500"
                }`}>
                  {isPositive ? "+" : ""}{item.contribution.toFixed(1)}%
                </span>
              </div>
              
              {/* Bar visualization */}
              <div className="flex items-center h-6 gap-1">
                {/* Negative side */}
                <div className="flex-1 flex justify-end">
                  {!isPositive && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-5 bg-gradient-to-l from-red-500 to-red-600 rounded-l"
                    />
                  )}
                </div>
                
                {/* Center line */}
                <div className="w-0.5 h-6 bg-gray-600" />
                
                {/* Positive side */}
                <div className="flex-1">
                  {isPositive && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-5 bg-gradient-to-r from-green-500 to-green-600 rounded-r"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Decreases Health</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Increases Health</span>
        </div>
      </div>

      {/* Interpretation Help */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground">
          <strong className="text-primary">Interpretation:</strong> The feature with the 
          largest bar has the biggest impact on prediction. Red bars indicate the 
          sensor reading is pushing health lower; green bars indicate it's helping 
          maintain good health.
        </p>
      </div>
    </div>
  );
}

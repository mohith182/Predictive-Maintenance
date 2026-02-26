import { motion } from "framer-motion";
import { IndianRupee, AlertTriangle, Clock, TrendingDown } from "lucide-react";

interface CostEstimateProps {
  downtimeCostPerHour: number;
  estimatedRepairHours: number;
  estimatedLoss: number;
  currency?: string;
  isHighCost?: boolean;
  healthPercentage?: number;
}

export default function CostEstimator({
  downtimeCostPerHour = 5000,
  estimatedRepairHours = 4,
  estimatedLoss = 50000,
  currency = "INR",
  isHighCost = false,
  healthPercentage = 75
}: CostEstimateProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    if (currency === "INR") {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `$${amount.toLocaleString()}`;
  };

  // Calculate breakdown
  const laborCost = downtimeCostPerHour * estimatedRepairHours;
  const partsCost = estimatedLoss - laborCost;

  return (
    <div className={`glass rounded-xl p-4 space-y-4 ${
      isHighCost ? "border border-red-500/30" : ""
    }`}>
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          Downtime Cost Estimator
        </h3>
        {isHighCost && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400"
          >
            <AlertTriangle className="h-3 w-3" />
            HIGH COST ALERT
          </motion.span>
        )}
      </div>

      {/* Main Cost Display */}
      <div className={`p-4 rounded-lg text-center ${
        isHighCost ? "bg-red-500/10 border border-red-500/30" : "bg-secondary/50"
      }`}>
        <span className="text-xs text-muted-foreground">Estimated Financial Impact</span>
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`font-mono text-3xl font-bold mt-1 ${
            isHighCost ? "text-red-400" : "text-foreground"
          }`}
        >
          {formatCurrency(estimatedLoss)}
        </motion.div>
        {isHighCost && (
          <p className="text-xs text-red-400 mt-2 flex items-center justify-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Exceeds threshold - Immediate action recommended
          </p>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Downtime Cost/Hour
          </span>
          <span className="font-mono">{formatCurrency(downtimeCostPerHour)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Estimated Repair Time</span>
          <span className="font-mono">{estimatedRepairHours.toFixed(1)} hours</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Labor & Downtime</span>
          <span className="font-mono">{formatCurrency(laborCost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Parts & Materials</span>
          <span className="font-mono">{formatCurrency(Math.max(partsCost, 0))}</span>
        </div>
      </div>

      {/* Cost Impact Visualization */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cost Impact Level</span>
          <span>{isHighCost ? "High" : estimatedLoss > 30000 ? "Medium" : "Low"}</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(estimatedLoss / 1000, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${
              isHighCost ? "bg-gradient-to-r from-red-500 to-red-600" :
              estimatedLoss > 30000 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
              "bg-gradient-to-r from-green-500 to-green-600"
            }`}
          />
        </div>
      </div>

      {/* Prevention Savings */}
      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-400">
            💡 Preventive maintenance could save
          </span>
          <span className="font-mono text-sm font-bold text-green-400">
            {formatCurrency(Math.round(estimatedLoss * 0.6))}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Early intervention typically reduces costs by 60%
        </p>
      </div>
    </div>
  );
}

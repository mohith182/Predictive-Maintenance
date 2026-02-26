import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

interface FailureTimelineProps {
  currentHealth: number;
  rul: number; // in days
  startDate?: Date;
}

export default function FailureTimeline({ 
  currentHealth, 
  rul,
  startDate = new Date() 
}: FailureTimelineProps) {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Convert RUL from days to hours
    const totalHours = rul * 24;
    const totalSeconds = totalHours * 3600;
    let remaining = totalSeconds;

    const timer = setInterval(() => {
      if (remaining <= 0) {
        clearInterval(timer);
        return;
      }
      remaining -= 1;

      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = Math.floor(remaining % 60);

      setCountdown({ days, hours, minutes, seconds });
    }, 1000);

    // Initial calculation
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    setCountdown({ days, hours, minutes, seconds });

    return () => clearInterval(timer);
  }, [rul]);

  // Calculate timeline progress
  const progressPercent = 100 - currentHealth;
  
  // Determine current stage
  const getCurrentStage = () => {
    if (currentHealth >= 70) return "normal";
    if (currentHealth >= 40) return "warning";
    if (currentHealth > 0) return "critical";
    return "failure";
  };

  const stage = getCurrentStage();

  const stages = [
    { id: "normal", label: "Normal", threshold: 100, color: "bg-green-500" },
    { id: "warning", label: "Warning", threshold: 70, color: "bg-yellow-500" },
    { id: "critical", label: "Critical", threshold: 40, color: "bg-red-500" },
    { id: "failure", label: "Failure", threshold: 0, color: "bg-gray-800" }
  ];

  // Calculate estimated failure date based on RUL in days
  const failureDate = new Date(startDate.getTime() + rul * 24 * 3600000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Failure Timeline Forecast
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full ${
          stage === "normal" ? "bg-green-500/20 text-green-400" :
          stage === "warning" ? "bg-yellow-500/20 text-yellow-400" :
          stage === "critical" ? "bg-red-500/20 text-red-400" :
          "bg-gray-500/20 text-gray-400"
        }`}>
          {stage.toUpperCase()}
        </span>
      </div>

      {/* Countdown Timer */}
      <div className="flex justify-center gap-3">
        {[
          { value: countdown.days, label: "Days" },
          { value: countdown.hours, label: "Hours" },
          { value: countdown.minutes, label: "Mins" },
          { value: countdown.seconds, label: "Secs" }
        ].map((item, i) => (
          <div key={i} className="text-center">
            <motion.div
              key={item.value}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className={`w-14 h-14 rounded-lg flex items-center justify-center font-mono text-xl font-bold ${
                stage === "critical" ? "bg-red-500/20 text-red-400" :
                stage === "warning" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-green-500/20 text-green-400"
              }`}
            >
              {item.value.toString().padStart(2, '0')}
            </motion.div>
            <span className="text-xs text-muted-foreground mt-1">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Estimated Failure Date */}
      <div className="text-center p-3 rounded-lg bg-secondary/50">
        <span className="text-xs text-muted-foreground">Estimated Failure Date</span>
        <p className="font-mono text-sm font-semibold text-foreground">{failureDate}</p>
      </div>

      {/* Timeline Visualization */}
      <div className="relative pt-4">
        <div className="flex justify-between mb-2">
          {stages.map((s, i) => (
            <div key={s.id} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                stage === s.id ? s.color + " animate-pulse" : 
                stages.findIndex(st => st.id === stage) >= i ? s.color : "bg-gray-600"
              }`}>
                {s.id === "normal" && <CheckCircle className="h-4 w-4 text-white" />}
                {s.id === "warning" && <AlertTriangle className="h-4 w-4 text-white" />}
                {s.id === "critical" && <AlertCircle className="h-4 w-4 text-white" />}
                {s.id === "failure" && <span className="text-white text-xs">✕</span>}
              </div>
              <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
            </div>
          ))}
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${
              stage === "critical" ? "bg-gradient-to-r from-yellow-500 to-red-500" :
              stage === "warning" ? "bg-gradient-to-r from-green-500 to-yellow-500" :
              "bg-green-500"
            }`}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">Today</span>
          <span className="text-xs text-muted-foreground">Failure</span>
        </div>
      </div>
    </div>
  );
}

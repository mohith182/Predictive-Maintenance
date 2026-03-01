import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

interface DigitalTwinProps {
  temperature: number;
  vibration: number;
  current: number;
  healthPercentage: number;
  machineType?: string;
}

export default function DigitalTwin({
  temperature,
  vibration,
  current,
  healthPercentage,
  machineType = "Industrial Pump"
}: DigitalTwinProps) {
  // Defensive: fallback to 0 if undefined
  const safeTemperature = typeof temperature === "number" ? temperature : 0;
  const safeVibration = typeof vibration === "number" ? vibration : 0;
  const safeCurrent = typeof current === "number" ? current : 0;
  const safeHealth = typeof healthPercentage === "number" ? healthPercentage : 0;
  // Determine component states based on sensor values
  const isBearingCritical = vibration > 6.0;
  const isBearingWarning = vibration > 4.5 && !isBearingCritical;
  const isMotorCritical = temperature > 90;
  const isMotorWarning = temperature > 75 && !isMotorCritical;
  const isShaftCritical = current > 24;
  const isShaftWarning = current > 20 && !isShaftCritical;

  const getColor = (warning: boolean, critical: boolean) => {
    if (critical) return "#ef4444"; // red-500
    if (warning) return "#f59e0b"; // amber-500
    return "#22c55e"; // green-500
  };

  const getGlowFilter = (warning: boolean, critical: boolean) => {
    if (critical) return "url(#criticalGlow)";
    if (warning) return "url(#warningGlow)";
    return "none";
  };

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <h3 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
        <Cpu className="h-4 w-4 text-primary" />
        Digital Twin - {machineType}
      </h3>

      {/* SVG Machine Schematic */}
      <div className="relative bg-secondary/30 rounded-lg p-4 flex items-center justify-center">
        <svg
          viewBox="0 0 400 200"
          className="w-full max-w-md h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Filters for glow effects */}
          <defs>
            <filter id="criticalGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="warningGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base/Frame */}
          <rect x="50" y="150" width="300" height="20" rx="3" fill="#374151" />
          <rect x="70" y="140" width="30" height="15" fill="#4b5563" />
          <rect x="300" y="140" width="30" height="15" fill="#4b5563" />

          {/* Motor Housing */}
          <motion.rect
            x="60"
            y="60"
            width="120"
            height="80"
            rx="5"
            fill={getColor(isMotorWarning, isMotorCritical)}
            filter={getGlowFilter(isMotorWarning, isMotorCritical)}
            animate={{
              opacity: isMotorCritical ? [1, 0.7, 1] : 1
            }}
            transition={{
              duration: 0.5,
              repeat: isMotorCritical ? Infinity : 0
            }}
          />
          <text x="120" y="105" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
            MOTOR
          </text>
          <text x="120" y="120" textAnchor="middle" fill="white" fontSize="10">
            {safeTemperature.toFixed(1)}
          </text>

          {/* Shaft/Coupling */}
          <motion.rect
            x="180"
            y="85"
            width="60"
            height="30"
            rx="4"
            fill={getColor(isShaftWarning, isShaftCritical)}
            filter={getGlowFilter(isShaftWarning, isShaftCritical)}
            animate={{
              opacity: isShaftCritical ? [1, 0.7, 1] : 1
            }}
            transition={{
              duration: 0.5,
              repeat: isShaftCritical ? Infinity : 0
            }}
          />
          <text x="210" y="105" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
            SHAFT
          </text>

          {/* Bearing Section */}
          <motion.circle
            cx="260"
            cy="100"
            r="20"
            fill={getColor(isBearingWarning, isBearingCritical)}
            filter={getGlowFilter(isBearingWarning, isBearingCritical)}
            animate={{
              scale: isBearingCritical ? [1, 1.1, 1] : 1,
              opacity: isBearingCritical ? [1, 0.7, 1] : 1
            }}
            transition={{
              duration: 0.3,
              repeat: isBearingCritical ? Infinity : 0
            }}
          />
          <text x="260" y="104" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            BRG
          </text>

          {/* Pump/Impeller Housing */}
          <rect x="280" y="50" width="80" height="100" rx="5" fill="#6b7280" />
          <circle cx="320" cy="100" r="30" fill="#4b5563" stroke="#9ca3af" strokeWidth="2" />
          
          {/* Impeller */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "320px 100px" }}
          >
            <rect x="310" y="70" width="20" height="8" rx="1" fill="#d1d5db" />
            <rect x="310" y="122" width="20" height="8" rx="1" fill="#d1d5db" />
            <rect x="290" y="95" width="8" height="20" rx="1" fill="#d1d5db" style={{ transform: "rotate(90deg)", transformOrigin: "294px 105px" }} />
          </motion.g>

          {/* Inlet/Outlet Pipes */}
          <rect x="360" y="70" width="30" height="20" fill="#4b5563" />
          <rect x="360" y="110" width="30" height="20" fill="#4b5563" />
          <text x="375" y="84" textAnchor="middle" fill="#9ca3af" fontSize="8">IN</text>
          <text x="375" y="124" textAnchor="middle" fill="#9ca3af" fontSize="8">OUT</text>

          {/* Current/Load indicator on motor */}
          <text x="120" y="135" textAnchor="middle" fill="white" fontSize="9">
            {safeCurrent.toFixed(1)}A
          </text>

          {/* Vibration indicator on bearing */}
          <text x="260" y="135" textAnchor="middle" fill="#9ca3af" fontSize="8">
            {safeVibration.toFixed(1)} mm/s
          </text>
        </svg>
      </div>

      {/* Component Status Legend */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className={`p-2 rounded-lg text-center ${
          isMotorCritical ? "bg-red-500/20 text-red-400" :
          isMotorWarning ? "bg-yellow-500/20 text-yellow-400" :
          "bg-green-500/20 text-green-400"
        }`}>
          <div className="font-semibold">Motor Core</div>
          <div>{safeTemperature.toFixed(1)}</div>
        </div>
        <div className={`p-2 rounded-lg text-center ${
          isShaftCritical ? "bg-red-500/20 text-red-400" :
          isShaftWarning ? "bg-yellow-500/20 text-yellow-400" :
          "bg-green-500/20 text-green-400"
        }`}>
          <div className="font-semibold">Shaft Load</div>
          <div>{safeCurrent.toFixed(1)}A</div>
        </div>
        <div className={`p-2 rounded-lg text-center ${
          isBearingCritical ? "bg-red-500/20 text-red-400" :
          isBearingWarning ? "bg-yellow-500/20 text-yellow-400" :
          "bg-green-500/20 text-green-400"
        }`}>
          <div className="font-semibold">Bearing</div>
          <div>{safeVibration.toFixed(1)} mm/s</div>
        </div>
      </div>

      {/* Overall Health */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
        <span className="text-xs text-muted-foreground">Overall Health</span>
        <span className={`font-mono text-sm font-bold ${
          safeHealth >= 70 ? "text-green-400" :
          safeHealth >= 40 ? "text-yellow-400" :
          "text-red-400"
        }`}>
          {safeHealth.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

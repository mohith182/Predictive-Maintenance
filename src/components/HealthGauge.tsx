import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface HealthGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

const HealthGauge = ({ score, size = 180, label }: HealthGaugeProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius * 0.75; // 270 degrees
  const offset = circumference - (animatedScore / 100) * circumference;

  const getColor = (s: number) => {
    if (s > 70) return { stroke: "hsl(var(--success))", class: "text-success text-glow-primary", glow: "glow-success" };
    if (s >= 40) return { stroke: "hsl(var(--warning))", class: "text-warning text-glow-warning", glow: "glow-warning" };
    return { stroke: "hsl(var(--destructive))", class: "text-destructive text-glow-danger", glow: "glow-danger" };
  };

  const colorInfo = getColor(score);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size * 0.85 }}>
        <svg
          width={size}
          height={size * 0.85}
          viewBox={`0 0 ${size} ${size * 0.85}`}
          className="overflow-visible"
        >
          {/* Background arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />
          {/* Active arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorInfo.stroke}
            strokeWidth={8}
            strokeDasharray={circumference}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${colorInfo.stroke})` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-mono text-3xl font-bold ${colorInfo.class}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {animatedScore}%
          </motion.span>
          {label && (
            <span className="text-xs text-muted-foreground mt-1">{label}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthGauge;

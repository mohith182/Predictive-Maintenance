import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { SensorReading } from "@/lib/api";

interface SensorChartProps {
  data: SensorReading[];
  dataKey: keyof SensorReading;
  label: string;
  unit: string;
  color: string;
  glowClass?: string;
  isLive?: boolean;
}

const SensorChart = ({ data, dataKey, label, unit, color, glowClass = "", isLive = false }: SensorChartProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every second for live display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get current IST time
  const getISTTime = (date: Date) => {
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utcTime + (5.5 * 60 * 60 * 1000));
  };

  // Transform data to show current time at the end
  // Each data point represents 1 hour interval, ending at current time
  const transformedData = data.slice(-24).map((reading, index, arr) => {
    const hoursAgo = arr.length - 1 - index;
    const timestamp = new Date(currentTime.getTime() - hoursAgo * 3600000);
    return {
      ...reading,
      timestamp: timestamp.toISOString(),
    };
  });

  // Convert to IST (Indian Standard Time = UTC+5:30)
  const formatTimeIST = (ts: string) => {
    const d = new Date(ts);
    const istTime = getISTTime(d);
    
    const hours = istTime.getHours().toString().padStart(2, "0");
    const minutes = istTime.getMinutes().toString().padStart(2, "0");
    const seconds = istTime.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // Get current IST time for live display
  const getCurrentIST = () => {
    const istTime = getISTTime(currentTime);
    
    const hours = istTime.getHours().toString().padStart(2, "0");
    const minutes = istTime.getMinutes().toString().padStart(2, "0");
    const seconds = istTime.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass rounded-lg px-3 py-2 font-mono text-xs">
        <span className="text-foreground">{payload[0].value} {unit}</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-4 ${glowClass}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </h4>
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] text-green-500 font-mono uppercase">Live</span>
              <span className="text-[10px] text-green-400 font-mono ml-1">IST {getCurrentIST()}</span>
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={transformedData}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTimeIST}
            tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(215 15% 55%)" }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#gradient-${dataKey})`}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default SensorChart;

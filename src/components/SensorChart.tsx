import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import type { SensorReading } from "@/lib/mockData";

interface SensorChartProps {
  data: SensorReading[];
  dataKey: keyof SensorReading;
  label: string;
  unit: string;
  color: string;
  glowClass?: string;
}

const SensorChart = ({ data, dataKey, label, unit, color, glowClass = "" }: SensorChartProps) => {
  const last24 = data.slice(-24);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:00`;
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
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h4>
        <span className="font-mono text-sm font-bold" style={{ color }}>
          {last24[last24.length - 1]?.[dataKey]} {unit}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={last24}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
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

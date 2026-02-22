import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "../lib/utils";

interface ScoreGaugeProps {
  score: number;
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const data = [
    { name: "AI", value: score },
    { name: "Human", value: 100 - score },
  ];

  // Color logic: 
  // High AI score -> Red/Orange
  // Low AI score -> Green/Blue
  const getColor = (s: number) => {
    if (s < 30) return "#10b981"; // Green
    if (s < 70) return "#f59e0b"; // Yellow/Orange
    return "#ef4444"; // Red
  };

  const color = getColor(score);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell key="cell-0" fill={color} />
            <Cell key="cell-1" fill="#27272a" /> {/* zinc-800 */}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={cn("text-4xl font-bold font-mono tracking-tighter", {
            "text-emerald-500": score < 30,
            "text-amber-500": score >= 30 && score < 70,
            "text-red-500": score >= 70,
        })}>
          {score}%
        </span>
        <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium mt-1">
          AI Score
        </span>
      </div>
    </div>
  );
}

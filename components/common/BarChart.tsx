import React from 'react';

interface BarChartData {
  label: string;
  value: number;
  maxValue?: number;
}

interface BarChartProps {
  data: BarChartData[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      {data.map(({ label, value, maxValue = 20 }) => {
        const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
        return (
          <div key={label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <span className="text-sm font-bold text-royal-blue">{value.toFixed(2)} / {maxValue}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="bg-royal-blue h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;

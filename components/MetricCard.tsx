import React from 'react';

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, description }) => {
  // Determine color based on value
  const getColor = (val: number) => {
    if (val >= 80) return 'text-lime-400';
    if (val >= 60) return 'text-zinc-300';
    return 'text-zinc-500';
  };

  const getBarColor = (val: number) => {
    if (val >= 80) return 'bg-lime-400';
    if (val >= 60) return 'bg-zinc-400';
    return 'bg-zinc-600';
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-lime-400/40 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-zinc-950 rounded-lg text-zinc-400">
          {icon}
        </div>
        <span className={`text-2xl font-bold ${getColor(value)}`}>{value}</span>
      </div>
      <h3 className="text-white font-semibold mb-1">{label}</h3>
      <p className="text-xs text-zinc-500 mb-4 h-8 overflow-hidden">{description}</p>
      
      <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full ${getBarColor(value)} transition-all duration-1000 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

export default MetricCard;
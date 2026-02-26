import { energyInfo } from '../../utils/formatters';

export default function EnergyMeter({ level, compact = false }) {
  const { color, bg, label, emoji } = energyInfo(level);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} ${bg} px-2 py-0.5 rounded-full`}>
        {emoji} {label}
      </span>
    );
  }

  const percent = level === 'relaxed' ? 33 : level === 'moderate' ? 66 : 100;
  const barColor = level === 'relaxed' ? 'bg-green-400' : level === 'moderate' ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-300 font-medium">Energy Level</span>
        <span className={`font-semibold ${color}`}>
          {emoji} {label}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

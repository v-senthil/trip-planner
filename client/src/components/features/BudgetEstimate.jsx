import { useMemo } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function BudgetEstimate({ days, currency, convertedCurrency }) {
  const budget = useMemo(() => {
    if (!days?.length) return null;

    let total = 0;
    const breakdown = { food: 0, transport: 0, activities: 0 };
    let daysWithBudget = 0;

    for (const day of days) {
      if (day.estimatedBudget?.amount) {
        total += day.estimatedBudget.amount;
        daysWithBudget++;
        if (day.estimatedBudget.breakdown) {
          breakdown.food += day.estimatedBudget.breakdown.food || 0;
          breakdown.transport += day.estimatedBudget.breakdown.transport || 0;
          breakdown.activities += day.estimatedBudget.breakdown.activities || 0;
        }
      }
    }

    return { total, breakdown, daysWithBudget, avg: daysWithBudget > 0 ? total / daysWithBudget : 0 };
  }, [days]);

  if (!budget || budget.daysWithBudget === 0) {
    return (
      <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40">
        <h3 className="font-semibold text-gray-900 dark:text-white">💰 Budget Estimate</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Budget data will appear after trip generation.</p>
      </div>
    );
  }

  const categories = [
    { key: 'food', label: '🍽️ Food', color: 'bg-orange-400' },
    { key: 'transport', label: '🚗 Transport', color: 'bg-blue-400' },
    { key: 'activities', label: '🎯 Activities', color: 'bg-purple-400' },
  ];

  return (
    <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">💰 Budget Estimate</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {formatCurrency(budget.total, currency, convertedCurrency)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ~{formatCurrency(Math.round(budget.avg), currency, convertedCurrency)}/day
          </p>
        </div>
        <TrendingUp className="w-8 h-8 text-green-400" />
      </div>

      {/* Breakdown bar */}
      <div className="mt-4">
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
          {categories.map((cat) => {
            const percent = budget.total > 0 ? (budget.breakdown[cat.key] / budget.total) * 100 : 0;
            return percent > 0 ? (
              <div
                key={cat.key}
                className={`${cat.color}`}
                style={{ width: `${percent}%` }}
                title={`${cat.label}: ${budget.breakdown[cat.key]}`}
              />
            ) : null;
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-3">
          {categories.map((cat) => (
            <span key={cat.key} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
              {cat.label}: {formatCurrency(budget.breakdown[cat.key], currency, convertedCurrency)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

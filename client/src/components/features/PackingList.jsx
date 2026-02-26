import { useEffect } from 'react';
import useTripStore from '../../store/tripStore';
import Modal from '../ui/Modal';
import { Skeleton } from '../ui/LoadingSkeleton';

const CATEGORY_ICONS = {
  essentials: '🎒',
  clothing: '👕',
  toiletries: '🧴',
  electronics: '🔌',
  documents: '📄',
  activitySpecific: '🎯',
  culturalNotes: '🙏',
  tips: '💡',
};

export default function PackingList({ onClose }) {
  const { packingList, generatePackingList, isLoading } = useTripStore();

  useEffect(() => {
    if (!packingList) {
      generatePackingList();
    }
  }, []);

  return (
    <Modal isOpen onClose={onClose} title="🎒 AI Packing List" maxWidth="max-w-2xl">
      {isLoading || !packingList ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(packingList).map(([category, items]) => {
            if (!Array.isArray(items) || items.length === 0) return null;
            const icon = CATEGORY_ICONS[category] || '📦';
            const label = category.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

            return (
              <div key={category}>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {icon} {label}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-1.5 rounded-lg"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

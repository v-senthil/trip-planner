import { useEffect } from 'react';
import useTripStore from '../../store/tripStore';
import Modal from '../ui/Modal';
import { Skeleton } from '../ui/LoadingSkeleton';

export default function TransportGuide({ onClose }) {
  const { transportGuide, fetchTransportGuide, isLoading } = useTripStore();

  useEffect(() => {
    if (!transportGuide) {
      fetchTransportGuide();
    }
  }, []);

  return (
    <Modal isOpen onClose={onClose} title="🚌 Local Transport Guide" maxWidth="max-w-2xl">
      {isLoading || !transportGuide ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {transportGuide.overview && (
            <p className="text-gray-600 dark:text-gray-300">{transportGuide.overview}</p>
          )}

          {transportGuide.options?.map((option, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {option.type === 'metro' ? '🚇' :
                   option.type === 'bus' ? '🚌' :
                   option.type === 'taxi' ? '🚕' :
                   option.type === 'bike' ? '🚲' :
                   option.type === 'walk' ? '🚶' : '🚗'}
                </span>
                <h4 className="font-semibold text-gray-900 dark:text-white">{option.name || option.type}</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{option.description}</p>
              {option.cost && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">💰 {option.cost}</p>
              )}
              {option.app && (
                <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">📱 App: {option.app}</p>
              )}
              {option.tips && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{option.tips}</p>
              )}
            </div>
          ))}

          {transportGuide.airportTransfer && (
            <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">✈️ Airport Transfer</h4>
              {transportGuide.airportTransfer.options?.map((opt, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-300">• {opt}</p>
              ))}
              {transportGuide.airportTransfer.estimatedCost && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  💰 {transportGuide.airportTransfer.estimatedCost} · ⏱️ {transportGuide.airportTransfer.estimatedTime}
                </p>
              )}
            </div>
          )}

          {transportGuide.tips?.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💡 Tips</h4>
              {transportGuide.tips.map((tip, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-300 mt-1">• {tip}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

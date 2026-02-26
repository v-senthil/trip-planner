import { clsx } from 'clsx';

export default function Card({ children, className, hover = true, ...props }) {
  return (
    <div
      className={clsx(
        'card p-6',
        hover && 'hover:shadow-card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div className={clsx('mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={clsx('font-display font-bold text-lg text-gray-900 dark:text-white', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }) {
  return (
    <p className={clsx('text-sm text-gray-500 dark:text-gray-400 mt-1', className)}>
      {children}
    </p>
  );
}

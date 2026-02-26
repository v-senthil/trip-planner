import { clsx } from 'clsx';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading,
  icon: Icon,
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'bg-red-500 text-white px-5 py-2.5 rounded-xl hover:bg-red-600 transition-colors font-medium',
  };

  const sizes = {
    sm: 'text-sm px-3 py-2',
    md: '',
    lg: 'text-lg px-8 py-4',
  };

  return (
    <button
      className={clsx(variants[variant], sizes[size], className, 'inline-flex items-center gap-2')}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}

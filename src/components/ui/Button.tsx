import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "danger" | "gpay" | "cashfree";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  iconPosition?: "left" | "right";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium border border-transparent disabled:bg-emerald-300 disabled:text-white",
  secondary:
    "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-medium border border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
  outline:
    "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 font-medium disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200",
  ghost:
    "bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-medium border border-transparent disabled:text-slate-400",
  destructive:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-medium border border-transparent disabled:bg-rose-300",
  danger:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-medium border border-transparent disabled:bg-rose-300",
  gpay:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium border border-transparent disabled:bg-blue-300",
  cashfree:
    "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium border border-transparent disabled:bg-amber-300",
};

const sizeStyles = {
  sm: "h-8 px-2.5 text-xs rounded-md gap-1.5",
  md: "h-9 px-3.5 text-sm rounded-md gap-2",
  lg: "h-10 px-4 text-sm font-semibold rounded-md gap-2",
  icon: "h-9 w-9 p-0 rounded-md justify-center",
};

const iconSizeStyles = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-4 h-4",
  icon: "w-4 h-4",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      loading = false,
      icon,
      iconPosition = "left",
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isSpinning = isLoading || loading;

    // Helper to render icon prop
    const renderIconProp = () => {
      if (!icon) return null;
      if (React.isValidElement(icon)) {
        return icon;
      }
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className={iconSizeStyles[size]} />;
    };

    const effectiveLeftIcon = leftIcon || (icon && iconPosition === "left" ? renderIconProp() : null);
    const effectiveRightIcon = rightIcon || (icon && iconPosition === "right" ? renderIconProp() : null);

    return (
      <button
        ref={ref}
        disabled={disabled || isSpinning}
        className={`inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-1 select-none disabled:pointer-events-none ${
          variantStyles[variant] || variantStyles.primary
        } ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isSpinning ? (
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        ) : (
          effectiveLeftIcon
        )}
        {children}
        {!isSpinning && effectiveRightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;

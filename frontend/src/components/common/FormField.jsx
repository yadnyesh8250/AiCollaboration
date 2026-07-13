import React from "react";

export default function FormField({
  label,
  name,
  type = "text",
  placeholder,
  disabled = false,
  error,
  register,
  className = "",
  inputClassName = "",
  icon,
  plClass = "pl-10",
  iconClass = "left-3",
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className={`absolute inset-y-0 ${iconClass} flex items-center pointer-events-none text-zinc-500`}>
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={`h-10 w-full rounded-lg border bg-zinc-950 py-2 text-sm text-foreground placeholder:text-zinc-500/60 transition-all duration-200 outline-none focus:ring-1 ${
            icon ? `${plClass} pr-3` : "px-3"
          } ${
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/40 bg-destructive/5 text-destructive"
              : "border-zinc-800 focus:border-primary focus:ring-primary/40 shadow-sm focus:shadow-[0_0_12px_rgba(139,92,246,0.15)]"
          } ${inputClassName}`}
          {...(register ? register(name) : {})}
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-destructive transition-all duration-150 animate-in fade-in slide-in-from-top-1">
          {error.message}
        </p>
      )}
    </div>
  );
}

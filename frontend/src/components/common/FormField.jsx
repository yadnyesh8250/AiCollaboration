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
  plClass = "pl-9",
  iconClass = "left-3",
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block select-none">
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
          className={`h-9 w-full rounded-lg border text-xs text-foreground placeholder:text-zinc-600/70 transition-all duration-200 outline-none ${
            icon ? `${plClass} pr-3` : "px-3"
          } ${
            error
              ? "border-red-900/50 bg-red-950/10 text-red-400 focus:border-red-800 focus:ring-1 focus:ring-red-900/30"
              : "border-zinc-900 bg-zinc-950/40 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 shadow-sm"
          } ${inputClassName}`}
          {...props}
          {...(register ? register(name) : {})}
        />
      </div>
      {error && (
        <p className="text-[10px] font-semibold text-red-400 transition-all duration-150 animate-in fade-in slide-in-from-top-1">
          {error.message}
        </p>
      )}
    </div>
  );
}

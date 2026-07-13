import React, { useRef } from "react";

export default function OtpInputGroup({ value = "", onChange, onComplete, disabled = false, error }) {
  const length = 6;
  const inputRefs = useRef([]);

  const otpArray = value.split("").concat(Array(length).fill("")).slice(0, length);

  const handleTextChange = (e, index) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) return;

    const newOtp = [...otpArray];
    newOtp[index] = val.substring(val.length - 1);
    const updatedValue = newOtp.join("");
    onChange(updatedValue);

    // Auto-focus next input box
    if (index < length - 1 && updatedValue.length > index) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on 6th digit
    if (updatedValue.length === length) {
      onComplete?.(updatedValue);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otpArray[index] && index > 0) {
        const newOtp = [...otpArray];
        newOtp[index - 1] = "";
        onChange(newOtp.join(""));
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otpArray];
        newOtp[index] = "";
        onChange(newOtp.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      if (pastedData.length === length) {
        onComplete?.(pastedData);
      } else {
        const focusIndex = Math.min(pastedData.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-2" onPaste={handlePaste}>
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            ref={(el) => (inputRefs.current[index] = el)}
            value={otpArray[index]}
            onChange={(e) => handleTextChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`h-12 w-12 rounded-lg border bg-zinc-950 text-center text-lg font-bold text-foreground transition-all duration-200 outline-none focus:ring-1 ${
              error
                ? "border-destructive focus:border-destructive focus:ring-destructive/40 bg-destructive/5 text-destructive"
                : "border-zinc-800 focus:border-primary focus:ring-primary/40 focus:shadow-[0_0_12px_rgba(139,92,246,0.15)]"
            }`}
          />
        ))}
      </div>
      {error && (
        <p className="text-center text-xs font-medium text-destructive transition-all duration-150 animate-in fade-in">
          {error}
        </p>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import OtpInputGroup from "../../components/auth/OtpInputGroup";
import { Alert, AlertDescription } from "../../components/ui/alert";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const verifyCode = async (verificationCode) => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      if (verificationCode === "111111") {
        throw new Error("Invalid verification code. Please try again.");
      }

      setSuccessMsg("Email successfully verified.");
      setTimeout(() => {
        navigate("/create-org");
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || "Failed to verify email. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (code.length === 6) {
      verifyCode(code);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMsg("A fresh 6-digit security code has been sent to your inbox.");
    } catch (err) {
      setErrorMsg("Failed to resend code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Verify your Email
        </h3>
        <p className="text-xs text-zinc-500">
          Enter the 6-digit verification code sent to your inbox
        </p>
      </div>

      {successMsg && (
        <Alert className="border-emerald-500 bg-emerald-500/10 text-emerald-500 animate-in zoom-in-95 duration-200">
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex justify-center">
          <OtpInputGroup
            value={code}
            onChange={(val) => {
              setCode(val);
              if (errorMsg) setErrorMsg("");
            }}
            onComplete={(completedCode) => verifyCode(completedCode)}
            disabled={isLoading}
            error={errorMsg}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            "Verify Email"
          )}
        </button>
      </form>

      <div className="text-center text-xs text-zinc-500">
        Didn't receive the code?{" "}
        <button
          onClick={handleResend}
          disabled={isLoading}
          className="font-semibold text-primary hover:underline hover:text-primary/90 transition-colors disabled:opacity-50 cursor-pointer bg-transparent border-0 p-0"
        >
          Resend code
        </button>
      </div>
    </div>
  );
}

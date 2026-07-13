import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link } from "react-router-dom";
import { authService } from "../../features/auth/services/authService";
import FormField from "../../components/common/FormField";
import { Alert, AlertDescription } from "../../components/ui/alert";

const schema = zod.object({
  email: zod.string().min(1, "Email is required").email("Invalid email format"),
});

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await authService.forgotPassword(data.email);
      setSuccessMsg("If your account exists, a reset link has been dispatched to your email inbox.");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Something went wrong. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Reset Password
        </h3>
        <p className="text-xs text-zinc-500">
          Enter your email and we'll send you a password recovery link
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

      {!successMsg && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Email Address"
            name="email"
            type="email"
            placeholder="name@example.com"
            disabled={isLoading}
            error={errors.email}
            register={register}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            }
          />

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      )}

      <div className="text-center text-xs text-zinc-500">
        Remember your password?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
}

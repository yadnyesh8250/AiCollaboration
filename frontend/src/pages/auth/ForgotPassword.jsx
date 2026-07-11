import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link } from "react-router-dom";
import { authService } from "../../features/auth/services/authService";
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
      // Treat as success or fallback depending on preference, but display error if explicitly failed
      setErrorMsg(err.response?.data?.message || "Something went wrong. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          Reset Password
        </h3>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a password recovery link
        </p>
      </div>

      {successMsg && (
        <Alert className="border-emerald-500 bg-emerald-500/10 text-emerald-500">
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {!successMsg && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              disabled={isLoading}
              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
                errors.email
                  ? "border-destructive focus:ring-destructive"
                  : "border-border focus:border-primary focus:ring-primary"
              }`}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform duration-150 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

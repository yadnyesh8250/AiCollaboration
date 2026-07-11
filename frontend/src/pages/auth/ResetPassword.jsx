import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "../../features/auth/services/authService";
import { Alert, AlertDescription } from "../../components/ui/alert";

const schema = zod
  .object({
    password: zod.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: zod.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data) => {
    if (!token) {
      setErrorMsg("Missing or invalid security token. Please request a new link.");
      return;
    }
    setIsLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await authService.resetPassword(token, data.password);
      setSuccessMsg("Your password has been successfully updated.");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Reset request failed. Link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          Set New Password
        </h3>
        <p className="text-sm text-muted-foreground">
          Create a secure password containing at least 6 characters
        </p>
      </div>

      {successMsg && (
        <Alert className="border-emerald-500 bg-emerald-500/10 text-emerald-500">
          <AlertDescription>
            {successMsg} Redirecting to login in 3 seconds...
          </AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {!token && (
        <Alert variant="destructive">
          <AlertDescription>
            No password reset token was detected in your URL request.
          </AlertDescription>
        </Alert>
      )}

      {!successMsg && token && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
                errors.password
                  ? "border-destructive focus:ring-destructive"
                  : "border-border focus:border-primary focus:ring-primary"
              }`}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs font-medium text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
                errors.confirmPassword
                  ? "border-destructive focus:ring-destructive"
                  : "border-border focus:border-primary focus:ring-primary"
              }`}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs font-medium text-destructive">
                {errors.confirmPassword.message}
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
              "Save Password"
            )}
          </button>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Back to{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

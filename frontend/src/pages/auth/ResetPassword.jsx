import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "../../features/auth/services/authService";
import FormField from "../../components/common/FormField";
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
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Set New Password
        </h3>
        <p className="text-xs text-zinc-500">
          Create a secure password containing at least 6 characters
        </p>
      </div>

      {successMsg && (
        <Alert className="border-emerald-500 bg-emerald-500/10 text-emerald-500 animate-in zoom-in-95 duration-200">
          <AlertDescription>
            {successMsg} Redirecting to login in 3 seconds...
          </AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
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
          <FormField
            label="New Password"
            name="password"
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            error={errors.password}
            register={register}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.25 0h13.5m-13.5 0a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25M10.5 15h3" />
              </svg>
            }
          />

          <FormField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            error={errors.confirmPassword}
            register={register}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.25 0h13.5m-13.5 0a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25M10.5 15h3" />
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
              "Save Password"
            )}
          </button>
        </form>
      )}

      <div className="text-center text-xs text-zinc-500">
        Back to{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
}

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link } from "react-router-dom";
import { useAuthMutations } from "../../features/auth/hooks/useAuthMutations";
import { Alert, AlertDescription } from "../../components/ui/alert";

// Zod Validation Schema
const loginSchema = zod.object({
  emailOrUsername: zod.string().min(1, "Email or Username is required"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const { login, isLoggingIn, loginError } = useAuthMutations();
  
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: "",
      password: "",
    },
  });

  const onSubmit = (data) => {
    login({ emailOrUsername: data.emailOrUsername, password: data.password });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h3>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to sign in to your workspace
        </p>
      </div>

      {loginError && (
        <Alert variant="destructive">
          <AlertDescription>
            {loginError.response?.data?.message || "Invalid credentials."}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email or Username Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Email or Username
          </label>
          <input
            type="text"
            placeholder="name@example.com or username"
            disabled={isLoggingIn}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
              errors.emailOrUsername
                ? "border-destructive focus:ring-destructive"
                : "border-border focus:border-primary focus:ring-primary"
            }`}
            {...registerField("emailOrUsername")}
          />
          {errors.emailOrUsername && (
            <p className="text-xs font-medium text-destructive">
              {errors.emailOrUsername.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            disabled={isLoggingIn}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
              errors.password
                ? "border-destructive focus:ring-destructive"
                : "border-border focus:border-primary focus:ring-primary"
            }`}
            {...registerField("password")}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoggingIn}
          className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform duration-150 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoggingIn ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}

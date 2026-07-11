import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link } from "react-router-dom";
import { useAuthMutations } from "../../features/auth/hooks/useAuthMutations";
import { Alert, AlertDescription } from "../../components/ui/alert";

// Zod Validation Schema matching backend schema
const registerSchema = zod.object({
  email: zod.string().min(1, "Email is required").email("Invalid email format"),
  username: zod
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_\-]+$/, "Only letters, numbers, underscores, and hyphens are allowed"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

export default function Register() {
  const { register, isRegistering, registerError } = useAuthMutations();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const onSubmit = (data) => {
    register(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          Create an account
        </h3>
        <p className="text-sm text-muted-foreground">
          Bootstrap your collaboration profile to get started
        </p>
      </div>

      {registerError && (
        <Alert variant="destructive">
          <AlertDescription>
            {registerError.response?.data?.message || "Registration failed. Try again."}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            placeholder="name@example.com"
            disabled={isRegistering}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
              errors.email
                ? "border-destructive focus:ring-destructive"
                : "border-border focus:border-primary focus:ring-primary"
            }`}
            {...registerField("email")}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Username Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Username
          </label>
          <input
            type="text"
            placeholder="johndoe"
            disabled={isRegistering}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
              errors.username
                ? "border-destructive focus:ring-destructive"
                : "border-border focus:border-primary focus:ring-primary"
              }`}
            {...registerField("username")}
          />
          {errors.username && (
            <p className="text-xs font-medium text-destructive">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            disabled={isRegistering}
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
          disabled={isRegistering}
          className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform duration-150 disabled:pointer-events-none disabled:opacity-50"
        >
          {isRegistering ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

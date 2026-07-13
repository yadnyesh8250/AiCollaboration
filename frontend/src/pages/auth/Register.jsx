import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link } from "react-router-dom";
import { useAuthMutations } from "../../features/auth/hooks/useAuthMutations";
import FormField from "../../components/common/FormField";
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
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (registerError) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 400);
      return () => clearTimeout(timer);
    }
  }, [registerError]);

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
    <div className={`space-y-6 ${isShaking ? "animate-shake" : ""}`}>
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Create an Account
        </h3>
        <p className="text-xs text-zinc-500">
          Bootstrap your collaboration profile to get started
        </p>
      </div>

      {registerError && (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <AlertDescription>
            {registerError.response?.data?.message || "Registration failed. Please check your fields."}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <FormField
          label="Email Address"
          name="email"
          type="email"
          placeholder="name@example.com"
          disabled={isRegistering}
          error={errors.email}
          register={registerField}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          }
        />

        {/* Username Field */}
        <FormField
          label="Username"
          name="username"
          placeholder="johndoe"
          disabled={isRegistering}
          error={errors.username}
          register={registerField}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          }
        />

        {/* Password Field */}
        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          disabled={isRegistering}
          error={errors.password}
          register={registerField}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.25 0h13.5m-13.5 0a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25M10.5 15h3" />
            </svg>
          }
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isRegistering}
          className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {isRegistering ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="text-center text-xs text-zinc-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link } from "react-router-dom";
import { useAuthMutations } from "../../features/auth/hooks/useAuthMutations";
import FormField from "../../components/common/FormField";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { useGoogleLogin } from "@react-oauth/google";
import aCollabLogo from "../../assets/logo.png";

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
  const { register, isRegistering, registerError, googleLogin, isGoogleLoggingIn, googleLoginError } = useAuthMutations();
  const [isShaking, setIsShaking] = useState(false);

  const handleGoogleSuccess = async (tokenResponse) => {
    googleLogin({ accessToken: tokenResponse.access_token });
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (error) => console.error("Google Signup failed:", error)
  });

  const handleGithubLogin = () => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
    window.location.href = `${apiBase}/auth/github`;
  };

  const activeError = registerError || googleLoginError;

  useEffect(() => {
    if (activeError) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 400);
      return () => clearTimeout(timer);
    }
  }, [activeError]);

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
      {/* Brand Header */}
      <div className="flex flex-col items-center space-y-2 text-center select-none">
        <img src={aCollabLogo} alt="A-Collab Logo" className="h-10 w-10 object-contain shadow-sm rounded-xl" />
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 pt-2">
          Create an account
        </h3>
        <p className="text-[11px] text-zinc-400 font-medium">
          Get started with A-Collab platform today
        </p>
      </div>

      {activeError && (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <AlertDescription>
            {activeError.response?.data?.message || "Registration or login failed. Please check your fields."}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Email Address"
          name="email"
          type="email"
          placeholder="name@example.com"
          disabled={isRegistering}
          error={errors.email}
          register={registerField}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5 text-zinc-650 ml-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          }
        />

        <FormField
          label="Username"
          name="username"
          placeholder="johndoe"
          disabled={isRegistering}
          error={errors.username}
          register={registerField}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5 text-zinc-650 ml-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          }
        />

        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          disabled={isRegistering}
          error={errors.password}
          register={registerField}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5 text-zinc-650 ml-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.25 0h13.5m-13.5 0a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25M10.5 15h3" />
            </svg>
          }
        />

        <button
          type="submit"
          disabled={isRegistering}
          className="flex h-9 w-full items-center justify-center rounded-lg bg-primary text-xs font-bold text-white hover:bg-primary-dark transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {isRegistering ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* OAuth dividers */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="h-px bg-zinc-200 flex-1" />
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">or sign up with</span>
          <div className="h-px bg-zinc-200 flex-1" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button 
            type="button"
            onClick={() => handleGoogleLogin()}
            disabled={isGoogleLoggingIn || isRegistering}
            className="flex items-center justify-center h-9 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white transition-all cursor-pointer text-zinc-650 hover:text-zinc-900 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            {isGoogleLoggingIn ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            )}
          </button>
          <button 
            type="button"
            onClick={handleGithubLogin}
            disabled={isGoogleLoggingIn || isRegistering}
            className="flex items-center justify-center h-9 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white transition-all cursor-pointer text-zinc-650 hover:text-zinc-900 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </button>
          <button type="button" className="flex items-center justify-center h-9 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white transition-all cursor-pointer text-zinc-650 hover:text-zinc-900 shadow-sm">
            <svg className="h-4 w-4" viewBox="0 0 23 23" fill="currentColor">
              <path d="M0 0h11v11H0z" fill="#F25022"/>
              <path d="M12 0h11v11H12z" fill="#7FBA00"/>
              <path d="M0 12h11v11H0z" fill="#00A4EF"/>
              <path d="M12 12h11v11H12z" fill="#FFB900"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-zinc-500">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-primary hover:underline transition-all">
          Sign in
        </Link>
      </div>
    </div>
  );
}

import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../services/api/client";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      console.error("Missing OAuth tokens");
      navigate("/login", { replace: true });
      return;
    }

    const processLogin = async () => {
      try {
        // 1. Save tokens to Zustand store
        setTokens(accessToken, refreshToken);
        
        // 2. Fetch user profile from backend
        const meRes = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        // 3. Save profile
        setUser(meRes.data.user);
        
        // 4. Route to root/dashboard
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Failed to load user profile during OAuth login:", err);
        navigate("/login", { replace: true });
      }
    };

    processLogin();
  }, [searchParams, navigate, setTokens, setUser]);

  return (
    <div className="h-screen w-screen bg-zinc-50 flex flex-col items-center justify-center space-y-4">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent z-10" />
      </div>
      <p className="text-xs text-zinc-400 font-semibold animate-pulse">Syncing authentication credentials...</p>
    </div>
  );
}

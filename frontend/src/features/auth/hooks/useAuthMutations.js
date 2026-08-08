import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";
import { authService } from "../services/authService";
import { disconnectSocket } from "../../../services/socket/connection";

export function useAuthMutations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setTokens, setUser, clearAuth, refreshToken } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: ({ emailOrUsername, password }) =>
      authService.login(emailOrUsername, password),
    onSuccess: (data) => {
      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        if (data.user) {
          setUser(data.user);
        }
        queryClient.invalidateQueries();
        navigate("/", { replace: true });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({ email, username, password }) =>
      authService.register(email, username, password),
    onSuccess: (data) => {
      // Auto login by directly saving the tokens and user profile returned in the registration payload
      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        if (data.user) {
          setUser(data.user);
        }
        queryClient.invalidateQueries();
        navigate("/", { replace: true });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(refreshToken),
    onSuccess: () => {
      disconnectSocket();
      clearAuth();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
    onError: () => {
      disconnectSocket();
      clearAuth();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: ({ credential, accessToken }) =>
      authService.googleLogin(credential, accessToken),
    onSuccess: (data) => {
      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        if (data.user) {
          setUser(data.user);
        }
        queryClient.invalidateQueries();
        navigate("/", { replace: true });
      }
    },
  });

  return {
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    googleLogin: googleLoginMutation.mutate,
    isGoogleLoggingIn: googleLoginMutation.isPending,
    googleLoginError: googleLoginMutation.error,
    
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

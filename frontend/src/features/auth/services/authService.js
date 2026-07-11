import { api } from "../../../services/api/client";

export const authService = {
  async login(emailOrUsername, password) {
    const res = await api.post("/auth/login", { emailOrUsername, password });
    return res.data;
  },

  async register(email, username, password) {
    const res = await api.post("/auth/register", {
      email,
      username,
      password,
    });
    return res.data;
  },

  async logout(refreshToken) {
    const res = await api.post("/auth/logout", { refreshToken });
    return res.data;
  },

  async getCurrentUser() {
    const res = await api.get("/auth/me");
    return res.data;
  },

  async forgotPassword(email) {
    // Mocked on frontend since backend does not support password recovery routes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: "Mock recovery link sent." });
      }, 1000);
    });
  },

  async resetPassword(token, password) {
    // Mocked on frontend since backend does not support password recovery routes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: "Mock password reset completed." });
      }, 1000);
    });
  },
};

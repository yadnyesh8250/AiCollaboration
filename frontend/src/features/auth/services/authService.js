import { api } from "../../../services/api/client";

export const authService = {
  async login(emailOrUsername, password) {
    const res = await api.post("/auth/login", { emailOrUsername, password });
    return res.data;
  },

  async googleLogin(credential, accessToken) {
    const res = await api.post("/auth/google", { credential, accessToken });
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
    // TODO: Connect once backend supports password recovery endpoints
    return Promise.reject(new Error("Password recovery is not supported by the backend yet."));
  },

  async resetPassword(token, password) {
    // TODO: Connect once backend supports password reset endpoints
    return Promise.reject(new Error("Password reset is not supported by the backend yet."));
  },
};

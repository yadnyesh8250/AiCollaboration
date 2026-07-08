import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

const generateAuthTokens = async (userId, deviceInfo = null) => {
  // We need basic user payload for tokens
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const payload = { id: user.id, email: user.email, username: user.username };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user.id }); // only need id in refresh token

  // Save session in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      deviceInfo,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      const field = existing.email === email ? "email" : "username";
      return res.status(409).json({ success: false, message: `A user with this ${field} already exists.` });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
      select: { id: true, email: true, username: true, createdAt: true },
    });

    // Create tokens & session
    const deviceInfo = req.headers["user-agent"];
    const { accessToken, refreshToken } = await generateAuthTokens(user.id, deviceInfo);

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) {
    console.error("[register]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Create tokens & session
    const deviceInfo = req.headers["user-agent"];
    const { accessToken, refreshToken } = await generateAuthTokens(user.id, deviceInfo);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ──────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        email: true, 
        username: true, 
        firstName: true,
        lastName: true,
        bio: true,
        avatarUrl: true,
        status: true,
        createdAt: true 
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("[getMe]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
// POST /api/auth/logout
// ──────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "refreshToken is required." });
    }

    await prisma.session.deleteMany({
      where: { refreshToken },
    });

    return res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    console.error("[logout]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
// POST /api/auth/logout-all  (protected)
// ──────────────────────────────────────────────
export const logoutAll = async (req, res) => {
  try {
    await prisma.session.deleteMany({
      where: { userId: req.user.id },
    });

    return res.status(200).json({ success: true, message: "Logged out from all devices." });
  } catch (err) {
    console.error("[logoutAll]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
// POST /api/auth/refresh
// ──────────────────────────────────────────────
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // 1. Verify token signature & expiry
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
    }

    // 2. Check if it exists in DB and is not expired
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session) {
      return res.status(401).json({ success: false, message: "Session not found or revoked." });
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      return res.status(401).json({ success: false, message: "Session expired." });
    }

    // 3. Issue new access token
    const payload = { 
      id: session.user.id, 
      email: session.user.email, 
      username: session.user.username 
    };
    
    const newAccessToken = signAccessToken(payload);

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });

  } catch (err) {
    console.error("[refresh]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

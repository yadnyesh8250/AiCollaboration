import bcrypt from "bcryptjs";
import prisma from "../config/db.js";

// ──────────────────────────────────────────────
// PATCH /api/users/profile
// ──────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, avatarUrl, username, status } = req.body;
    
    // Optional: check username duplication if they are changing it
    if (username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ success: false, message: "Username is already taken." });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(username !== undefined && { username }),
        ...(status !== undefined && { status }),
      },
      select: { 
        id: true, email: true, username: true, 
        firstName: true, lastName: true, bio: true, 
        avatarUrl: true, status: true, createdAt: true 
      },
    });

    return res.status(200).json({ success: true, message: "Profile updated successfully.", user });
  } catch (err) {
    console.error("[updateProfile]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
// PATCH /api/users/change-password
// ──────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "oldPassword and newPassword are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect old password." });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash }
    });

    // Automatically log out all other devices for security
    // We optionally keep the current session if we pass in a token, but the simplest secure approach is invalidating all or all except current.
    // For now, we clear all sessions, forcing the user to log in again with their new password.
    await prisma.session.deleteMany({
      where: { userId: req.user.id }
    });

    return res.status(200).json({ success: true, message: "Password updated successfully. All sessions revoked." });
  } catch (err) {
    console.error("[changePassword]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

// Layouts
import AuthLayout from "../components/layout/AuthLayout";
import WorkspaceLayout from "../components/layout/WorkspaceLayout";

// Lazy-loaded pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";
import InvitationAcceptance from "../pages/auth/InvitationAcceptance";
import OrganizationCreation from "../pages/auth/OrganizationCreation";
import WorkspaceCreation from "../pages/auth/WorkspaceCreation";
import Dashboard from "../pages/dashboard/Dashboard";

// Workspace sub-pages
import WorkspaceTasks from "../pages/workspace/WorkspaceTasks";
import WorkspaceChat from "../pages/workspace/WorkspaceChat";
import WorkspaceDocs from "../pages/workspace/WorkspaceDocs";
import WorkspaceSettings from "../pages/workspace/WorkspaceSettings";

// Simple Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Simple Public Route wrapper (redirects logged in users to /)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Guest Routes wrapped in AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
      </Route>

      {/* Protected Onboarding Wizard Pages wrapped in AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route
          path="/verify-email"
          element={
            <ProtectedRoute>
              <VerifyEmail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invites/accept"
          element={
            <ProtectedRoute>
              <InvitationAcceptance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-org"
          element={
            <ProtectedRoute>
              <OrganizationCreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-workspace"
          element={
            <ProtectedRoute>
              <WorkspaceCreation />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Protected Dashboard Route redirecting to default workspace */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/workspaces/1" replace />
          </ProtectedRoute>
        }
      />

      {/* Protected Workspace Layout Shell */}
      <Route
        path="/workspaces/:workspaceId"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="tasks" replace />} />
        <Route path="tasks" element={<WorkspaceTasks />} />
        <Route path="chat" element={<WorkspaceChat />} />
        <Route path="docs" element={<WorkspaceDocs />} />
        <Route path="settings" element={<WorkspaceSettings />} />
        
        {/* Wildcard to resolve channels/projects to chat */}
        <Route path="channels/*" element={<WorkspaceChat />} />
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

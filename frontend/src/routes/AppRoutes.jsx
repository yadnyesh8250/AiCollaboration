import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import { api } from "../services/api/client";

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
import WorkspaceHome from "../pages/workspace/WorkspaceHome";

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

// Dynamic workspace redirect component
function WorkspaceRedirect() {
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["allWorkspaces"],
    queryFn: () => api.get("/workspaces").then((res) => res.data.workspaces || []),
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-zinc-500 text-xs font-semibold animate-pulse">Loading workspace portal...</div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <Navigate to="/dashboard" replace />;
  }

  if (workspaces.length === 1) {
    return <Navigate to={`/workspaces/${workspaces[0].id}`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
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

      {/* Workspace Selector Dashboard Portal */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Dashboard Route redirecting to default workspace */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <WorkspaceRedirect />
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
        <Route index element={<WorkspaceHome />} />
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

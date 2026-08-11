# Phase G1: User Journey & Workspace Entry Refactor Report

This report documents the changes implemented during **Phase G1** to refactor workspace entry, invitation declining, route protection, and session handling in **A-Collab**.

---

## 1. Authentication & Session Flow
- **Session Tokens**: Access tokens (JWT) are saved in local storage via Zustand. Silent refresh is handled automatically upon a 401 Unauthorized interceptor response by posting the refresh token to `/api/auth/refresh`.
- **Browser Refresh Protection**: Authenticated state is restored before the React application mounts, preventing users from being redirected to onboarding loops.

---

## 2. Onboarding User Entry Paths (New User Flow)
- **Non-wizard redirection**: A fresh user registering/signing up is redirected to `/dashboard` instead of being locked into organization creation screens.
- **Entry choice list**: lands on `/dashboard` rendering three distinct paths:
  1. **Create Organization**: Redirects to `/create-org`.
  2. **Join Workspace**: Input form validating invitation tokens.
  3. **Accept Invitation**: Displays a list of pending invites with Accept and Decline actions.

---

## 3. Selector Routing Logic (Returning User Flow)
On loading `/`, user workspace lists are checked flat via `/api/workspaces` to resolve entry:
- **Case A (0 workspaces)**: Sends user to `/dashboard`.
- **Case B (1 workspace)**: Directly enters the workspace room at `/workspaces/:workspaceId`.
- **Case C (multiple workspaces)**: Opens the Workspace Selector portal at `/dashboard`.
- **Case D (pending invite + 0 workspaces)**: Opens `/dashboard` to accept or decline the pending invites.

---

## 4. Invitation Accept/Decline Workflows
- **Accept**: Calls `/api/invites/accept`, linking membership to organization and workspaces, then updates states and enters the workspace.
- **Decline**: Added `/api/invites/decline` to mutate status to `DECLINED` in Prisma database tables.

---

## 5. Route Protection & Security
- **403/404 Handling**: If a user attempts to access an unauthorized workspace, `WorkspaceLayout` catches the request error and safely routes them back to `/` to re-resolve their access.
- **Autorization Checks**: Backend routes use the `requireWorkspaceRole` middleware to enforce authority on task mutations, document versions, and chat rooms.

---

## 6. Verification Results
- **Compile Status**: Frontend Vite production compile succeeded cleanly:
  ```bash
  vite build
  ✓ built in 274ms
  ```
- **MySQL Integration**: Validated database records for `WorkspaceInvite` update state to ACCEPTED or DECLINED.

---

## 7. Remaining Backend Limitations
- **General Invite Link**: Joining works exclusively through token invitation matching email recipient targets, preventing public anonymous joining without prior invitations.

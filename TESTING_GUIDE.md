# 🧪 Phase 2 Enterprise Testing Guide

Follow this guide sequentially in Postman to test the full flow of Organizations, Workspaces, Role-Based Access Control (RBAC), and Invitations.

> **Prerequisite:** You need TWO user accounts to test this properly. 
> Use `POST /api/auth/register` twice to create `User A` and `User B`. 
> Log in as `User A` and keep their **Bearer Token** in your Authorization tab for Steps 1-4.

---

### Step 1: Create an Organization (User A)
This tests the auto-creation of `OrganizationMember` and the `AuditLog`.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/organizations`
- **Body (JSON):**
  ```json
  {
    "name": "Global Corp",
    "slug": "global-corp",
    "description": "An enterprise test org"
  }
  ```
> 📝 **Action:** Copy the `organization.id` from the response (referred to as `<ORG_ID>`).

---

### Step 2: Create a Workspace (User A)
This tests that the Org Owner can create a workspace.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/organizations/<ORG_ID>/workspaces`
- **Body (JSON):**
  ```json
  {
    "name": "Engineering",
    "slug": "engineering",
    "description": "Tech team",
    "isPublic": false
  }
  ```
> 📝 **Action:** Copy the `workspace.id` from the response (referred to as `<WORKSPACE_ID>`).

---

### Step 3: Test Workspace RBAC (User A)
This tests the update permissions. User A is the `OWNER`, so this should succeed.

- **Method:** `PUT`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>`
- **Body (JSON):**
  ```json
  {
    "name": "Frontend Engineering"
  }
  ```
*(It should return 200 OK).*

---

### Step 4: Generate an Invitation (User A)
This tests the Invitation generation and Notification services.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/invites/<WORKSPACE_ID>`
- **Body (JSON):**
  ```json
  {
    "email": "<USER_B_EMAIL>",
    "role": "MEMBER"
  }
  ```
*(Make sure to use the exact email address you registered User B with!)*
> 📝 **Action:** Copy the `inviteToken` from the response (referred to as `<TOKEN>`).

---

### Step 5: Switch Accounts! (User B)
> 🛑 **STOP!** Go to `POST /api/auth/login` and log in as **User B**. 
> Replace the Bearer Token in your Authorization tab with User B's token!

---

### Step 6: Test RBAC Blocking (User B - Before joining)
User B is NOT in the workspace yet. Let's see if they can delete it.

- **Method:** `DELETE`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>`
*(This should return **403 Forbidden: Not a member**).*

---

### Step 7: Accept the Invitation (User B)
User B consumes the token to join the workspace.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/invites/accept`
- **Body (JSON):**
  ```json
  {
    "token": "<TOKEN>"
  }
  ```
*(This should return **200 OK: Successfully joined**).*

---

### Step 8: Test RBAC Blocking (User B - After joining)
User B is now a `MEMBER`. Let's see if they can update the workspace name.

- **Method:** `PUT`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>`
- **Body (JSON):**
  ```json
  {
    "name": "Hacked Engineering"
  }
  ```
*(This should return **403 Forbidden: Requires one of roles: OWNER, ADMIN**).*

---

### Step 9: Verify the Database (Optional)
If you open your MySQL database (or run `npx prisma studio`), you can verify that the Audit Logs and Notifications were created automatically behind the scenes!
- Check the `AuditLog` table: You should see logs for Workspace Created, User Invited, and Invite Accepted.
- Check the `Notification` table: You should see a notification sent to User A when User B accepted the invite.

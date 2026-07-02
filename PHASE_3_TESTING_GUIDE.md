# 🧪 Phase 3 Communication Testing Guide

Follow this guide sequentially in Postman to test the full flow of Channels, Messages, Threads, Mentions, and Reactions.

> **Prerequisite:** Make sure you've completed Phase 2 testing. You should have a `User A` token and a valid `<WORKSPACE_ID>`. Use `User A`'s token for all steps below unless specified otherwise.

---

### Step 1: Create a Channel
Let's create a public channel inside your workspace.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>/channels`
- **Body (JSON):**
  ```json
  {
    "name": "General Chat",
    "slug": "general",
    "description": "Company wide discussion",
    "type": "PUBLIC"
  }
  ```
> 📝 **Action:** Copy the `channel.id` from the response (referred to as `<CHANNEL_ID>`).

---

### Step 2: Send a Message
Send the very first message into your new channel! We will include a mention of User B to test the mention extraction system.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/channels/<CHANNEL_ID>/messages`
- **Body (JSON):**
  ```json
  {
    "content": "Hello world! Are you here @UserBUsername?",
    "messageType": "TEXT"
  }
  ```
*(Replace `UserBUsername` with the exact username you gave User B in Phase 2)*
> 📝 **Action:** Copy the `message.id` from the response (referred to as `<MESSAGE_ID>`).

---

### Step 3: Fetch Messages (Cursor Pagination)
See how messages are retrieved for a channel.

- **Method:** `GET`
- **URL:** `http://localhost:5001/api/channels/<CHANNEL_ID>/messages?limit=10`
*(You should see your message returned in an array. If you had more than 10, it would return a `nextCursor` value for pagination).*

---

### Step 4: React to the Message
Let's add an emoji reaction to the message.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/messages/<MESSAGE_ID>/reactions`
- **Body (JSON):**
  ```json
  {
    "emoji": "🚀"
  }
  ```
*(Returns 201 OK).*

---

### Step 5: Start a Thread
Reply directly to the main message to create a thread.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/channels/<CHANNEL_ID>/messages`
- **Body (JSON):**
  ```json
  {
    "content": "This is a threaded reply!",
    "parentMessageId": "<MESSAGE_ID>"
  }
  ```

---

### Step 6: Fetch the Thread
Fetch only the messages inside that specific thread.

- **Method:** `GET`
- **URL:** `http://localhost:5001/api/messages/<MESSAGE_ID>/thread`
*(You should see the parent message and an array of replies).*

---

### Step 7: Edit a Message
Fix a typo in your original message.

- **Method:** `PATCH`
- **URL:** `http://localhost:5001/api/messages/<MESSAGE_ID>`
- **Body (JSON):**
  ```json
  {
    "content": "Hello world! We are live! @UserBUsername"
  }
  ```
*(Notice the `editedAt` timestamp will now be populated in the response).*

---

### Step 8: Upload an Attachment (Optional)
This one requires switching from JSON to `multipart/form-data` in Postman.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/messages/<MESSAGE_ID>/attachments`
- **Body (form-data):**
  - Key: `file` (Change the type from Text to File on the right side of the key field)
  - Value: *(Select any image or small file from your computer)*
*(This saves the file to the local `/uploads` folder and links it to the message).*

---

### Step 9: Soft-Delete a Message
Let's delete the threaded reply we made in Step 5.

- **Method:** `DELETE`
- **URL:** `http://localhost:5001/api/messages/<ID_OF_THE_THREAD_REPLY>`
*(Returns 200 OK).*

Now, go back and run **Step 6** (Fetch the Thread) again. You'll notice the message still exists, but the content has been scrubbed to `"This message was deleted."`!

---

### Step 10: Verify the Database (Optional)
If you open your MySQL database (or run `npx prisma studio`), you can verify:
- **Mention Table:** The system automatically created a `Mention` row for User B.
- **Notification Table:** User B automatically received a `MENTION` notification.
- **AuditLog Table:** Channel creation was logged successfully.

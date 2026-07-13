import prisma from "/Users/yadnyesh8250/Desktop/A-collab/backend/src/config/db.js";

async function verify() {
  const PORT = 5001;
  const BASE_URL = `http://localhost:${PORT}/api`;
  const suffix = Date.now();

  const userCreds = {
    email: `notify_test_${suffix}@example.com`,
    username: `notify_test_${suffix}`,
    password: "Password123"
  };

  console.log("1. Registering test user...");
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userCreds)
  });

  if (!regRes.ok) {
    throw new Error(`Failed to register user: ${await regRes.text()}`);
  }
  const regJson = await regRes.json();
  console.log("Registration Response JSON:", regJson);
  
  const token = regJson.accessToken;
  const userId = regJson.user.id;
  console.log(`Registered user ID: ${userId}, Token: ${token}`);

  // Create a notification directly in the DB to test the endpoints
  console.log("2. Inserting mock notification into database...");
  const mockNotification = await prisma.notification.create({
    data: {
      recipientId: userId,
      type: "TEST_ALERT",
      payload: { detail: "Verifying backend completion" },
      isRead: false
    }
  });
  console.log(`Inserted notification ID: ${mockNotification.id}`);

  // Test GET /api/notifications
  console.log("3. Fetching list of notifications via GET /api/notifications...");
  const getRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!getRes.ok) {
    throw new Error(`GET /notifications failed: ${await getRes.text()}`);
  }
  const getJson = await getRes.json();
  console.log("GET Response:", getJson);
  if (getJson.notifications.length !== 1) {
    throw new Error(`Expected 1 notification, got ${getJson.notifications.length}`);
  }

  // Test PATCH /api/notifications/:id/read
  console.log("4. Marking notification as read...");
  const patchRes = await fetch(`${BASE_URL}/notifications/${mockNotification.id}/read`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  if (!patchRes.ok) {
    throw new Error(`PATCH /notifications/:id/read failed: ${await patchRes.text()}`);
  }
  const patchJson = await patchRes.json();
  console.log("PATCH Response:", patchJson);
  if (patchJson.notification.isRead !== true) {
    throw new Error("Expected notification isRead to be true");
  }

  // Test DELETE /api/notifications/:id
  console.log("5. Deleting notification...");
  const delRes = await fetch(`${BASE_URL}/notifications/${mockNotification.id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!delRes.ok) {
    throw new Error(`DELETE /notifications/:id failed: ${await delRes.text()}`);
  }
  const delJson = await delRes.json();
  console.log("DELETE Response:", delJson);

  // Verify list is empty
  const getEmptyRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const getEmptyJson = await getEmptyRes.json();
  console.log("Empty List GET Response:", getEmptyJson);
  if (getEmptyJson.notifications.length !== 0) {
    throw new Error(`Expected 0 notifications, got ${getEmptyJson.notifications.length}`);
  }

  // Clean up user
  console.log("6. Cleaning up test user...");
  await prisma.user.delete({ where: { id: userId } });
  console.log("Verification finished successfully! 🚀");
}

verify().catch(console.error);

// server.js
const express = require('express');
const admin = require('firebase-admin');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://information-project1-default-rtdb.firebaseio.com'
});

const db = admin.database();
const messaging = admin.messaging();

// Endpoint to schedule notifications
app.post('/schedule-notifications', async (req, res) => {
  try {
    const { appointmentId, fcmToken, date, time, userName } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ error: 'No FCM token provided' });
    }

    // Parse appointment datetime
    const appointmentDateTime = new Date(`${date}T${time}`);
    const confirmationTime = new Date(Date.now() + 60000); // 1 minute from now
    const reminderTime = new Date(appointmentDateTime.getTime() - 30 * 60000); // 30 minutes before

    // Schedule confirmation notification (1 minute after booking)
    const confirmationJob = cron.schedule(confirmationTime, () => {
      sendNotification(
        fcmToken,
        'Appointment Confirmed',
        `Your appointment has been confirmed for ${date} at ${time}`
      );
      confirmationJob.stop();
    });

    // Schedule reminder notification (30 minutes before appointment)
    const reminderJob = cron.schedule(reminderTime, () => {
      sendNotification(
        fcmToken,
        'Appointment Reminder',
        `Hi ${userName}, don't forget your appointment today at ${time}`
      );
      reminderJob.stop();
    });

    res.status(200).json({ message: 'Notifications scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to send FCM notification
async function sendNotification(token, title, body) {
  try {
    const message = {
      notification: {
        title,
        body
      },
      token
    };

    await messaging.send(message);
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

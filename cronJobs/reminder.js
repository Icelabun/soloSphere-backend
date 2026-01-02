const cron = require('node-cron');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const moment = require('moment');

// Set up Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Helper function to send email reminders
const sendReminderEmail = async (userEmail, username) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender email
    to: userEmail, // Recipient email
    subject: 'Reminder: Keep Your Streak Going!',
    text: `Hello ${username},\n\nThis is your daily reminder to keep your streak going! Keep studying and stay consistent.\n\nGood luck!`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder sent to ${username} at ${userEmail}`);
  } catch (error) {
    console.error(`❌ Error sending reminder to ${username} (${userEmail}):`, error);
  }
};

// Cron job to check and send reminders at 8 AM daily
cron.schedule('0 8 * * *', async () => {
  console.log(`⏳ Checking users for daily reminders...`);

  try {
    const users = await User.find({ isVerified: true });

    for (const user of users) {
      const currentDate = moment().startOf('day');
      const lastStudyDate = moment(user.lastStudyDate).startOf('day');

      // If the user hasn't studied today (and they have a streak), send a reminder
      if (!currentDate.isSame(lastStudyDate) && user.streak > 0) {
        await sendReminderEmail(user.email, user.username);
      }
    }

    console.log(`✅ Daily reminder check completed.`);
  } catch (error) {
    console.error(`❌ Error running the reminder cron job:`, error);
  }
});

console.log(`📅 Cron job scheduled to run daily at 8 AM.`);

module.exports = { sendReminderEmail };
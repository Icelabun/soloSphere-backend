const express = require('express');
const moment = require('moment');
const User = require('../models/User');

const router = express.Router();

// Helper function to update streaks
const updateStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const currentDate = moment().startOf('day');
  const lastStudyDate = moment(user.lastStudyDate).startOf('day');

  if (currentDate.isSame(lastStudyDate)) return user;

  const dayDiff = currentDate.diff(lastStudyDate, 'days');

  user.streak = dayDiff === 1 ? user.streak + 1 : 1;
  user.lastStudyDate = currentDate;
  
  await user.save();
  return user;
};

// Get user streak
router.get('/streak/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ streak: user.streak });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching streak' });
  }
});

// Update user streak
router.post('/update/:userId', async (req, res) => {
  try {
    const updatedUser = await updateStreak(req.params.userId);
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ streak: updatedUser.streak });
  } catch (error) {
    res.status(500).json({ message: 'Error updating streak' });
  }
});

module.exports = router;
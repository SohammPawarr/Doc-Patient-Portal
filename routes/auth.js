const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { findUserByEmail, findUserById, createUser, getUsers } = require('../utils/database');

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Sign-In / Sign-Up
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Check if user already exists
    let user = findUserByEmail(email);

    if (!user) {
      // Create new user
      user = {
        id: uuidv4(),
        name: name,
        email: email.toLowerCase(),
        phone: '',
        picture: picture || '',
        googleId: googleId,
        createdAt: new Date().toISOString()
      };
      createUser(user);
    } else {
      // Update existing user with Google info if needed
      if (!user.googleId) {
        const users = getUsers();
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex].googleId = googleId;
          users[userIndex].picture = picture || users[userIndex].picture || '';
          // Remove password if exists (migrating from password auth)
          delete users[userIndex].password;
          
          const fs = require('fs');
          const path = require('path');
          fs.writeFileSync(
            path.join(__dirname, '../data/users.json'),
            JSON.stringify(users, null, 2)
          );
          user = users[userIndex];
        }
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user without sensitive data
    const { googleId: _, ...userResponse } = user;

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Google auth error:', error);
    if (error.message.includes('Token used too late') || error.message.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }
    res.status(500).json({ error: 'Server error during authentication' });
  }
});

// Get current user (protected route)
router.get('/me', (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user without sensitive data
    const { password: _, googleId: __, ...userWithoutSensitive } = user;
    res.json({ user: userWithoutSensitive });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { name, phone } = req.body;
    
    // Get all users and update the specific one
    const db = require('../utils/database');
    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.id === decoded.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) users[userIndex].name = name;
    if (phone) users[userIndex].phone = phone;
    
    // Save updated users
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(
      path.join(__dirname, '../data/users.json'),
      JSON.stringify(users, null, 2)
    );

    const { password: _, googleId: __, ...userWithoutSensitive } = users[userIndex];
    res.json({ message: 'Profile updated', user: userWithoutSensitive });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    const user = await User.findOne({
      where: { username },
      include: [{ model: Role }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.Role ? user.Role.name : null
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.Role ? user.Role.name : null
      }
    });

  } catch (error) {
    console.error('Login hiba:', error.message);
    res.status(500).json({ message: 'Szerverhiba: ' + error.message });
  }
});

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, username, password, role } = req.body;

    if (!firstName || !lastName || !email || !username || !password || !role) {
      return res.status(400).json({ message: 'Minden mező kitöltése kötelező.' });
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ message: 'Ez a felhasználónév már foglalt.' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: 'Ez az email cím már regisztrált.' });
    }

    const roleRecord = await Role.findOne({ where: { name: role } });
    if (!roleRecord) {
      return res.status(400).json({ message: 'Érvénytelen szerepkör.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email,
      password_hash,
      role_id: roleRecord.id
    });

    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: roleRecord.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      message: 'Sikeres regisztráció!',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: roleRecord.name
      }
    });

  } catch (error) {
    console.error('Regisztráció hiba:', error.message);
    res.status(500).json({ message: 'Szerverhiba: ' + error.message });
  }
});

// GET /api/users/roles
router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.findAll({ attributes: ['id', 'name'] });
    res.json(roles);
  } catch (error) {
    console.error('Roles hiba:', error.message);
    res.status(500).json({ message: 'Szerverhiba: ' + error.message });
  }
});

module.exports = router;
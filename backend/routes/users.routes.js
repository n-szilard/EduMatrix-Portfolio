const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { body, validationResult } = require('express-validator');

// Validation rules
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Felhasználónév megadása kötelező.'),
  body('password').notEmpty().withMessage('Jelszó megadása kötelező.'),
];

const registerValidation = [
  body('email')
    .isEmail().withMessage('Érvénytelen email cím.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('A jelszónak legalább 8 karakter hosszúnak kell lennie.'),
  body('username')
    .trim()
    .isAlphanumeric().withMessage('A felhasználónév csak betűket és számokat tartalmazhat.')
    .isLength({ min: 3, max: 30 }).withMessage('A felhasználónévnek 3 és 30 karakter közé kell esnie.'),
  body('firstName')
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 }).withMessage('Keresztnév megadása kötelező (max. 50 karakter).'),
  body('lastName')
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 }).withMessage('Vezetéknév megadása kötelező (max. 50 karakter).'),
];

// POST /api/users/login
router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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
      token
    });

  } catch (error) {
    console.error('Login hiba:', error.message);
    res.status(500).json({ message: 'Szerverhiba: ' + error.message });
  }
});

// POST /api/users/register
/**
 * Felhasználó regisztrációja. A regisztráció után a fiók inaktív marad,
 * amíg egy adminisztrátor szerepkört (role) nem rendel hozzá.
 * A szerepkör határozza meg a rendszerhez való hozzáférési jogosultságokat.
 */
router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { firstName, lastName, email, username, password } = req.body; // role kivéve
    if (!firstName || !lastName || !email || !username || !password) {
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

    // Automatikusan PENDING role hozzárendelése
    const pendingRole = await Role.findOne({ where: { name: 'PENDING' } });
    if (!pendingRole) {
      return res.status(500).json({ message: 'Szerverhiba: PENDING szerepkör nem található.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await User.create({
      firstName,
      lastName,
      username,
      email,
      password_hash,
      role_id: pendingRole.id
    });

    // PENDING usereknek NEM adunk tokent, várniuk kell az admin jóváhagyására
    return res.status(201).json({
      message: 'Sikeres regisztráció! Fiókod aktiválásra vár, az adminisztrátor szerepkört rendel hozzád.'
    });

  } catch (error) {
    console.error('Regisztráció hiba:', error.message);
    return res.status(500).json({ message: 'Szerverhiba: ' + error.message });
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
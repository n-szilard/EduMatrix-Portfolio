const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, Student, Teacher, sequelize } = require('../models');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Segédfüggvény: biztonságos user kimenet normalizálása
function toUserDto(userInstance) {
  if (!userInstance) return null;
  const u = userInstance.toJSON ? userInstance.toJSON() : userInstance;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    full_name: u.full_name,
    role: u.Role?.name || null,
  };
}

// Validációs szabályok
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

async function resolveRoleInput(role) {
  if (typeof role === 'string' && role.trim()) {
    const foundByName = await Role.findOne({ where: { name: role.trim().toLowerCase() } });
    if (foundByName) return foundByName;
  }

  return null;
}

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
      token,
      user: toUserDto(user),
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

    // Automatikusan pending role hozzárendelése
    const pendingRole = await Role.findOne({ where: { name: 'pending' } });
    if (!pendingRole) {
      return res.status(500).json({ message: 'Szerverhiba: pending szerepkör nem található.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await User.create({
      username,
      email,
      full_name: `${firstName} ${lastName}`.trim(),
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

// ─────────────────────────────────────────────────────────────────────────────
// Admin CRUD felhasználók kezeléséhez (frontend UserService igényli)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/users  (csak admin)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'full_name', 'role_id'],
      include: [{ model: Role, attributes: ['id', 'name'] }],
    });
    return res.json(users.map(toUserDto));
  } catch (error) {
    console.error('Users list hiba:', error.message);
    return res.status(500).json({ message: 'Szerverhiba: ' + error.message });
  }
});

// POST /api/users  (csak admin)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  [
    body('email').isEmail().withMessage('Érvénytelen email cím.').normalizeEmail(),
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('A felhasználónévnek 3 és 30 karakter közé kell esnie.'),
    body('full_name').trim().isLength({ min: 1, max: 120 }).withMessage('Teljes név megadása kötelező.'),
    body('password').isLength({ min: 8 }).withMessage('A jelszónak legalább 8 karakter hosszúnak kell lennie.'),
    body('role').trim().notEmpty().withMessage('Szerepkör megadása kötelező.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email, full_name, password, role } = req.body;

      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ message: 'Ez a felhasználónév már foglalt.' });
      }
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ message: 'Ez az email cím már regisztrált.' });
      }

      const resolvedRole = await resolveRoleInput(role);
      if (!resolvedRole) {
        return res.status(400).json({ message: 'Érvénytelen szerepkör.' });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const created = await User.create({
        username,
        email,
        full_name,
        password_hash,
        role_id: resolvedRole.id,
      });

      const createdWithRole = await User.findByPk(created.id, {
        attributes: ['id', 'username', 'email', 'full_name', 'role_id'],
        include: [{ model: Role, attributes: ['id', 'name'] }],
      });

      return res.status(201).json(toUserDto(createdWithRole));
    } catch (error) {
      console.error('User create hiba:', error.message);
      return res.status(500).json({ message: 'Szerverhiba: ' + error.message });
    }
  }
);

// PUT /api/users/:id  (csak admin)
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  [
    body('email').optional().isEmail().withMessage('Érvénytelen email cím.').normalizeEmail(),
    body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('A felhasználónévnek 3 és 30 karakter közé kell esnie.'),
    body('full_name').optional().trim().isLength({ min: 1, max: 120 }).withMessage('Teljes név megadása kötelező.'),
    body('password').optional().isLength({ min: 8 }).withMessage('A jelszónak legalább 8 karakter hosszúnak kell lennie.'),
    body('role').optional().isString().withMessage('A szerepkör neve szöveg kell legyen.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'Felhasználó nem található.' });
      }

      const { username, email, full_name, password, role } = req.body;

      if (username && username !== user.username) {
        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
          return res.status(409).json({ message: 'Ez a felhasználónév már foglalt.' });
        }
        user.username = username;
      }
      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
          return res.status(409).json({ message: 'Ez az email cím már regisztrált.' });
        }
        user.email = email;
      }
      if (typeof full_name === 'string') {
        user.full_name = full_name;
      }
      if (role) {
        const currentRole = await Role.findByPk(user.role_id);
        if (!currentRole) {
          return res.status(500).json({ message: 'Szerverhiba: a jelenlegi szerepkör nem található.' });
        }

        const resolvedRole = await resolveRoleInput(role);
        if (!resolvedRole) {
          return res.status(400).json({ message: 'Érvénytelen szerepkör.' });
        }

        // Pending felhasználó teacher/student aktiválása csak az activate endpointon megengedett
        if (currentRole.name === 'pending' && ['teacher', 'student'].includes(resolvedRole.name)) {
          return res.status(400).json({ message: 'Teacher vagy student szerepkörhöz az aktiválás endpointot használd.' });
        }

        // Aktiválás után a szerepkör nem módosítható
        if (currentRole.name !== 'pending' && resolvedRole.id !== user.role_id) {
          return res.status(400).json({ message: 'Aktiválás után a szerepkör már nem módosítható.' });
        }

        user.role_id = resolvedRole.id;
      }
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(password, salt);
      }

      await user.save();

      const updated = await User.findByPk(user.id, {
        attributes: ['id', 'username', 'email', 'full_name', 'role_id'],
        include: [{ model: Role, attributes: ['id', 'name'] }],
      });

      return res.json(toUserDto(updated));
    } catch (error) {
      console.error('User update hiba:', error.message);
      return res.status(500).json({ message: 'Szerverhiba: ' + error.message });
    }
  }
);

// DELETE /api/users/:id  (csak admin)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }
    await user.destroy();
    return res.status(204).send();
  } catch (error) {
    console.error('User delete hiba:', error.message);
    return res.status(500).json({ message: 'Szerverhiba: ' + error.message });
  }
});

/**
 * Saját jelszó módosítása (bejelentkezett user)
 * PUT /api/users/me/password
 * body: { currentPassword: string, newPassword: string }
 */
router.put(
  '/me/password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Jelenlegi jelszó megadása kötelező.'),
    body('newPassword').isLength({ min: 8 }).withMessage('Az új jelszónak legalább 8 karakter hosszúnak kell lennie.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Nincs bejelentkezett felhasználó.' });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'Felhasználó nem található.' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ message: 'A jelenlegi jelszó hibás.' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(newPassword, salt);
      await user.save();

      return res.json({ message: 'Jelszó sikeresen módosítva.' });
    } catch (error) {
      console.error('Change password hiba:', error.message);
      return res.status(500).json({ message: 'Szerverhiba: ' + error.message });
    }
  }
);

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

/**
 * Admin: pending felhasználó aktiválása (szerepkör beállítása) + Student/Teacher rekord létrehozása.
 * PUT /api/users/:id/activate
 * body: { role: 'student' | 'teacher', class_id?: string }
 */
router.put('/:id/activate', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const userId = req.params.id;
  const { role, class_id } = req.body;

  if (!['student', 'teacher'].includes(role)) {
    return res.status(400).json({ message: 'Érvénytelen szerepkör. Csak student vagy teacher adható meg.' });
  }

  const t = await sequelize.transaction();
  try {
    const [pendingRole, targetRole] = await Promise.all([
      Role.findOne({ where: { name: 'pending' }, transaction: t }),
      Role.findOne({ where: { name: role }, transaction: t }),
    ]);

    if (!pendingRole || !targetRole) {
      await t.rollback();
      return res.status(500).json({ message: 'Szerepkörök nincsenek megfelelően inicializálva az adatbázisban.' });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }

    if (user.role_id !== pendingRole.id) {
      await t.rollback();
      return res.status(400).json({ message: 'Csak pending felhasználó aktiválható ezzel az endpointtal.' });
    }

    // Biztonság: ne legyen duplikált rekord
    const [existingStudent, existingTeacher] = await Promise.all([
      Student.findOne({ where: { user_id: userId }, transaction: t }),
      Teacher.findOne({ where: { user_id: userId }, transaction: t }),
    ]);
    if (existingStudent || existingTeacher) {
      await t.rollback();
      return res.status(409).json({ message: 'A felhasználó már hozzá van rendelve student/teacher rekordhoz.' });
    }

    // Student/Teacher rekord létrehozása + szerepkör váltás
    if (role === 'student') {
      await Student.create(
        {
          user_id: userId,
          class_id: class_id ?? null,
        },
        { transaction: t }
      );
    } else {
      await Teacher.create(
        {
          user_id: userId,
        },
        { transaction: t }
      );
    }

    user.role_id = targetRole.id;
    await user.save({ transaction: t });

    await t.commit();
    return res.json({ message: 'Felhasználó aktiválva és szerepkör beállítva.', userId, role });
  } catch (error) {
    await t.rollback();
    console.error('Activate hiba:', error.message);
    return res.status(500).json({ message: 'Szerverhiba: ' + error.message });
  }
});

module.exports = router;
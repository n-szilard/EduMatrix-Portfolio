const jwt = require('jsonwebtoken');

// Token ellenőrzése
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Token

    if (!token) {
        return res.status(401).json({ message: 'Hozzáférés megtagadva: hiányzó token.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Érvénytelen vagy lejárt token.' });
        }
        req.user = user;
        next();
    });
};

// Szerepkör ellenőrzése, több szerepkör is megadható
const authorizeRoles = (...rolesInput) => {
  const roles = rolesInput.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Hozzáférés megtagadva: nincs bejelentkezett felhasználó.' });
    }
    if (req.user.role === 'pending') {
      return res.status(403).json({ message: 'Fiókod még nem aktivált. Várj az admin jóváhagyására.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Nincs jogosultságod ehhez a művelethez.' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};

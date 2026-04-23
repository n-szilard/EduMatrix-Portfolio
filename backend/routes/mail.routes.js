const express = require('express');
const router = express.Router();
const { sendEmail } = require('../config/email');

const ADMIN_EMAIL = process.env.GMAIL_USER;

// POST /api/mail/contact - Kapcsolat form üzenet elküldése
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validáció
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hiányzó mezők: name, email, subject, message szükséges.' 
      });
    }

    // Email regex validáció
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Érvénytelen email cím.' 
      });
    }

    // 1. Megerősítő email a felhasználónak
    await sendEmail(
      email,
      'Üzenete megérkezett - EduMatrix',
      'user-confirmation',
      { name, email, subject }
    );

    // 2. Értesítési email az adminnak
    await sendEmail(
      ADMIN_EMAIL,
      `Új üzenet: ${subject}`,
      'admin-notification',
      { name, email, subject, message }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Az üzenet sikeresen elküldve. Hamarosan válaszolunk.' 
    });

  } catch (error) {
    console.error('Kapcsolat form hiba:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Hiba az üzenet küldésekor. Kérlek próbáld később.' 
    });
  }
});

module.exports = router;

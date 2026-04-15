const express = require('express');
const router = express.Router();

const { Subject, ClassSubject } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// GET Összes tantárgy lekérése
router.get(
  '/',
  authenticateToken,
  authorizeRoles(['admin', 'teacher', 'student', 'parent']),
  async (req, res) => {
    try {
      const subjects = await Subject.findAll({ order: [['name', 'ASC']] });
      return res.status(200).json(subjects);
    } catch (error) {
      return res.status(500).json({ message: 'Hiba történt a tantárgyak lekérése során.' });
    }
  }
);

// GET Tantárgy lekérése id alapján
router.get('/:id', authenticateToken, authorizeRoles(['admin', 'teacher', 'student', 'parent']), async (req, res) => {
  const { id } = req.params;

  try {
    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ message: 'Tantárgy nem található.' });
    }
    return res.status(200).json(subject);
  } catch (error) {
    return res.status(500).json({ message: 'Hiba történt a tantárgy lekérése során.' });
  }
});

// POST Új tantárgy létrehozása
router.post('/', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'A tantárgy neve kötelező.' });
  }

  try {
    const newSubject = await Subject.create({ name: String(name).trim() });
    return res.status(201).json(newSubject);
  } catch (error) {
    return res.status(500).json({ message: 'Hiba történt a tantárgy létrehozása során.' });
  }
});

// PATCH Tantárgy módosítása
router.patch('/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'A tantárgy neve kötelező.' });
  }

  try {
    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ message: 'Tantárgy nem található.' });
    }

    subject.name = String(name).trim();
    await subject.save();

    return res.status(200).json(subject);
  } catch (error) {
    return res.status(500).json({ message: 'Hiba történt a tantárgy módosítása során.' });
  }
});

// DELETE Tantárgy törlése
router.delete('/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ message: 'Tantárgy nem található.' });
    }

    // Ne engedjük törölni, ha hozzá van rendelve osztályhoz/tanárhoz (class_subjects)
    const classSubjectCount = await subject.countClassSubjects?.()
      ? await subject.countClassSubjects()
      : 0;

    // Ha nincs association helper, akkor direkt lekérdezés
    const directCount = await ClassSubject.count({ where: { subject_id: id } });

    const total = Math.max(classSubjectCount, directCount);

    if (total > 0) {
      return res.status(409).json({
        message:
          'A tantárgy nem törölhető, mert hozzá van rendelve osztályhoz/tanárhoz (class_subjects). Előbb töröld a hozzárendeléseket.',
      });
    }

    await subject.destroy();
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Hiba történt a tantárgy törlése során.' });
  }
});

module.exports = router;
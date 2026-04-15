const express = require('express');
const router = express.Router();

const { Class, Subject, Teacher, ClassSubject, Absence, Grade, Timetable } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

function normalizePayload(body) {
  return {
    class_id: body.class_id ?? body.classId,
    subject_id: body.subject_id ?? body.subjectId,
    teacher_id: body.teacher_id ?? body.teacherId,
  };
}

// GET osztály–tantárgy–tanár kapcsolatok listázása
router.get(
  '/',
  authenticateToken,
  authorizeRoles(['admin', 'teacher']),
  async (req, res) => {
    try {
      const classSubjects = await ClassSubject.findAll({
        include: [
          { model: Class },
          { model: Subject },
          { model: Teacher },
        ],
      });

      return res.status(200).json(classSubjects);
    } catch (error) {
      return res.status(500).json({ message: 'Hiba történt a kapcsolatok lekérése során.' });
    }
  }
);

// GET osztály–tantárgy–tanár kapcsolat lekérése id alapján
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles(['admin', 'teacher']),
  async (req, res) => {
    const { id } = req.params;

    try {
      const classSubject = await ClassSubject.findByPk(id, {
        include: [
          { model: Class },
          { model: Subject },
          { model: Teacher },
        ],
      });

      if (!classSubject) {
        return res.status(404).json({ message: 'Kapcsolat nem található.' });
      }

      return res.status(200).json(classSubject);
    } catch (error) {
      return res.status(500).json({ message: 'Hiba történt a kapcsolat lekérése során.' });
    }
  }
);

// POST új osztály–tantárgy–tanár kapcsolat létrehozása
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['admin']),
  async (req, res) => {
    const { class_id, subject_id, teacher_id } = normalizePayload(req.body);

    if (!class_id || !subject_id || !teacher_id) {
      return res.status(400).json({ message: 'Minden mező kitöltése kötelező.' });
    }

    try {
      // Duplikáció védelem
      const exists = await ClassSubject.findOne({
        where: { class_id, subject_id, teacher_id },
      });

      if (exists) {
        return res.status(409).json({ message: 'Ez a hozzárendelés már létezik.' });
      }

      const newClassSubject = await ClassSubject.create({ class_id, subject_id, teacher_id });
      return res.status(201).json(newClassSubject);
    } catch (error) {
      return res.status(500).json({ message: 'Hiba történt a kapcsolat létrehozása során.' });
    }
  }
);

// PATCH osztály–tantárgy–tanár kapcsolat módosítása
router.patch(
  '/:id',
  authenticateToken,
  authorizeRoles(['admin']),
  async (req, res) => {
    const { id } = req.params;
    const payload = normalizePayload(req.body);

    try {
      const classSubject = await ClassSubject.findByPk(id);
      if (!classSubject) {
        return res.status(404).json({ message: 'Kapcsolat nem található.' });
      }

      if (payload.class_id !== undefined) classSubject.class_id = payload.class_id;
      if (payload.subject_id !== undefined) classSubject.subject_id = payload.subject_id;
      if (payload.teacher_id !== undefined) classSubject.teacher_id = payload.teacher_id;

      await classSubject.save();
      return res.status(200).json(classSubject);
    } catch (error) {
      return res.status(500).json({ message: 'Hiba történt a kapcsolat módosítása során.' });
    }
  }
);

// DELETE osztály–tantárgy–tanár kapcsolat törlése
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(['admin']),
  async (req, res) => {
    const { id } = req.params;

    try {
      const classSubject = await ClassSubject.findByPk(id);
      if (!classSubject) {
        return res.status(404).json({ message: 'Kapcsolat nem található.' });
      }

      // Ne engedjük törölni, ha van rá hivatkozó rekord (hiányzás / jegy / órarend)
      const [absenceCount, gradeCount, timetableCount] = await Promise.all([
        Absence.count({ where: { class_subject_id: id } }),
        Grade.count({ where: { class_subject_id: id } }),
        Timetable.count({ where: { class_subject_id: id } }),
      ]);

      if (absenceCount > 0 || gradeCount > 0 || timetableCount > 0) {
        return res.status(409).json({
          message:
            'A kapcsolat nem törölhető, mert már van hozzá kapcsolódó adat (hiányzás/jegy/órarend). Előbb töröld ezeket a hivatkozásokat.',
        });
      }

      await classSubject.destroy();
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: 'Hiba történt a kapcsolat törlése során.' });
    }
  }
);

module.exports = router;
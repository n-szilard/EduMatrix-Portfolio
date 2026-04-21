const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { Grade, Student, ClassSubject, Subject, Class } = require('../models');

const router = express.Router();

/**
 * Diák: saját tantárgyai osztály alapján
 * GET /api/grades/me/subjects
 */
router.get('/me/subjects', authenticateToken, authorizeRoles(['student', 'admin']), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Nincs bejelentkezett felhasználó.' });
    }

    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return res.status(404).json({ message: 'A felhasználóhoz nem tartozik diák rekord.' });
    }

    if (!student.class_id) {
      return res.json([]);
    }

    const classSubjectRows = await ClassSubject.findAll({
      where: { class_id: student.class_id },
      include: [
        { model: Subject, attributes: ['id', 'name'] },
        { model: Class, attributes: ['id', 'name'] },
      ],
    });

    const dto = classSubjectRows.map((row) => {
      const rowJson = row.toJSON ? row.toJSON() : row;

      return {
        subject: {
          id: rowJson.Subject?.id ?? null,
          name: rowJson.Subject?.name ?? 'Ismeretlen tantárgy',
        },
        class: {
          id: rowJson.Class?.id ?? null,
          name: rowJson.Class?.name ?? null,
        },
      };
    }).sort((a, b) => a.subject.name.localeCompare(b.subject.name));

    return res.json(dto);
  } catch (error) {
    console.error('Grades /me/subjects hiba:', error);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
});

/**
 * Diák: saját jegyei
 * GET /api/grades/me
 */
router.get('/me', authenticateToken, authorizeRoles(['student', 'admin']), async (req, res) => {
  try {
  // Bejelentkezett user azonosító
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Nincs bejelentkezett felhasználó.' });
    }

  // Student rekord megkeresése a user-hez
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return res.status(404).json({ message: 'A felhasználóhoz nem tartozik diák rekord.' });
    }

  // Jegyek + tantárgy + osztály
  const gradeRows = await Grade.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      include: [
        {
          model: ClassSubject,
          include: [
            { model: Subject, attributes: ['id', 'name'] },
            { model: Class, attributes: ['id', 'name'] },
          ],
        },
      ],
    });

    // API kimenet
    const dto = gradeRows.map((gradeInstance) => {
      const gradeJson = gradeInstance.toJSON ? gradeInstance.toJSON() : gradeInstance;

      const subjectJson = gradeJson.ClassSubject?.Subject;
      const classJson = gradeJson.ClassSubject?.Class;

      return {
        id: gradeJson.id,
        grade: Number(gradeJson.grade),
        date: gradeJson.date,
        subject: {
          id: subjectJson?.id ?? null,
          name: subjectJson?.name ?? 'Ismeretlen tantárgy',
        },
        class: {
          id: classJson?.id ?? null,
          name: classJson?.name ?? null,
        },
      };
    });

    return res.json(dto);
  } catch (error) {
    console.error('Grades /me hiba:', error);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
});

module.exports = router;

const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { Grade, Student, ClassSubject, Subject, Class } = require('../models');

const router = express.Router();

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

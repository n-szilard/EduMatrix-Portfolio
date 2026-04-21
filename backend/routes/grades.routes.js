const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { Grade, Student, ClassSubject, Subject, Class, Teacher, User } = require('../models');

const router = express.Router();

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

async function getTeacher(userId) {
  return Teacher.findOne({ where: { user_id: userId } });
}

function toGradeDto(gradeInstance) {
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
}

function toStudentForGradebookDto(studentInstance) {
  const s = studentInstance.toJSON ? studentInstance.toJSON() : studentInstance;
  return {
    id: s.id,
    class_id: s.class_id ?? null,
    full_name: s.User?.full_name ?? null,
  };
}

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
  // Bejelentkezett user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Nincs bejelentkezett felhasználó.' });
    }

  // Diák rekord
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

  return res.json(gradeRows.map(toGradeDto));
  } catch (error) {
    console.error('Grades /me hiba:', error);
    return res.status(500).json({ message: 'Szerverhiba.' });
  }
});

/**
 * Tanár: egy diák jegyei
 * GET /api/grades/student/:studentId
 */
router.get(
  '/student/:studentId',
  authenticateToken,
  authorizeRoles(['teacher', 'admin']),
  async (req, res) => {
    try {
      const teacher = await getTeacher(req.user.id);
      if (!teacher) {
        return res.status(403).json({ message: 'Nincs tanár profil rendelve ehhez a felhasználóhoz.' });
      }
      const studentId = req.params.studentId;

      const student = await Student.findByPk(studentId);
      if (!student) {
        return res.status(404).json({ message: 'A tanuló nem található.' });
      }

  // Csak a tanár saját, adott osztályhoz tartozó tantárgyai
      const allowedClassSubjects = await ClassSubject.findAll({
        where: {
          teacher_id: teacher.id,
          class_id: student.class_id,
        },
        attributes: ['id'],
      });

      const allowedIds = allowedClassSubjects.map((x) => x.id);
      if (!allowedIds.length) {
        return res.status(200).json([]);
      }

      const gradeRows = await Grade.findAll({
        where: { student_id: studentId, class_subject_id: allowedIds },
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

      return res.status(200).json(gradeRows.map(toGradeDto));
    } catch (error) {
      console.error('Grades /student/:studentId hiba:', error);
      return res.status(500).json({ message: 'Szerverhiba.' });
    }
  }
);

/**
 * Tanár: új jegy létrehozása diákhoz
 * POST /api/grades
 * body: { student_id, class_subject_id, grade, date }
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['teacher', 'admin']),
  async (req, res) => {
    try {
      const teacher = await getTeacher(req.user.id);
      if (!teacher) {
        return res.status(403).json({ message: 'Nincs tanár profil rendelve ehhez a felhasználóhoz.' });
      }

      const student_id = isNonEmptyString(req.body.student_id) ? req.body.student_id.trim() : '';
      const class_subject_id = isNonEmptyString(req.body.class_subject_id) ? req.body.class_subject_id.trim() : '';
      const gradeRaw = req.body.grade;
      const date = isNonEmptyString(req.body.date) ? req.body.date.trim() : '';

      const grade = Number(gradeRaw);

      if (!student_id || !class_subject_id || !date || Number.isNaN(grade)) {
        return res.status(400).json({ message: 'Minden mező kitöltése kötelező.' });
      }

  if (!Number.isInteger(grade) || grade < 1 || grade > 5) {
        return res.status(400).json({ message: 'A jegy 1 és 5 közötti lehet.' });
      }

      const student = await Student.findByPk(student_id);
      if (!student) {
        return res.status(404).json({ message: 'A tanuló nem található.' });
      }

      if (!student.class_id) {
        return res.status(409).json({ message: 'A tanuló nincs osztályhoz rendelve, nem adható jegy.' });
      }

  // Jogosultság: tantárgy + osztály a bejelentkezett tanárhoz tartozzon
      const cs = await ClassSubject.findOne({
        where: {
          id: class_subject_id,
          teacher_id: teacher.id,
          class_id: student.class_id,
        },
      });

      if (!cs) {
        return res.status(403).json({ message: 'Nincs jogosultság (nem a te tantárgyad / nem ebben az osztályban).' });
      }

      const created = await Grade.create({
        student_id,
        class_subject_id,
        grade,
        date,
      });

      const hydrated = await Grade.findByPk(created.id, {
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

      return res.status(201).json(toGradeDto(hydrated));
    } catch (error) {
      console.error('Grades POST hiba:', error);
      return res.status(500).json({ message: 'Szerverhiba.' });
    }
  }
);

/**
 * GET /api/grades/gradebook/:classSubjectId
 * Visszaad: { classSubject, students: [{ id, full_name }], gradesByStudentId: { [studentId]: GradeItemDto[] } }
 */
router.get(
  '/gradebook/:classSubjectId',
  authenticateToken,
  authorizeRoles(['teacher', 'admin']),
  async (req, res) => {
    try {
      const teacher = await getTeacher(req.user.id);
      if (!teacher) {
        return res.status(403).json({ message: 'Nincs tanár profil rendelve ehhez a felhasználóhoz.' });
      }
      const classSubjectId = req.params.classSubjectId;

      const cs = await ClassSubject.findOne({
        where: { id: classSubjectId, teacher_id: teacher.id },
        include: [
          { model: Subject, attributes: ['id', 'name'] },
          { model: Class, attributes: ['id', 'name'] },
        ],
      });

      if (!cs) {
        return res.status(403).json({ message: 'Nincs jogosultság ehhez a tantárgy/osztályhoz.' });
      }

      const classId = cs.class_id;
      const students = await Student.findAll({
        where: { class_id: classId },
        include: [{ model: User, attributes: ['id', 'full_name'] }],
      });

      const grades = await Grade.findAll({
        where: { class_subject_id: classSubjectId },
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

  const gradesByStudentId = {};
      for (const g of grades) {
        const dto = toGradeDto(g);
        const sid = g.student_id;
        if (!gradesByStudentId[sid]) gradesByStudentId[sid] = [];
        gradesByStudentId[sid].push(dto);
      }

      return res.status(200).json({
        classSubject: {
          id: cs.id,
          class: { id: cs.Class?.id ?? null, name: cs.Class?.name ?? null },
          subject: { id: cs.Subject?.id ?? null, name: cs.Subject?.name ?? null },
        },
        students: students.map(toStudentForGradebookDto),
        gradesByStudentId,
      });
    } catch (error) {
      console.error('Grades /gradebook/:classSubjectId hiba:', error);
      return res.status(500).json({ message: 'Szerverhiba.' });
    }
  }
);

module.exports = router;

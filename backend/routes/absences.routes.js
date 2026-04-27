const express = require('express');
const { Op } = require('sequelize');

const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const {
  Absence,
  Student,
  User,
  Teacher,
  Timetable,
  ClassSubject,
  Class,
  Subject,
} = require('../models');

const router = express.Router();

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeUuid(value) {
  return isNonEmptyString(value) ? value.trim() : null;
}

function parseDateOnly(value) {
  if (!isNonEmptyString(value)) return null;
  const normalized = value.trim();
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : normalized;
}

function dayOfWeekFromDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return DAY_NAMES[date.getUTCDay()] ?? null;
}

async function getTeacherByUserId(userId) {
  return Teacher.findOne({ where: { user_id: userId } });
}

async function shouldRestrictToTeacherAssignments(req, teacher) {
  if (req.user.role !== 'teacher') return false;
  if (!teacher) return false;

  const assignmentCount = await ClassSubject.count({ where: { teacher_id: teacher.id } });
  return assignmentCount > 0;
}

function toTeacherAbsenceDto(row) {
  const absence = row.toJSON ? row.toJSON() : row;

  return {
    id: absence.id,
    date: absence.date,
    justified: Boolean(absence.justified),
    student_id: absence.student_id,
    timetable_id: absence.timetable_id,
    student_name: absence.Student?.User?.full_name ?? 'Ismeretlen tanuló',
    class_subject_id: absence.class_subject_id,
    subject_name: absence.ClassSubject?.Subject?.name ?? 'Ismeretlen tantárgy',
    class_name: absence.ClassSubject?.Class?.name ?? 'Ismeretlen osztály',
    lesson_number: absence.Timetable?.lesson_number ?? null,
  };
}

router.get('/day-lessons', authenticateToken, authorizeRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const classId = normalizeUuid(req.query.class_id ?? req.query.classId);
    const date = parseDateOnly(req.query.date);

    if (!classId || !date) {
      return res.status(400).json({ message: 'A class_id és a date kötelező.' });
    }

    const dayOfWeek = dayOfWeekFromDate(date);
    if (!dayOfWeek) {
      return res.status(400).json({ message: 'Érvénytelen dátum.' });
    }

    const teacher = await getTeacherByUserId(req.user.id);
    if (req.user.role === 'teacher' && !teacher) {
      return res.status(403).json({ message: 'Nincs tanár profil rendelve ehhez a felhasználóhoz.' });
    }

    const restrictToTeacher = await shouldRestrictToTeacherAssignments(req, teacher);

    const whereClassSubject = { class_id: classId };
    if (restrictToTeacher) {
      whereClassSubject.teacher_id = teacher.id;
    }

    const rows = await Timetable.findAll({
      where: { day_of_week: dayOfWeek },
      order: [['lesson_number', 'ASC']],
      include: [
        {
          model: ClassSubject,
          where: whereClassSubject,
          include: [
            { model: Class, attributes: ['id', 'name'] },
            { model: Subject, attributes: ['id', 'name'] },
          ],
        },
      ],
    });

    const dto = rows.map((row) => {
      const item = row.toJSON ? row.toJSON() : row;
      return {
        timetable_id: item.id,
        class_subject_id: item.class_subject_id,
        lesson_number: item.lesson_number,
        day_of_week: item.day_of_week,
        room_number: item.room_number,
        class_name: item.ClassSubject?.Class?.name ?? null,
        subject_name: item.ClassSubject?.Subject?.name ?? 'Ismeretlen tantárgy',
      };
    });

    return res.status(200).json(dto);
  } catch (error) {
    console.error('Absences /day-lessons hiba:', error);
    return res.status(500).json({ message: 'Hiba történt az aznapi órák lekérése során.' });
  }
});

router.get('/teacher', authenticateToken, authorizeRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const teacher = await getTeacherByUserId(req.user.id);
    if (req.user.role === 'teacher' && !teacher) {
      return res.status(403).json({ message: 'Nincs tanár profil rendelve ehhez a felhasználóhoz.' });
    }

    const restrictToTeacher = await shouldRestrictToTeacherAssignments(req, teacher);

    const classId = normalizeUuid(req.query.class_id ?? req.query.classId);
    const studentId = normalizeUuid(req.query.student_id ?? req.query.studentId);
    const date = parseDateOnly(req.query.date);

    const absenceWhere = {};
    if (studentId) absenceWhere.student_id = studentId;
    if (date) absenceWhere.date = date;

    const classSubjectWhere = {};
    if (classId) classSubjectWhere.class_id = classId;
    if (restrictToTeacher) classSubjectWhere.teacher_id = teacher.id;

    const rows = await Absence.findAll({
      where: absenceWhere,
      order: [
        ['date', 'DESC'],
        ['id', 'DESC'],
      ],
      include: [
        {
          model: Student,
          include: [{ model: User, attributes: ['id', 'full_name', 'username', 'email'] }],
        },
        {
          model: Timetable,
          attributes: ['id', 'lesson_number', 'day_of_week', 'room_number'],
        },
        {
          model: ClassSubject,
          where: classSubjectWhere,
          include: [
            { model: Class, attributes: ['id', 'name'] },
            { model: Subject, attributes: ['id', 'name'] },
          ],
        },
      ],
    });

    return res.status(200).json(rows.map(toTeacherAbsenceDto));
  } catch (error) {
    console.error('Absences /teacher hiba:', error);
    return res.status(500).json({ message: 'Hiba történt a hiányzások lekérése során.' });
  }
});

router.post('/mark', authenticateToken, authorizeRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const studentId = normalizeUuid(req.body.student_id ?? req.body.studentId);
    const date = parseDateOnly(req.body.date);
    const timetableIds = Array.isArray(req.body.timetable_ids)
      ? req.body.timetable_ids.map(normalizeUuid).filter(Boolean)
      : [];

    if (!studentId || !date || timetableIds.length === 0) {
      return res.status(400).json({ message: 'A student_id, date és timetable_ids mezők kötelezőek.' });
    }

    const teacher = await getTeacherByUserId(req.user.id);
    if (req.user.role === 'teacher' && !teacher) {
      return res.status(403).json({ message: 'Nincs tanár profil rendelve ehhez a felhasználóhoz.' });
    }

    const restrictToTeacher = await shouldRestrictToTeacherAssignments(req, teacher);

    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: 'A tanuló nem található.' });
    }

    if (!student.class_id) {
      return res.status(409).json({ message: 'A tanuló nincs osztályhoz rendelve.' });
    }

    const timetables = await Timetable.findAll({
      where: { id: { [Op.in]: timetableIds } },
      include: [
        {
          model: ClassSubject,
          include: [
            { model: Class, attributes: ['id', 'name'] },
            { model: Subject, attributes: ['id', 'name'] },
          ],
        },
      ],
    });

    if (timetables.length !== timetableIds.length) {
      return res.status(404).json({ message: 'Egy vagy több kiválasztott óra nem található.' });
    }

    const invalidForClass = timetables.find((item) => item.ClassSubject?.class_id !== student.class_id);
    if (invalidForClass) {
      return res.status(403).json({ message: 'A kiválasztott óra nem a tanuló osztályához tartozik.' });
    }

    if (restrictToTeacher) {
      const invalidForTeacher = timetables.find((item) => item.ClassSubject?.teacher_id !== teacher.id);
      if (invalidForTeacher) {
        return res.status(403).json({ message: 'Csak a saját óráidhoz jelölhetsz hiányzást.' });
      }
    }

    const dayOfWeek = dayOfWeekFromDate(date);
    const invalidDay = timetables.find((item) => item.day_of_week !== dayOfWeek);
    if (invalidDay) {
      return res.status(400).json({ message: 'A dátum és az óra napja nem egyezik.' });
    }

    const existingRows = await Absence.findAll({
      where: {
        student_id: studentId,
        timetable_id: { [Op.in]: timetableIds },
        date,
      },
      attributes: ['id', 'timetable_id'],
    });

    const existingSet = new Set(existingRows.map((row) => row.timetable_id));
    const toCreate = timetables.filter((item) => !existingSet.has(item.id));

    if (toCreate.length === 0) {
      return res.status(409).json({ message: 'A kiválasztott órákra már létezik hiányzás ehhez a tanulóhoz.' });
    }

    await Absence.bulkCreate(
      toCreate.map((timetableItem) => ({
        student_id: studentId,
        class_subject_id: timetableItem.class_subject_id,
        timetable_id: timetableItem.id,
        entered_by_teacher_id: req.user.role === 'teacher' ? teacher.id : timetableItem.ClassSubject.teacher_id,
        date,
        justified: false,
        reason: null,
        notes: null,
      }))
    );

    const createdTimetableIds = toCreate.map((item) => item.id);

    const createdRows = await Absence.findAll({
      where: {
        student_id: studentId,
        timetable_id: { [Op.in]: createdTimetableIds },
        date,
      },
      include: [
        {
          model: Student,
          include: [{ model: User, attributes: ['id', 'full_name', 'username', 'email'] }],
        },
        {
          model: Timetable,
          attributes: ['id', 'lesson_number', 'day_of_week', 'room_number'],
        },
        {
          model: ClassSubject,
          include: [
            { model: Class, attributes: ['id', 'name'] },
            { model: Subject, attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['id', 'DESC']],
    });

    return res.status(201).json({
      message: 'Hiányzás sikeresen rögzítve.',
      created_count: createdRows.length,
      skipped_count: timetableIds.length - toCreate.length,
      items: createdRows.map(toTeacherAbsenceDto),
    });
  } catch (error) {
    console.error('Absences /mark hiba:', error);
    return res.status(500).json({ message: 'Hiba történt a hiányzás rögzítése során.' });
  }
});

module.exports = router;
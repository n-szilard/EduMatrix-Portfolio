const express = require('express');
const router = express.Router();

const { Op } = require('sequelize');

const { Note, Teacher, Student, User } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

const NOTE_CATEGORIES = ['Tanulmányi', 'Személyes', 'Emlékeztető'];
const TEACHER_INCLUDE = [{ model: Teacher, include: [{ model: User, attributes: ['full_name'] }] }];

async function getOrCreateTeacher(userId) {
  const [teacher] = await Teacher.findOrCreate({
    where: { user_id: userId },
    defaults: { user_id: userId },
  });
  return teacher;
}

async function getStudentByUserId(userId) {
  return Student.findOne({ where: { user_id: userId } });
}

function toNoteDto(noteInstance) {
  const n = noteInstance.toJSON ? noteInstance.toJSON() : noteInstance;
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    category: n.category,
    created_at: n.created_at,
    author: n.Teacher?.User?.full_name ?? null,
    teacher_id: n.teacher_id,
    student_id: n.student_id ?? null,
  };
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function parseDate(v) {
  if (!isNonEmptyString(v)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /api/notes
router.get(
  '/',
  authenticateToken,
  authorizeRoles(['teacher', 'admin', 'student']),
  async (req, res) => {
    try {
      const where = {};

      const q = isNonEmptyString(req.query.q) ? req.query.q.trim() : '';
      const category = isNonEmptyString(req.query.category) ? req.query.category.trim() : '';
      const from = parseDate(req.query.from);
      const to = parseDate(req.query.to);

      if (req.user.role === 'student') {
        const student = await getStudentByUserId(req.user.id);
        if (!student) {
          return res.status(404).json({ message: 'Tanuló profil nem található.' });
        }
        where.student_id = student.id;
      } else {
        const teacher = await getOrCreateTeacher(req.user.id);
        where.teacher_id = teacher.id;
      }

      if (category && category !== 'Összes') where.category = category;

      if (from || to) {
        where.created_at = {};
        if (from) where.created_at[Op.gte] = from;
        if (to) where.created_at[Op.lte] = to;
      }

      if (q) {
        const term = `%${q}%`;
        where[Op.or] = [{ title: { [Op.like]: term } }, { content: { [Op.like]: term } }];
      }

      const notes = await Note.findAll({
        where,
        order: [['created_at', 'DESC']],
        include: TEACHER_INCLUDE,
      });

      return res.status(200).json(notes.map(toNoteDto));
    } catch {
      return res.status(500).json({ message: 'Hiba történt a feljegyzések lekérése során.' });
    }
  }
);

// POST /api/notes
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['teacher', 'admin']),
  async (req, res) => {
    try {
      const teacher = await getOrCreateTeacher(req.user.id);

      const title = isNonEmptyString(req.body.title) ? req.body.title.trim() : '';
      const content = isNonEmptyString(req.body.content) ? req.body.content.trim() : '';
      const category = isNonEmptyString(req.body.category) ? req.body.category.trim() : '';
      const student_id = isNonEmptyString(req.body.student_id) ? req.body.student_id.trim() : '';

      if (!title || !content || !student_id) {
        return res.status(400).json({ message: 'Minden mező kitöltése kötelező.' });
      }
      if (!NOTE_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Érvénytelen kategória.' });
      }

      const student = await Student.findByPk(student_id);
      if (!student) {
        return res.status(404).json({ message: 'A tanuló nem található.' });
      }

      const created = await Note.create({
        teacher_id: teacher.id,
        student_id,
        title,
        category,
        content,
      });

      const hydrated = await Note.findByPk(created.id, { include: TEACHER_INCLUDE });
      return res.status(201).json(toNoteDto(hydrated));
    } catch {
      return res.status(500).json({ message: 'Hiba történt a feljegyzés létrehozása során.' });
    }
  }
);

// PUT /api/notes/:id
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['teacher', 'admin']),
  async (req, res) => {
    try {
      const note = await Note.findByPk(req.params.id);
      if (!note) return res.status(404).json({ message: 'Feljegyzés nem található.' });

      const teacher = await getOrCreateTeacher(req.user.id);
      if (note.teacher_id !== teacher.id) {
        return res.status(403).json({ message: 'Nincs jogosultság.' });
      }

      const title = isNonEmptyString(req.body.title) ? req.body.title.trim() : null;
      const content = isNonEmptyString(req.body.content) ? req.body.content.trim() : null;
      const category = isNonEmptyString(req.body.category) ? req.body.category.trim() : null;

      if (title !== null) note.title = title;
      if (content !== null) note.content = content;
      if (category !== null) {
        if (!NOTE_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Érvénytelen kategória.' });
        note.category = category;
      }

      await note.save();

      const hydrated = await Note.findByPk(note.id, { include: TEACHER_INCLUDE });
      return res.status(200).json(toNoteDto(hydrated));
    } catch {
      return res.status(500).json({ message: 'Hiba történt a feljegyzés módosítása során.' });
    }
  }
);

// DELETE /api/notes/:id
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(['teacher', 'admin']),
  async (req, res) => {
    try {
      const note = await Note.findByPk(req.params.id);
      if (!note) return res.status(404).json({ message: 'Feljegyzés nem található.' });

      const teacher = await getOrCreateTeacher(req.user.id);
      if (note.teacher_id !== teacher.id) {
        return res.status(403).json({ message: 'Nincs jogosultság.' });
      }

      await note.destroy();
      return res.status(204).send();
    } catch {
      return res.status(500).json({ message: 'Hiba történt a feljegyzés törlése során.' });
    }
  }
);

module.exports = router;

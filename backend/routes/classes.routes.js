const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { Class, Student, User } = require('../models');

const router = express.Router();

// POST uj osztály létrehozása
router.post('/', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { name } = req.body;
    const newClass = await Class.create({ name });
    res.status(201).json(newClass);
  } catch (error) {
    console.error('Hiba az osztály létrehozása során:', error);
    res.status(500).json({ error: 'Sikertelen osztály létrehozása' });
  }
});

// GET összes osztály lekérése
router.get('/', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const classes = await Class.findAll();
    res.json(classes);
  } catch (error) {
    console.error('Hiba az osztályok lekérése során:', error);
    res.status(500).json({ error: 'Sikertelen osztályok lekérése' });
  }
});

// GET összes diák listája (tanár/admin)
router.get('/students', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const students = await Student.findAll({
      order: [['id', 'ASC']],
      include: [
        {
          model: User,
          attributes: ['id', 'full_name', 'username', 'email'],
        },
        {
          model: Class,
          attributes: ['id', 'name'],
        },
      ],
    });
    return res.json(students);
  } catch (error) {
    console.error('Hiba az összes diák lekérése során:', error);
    return res.status(500).json({ error: 'Sikertelen diáklista lekérés' });
  }
});

// GET szabad diákok listája
router.get('/students/free', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const freeStudents = await Student.findAll({
      where: { class_id: null },
      include: [
        {
          model: User,
          attributes: ['id', 'full_name', 'username', 'email'],
        },
      ],
    });
    return res.json(freeStudents);
  } catch (error) {
    console.error('Hiba a szabad diákok lekérése során:', error);
    return res.status(500).json({ error: 'Sikertelen szabad diák lekérés' });
  }
});

// GET egy osztály lekérése ID alapján
router.get('/:id', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const classId = req.params.id;
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Osztály nem található' });
    }
    res.json(classData);
  } catch (error) {
    console.error('Hiba az osztály lekérése során:', error);
    res.status(500).json({ error: 'Sikertelen osztály lekérése' });
  }
});

// GET osztály diákjainak listája
router.get('/:id/students', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const classId = req.params.id;

    // Osztály ellenőrzés
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Osztály nem található' });
    }

    const students = await Student.findAll({
      where: { class_id: classId },
    });

    return res.json(students);
  } catch (error) {
    console.error('Hiba az osztály diákjainak lekérése során:', error);
    return res.status(500).json({ error: 'Sikertelen diáklista lekérés' });
  }
});

// PUT osztály átnevezése
router.put('/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const classId = req.params.id;
    const { name } = req.body;

    // Kötelező mező
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Az osztály neve kötelező' });
    }

    // Osztály ellenőrzés
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Osztály nem található' });
    }

    // Név ütközés ellenőrzés
    const existingByName = await Class.findOne({ where: { name: String(name).trim() } });
    if (existingByName && existingByName.id !== classId) {
      return res.status(409).json({ error: 'Ez az osztálynév már foglalt' });
    }

    classData.name = String(name).trim();
    await classData.save();

    return res.json(classData);
  } catch (error) {
    console.error('Hiba az osztály átnevezése során:', error);
    return res.status(500).json({ error: 'Sikertelen osztály átnevezés' });
  }
});

// DELETE osztály törlése, ha üres
router.delete('/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const classId = req.params.id;

    // Osztály ellenőrzés
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Osztály nem található' });
    }

    // Hozzárendelt diákok száma
    const assignedCount = await Student.count({
      where: { class_id: classId },
    });

    if (assignedCount > 0) {
      return res.status(400).json({ error: 'Az osztály nem törölhető, mert van hozzárendelt diák' });
    }

    await classData.destroy();
    return res.status(204).send();
  } catch (error) {
    console.error('Hiba az osztály törlése során:', error);
    return res.status(500).json({ error: 'Sikertelen osztály törlés' });
  }
});


// POST egy osztályhoz diák hozzárendelése
router.post('/:id/enroll', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const classId = req.params.id;
    const { student_id, studentId } = req.body;
    const resolvedStudentId = student_id || studentId;

    // Kötelező mező
    if (!resolvedStudentId) {
      return res.status(400).json({ error: 'A diák azonosítója kötelező' });
    }

    // Osztály ellenőrzés
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Osztály nem található' });
    }

    // Diák ellenőrzés
    const student = await Student.findByPk(resolvedStudentId);
    if (!student) {
      return res.status(404).json({ error: 'Diák nem található' });
    }

    // Hozzárendelés
    student.class_id = classId;
    await student.save();

    return res.json({
      message: 'Diák sikeresen hozzárendelve az osztályhoz',
      student,
    });
  } catch (error) {
    console.error('Hiba a diák osztályhoz rendelése során:', error);
    return res.status(500).json({ error: 'Sikertelen diák hozzárendelés' });
  }
});

// PUT diák osztályának módosítása
router.put('/:id/enroll/:studentId', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const classId = req.params.id;
    const studentId = req.params.studentId;

    // Osztály ellenőrzés
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Osztály nem található' });
    }

    // Diák ellenőrzés
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Diák nem található' });
    }

    // Osztályváltás
    student.class_id = classId;
    await student.save();

    return res.json({
      message: 'Diák osztálya sikeresen módosítva',
      student,
    });
  } catch (error) {
    console.error('Hiba a diák osztályának módosítása során:', error);
    return res.status(500).json({ error: 'Sikertelen osztálymódosítás' });
  }
});

// DELETE diák törlése az osztályból
router.delete('/:id/enroll/:studentId', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const classId = req.params.id;
    const studentId = req.params.studentId;

    // Osztály ellenőrzés
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Osztály nem található' });
    }

    // Diák ellenőrzés
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Diák nem található' });
    }

    // Osztálytagság ellenőrzés
    if (student.class_id !== classId) {
      return res.status(400).json({ error: 'A diák nem ebben az osztályban van' });
    }

    // Törlés az osztályból
    student.class_id = null;
    await student.save();

    return res.json({
      message: 'Diák sikeresen törölve az osztályból',
      student,
    });
  } catch (error) {
    console.error('Hiba a diák osztályból törlése során:', error);
    return res.status(500).json({ error: 'Sikertelen törlés az osztályból' });
  }
});


module.exports = router;
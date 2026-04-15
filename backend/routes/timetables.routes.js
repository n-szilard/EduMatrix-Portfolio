const express = require('express');
const router = express.Router();

const { Op } = require('sequelize');
const { Timetable, ClassSubject, Class, Subject, Teacher } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Apró kompatibilitási réteg: a frontend/REST kliens használhat camelCase mezőneveket is.
function normalizePayload(body) {
    return {
        class_subject_id: body.class_subject_id ?? body.classSubjectId,
        day_of_week: body.day_of_week ?? body.dayOfWeek,
        lesson_number: body.lesson_number ?? body.lessonNumber,
    };
}

function isValidDayOfWeek(value) {
    const allowed = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
    ];
    return allowed.includes(value);
}

// GET órarendek listázása
// Opcionális szűrés query paraméterekkel: ?class_subject_id=...&day_of_week=...&lesson_number=...
router.get(
    '/',
    authenticateToken,
    authorizeRoles(['admin', 'teacher', 'student', 'parent']),
    async (req, res) => {
        try {
            const where = {};

            if (req.query.class_subject_id) where.class_subject_id = req.query.class_subject_id;
            if (req.query.day_of_week) where.day_of_week = req.query.day_of_week;
            if (req.query.lesson_number) where.lesson_number = Number(req.query.lesson_number);

            const rows = await Timetable.findAll({
                where,
                order: [
                    ['day_of_week', 'ASC'],
                    ['lesson_number', 'ASC'],
                ],
                include: [
                    {
                        model: ClassSubject,
                        include: [{ model: Class }, { model: Subject }, { model: Teacher }],
                    },
                ],
            });

            return res.status(200).json(rows);
        } catch (error) {
            return res.status(500).json({ message: 'Hiba történt az órarendek lekérése során.' });
        }
    }
);

// GET órarend lekérése id alapján
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles(['admin', 'teacher', 'student', 'parent']),
    async (req, res) => {
        const { id } = req.params;

        try {
            const row = await Timetable.findByPk(id, {
                include: [
                    {
                        model: ClassSubject,
                        include: [{ model: Class }, { model: Subject }, { model: Teacher }],
                    },
                ],
            });

            if (!row) {
                return res.status(404).json({ message: 'Órarend bejegyzés nem található.' });
            }

            return res.status(200).json(row);
        } catch (error) {
            return res.status(500).json({ message: 'Hiba történt az órarend lekérése során.' });
        }
    }
);

// POST új órarend bejegyzés létrehozása
// Szabály: egy class_subject_id-hoz ugyanarra a napra és óraszámra nem lehet duplikált bejegyzés.
router.post(
    '/',
    authenticateToken,
    authorizeRoles(['admin']),
    async (req, res) => {
        const { class_subject_id, day_of_week, lesson_number } = normalizePayload(req.body);

        if (!class_subject_id || !day_of_week || lesson_number === undefined) {
            return res.status(400).json({ message: 'Minden mező kitöltése kötelező.' });
        }
        if (!isValidDayOfWeek(day_of_week)) {
            return res.status(400).json({ message: 'Érvénytelen nap (day_of_week).' });
        }
    if (!Number.isInteger(Number(lesson_number)) || Number(lesson_number) < 0) {
            return res.status(400).json({ message: 'Érvénytelen óraszám (lesson_number).' });
        }

        try {
            const classSubject = await ClassSubject.findByPk(class_subject_id);
            if (!classSubject) {
                return res.status(400).json({ message: 'A megadott class_subject_id nem létezik.' });
            }

            const exists = await Timetable.findOne({
                where: { class_subject_id, day_of_week, lesson_number: Number(lesson_number) },
            });
            if (exists) {
                return res.status(409).json({ message: 'Erre a napra és órára már van órarend bejegyzés ehhez a hozzárendeléshez.' });
            }

            const created = await Timetable.create({
                class_subject_id,
                day_of_week,
                lesson_number: Number(lesson_number),
            });

            return res.status(201).json(created);
        } catch (error) {
            return res.status(500).json({ message: 'Hiba történt az órarend létrehozása során.' });
        }
    }
);

// PATCH órarend bejegyzés módosítása
router.patch(
    '/:id',
    authenticateToken,
    authorizeRoles(['admin']),
    async (req, res) => {
        const { id } = req.params;
        const payload = normalizePayload(req.body);

        try {
            const row = await Timetable.findByPk(id);
            if (!row) {
                return res.status(404).json({ message: 'Órarend bejegyzés nem található.' });
            }

            if (payload.class_subject_id !== undefined) {
                const cs = await ClassSubject.findByPk(payload.class_subject_id);
                if (!cs) {
                    return res.status(400).json({ message: 'A megadott class_subject_id nem létezik.' });
                }
                row.class_subject_id = payload.class_subject_id;
            }
            if (payload.day_of_week !== undefined) {
                if (!isValidDayOfWeek(payload.day_of_week)) {
                    return res.status(400).json({ message: 'Érvénytelen nap (day_of_week).' });
                }
                row.day_of_week = payload.day_of_week;
            }
            if (payload.lesson_number !== undefined) {
                if (!Number.isInteger(Number(payload.lesson_number)) || Number(payload.lesson_number) < 0) {
                    return res.status(400).json({ message: 'Érvénytelen óraszám (lesson_number).' });
                }
                row.lesson_number = Number(payload.lesson_number);
            }

            // Ütközés ellenőrzés (ne legyen duplikáció a módosítás után)
            const conflict = await Timetable.findOne({
                where: {
                    id: { [Op.ne]: row.id },
                    class_subject_id: row.class_subject_id,
                    day_of_week: row.day_of_week,
                    lesson_number: row.lesson_number,
                },
            });
            if (conflict) {
                return res.status(409).json({ message: 'Ütközés: már van ilyen órarend bejegyzés (ugyanaz a class_subject_id + nap + óraszám).' });
            }

            await row.save();
            return res.status(200).json(row);
        } catch (error) {
            return res.status(500).json({ message: 'Hiba történt az órarend módosítása során.' });
        }
    }
);

// DELETE órarend bejegyzés törlése
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles(['admin']),
    async (req, res) => {
        const { id } = req.params;

        try {
            const row = await Timetable.findByPk(id);
            if (!row) {
                return res.status(404).json({ message: 'Órarend bejegyzés nem található.' });
            }

            await row.destroy();
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: 'Hiba történt az órarend törlése során.' });
        }
    }
);

module.exports = router;

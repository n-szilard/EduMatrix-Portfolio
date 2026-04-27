const app = require('./config/app');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, seedInitialData } = require('./models/index')

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/classes', require('./routes/classes.routes'));
app.use('/api/grades', require('./routes/grades.routes'));
app.use('/api/subjects', require('./routes/subjects.routes'));
app.use('/api/class-subjects', require('./routes/class-subjects.routes'));
app.use('/api/timetables', require('./routes/timetables.routes'));
app.use('/api/notes', require('./routes/notes.routes'));
app.use('/api/mail', require('./routes/mail.routes'));
app.use('/api/absences', require('./routes/absences.routes'));


// DB sync + szerver indítás
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Adatbázis kapcsolat OK');

        const syncAlter = process.env.DB_SYNC_ALTER === 'true';
        await sequelize.sync(syncAlter ? { alter: true } : undefined);
        await seedInitialData();

        app.listen(PORT, () => console.log(`Szerver fut: http://localhost:${PORT}`));
    } catch (error) {
        console.error('Indítási hiba:', error);
    }
})();

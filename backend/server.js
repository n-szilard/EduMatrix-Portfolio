const app = require('./config/app');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/index')

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users.routes'));

// DB sync + szerver indítás
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Adatbázis kapcsolat OK');

        await sequelize.sync({ alter: true });

        app.listen(PORT, () => console.log(`Szerver fut: http://localhost:${PORT}`));
    } catch (error) {
        console.error('Indítási hiba:', error);
    }
})();

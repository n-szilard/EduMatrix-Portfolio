const app = require('./config/app');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/index')

const port = process.env.PORT;

app.use(cors());
app.use(express.json());

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        sequelize.sync({ alter: true });

        app.listen(port, () => {
            console.log('Server listening on port: ' + port)
        })
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }

})();

// Routes
app.use('/api/users', require('./routes/users.routes'));

// DB sync + szerver indítás
const PORT = process.env.PORT || 3000;

sequelize.authenticate()
    .then(() => {
        console.log('Adatbázis kapcsolat OK');
        return sequelize.sync({ alter: false });
    })
    .then(() => {
        app.listen(PORT, () => console.log(`Szerver fut: http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('Indítási hiba:', err);
    });

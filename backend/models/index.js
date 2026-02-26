const { Sequelize } = require('sequelize');

const dbConfig = require('../config/database')

const sequelize = new Sequelize(
    dbConfig.dtbs,
    dbConfig.user,
    dbConfig.pass,
    {
        host: dbConfig.host,
        dialect: dbConfig.dialect,
        port: dbConfig.port,
        logging: dbConfig.logging
    }
);

// Modellek betöltése
const Role = require('./Role')(sequelize);
const User = require('./User')(sequelize);
const Class = require('./Class')(sequelize);
const Subject = require('./Subject')(sequelize);
const Teacher = require('./Teacher')(sequelize);
const Student = require('./Student')(sequelize);
const ClassSubject = require('./ClassSubject')(sequelize);
const Note = require('./Note')(sequelize);
const Absence = require('./Absence')(sequelize);
const Grade = require('./Grade')(sequelize);
const Timetable = require('./Timetable')(sequelize);

const models = {
    Role, User, Class, Subject, Teacher,
    Student, ClassSubject, Note, Absence, Grade, Timetable,
};

Object.values(models).forEach((model) => {
    if (typeof model.associate === 'function') {
        model.associate(models);
    }
});

module.exports = { sequelize, ...models }
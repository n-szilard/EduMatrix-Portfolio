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

// Role betöltés
const seedRoles = async () => {
    const roles = ['admin', 'teacher', 'student', 'parent', 'pending'];

    for (const name of roles) {
        await Role.findOrCreate({
            where: { name },
            defaults: { name },
        });
    }
};

// Alapértelmezett admin felhasználó hozzáadása
const seedAdminUser = async () => {
  const adminRole = await Role.findOne({ where: { name: 'admin' } });
  if (!adminRole) return;

  const existing = await User.findOne({ where: { username: 'admin' } });
  if (!existing) {
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
    await User.create({
      firstName: 'Admin',
      lastName: 'Admin',
      username: 'admin',
      email: 'admin@admin.com',
      password_hash,
      role_id: adminRole.id
    });
    console.log('Alapértelmezett admin fiók létrehozva.');
  }
};

sequelize.sync().then(() => {
    seedRoles();
    seedAdminUser();
}).catch((err) => {
    console.error('Adatbázis szinkronizálása sikertelen:', err);
});

module.exports = { sequelize, ...models }
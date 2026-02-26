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

const models = { Role, User };
console.log(models);

Object.values(models).forEach((model) => {
    if (typeof model.associate === 'function') {
        model.associate(models);
    }
});

module.exports = { sequelize, ...models }
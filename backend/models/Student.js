const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Student extends Model {
    static associate(models) {
      Student.belongsTo(models.User, { foreignKey: 'user_id' });
      Student.belongsTo(models.Class, { foreignKey: 'class_id' });
      Student.hasMany(models.Note, { foreignKey: 'student_id' });
      Student.hasMany(models.Absence, { foreignKey: 'student_id' });
      Student.hasMany(models.Grade, { foreignKey: 'student_id' });
    }
  }

  Student.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      class_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'classes', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'Student',
      tableName: 'students',
      timestamps: false,
    }
  );

  return Student;
};
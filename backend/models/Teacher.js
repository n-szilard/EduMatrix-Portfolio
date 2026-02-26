const { Model, DataTypes } = require('sequelize');

const UUID = DataTypes.UUID;

module.exports = (sequelize) => {
  class Teacher extends Model {
    static associate(models) {
      Teacher.belongsTo(models.User, { foreignKey: 'user_id' });
      Teacher.hasMany(models.Note, { foreignKey: 'teacher_id' });
      Teacher.hasMany(models.ClassSubject, { foreignKey: 'teacher_id' });
    }
  }

  Teacher.init(
    {
      id: {
        type: UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Teacher',
      tableName: 'teachers',
      timestamps: false,
    }
  );

  return Teacher;
};

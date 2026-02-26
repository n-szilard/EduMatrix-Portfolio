const { Model, DataTypes } = require('sequelize');

const UUID = DataTypes.UUID;

module.exports = (sequelize) => {
  class Class extends Model {
    static associate(models) {
      Class.hasMany(models.Student, { foreignKey: 'class_id' });
      Class.hasMany(models.ClassSubject, { foreignKey: 'class_id' });
    }
  }

  Class.init(
    {
      id: {
        type: UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: 'Class',
      tableName: 'classes',
      timestamps: false,
    }
  );

  return Class;
};

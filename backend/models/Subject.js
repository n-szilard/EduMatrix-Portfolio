const { Model, DataTypes } = require('sequelize');

const UUID = DataTypes.UUID;

module.exports = (sequelize) => {
  class Subject extends Model {
    static associate(models) {
      Subject.hasMany(models.ClassSubject, { foreignKey: 'subject_id' });
    }
  }

  Subject.init(
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
      modelName: 'Subject',
      tableName: 'subjects',
      timestamps: false,
    }
  );

  return Subject;
};

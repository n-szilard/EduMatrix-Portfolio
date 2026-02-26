const { Model, DataTypes } = require('sequelize');

const UUID = DataTypes.UUID;

module.exports = (sequelize) => {
  class Absence extends Model {
    static associate(models) {
      Absence.belongsTo(models.Student, { foreignKey: 'student_id' });
      Absence.belongsTo(models.ClassSubject, { foreignKey: 'class_subject_id' });
    }
  }

  Absence.init(
    {
      id: {
        type: UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      student_id: {
        type: UUID,
        allowNull: false,
        references: { model: 'students', key: 'id' },
      },
      class_subject_id: {
        type: UUID,
        allowNull: false,
        references: { model: 'class_subjects', key: 'id' },
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      justified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Absence',
      tableName: 'absences',
      timestamps: false,
    }
  );

  return Absence;
};

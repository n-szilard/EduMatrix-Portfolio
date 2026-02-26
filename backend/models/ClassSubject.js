const { Model, DataTypes } = require('sequelize');

const UUID = DataTypes.UUID;

module.exports = (sequelize) => {
  class ClassSubject extends Model {
    static associate(models) {
      ClassSubject.belongsTo(models.Class, { foreignKey: 'class_id' });
      ClassSubject.belongsTo(models.Subject, { foreignKey: 'subject_id' });
      ClassSubject.belongsTo(models.Teacher, { foreignKey: 'teacher_id' });
      ClassSubject.hasMany(models.Absence, { foreignKey: 'class_subject_id' });
      ClassSubject.hasMany(models.Grade, { foreignKey: 'class_subject_id' });
      ClassSubject.hasMany(models.Timetable, { foreignKey: 'class_subject_id' });
    }
  }

  ClassSubject.init(
    {
      id: {
        type: UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      class_id: {
        type: UUID,
        allowNull: false,
        references: { model: 'classes', key: 'id' },
      },
      subject_id: {
        type: UUID,
        allowNull: false,
        references: { model: 'subjects', key: 'id' },
      },
      teacher_id: {
        type: UUID,
        allowNull: false,
        references: { model: 'teachers', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'ClassSubject',
      tableName: 'class_subjects',
      timestamps: false,
    }
  );

  return ClassSubject;
};

const { Model, DataTypes } = require('sequelize');

const UUID = DataTypes.UUID;

module.exports = (sequelize) => {
  class Absence extends Model {
    static associate(models) {
      Absence.belongsTo(models.Student, { foreignKey: 'student_id' });
      Absence.belongsTo(models.ClassSubject, { foreignKey: 'class_subject_id' });
      Absence.belongsTo(models.Timetable, { foreignKey: 'timetable_id' });
      Absence.belongsTo(models.Teacher, { foreignKey: 'entered_by_teacher_id' });
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
      timetable_id: {
        type: UUID,
        allowNull: false,
      },
      entered_by_teacher_id: {
        type: UUID,
        allowNull: false,
        references: { model: 'teachers', key: 'id' },
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
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Absence',
      tableName: 'absences',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['student_id', 'timetable_id', 'date'],
          name: 'absences_student_id_timetable_id_date',
        },
      ],
    }
  );

  return Absence;
};

const { Model, DataTypes } = require('sequelize');

const UUID = DataTypes.UUID;

module.exports = (sequelize) => {
  class Grade extends Model {
    static associate(models) {
      Grade.belongsTo(models.Student, { foreignKey: 'student_id' });
      Grade.belongsTo(models.ClassSubject, { foreignKey: 'class_subject_id' });
    }
  }

  Grade.init(
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
      grade: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Grade',
      tableName: 'grades',
      timestamps: false,
    }
  );

  return Grade;
};

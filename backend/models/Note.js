const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Note extends Model {
    static associate(models) {
      Note.belongsTo(models.Student, { foreignKey: 'student_id' });
      Note.belongsTo(models.Teacher, { foreignKey: 'teacher_id' });
    }
  }

  Note.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'students', key: 'id' },
      },
      teacher_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'teachers', key: 'id' },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Note',
      tableName: 'notes',
      timestamps: false,
    }
  );

  return Note;
};
const { Model, DataTypes } = require('sequelize');


module.exports = (sequelize) => {
  class Timetable extends Model {
    static associate(models) {
      Timetable.belongsTo(models.ClassSubject, { foreignKey: 'class_subject_id' });
    }
  }

  Timetable.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      class_subject_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'class_subjects', key: 'id' },
      },
      day_of_week: {
        type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        allowNull: false,
      },
      lesson_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      room_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Timetable',
      tableName: 'timetable',
      timestamps: false,
    }
  );

  return Timetable;
};

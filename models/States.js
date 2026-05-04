const mongoose = require('mongoose');

const { Schema } = mongoose;

const statesSchema = new Schema(
  {
    stateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    funfacts: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.every((item) => typeof item === 'string');
        },
        message: 'funfacts must be an array of strings',
      },
    },
  }
);

module.exports = mongoose.model('States', statesSchema);
'use strict';

const mongoose = require('mongoose');

const docVersionSchema = new mongoose.Schema(
  {
    docId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Documentation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    commitHash: {
      type: String,
      default: '',
    },
    changeMessage: {
      type: String,
      default: 'Updated documentation',
      maxlength: 200,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.versionId = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('DocVersion', docVersionSchema);
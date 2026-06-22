import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const projectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectName: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', maxlength: 1000 },
    repoFullName: { type: String },
    members: {
      type: [
        {
          _id: false,
          userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          login: String,
          avatarUrl: String,
          role: { type: String, enum: ['owner', 'editor'], default: 'editor' },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const r = ret as Record<string, unknown>;
        r.projectId = r._id;
        delete r._id;
        delete r.id;
        delete r.__v;
        return r;
      },
    },
  },
);

export type ProjectDoc = InferSchemaType<typeof projectSchema> & { _id: unknown };
export const Project: Model<ProjectDoc> = model<ProjectDoc>('Project', projectSchema);
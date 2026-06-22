import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const documentationSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '' },
    format: { type: String, enum: ['markdown'], default: 'markdown' },
    currentVersion: { type: Number, default: 1 },
    generatedAt: { type: Date, default: Date.now },
    sourceRepo: { type: String },
    sourceBindings: {
      type: [
        {
          _id: false,
          repoFullName: String,
          path: String,
          branch: String,
          commitSha: String,
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
        r.docId = r._id;
        delete r._id;
        delete r.id;
        delete r.__v;
        return r;
      },
    },
  },
);

export type DocumentationDoc = InferSchemaType<typeof documentationSchema> & { _id: unknown };
export const Documentation: Model<DocumentationDoc> = model<DocumentationDoc>(
  'Documentation',
  documentationSchema,
);
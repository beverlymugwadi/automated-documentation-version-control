import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const developerNoteSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    content: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const r = ret as Record<string, unknown>;
        r.noteId = r._id;
        delete r._id;
        delete r.id;
        delete r.__v;
        return r;
      },
    },
  },
);

export type DeveloperNoteDoc = InferSchemaType<typeof developerNoteSchema> & { _id: unknown };
export const DeveloperNote: Model<DeveloperNoteDoc> = model<DeveloperNoteDoc>(
  'DeveloperNote',
  developerNoteSchema,
);
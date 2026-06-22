import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const sourceCodeFileSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, default: '' },
    fileContent: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const r = ret as Record<string, unknown>;
        r.fileId = r._id;
        delete r._id;
        delete r.id;
        delete r.__v;
        return r;
      },
    },
  },
);

export type SourceCodeFileDoc = InferSchemaType<typeof sourceCodeFileSchema> & { _id: unknown };
export const SourceCodeFile: Model<SourceCodeFileDoc> = model<SourceCodeFileDoc>(
  'SourceCodeFile',
  sourceCodeFileSchema,
);
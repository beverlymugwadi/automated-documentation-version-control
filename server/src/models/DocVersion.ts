import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

/** DocVersion — an immutable snapshot linked to a git commit hash. */
const docVersionSchema = new Schema(
  {
    docId: { type: Schema.Types.ObjectId, ref: 'Documentation', required: true, index: true },
    versionNo: { type: Number, required: true },
    commitHash: { type: String, default: null },
    content: { type: String, required: true },
    message: { type: String, default: '' },
    // How this version was created (for the timeline).
    source: { type: String, enum: ['generate', 'edit', 'rollback', 'regenerate'], default: 'edit' },
    // Contributor attribution — who created this version.
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    authorLogin: { type: String },
    authorAvatarUrl: { type: String },
    // External publish: set when this version was committed to GitHub.
    externalCommitSha: { type: String },
    externalCommitUrl: { type: String },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const r = ret as Record<string, unknown>;
        r.versionId = r._id;
        delete r._id;
        delete r.id;
        delete r.__v;
        return r;
      },
    },
  },
);

docVersionSchema.index({ docId: 1, versionNo: 1 }, { unique: true });

export type DocVersionDoc = InferSchemaType<typeof docVersionSchema> & { _id: unknown };
export const DocVersion: Model<DocVersionDoc> = model<DocVersionDoc>('DocVersion', docVersionSchema);

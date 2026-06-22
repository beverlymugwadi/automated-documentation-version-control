import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    githubId: { type: String, index: true, sparse: true },
    githubLogin: { type: String },
    githubAccessToken: { type: String, select: false },
    avatarUrl: { type: String },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const r = ret as Record<string, unknown>;
        r.userId = r._id;
        delete r._id;
        delete r.id;
        delete r.__v;
        delete r.passwordHash;
        delete r.githubAccessToken;
        return r;
      },
    },
  },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: unknown };
export const User: Model<UserDoc> = model<UserDoc>('User', userSchema);
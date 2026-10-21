import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBatchNodeDocument extends Document {
  institutionId: Types.ObjectId;
  code: string;
  name: string;
  parentBatchId?: Types.ObjectId | null;
  ancestorIds: Types.ObjectId[];
  depth: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BatchNodeSchema = new Schema<IBatchNodeDocument>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    parentBatchId: { type: Schema.Types.ObjectId, ref: 'BatchNode', default: null },
    ancestorIds: [{ type: Schema.Types.ObjectId, ref: 'BatchNode' }],
    depth: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

BatchNodeSchema.index({ institutionId: 1, code: 1 }, { unique: true });
BatchNodeSchema.index({ institutionId: 1, parentBatchId: 1 });

export const BatchNodeModel = mongoose.model<IBatchNodeDocument>('BatchNode', BatchNodeSchema);

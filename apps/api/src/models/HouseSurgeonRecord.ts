import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHouseSurgeonRecordDocument extends Document {
  institutionId: Types.ObjectId;
  name: string;
  batchNodeIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HouseSurgeonRecordSchema = new Schema<IHouseSurgeonRecordDocument>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    name: { type: String, required: true, trim: true },
    batchNodeIds: [{ type: Schema.Types.ObjectId, ref: 'BatchNode', required: true }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

HouseSurgeonRecordSchema.index({ institutionId: 1, name: 1 });
HouseSurgeonRecordSchema.index({ institutionId: 1, batchNodeIds: 1 });

export const HouseSurgeonRecordModel = mongoose.model<IHouseSurgeonRecordDocument>(
  'HouseSurgeonRecord',
  HouseSurgeonRecordSchema
);

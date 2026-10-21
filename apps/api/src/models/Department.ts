import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDepartmentDocument extends Document {
  institutionId: Types.ObjectId;
  name: string;
  abbreviation: string;
  aliases: string[];
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartmentDocument>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    name: { type: String, required: true, trim: true },
    abbreviation: { type: String, required: true, trim: true },
    aliases: [{ type: String, trim: true }],
    color: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

DepartmentSchema.index({ institutionId: 1, name: 1 }, { unique: true });
DepartmentSchema.index({ institutionId: 1, abbreviation: 1 });

export const DepartmentModel = mongoose.model<IDepartmentDocument>('Department', DepartmentSchema);

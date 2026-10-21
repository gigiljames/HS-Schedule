import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionDocument extends Document {
  name: string;
  shortName: string;
  location: string;
  codeHash: string;
  codePrefix: string;
  plainCode?: string;
  allowNewJoinees: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InstitutionSchema = new Schema<IInstitutionDocument>(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    codeHash: { type: String, required: true },
    codePrefix: { type: String, required: true },
    plainCode: { type: String },
    allowNewJoinees: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

InstitutionSchema.index({ name: 1 });
InstitutionSchema.index({ shortName: 1 });

export const InstitutionModel = mongoose.model<IInstitutionDocument>('Institution', InstitutionSchema);

import { departmentRepository } from '../repositories/departmentRepository.js';
import { ScheduleAssignmentModel } from '../models/ScheduleAssignment.js';
import { IDepartment } from '../shared/index.js';

// Predefined accessible palette with high-contrast text compatibility
export const PREDEFINED_PALETTE = [
  '#2563EB', // Royal Blue (GM)
  '#059669', // Emerald Green (Surgery)
  '#DC2626', // Crimson Red (Emergency / Casualty)
  '#D97706', // Amber / Orange (Pediatrics)
  '#7C3AED', // Violet / Purple (OBG)
  '#0891B2', // Cyan (Orthopedics)
  '#DB2777', // Pink (Dermatology)
  '#4B5563', // Slate (Psychiatry)
  '#4338CA', // Indigo (Ophthalmology)
  '#0D9488', // Teal (ENT)
  '#65A30D', // Lime (Community Medicine)
  '#9333EA', // Purple (Radiology)
  '#EA580C', // Rust (Anesthesia)
  '#475569', // Dark Slate (Forensic Medicine)
  '#B45309'  // Ochre (Pathology)
];

export class DepartmentService {
  async createDepartment(data: {
    institutionId: string;
    name: string;
    abbreviation: string;
    aliases?: string[];
    color?: string;
  }): Promise<IDepartment> {
    const existing = await departmentRepository.findByInstitutionAndName(data.institutionId, data.name);
    if (existing) {
      throw new Error(`Department with name "${data.name}" already exists in this institution`);
    }

    // Assign color from predefined palette cycling through existing count
    let assignedColor = data.color;
    if (!assignedColor) {
      const all = await departmentRepository.getAllActiveByInstitution(data.institutionId);
      assignedColor = PREDEFINED_PALETTE[all.length % PREDEFINED_PALETTE.length];
    }

    const doc = await departmentRepository.create({
      institutionId: data.institutionId as any,
      name: data.name.trim(),
      abbreviation: data.abbreviation.trim().toUpperCase(),
      aliases: (data.aliases || []).map((a) => a.trim()).filter(Boolean),
      color: assignedColor,
      isActive: true
    });

    return this.toDto(doc);
  }

  async updateDepartment(
    id: string,
    data: { name?: string; abbreviation?: string; aliases?: string[]; color?: string; isActive?: boolean }
  ): Promise<IDepartment> {
    const doc = await departmentRepository.update(id, data);
    if (!doc) throw new Error('Department not found');
    return this.toDto(doc);
  }

  async deleteDepartment(id: string): Promise<void> {
    await ScheduleAssignmentModel.deleteMany({ departmentId: id });
    await departmentRepository.delete(id);
  }

  async getDepartments(
    institutionId: string,
    query: { search?: string; page?: number; pageSize?: number }
  ): Promise<{ items: IDepartment[]; total: number }> {
    const { items, total } = await departmentRepository.listByInstitution(institutionId, query);
    return {
      items: items.map(this.toDto),
      total
    };
  }

  async getAllActive(institutionId: string): Promise<IDepartment[]> {
    const items = await departmentRepository.getAllActiveByInstitution(institutionId);
    return items.map(this.toDto);
  }

  private toDto(doc: any): IDepartment {
    return {
      id: doc._id.toString(),
      institutionId: doc.institutionId.toString(),
      name: doc.name,
      abbreviation: doc.abbreviation,
      aliases: doc.aliases || [],
      color: doc.color,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}

export const departmentService = new DepartmentService();

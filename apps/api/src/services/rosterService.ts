import { rosterRepository } from '../repositories/rosterRepository.js';
import { batchRepository } from '../repositories/batchRepository.js';
import { InstitutionMembershipModel } from '../models/InstitutionMembership.js';
import { IHouseSurgeonRecord } from '../shared/index.js';

export class RosterService {
  async createRosterRecord(data: {
    institutionId: string;
    name: string;
    batchNodeIds: string[];
  }): Promise<{ record: IHouseSurgeonRecord; warning?: string }> {
    const trimmedName = data.name.trim();

    // Validate referenced batch nodes
    if (!data.batchNodeIds || data.batchNodeIds.length === 0) {
      throw new Error('At least one batch membership must be selected');
    }

    const batches = await batchRepository.findByIds(data.batchNodeIds);
    if (batches.length !== data.batchNodeIds.length) {
      throw new Error('One or more referenced batch nodes do not exist');
    }

    for (const b of batches) {
      if (b.institutionId.toString() !== data.institutionId) {
        throw new Error('All referenced batch nodes must belong to the same institution');
      }
    }

    // Check for similar existing names to warn admin
    let warning: string | undefined;
    const existing = await rosterRepository.findByName(data.institutionId, trimmedName);
    if (existing) {
      warning = `Notice: A house surgeon record with the name "${trimmedName}" already exists in this institution.`;
    }

    const doc = await rosterRepository.create({
      institutionId: data.institutionId as any,
      name: trimmedName,
      batchNodeIds: data.batchNodeIds as any,
      isActive: true
    });

    return {
      record: this.toDto(doc),
      warning
    };
  }

  async updateRosterRecord(
    id: string,
    data: { name?: string; batchNodeIds?: string[]; isActive?: boolean }
  ): Promise<IHouseSurgeonRecord> {
    const record = await rosterRepository.findById(id);
    if (!record) throw new Error('Roster record not found');

    if (data.batchNodeIds) {
      const batches = await batchRepository.findByIds(data.batchNodeIds);
      if (batches.length !== data.batchNodeIds.length) {
        throw new Error('One or more referenced batch nodes do not exist');
      }
    }

    const doc = await rosterRepository.update(id, data as any);
    return this.toDto(doc!);
  }

  async deleteRosterRecord(id: string): Promise<void> {
    await InstitutionMembershipModel.updateMany(
      { defaultScheduleRecordId: id },
      { $unset: { defaultScheduleRecordId: 1 } }
    );
    await rosterRepository.delete(id);
  }

  async getRosterRecord(id: string): Promise<IHouseSurgeonRecord> {
    const doc = await rosterRepository.findById(id);
    if (!doc) throw new Error('Roster record not found');
    return this.toDto(doc);
  }

  async listRosterRecords(
    institutionId: string,
    query: { search?: string; batchNodeId?: string; page?: number; pageSize?: number; all?: boolean }
  ): Promise<{ items: IHouseSurgeonRecord[]; total: number }> {
    const { items, total } = await rosterRepository.list(institutionId, query);
    return {
      items: items.map(this.toDto),
      total
    };
  }

  async getAllActive(institutionId: string): Promise<IHouseSurgeonRecord[]> {
    const items = await rosterRepository.getAllActiveByInstitution(institutionId);
    return items.map(this.toDto);
  }

  private toDto(doc: any): IHouseSurgeonRecord {
    return {
      id: doc._id.toString(),
      institutionId: doc.institutionId.toString(),
      name: doc.name,
      batchNodeIds: (doc.batchNodeIds || []).map((b: any) => (b._id ? b._id.toString() : b.toString())),
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}

export const rosterService = new RosterService();

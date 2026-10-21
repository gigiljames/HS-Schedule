import { institutionRepository } from '../repositories/institutionRepository.js';
import { generateAccessCode, hashAccessCode } from '../utils/accessCode.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { InstitutionModel } from '../models/Institution.js';
import { HouseSurgeonRecordModel } from '../models/HouseSurgeonRecord.js';
import { UserModel } from '../models/User.js';
import { InstitutionMembershipModel } from '../models/InstitutionMembership.js';
import { ScheduleVersionModel } from '../models/ScheduleVersion.js';
import { IInstitution, IInstitutionMembership } from '../shared/index.js';

export class InstitutionService {
  async createInstitution(data: { name: string; shortName: string; location: string }): Promise<{ institution: IInstitution; accessCode: string }> {
    const { plainCode, codeHash, codePrefix } = generateAccessCode(data.shortName);

    const doc = await institutionRepository.create({
      name: data.name.trim(),
      shortName: data.shortName.trim().toUpperCase(),
      location: data.location.trim(),
      codeHash,
      codePrefix,
      plainCode,
      isActive: true
    });

    return {
      institution: this.toDto(doc),
      accessCode: plainCode
    };
  }

  async updateInstitution(id: string, data: { name?: string; shortName?: string; location?: string; isActive?: boolean }): Promise<IInstitution> {
    const doc = await institutionRepository.update(id, data);
    if (!doc) throw new Error('Institution not found');
    return this.toDto(doc);
  }

  async rotateAccessCode(id: string): Promise<{ accessCode: string; codePrefix: string }> {
    const institution = await institutionRepository.findById(id);
    if (!institution) throw new Error('Institution not found');

    const { plainCode, codeHash, codePrefix } = generateAccessCode(institution.shortName);
    await institutionRepository.update(id, { codeHash, codePrefix, plainCode });

    return { accessCode: plainCode, codePrefix };
  }

  async revokeAccessCode(id: string): Promise<void> {
    // Overwrite with an invalid hash to revoke current code
    await institutionRepository.update(id, { codeHash: 'REVOKED_' + Date.now(), plainCode: undefined });
  }

  async getInstitutionById(id: string): Promise<IInstitution> {
    const doc = await institutionRepository.findById(id);
    if (!doc) throw new Error('Institution not found');
    return this.toDto(doc);
  }

  async listInstitutions(query: { search?: string; page?: number; pageSize?: number }): Promise<{ items: IInstitution[]; total: number }> {
    const { items, total } = await institutionRepository.list(query);
    return {
      items: items.map(this.toDto),
      total
    };
  }

  async toggleAllowNewJoinees(id: string, allow: boolean): Promise<IInstitution> {
    const updated = await institutionRepository.update(id, { allowNewJoinees: allow } as any);
    if (!updated) throw new Error('Institution not found');
    return this.toDto(updated);
  }

  // Membership & Joining
  async joinByAccessCode(userId: string, accessCode: string): Promise<{ membership: IInstitutionMembership; institution: IInstitution }> {
    const codeHash = hashAccessCode(accessCode);
    const institution = await institutionRepository.findByCodeHash(codeHash);

    if (!institution) {
      throw new Error('Invalid or expired institution access code. Please check the code with your college administrator.');
    }

    if (institution.allowNewJoinees === false) {
      throw new Error('The administrator has closed the institution and new joinees are not allowed.');
    }

    const membershipDoc = await institutionRepository.createOrUpdateMembership(userId, institution._id.toString(), {
      status: 'active'
    });

    return {
      membership: this.toMembershipDto(membershipDoc),
      institution: this.toDto(institution)
    };
  }

  async getActiveMembership(userId: string): Promise<{ membership: IInstitutionMembership; institution: IInstitution } | null> {
    const membership = await institutionRepository.findActiveMembershipByUser(userId);
    if (!membership || !membership.institutionId) return null;

    return {
      membership: this.toMembershipDto(membership),
      institution: this.toDto(membership.institutionId as any)
    };
  }

  async setDefaultScheduleProfile(userId: string, institutionId: string, rosterRecordId: string): Promise<IInstitutionMembership> {
    const membership = await institutionRepository.updateMembership(userId, institutionId, {
      defaultScheduleRecordId: rosterRecordId as any
    });
    if (!membership) throw new Error('Institution membership not found');
    return this.toMembershipDto(membership);
  }

  async updateNotificationPreferences(
    userId: string,
    institutionId: string,
    preferences: Partial<IInstitutionMembership['notificationPreferences']>
  ): Promise<IInstitutionMembership> {
    const membership = await institutionRepository.findMembership(userId, institutionId);
    if (!membership) throw new Error('Institution membership not found');

    const updated = await institutionRepository.updateMembership(userId, institutionId, {
      notificationPreferences: {
        ...membership.notificationPreferences,
        ...preferences
      }
    });

    return this.toMembershipDto(updated!);
  }

  async leaveInstitution(userId: string, institutionId: string): Promise<void> {
    const membership = await institutionRepository.findMembership(userId, institutionId);
    if (!membership) return;

    // Set membership to inactive
    await institutionRepository.updateMembership(userId, institutionId, { status: 'inactive' });

    // Cancel pending notification events for this membership
    await notificationRepository.cancelEventsForMembership(membership._id.toString());
  }

  async removeMember(institutionId: string, membershipId: string): Promise<void> {
    if (!membershipId || membershipId === 'undefined') {
      throw new Error('Valid membership ID is required');
    }
    await institutionRepository.removeMembership(membershipId);
    await notificationRepository.cancelEventsForMembership(membershipId);
  }

  async getGlobalStats(): Promise<{
    totalInstitutions: number;
    totalRosterRecords: number;
    totalHsAccounts: number;
    totalActiveMemberships: number;
    institutionsWithPublishedSchedule: number;
  }> {
    const [
      totalInstitutions,
      totalRosterRecords,
      totalHsAccounts,
      totalActiveMemberships,
      publishedInstitutions
    ] = await Promise.all([
      InstitutionModel.countDocuments({ isActive: true }),
      HouseSurgeonRecordModel.countDocuments({ isActive: true }),
      UserModel.countDocuments({ role: 'hs' }),
      InstitutionMembershipModel.countDocuments({ status: 'active' }),
      ScheduleVersionModel.distinct('institutionId', { status: 'published' })
    ]);

    return {
      totalInstitutions,
      totalRosterRecords,
      totalHsAccounts,
      totalActiveMemberships,
      institutionsWithPublishedSchedule: publishedInstitutions.length
    };
  }

  private toDto(doc: any): IInstitution {
    return {
      id: doc._id.toString(),
      name: doc.name,
      shortName: doc.shortName,
      location: doc.location,
      codePrefix: doc.codePrefix,
      plainCode: doc.plainCode,
      allowNewJoinees: doc.allowNewJoinees !== false,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  private toMembershipDto(doc: any): IInstitutionMembership {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      institutionId: (doc.institutionId._id || doc.institutionId).toString(),
      status: doc.status,
      defaultScheduleRecordId: doc.defaultScheduleRecordId ? doc.defaultScheduleRecordId.toString() : undefined,
      notificationPreferences: doc.notificationPreferences,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}

export const institutionService = new InstitutionService();

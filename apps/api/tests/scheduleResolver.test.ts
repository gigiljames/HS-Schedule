import { describe, it, expect } from 'vitest';
import {
  resolvePostingsForDate,
  resolveAgenda,
  isDateInRange,
  getDayBefore,
  doRangesOverlap,
  IBatchNode,
  IDepartment,
  IRotationTrack,
  IScheduleAssignment,
} from '../src/shared/index.js';

describe('Schedule Resolution Engine & Inclusive Math', () => {
  const departments: IDepartment[] = [
    {
      id: 'dept-gm',
      institutionId: 'inst-1',
      name: 'General Medicine',
      abbreviation: 'GM',
      aliases: ['Medicine'],
      color: '#2563EB',
      isActive: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'dept-peds',
      institutionId: 'inst-1',
      name: 'Pediatrics',
      abbreviation: 'PED',
      aliases: [],
      color: '#D97706',
      isActive: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'dept-surg',
      institutionId: 'inst-1',
      name: 'General Surgery',
      abbreviation: 'GS',
      aliases: ['Surgery'],
      color: '#059669',
      isActive: true,
      createdAt: '',
      updatedAt: ''
    }
  ];

  const departmentMap = new Map(departments.map((d) => [d.id, d]));

  // Batch hierarchy: A -> A1 -> A1a, B
  const batches: IBatchNode[] = [
    {
      id: 'batch-a',
      institutionId: 'inst-1',
      code: 'A',
      name: 'Batch A',
      parentBatchId: null,
      ancestorIds: [],
      depth: 0,
      isActive: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'batch-a1',
      institutionId: 'inst-1',
      code: 'A1',
      name: 'Batch A1',
      parentBatchId: 'batch-a',
      ancestorIds: ['batch-a'],
      depth: 1,
      isActive: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'batch-a1a',
      institutionId: 'inst-1',
      code: 'A1a',
      name: 'Sub-batch A1a',
      parentBatchId: 'batch-a1',
      ancestorIds: ['batch-a', 'batch-a1'],
      depth: 2,
      isActive: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'batch-b',
      institutionId: 'inst-1',
      code: 'B',
      name: 'Batch B',
      parentBatchId: null,
      ancestorIds: [],
      depth: 0,
      isActive: true,
      createdAt: '',
      updatedAt: ''
    }
  ];

  const batchMap = new Map(batches.map((b) => [b.id, b]));

  const tracks: IRotationTrack[] = [
    {
      id: 'track-main',
      scheduleVersionId: 'ver-1',
      name: 'Main Rotation',
      order: 0,
      inheritParentAssignments: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'track-sub',
      scheduleVersionId: 'ver-1',
      name: 'Sub-Rotation',
      order: 1,
      inheritParentAssignments: true,
      createdAt: '',
      updatedAt: ''
    }
  ];

  const periods: ISchedulePeriod[] = [
    {
      id: 'period-main-1',
      scheduleVersionId: 'ver-1',
      rotationTrackId: 'track-main',
      startDate: '2026-10-07',
      endDate: '2026-10-21',
      order: 0,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'period-sub-1',
      scheduleVersionId: 'ver-1',
      rotationTrackId: 'track-sub',
      startDate: '2026-10-07',
      endDate: '2026-10-14',
      order: 0,
      createdAt: '',
      updatedAt: ''
    }
  ];

  it('correctly resolves inclusive date ranges and day-before reminders', () => {
    expect(isDateInRange('2026-10-07', '2026-10-07', '2026-10-21')).toBe(true);
    expect(isDateInRange('2026-10-21', '2026-10-07', '2026-10-21')).toBe(true);
    expect(isDateInRange('2026-10-14', '2026-10-07', '2026-10-21')).toBe(true);
    expect(isDateInRange('2026-10-06', '2026-10-07', '2026-10-21')).toBe(false);
    expect(isDateInRange('2026-10-22', '2026-10-07', '2026-10-21')).toBe(false);

    // Day before inclusive end date
    expect(getDayBefore('2026-10-21')).toBe('2026-10-20');
    expect(getDayBefore('2026-11-01')).toBe('2026-10-31');

    // Overlapping period detection within the same track
    expect(doRangesOverlap('2026-10-07', '2026-10-14', '2026-10-10', '2026-10-20')).toBe(true);
    expect(doRangesOverlap('2026-10-07', '2026-10-14', '2026-10-15', '2026-10-21')).toBe(false);
  });

  it('inherits parent batch assignment when child has no explicit assignment', () => {
    // Parent A is assigned to General Medicine
    const assignments: IScheduleAssignment[] = [
      {
        id: 'assign-1',
        scheduleVersionId: 'ver-1',
        rotationTrackId: 'track-main',
        periodId: 'period-main-1',
        departmentId: 'dept-gm',
        batchNodeId: 'batch-a',
        createdAt: '',
        updatedAt: ''
      }
    ];

    // Roster surgeon assigned directly to leaf batch A1a
    const resolved = resolvePostingsForDate(
      {
        rosterBatchNodeIds: ['batch-a1a'],
        batchMap,
        tracks: [tracks[0]],
        periods: [periods[0]],
        assignments,
        departmentMap
      },
      '2026-10-10'
    );

    expect(resolved.length).toBe(1);
    expect(resolved[0].departmentName).toBe('General Medicine');
    expect(resolved[0].matchedBatchCode).toBe('A');
    expect(resolved[0].isOverride).toBe(false);
  });

  it('allows more-specific child batch to override parent batch assignment', () => {
    // Parent A is assigned to General Medicine
    // Child A1a is assigned to Pediatrics for the same period
    const assignments: IScheduleAssignment[] = [
      {
        id: 'assign-1',
        scheduleVersionId: 'ver-1',
        rotationTrackId: 'track-main',
        periodId: 'period-main-1',
        departmentId: 'dept-gm',
        batchNodeId: 'batch-a',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'assign-2',
        scheduleVersionId: 'ver-1',
        rotationTrackId: 'track-main',
        periodId: 'period-main-1',
        departmentId: 'dept-peds',
        batchNodeId: 'batch-a1a',
        createdAt: '',
        updatedAt: ''
      }
    ];

    const resolved = resolvePostingsForDate(
      {
        rosterBatchNodeIds: ['batch-a1a'],
        batchMap,
        tracks: [tracks[0]],
        periods: [periods[0]],
        assignments,
        departmentMap
      },
      '2026-10-10'
    );

    expect(resolved.length).toBe(1);
    expect(resolved[0].departmentName).toBe('Pediatrics'); // Child override won!
    expect(resolved[0].matchedBatchCode).toBe('A1a');
    expect(resolved[0].isOverride).toBe(true);
  });

  it('allows multiple rotation tracks with overlapping dates to coexist', () => {
    // Main rotation: A -> General Surgery
    // Sub-rotation: A1a -> Pediatrics
    const assignments: IScheduleAssignment[] = [
      {
        id: 'assign-main',
        scheduleVersionId: 'ver-1',
        rotationTrackId: 'track-main',
        periodId: 'period-main-1',
        departmentId: 'dept-surg',
        batchNodeId: 'batch-a',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'assign-sub',
        scheduleVersionId: 'ver-1',
        rotationTrackId: 'track-sub',
        periodId: 'period-sub-1',
        departmentId: 'dept-peds',
        batchNodeId: 'batch-a1a',
        createdAt: '',
        updatedAt: ''
      }
    ];

    const resolved = resolvePostingsForDate(
      {
        rosterBatchNodeIds: ['batch-a1a'],
        batchMap,
        tracks,
        periods,
        assignments,
        departmentMap
      },
      '2026-10-09'
    );

    expect(resolved.length).toBe(2);
    expect(resolved.some((r) => r.trackName === 'Main Rotation' && r.departmentName === 'General Surgery')).toBe(true);
    expect(resolved.some((r) => r.trackName === 'Sub-Rotation' && r.departmentName === 'Pediatrics')).toBe(true);
  });
});

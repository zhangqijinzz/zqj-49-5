/**
 * 噪音记录状态管理
 * 使用 Zustand 实现全局状态管理，并通过 localStorage 进行数据持久化
 */

import { create } from 'zustand';
import type { NoiseRecord, Evidence, NoiseType, ImpactCategory, RecordTemplate } from '@/types';
import { generateId } from '@/utils/idUtils';

// ==================== 类型定义 ====================

/**
 * 筛选条件类型定义
 */
export interface Filters {
  dateRange: {
    start: string | null;  // 起始日期（YYYY-MM-DD）
    end: string | null;    // 结束日期（YYYY-MM-DD）
  };
  noiseTypes: NoiseType[];        // 选中的噪音类型
  impactTagIds: string[];         // 选中的影响标签ID
  keyword: string;                // 搜索关键词
}

/**
 * Store 状态类型
 */
export interface RecordsState {
  // ===== 数据状态 =====
  records: NoiseRecord[];         // 噪音记录列表
  evidence: Evidence[];           // 证据材料列表
  templates: RecordTemplate[];    // 记录模板列表

  // ===== UI 状态 =====
  isFormModalOpen: boolean;       // 记录表单弹窗是否打开
  editingRecordId: string | null; // 当前编辑的记录ID（null表示新增）
  previewEvidenceId: string | null; // 当前预览的证据ID
  templateToApply: RecordTemplate | null; // 待应用的模板（新建记录时使用）

  // ===== 筛选状态 =====
  filters: Filters;

  // ===== 记录操作方法 =====
  addRecord: (record: Omit<NoiseRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRecord: (id: string, partial: Partial<NoiseRecord>) => void;
  deleteRecord: (id: string) => void;

  // ===== 证据操作方法 =====
  addEvidence: (evidence: Omit<Evidence, 'id' | 'createdAt'>) => void;
  deleteEvidence: (id: string) => void;

  // ===== 模板操作方法 =====
  addTemplate: (template: Omit<RecordTemplate, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => void;
  updateTemplate: (id: string, partial: Partial<RecordTemplate>) => void;
  deleteTemplate: (id: string) => void;
  reorderTemplates: (templateIds: string[]) => void;
  createTemplateFromRecord: (recordId: string, name: string) => void;
  applyTemplate: (template: RecordTemplate | null) => void;
  openNewFormWithTemplate: (templateId: string) => void;

  // ===== UI 操作方法 =====
  openNewForm: () => void;
  openEditForm: (id: string) => void;
  closeForm: () => void;
  setPreviewEvidence: (id: string | null) => void;

  // ===== 筛选操作方法 =====
  setFilters: (partial: Partial<Filters>) => void;
  resetFilters: () => void;

  // ===== 持久化方法 =====
  hydrateFromStorage: () => void;
}

// ==================== LocalStorage Key ====================
const STORAGE_KEYS = {
  RECORDS: 'noise_records',
  EVIDENCE: 'noise_evidence',
  TEMPLATES: 'noise_templates',
} as const;

// ==================== 默认筛选条件 ====================
const DEFAULT_FILTERS: Filters = {
  dateRange: {
    start: null,
    end: null,
  },
  noiseTypes: [],
  impactTagIds: [],
  keyword: '',
};

// ==================== Mock 初始数据 ====================

/**
 * 生成 Mock 噪音记录数据
 * 用于首次使用时展示示例数据
 */
const generateMockRecords = (): NoiseRecord[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const toISO = (d: Date) => d.toISOString();

  return [
    {
      id: 'mock_record_001',
      title: '楼上深夜脚步声',
      date: formatDateStr(yesterday),
      startTime: '23:15',
      endTime: '23:58',
      durationMinutes: 43,
      noiseType: 'footsteps',
      intensity: 4,
      description: '昨晚11点多，楼上住户来回走动，脚步声清晰可闻，持续了将近一个小时，中间还有重物落地的声音，严重影响休息。',
      location: 'upstairs',
      impactTagIds: ['sleep_interruption', 'emotion_irritable'],
      evidenceIds: ['mock_evidence_001'],
      createdAt: toISO(new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 60 * 1000)),
      updatedAt: toISO(new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 60 * 1000)),
    },
    {
      id: 'mock_record_002',
      title: '隔壁装修电钻声',
      date: formatDateStr(dayBeforeYesterday),
      startTime: '09:00',
      endTime: '12:30',
      durationMinutes: 210,
      noiseType: 'decoration',
      intensity: 5,
      description: '隔壁邻居开始装修，电钻声、敲击声不断，持续一整个上午，完全无法在家办公，头痛欲裂。',
      location: 'next_door',
      impactTagIds: ['work_interruption', 'work_distraction', 'health_headache', 'emotion_anger'],
      evidenceIds: [],
      createdAt: toISO(new Date(dayBeforeYesterday.getTime() + 12 * 60 * 60 * 1000 + 35 * 60 * 1000)),
      updatedAt: toISO(new Date(dayBeforeYesterday.getTime() + 12 * 60 * 60 * 1000 + 35 * 60 * 1000)),
    },
    {
      id: 'mock_record_003',
      title: '楼下音乐派对',
      date: formatDateStr(threeDaysAgo),
      startTime: '20:30',
      endTime: '23:45',
      durationMinutes: 195,
      noiseType: 'music',
      intensity: 4,
      description: '楼下住户开派对，音乐声很大，低音炮震得地板都在抖，一直持续到将近午夜。已向物业投诉。',
      location: 'downstairs',
      impactTagIds: ['sleep_insomnia', 'emotion_anxiety'],
      evidenceIds: ['mock_evidence_002'],
      createdAt: toISO(new Date(threeDaysAgo.getTime() + 23 * 60 * 60 * 1000 + 50 * 60 * 1000)),
      updatedAt: toISO(new Date(threeDaysAgo.getTime() + 23 * 60 * 60 * 1000 + 50 * 60 * 1000)),
    },
    {
      id: 'mock_record_004',
      title: '宠物狗持续吠叫',
      date: formatDateStr(today),
      startTime: '07:20',
      endTime: '08:05',
      durationMinutes: 45,
      noiseType: 'animals',
      intensity: 3,
      description: '早晨准备出门上班时，听到走廊里有狗一直在叫，主人不在家，大概持续了半个多小时才安静下来。',
      location: 'hallway',
      impactTagIds: ['emotion_irritable'],
      evidenceIds: [],
      createdAt: toISO(new Date(today.getTime() + 8 * 60 * 60 * 1000 + 10 * 60 * 1000)),
      updatedAt: toISO(new Date(today.getTime() + 8 * 60 * 60 * 1000 + 10 * 60 * 1000)),
    },
    {
      id: 'mock_record_005',
      title: '管道漏水敲击声',
      date: formatDateStr(yesterday),
      startTime: '14:10',
      endTime: '15:00',
      durationMinutes: 50,
      noiseType: 'plumbing',
      intensity: 3,
      description: '卫生间管道传出规律性敲击声，疑似水管共振或漏水问题，已联系维修师傅上门检查。',
      location: 'same_room',
      impactTagIds: ['work_distraction', 'health_palpitations'],
      evidenceIds: [],
      createdAt: toISO(new Date(yesterday.getTime() + 15 * 60 * 60 * 1000 + 5 * 60 * 1000)),
      updatedAt: toISO(new Date(yesterday.getTime() + 15 * 60 * 60 * 1000 + 5 * 60 * 1000)),
    },
  ];
};

/**
 * 生成 Mock 证据数据
 */
const generateMockEvidence = (): Evidence[] => {
  return [
    {
      id: 'mock_evidence_001',
      recordId: 'mock_record_001',
      type: 'text',
      name: '文字描述记录',
      dataUrl: '记录了楼上脚步声的大致时间和频率，从23:15开始，每5-10分钟走动一次，每次持续约2-3分钟。期间有两次明显的重物放下的声音，时间分别在23:32和23:47左右。',
      mimeType: 'text/plain',
      sizeKB: 0.5,
      note: '详细记录了噪音出现的时间点',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock_evidence_002',
      recordId: 'mock_record_003',
      type: 'text',
      name: '物业投诉记录',
      dataUrl: '2024年X月X日，因楼下噪音问题致电物业投诉，物业记录编号：WL2024XXXX。物业表示将上门沟通协调。',
      mimeType: 'text/plain',
      sizeKB: 0.3,
      note: '已备案',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

// ==================== 持久化辅助方法 ====================

/**
 * 保存记录到 LocalStorage
 */
const persistRecords = (records: NoiseRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('保存记录失败:', e);
  }
};

/**
 * 保存证据到 LocalStorage
 */
const persistEvidence = (evidence: Evidence[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EVIDENCE, JSON.stringify(evidence));
  } catch (e) {
    console.error('保存证据失败:', e);
  }
};

/**
 * 从 LocalStorage 加载记录
 */
const loadRecords = (): NoiseRecord[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (data) {
      return JSON.parse(data) as NoiseRecord[];
    }
  } catch (e) {
    console.error('加载记录失败:', e);
  }
  return null;
};

/**
 * 从 LocalStorage 加载证据
 */
const loadEvidence = (): Evidence[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EVIDENCE);
    if (data) {
      return JSON.parse(data) as Evidence[];
    }
  } catch (e) {
    console.error('加载证据失败:', e);
  }
  return null;
};

/**
 * 保存模板到 LocalStorage
 */
const persistTemplates = (templates: RecordTemplate[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('保存模板失败:', e);
  }
};

/**
 * 从 LocalStorage 加载模板
 */
const loadTemplates = (): RecordTemplate[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (data) {
      return JSON.parse(data) as RecordTemplate[];
    }
  } catch (e) {
    console.error('加载模板失败:', e);
  }
  return null;
};

/**
 * 生成 Mock 模板数据
 */
const generateMockTemplates = (): RecordTemplate[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'mock_template_001',
      name: '楼上深夜脚步声',
      noiseType: 'footsteps',
      intensity: 4,
      location: 'upstairs',
      impactTagIds: ['sleep_interruption', 'emotion_irritable'],
      description: '楼上住户深夜来回走动，脚步声清晰可闻，影响休息。',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock_template_002',
      name: '隔壁装修施工',
      noiseType: 'decoration',
      intensity: 5,
      location: 'next_door',
      impactTagIds: ['work_interruption', 'work_distraction', 'health_headache'],
      description: '隔壁装修，电钻、敲击声持续不断，无法正常工作和休息。',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock_template_003',
      name: '楼下音乐派对',
      noiseType: 'music',
      intensity: 4,
      location: 'downstairs',
      impactTagIds: ['sleep_insomnia', 'emotion_anxiety'],
      description: '楼下播放音乐，低音炮震动感强，持续到深夜。',
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

// ==================== 创建 Store ====================

export const useRecordsStore = create<RecordsState>((set, get) => ({
  // ===== 初始数据 =====
  records: generateMockRecords(),
  evidence: generateMockEvidence(),
  templates: generateMockTemplates(),
  isFormModalOpen: false,
  editingRecordId: null,
  previewEvidenceId: null,
  templateToApply: null,
  filters: { ...DEFAULT_FILTERS },

  // ===== 记录操作 =====

  addRecord: (recordData) => {
    const now = new Date().toISOString();
    const newRecord: NoiseRecord = {
      ...recordData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const newRecords = [newRecord, ...get().records];
    set({ records: newRecords });
    persistRecords(newRecords);
  },

  updateRecord: (id, partial) => {
    const newRecords = get().records.map((record) =>
      record.id === id
        ? { ...record, ...partial, updatedAt: new Date().toISOString() }
        : record
    );
    set({ records: newRecords });
    persistRecords(newRecords);
  },

  deleteRecord: (id) => {
    const state = get();
    // 删除记录时，同时删除关联的证据
    const targetRecord = state.records.find((r) => r.id === id);
    const evidenceIdsToDelete = targetRecord?.evidenceIds ?? [];

    const newRecords = state.records.filter((r) => r.id !== id);
    const newEvidence = state.evidence.filter(
      (e) => !evidenceIdsToDelete.includes(e.id)
    );

    set({ records: newRecords, evidence: newEvidence });
    persistRecords(newRecords);
    persistEvidence(newEvidence);
  },

  // ===== 证据操作 =====

  addEvidence: (evidenceData) => {
    const newEvidenceItem: Evidence = {
      ...evidenceData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const newEvidence = [newEvidenceItem, ...get().evidence];

    // 同时更新关联记录的 evidenceIds
    const newRecords = get().records.map((record) =>
      record.id === evidenceData.recordId
        ? {
            ...record,
            evidenceIds: [...record.evidenceIds, newEvidenceItem.id],
            updatedAt: new Date().toISOString(),
          }
        : record
    );

    set({ evidence: newEvidence, records: newRecords });
    persistEvidence(newEvidence);
    persistRecords(newRecords);
  },

  deleteEvidence: (id) => {
    const state = get();
    const targetEvidence = state.evidence.find((e) => e.id === id);
    if (!targetEvidence) return;

    const newEvidence = state.evidence.filter((e) => e.id !== id);

    // 同时从关联记录中移除 evidenceId
    const newRecords = state.records.map((record) =>
      record.id === targetEvidence.recordId
        ? {
            ...record,
            evidenceIds: record.evidenceIds.filter((eid) => eid !== id),
            updatedAt: new Date().toISOString(),
          }
        : record
    );

    set({ evidence: newEvidence, records: newRecords });
    persistEvidence(newEvidence);
    persistRecords(newRecords);
  },

  // ===== 模板操作 =====

  addTemplate: (templateData) => {
    const now = new Date().toISOString();
    const state = get();
    const maxSortOrder = state.templates.length > 0
      ? Math.max(...state.templates.map((t) => t.sortOrder))
      : -1;

    const newTemplate: RecordTemplate = {
      ...templateData,
      id: generateId(),
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    const newTemplates = [...state.templates, newTemplate];
    set({ templates: newTemplates });
    persistTemplates(newTemplates);
  },

  updateTemplate: (id, partial) => {
    const newTemplates = get().templates.map((template) =>
      template.id === id
        ? { ...template, ...partial, updatedAt: new Date().toISOString() }
        : template
    );
    set({ templates: newTemplates });
    persistTemplates(newTemplates);
  },

  deleteTemplate: (id) => {
    const newTemplates = get().templates.filter((t) => t.id !== id);
    set({ templates: newTemplates });
    persistTemplates(newTemplates);
  },

  reorderTemplates: (templateIds) => {
    const state = get();
    const newTemplates = templateIds.map((id, index) => {
      const template = state.templates.find((t) => t.id === id);
      return template
        ? { ...template, sortOrder: index, updatedAt: new Date().toISOString() }
        : null;
    }).filter((t): t is RecordTemplate => t !== null);

    // 保留不在列表中的模板（虽然理论上应该都在）
    const remainingTemplates = state.templates.filter(
      (t) => !templateIds.includes(t.id)
    );

    const finalTemplates = [...newTemplates, ...remainingTemplates];
    set({ templates: finalTemplates });
    persistTemplates(finalTemplates);
  },

  createTemplateFromRecord: (recordId, name) => {
    const state = get();
    const record = state.records.find((r) => r.id === recordId);
    if (!record) return;

    state.addTemplate({
      name,
      noiseType: record.noiseType,
      intensity: record.intensity,
      location: record.location,
      impactTagIds: [...record.impactTagIds],
      description: record.description,
    });
  },

  applyTemplate: (template) => {
    set({ templateToApply: template });
  },

  openNewFormWithTemplate: (templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (template) {
      set({
        templateToApply: template,
        isFormModalOpen: true,
        editingRecordId: null,
      });
    }
  },

  // ===== UI 操作 =====

  openNewForm: () => {
    set({
      isFormModalOpen: true,
      editingRecordId: null,
    });
  },

  openEditForm: (id) => {
    set({
      isFormModalOpen: true,
      editingRecordId: id,
    });
  },

  closeForm: () => {
    set({
      isFormModalOpen: false,
      editingRecordId: null,
      templateToApply: null,
    });
  },

  setPreviewEvidence: (id) => {
    set({ previewEvidenceId: id });
  },

  // ===== 筛选操作 =====

  setFilters: (partial) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial,
        dateRange: {
          ...state.filters.dateRange,
          ...(partial.dateRange ?? {}),
        },
      },
    }));
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  // ===== 持久化：从 localStorage 加载 =====

  hydrateFromStorage: () => {
    const storedRecords = loadRecords();
    const storedEvidence = loadEvidence();
    const storedTemplates = loadTemplates();

    // 仅当 localStorage 中没有对应 key 时（即首次使用），才使用 mock 数据
    // 如果存储中有数据（包括空数组），说明用户进行过操作，应使用存储的数据
    if (storedRecords !== null) {
      set({ records: storedRecords });
      if (storedRecords.length === 0) {
        persistRecords(storedRecords);
      }
    } else {
      persistRecords(get().records);
    }

    if (storedEvidence !== null) {
      set({ evidence: storedEvidence });
      if (storedEvidence.length === 0) {
        persistEvidence(storedEvidence);
      }
    } else {
      persistEvidence(get().evidence);
    }

    if (storedTemplates !== null) {
      set({ templates: storedTemplates });
      if (storedTemplates.length === 0) {
        persistTemplates(storedTemplates);
      }
    } else {
      persistTemplates(get().templates);
    }
  },
}));

// ==================== 辅助选择器 ====================

/**
 * 根据 ID 获取记录
 */
export const selectRecordById = (id: string): NoiseRecord | undefined => {
  return useRecordsStore.getState().records.find((r) => r.id === id);
};

/**
 * 根据记录 ID 获取关联的证据列表
 */
export const selectEvidenceByRecordId = (recordId: string): Evidence[] => {
  return useRecordsStore.getState().evidence.filter((e) => e.recordId === recordId);
};

/**
 * 获取筛选后的记录（纯函数版本，供外部使用）
 */
export const selectFilteredRecords = (
  records: NoiseRecord[],
  filters: Filters
): NoiseRecord[] => {
  return records.filter((record) => {
    // 日期范围筛选
    if (filters.dateRange.start && record.date < filters.dateRange.start) {
      return false;
    }
    if (filters.dateRange.end && record.date > filters.dateRange.end) {
      return false;
    }

    // 噪音类型筛选
    if (filters.noiseTypes.length > 0 && !filters.noiseTypes.includes(record.noiseType)) {
      return false;
    }

    // 影响标签筛选（只要有任意一个标签匹配即通过）
    if (
      filters.impactTagIds.length > 0 &&
      !record.impactTagIds.some((id) => filters.impactTagIds.includes(id))
    ) {
      return false;
    }

    // 关键词筛选（搜索标题和描述）
    if (filters.keyword.trim()) {
      const keyword = filters.keyword.trim().toLowerCase();
      const inTitle = record.title.toLowerCase().includes(keyword);
      const inDescription = record.description.toLowerCase().includes(keyword);
      if (!inTitle && !inDescription) {
        return false;
      }
    }

    return true;
  });
};

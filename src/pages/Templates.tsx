import * as React from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Tag,
  Volume2,
  MapPin,
  Save,
  X,
  GripVertical,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordsStore } from '@/store/useRecordsStore';
import { getNoiseTypeConfig } from '@/constants/noiseTypes';
import { getLocationConfig } from '@/constants/locations';
import { getImpactTagById } from '@/constants/impactTags';
import {
  formatNoiseType,
  formatLocation,
  formatIntensityStars,
  truncateText,
} from '@/utils/formatUtils';
import type { RecordTemplate, NoiseType, LocationTag } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { NoiseTypePicker } from '@/components/record/NoiseTypePicker';
import { IntensitySlider } from '@/components/record/IntensitySlider';
import { LocationPicker } from '@/components/record/LocationPicker';
import { ImpactTagPicker } from '@/components/record/ImpactTagPicker';

type IntensityLevel = 1 | 2 | 3 | 4 | 5;

const LucideIcon = (name: string): React.ComponentType<{ className?: string }> => {
  const Icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return Icons[name] ?? LucideIcons.HelpCircle;
};

const sidebarColorMap: Record<string, string> = {
  footsteps: 'bg-amber-500',
  furniture: 'bg-orange-500',
  decoration: 'bg-red-500',
  music: 'bg-purple-500',
  talking: 'bg-blue-500',
  animals: 'bg-pink-500',
  plumbing: 'bg-cyan-500',
  door: 'bg-yellow-500',
  outdoor: 'bg-green-500',
  other: 'bg-gray-500',
};

interface TemplateFormState {
  name: string;
  noiseType: NoiseType;
  intensity: IntensityLevel;
  location: LocationTag;
  impactTagIds: string[];
  description: string;
}

const getDefaultFormState = (): TemplateFormState => ({
  name: '',
  noiseType: 'other',
  intensity: 3,
  location: 'unknown',
  impactTagIds: [],
  description: '',
});

const Templates: React.FC = () => {
  const templates = useRecordsStore((s) => s.templates);
  const addTemplate = useRecordsStore((s) => s.addTemplate);
  const updateTemplate = useRecordsStore((s) => s.updateTemplate);
  const deleteTemplate = useRecordsStore((s) => s.deleteTemplate);
  const reorderTemplates = useRecordsStore((s) => s.reorderTemplates);
  const openNewFormWithTemplate = useRecordsStore((s) => s.openNewFormWithTemplate);

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<RecordTemplate | null>(null);
  const [formState, setFormState] = React.useState<TemplateFormState>(getDefaultFormState());
  const [formError, setFormError] = React.useState<string>('');
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const sortedTemplates = React.useMemo(() => {
    return [...templates].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [templates]);

  const handleOpenCreate = () => {
    setFormState(getDefaultFormState());
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (template: RecordTemplate) => {
    setEditingTemplate(template);
    setFormState({
      name: template.name,
      noiseType: template.noiseType,
      intensity: template.intensity,
      location: template.location,
      impactTagIds: [...template.impactTagIds],
      description: template.description,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!formState.name.trim()) {
      setFormError('请输入模板名称');
      return;
    }

    addTemplate({
      name: formState.name.trim(),
      noiseType: formState.noiseType,
      intensity: formState.intensity,
      location: formState.location,
      impactTagIds: formState.impactTagIds,
      description: formState.description.trim(),
    });

    setIsCreateModalOpen(false);
  };

  const handleEditSubmit = () => {
    if (!editingTemplate) return;
    if (!formState.name.trim()) {
      setFormError('请输入模板名称');
      return;
    }

    updateTemplate(editingTemplate.id, {
      name: formState.name.trim(),
      noiseType: formState.noiseType,
      intensity: formState.intensity,
      location: formState.location,
      impactTagIds: formState.impactTagIds,
      description: formState.description.trim(),
    });

    setIsEditModalOpen(false);
    setEditingTemplate(null);
  };

  const handleDelete = (template: RecordTemplate) => {
    if (window.confirm(`确定要删除模板"${template.name}"吗？`)) {
      deleteTemplate(template.id);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...sortedTemplates];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderTemplates(newOrder.map((t) => t.id));
  };

  const handleMoveDown = (index: number) => {
    if (index >= sortedTemplates.length - 1) return;
    const newOrder = [...sortedTemplates];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderTemplates(newOrder.map((t) => t.id));
  };

  const handleUseTemplate = (template: RecordTemplate) => {
    openNewFormWithTemplate(template.id);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...sortedTemplates];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, removed);
    reorderTemplates(newOrder.map((t) => t.id));

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const updateFormField = <K extends keyof TemplateFormState>(
    key: K,
    value: TemplateFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    if (formError) {
      setFormError('');
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 animate-fade-in-up"
        style={{ opacity: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            记录模板
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {templates.length} 个模板 · 保存常用配置，快速新建记录
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          新建模板
        </Button>
      </div>

      {sortedTemplates.length > 0 ? (
        <div className="space-y-3">
          {sortedTemplates.map((template, index) => {
            const noiseConfig = getNoiseTypeConfig(template.noiseType);
            const locationConfig = getLocationConfig(template.location);
            const LocationIcon = LucideIcon(locationConfig.icon);
            const sidebarColor = sidebarColorMap[template.noiseType] ?? 'bg-gray-500';
            const impactTags = template.impactTagIds
              .map((id) => getImpactTagById(id))
              .filter(Boolean);
            const stars = formatIntensityStars(template.intensity);

            return (
              <div
                key={template.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'card-base relative overflow-hidden transition-all duration-200',
                  draggedIndex === index && 'opacity-50 scale-[0.98]',
                  dragOverIndex === index && draggedIndex !== index && 'ring-2 ring-primary ring-offset-2',
                )}
                style={{
                  animationDelay: `${index * 60}ms`,
                  opacity: 0,
                  animation: 'fadeInUp 0.4s ease-out forwards',
                }}
              >
                <div className="flex">
                  <div className={cn('w-1.5 shrink-0 rounded-l-xl', sidebarColor)} />

                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-start gap-3">
                      <button
                        className="shrink-0 p-1 -ml-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
                        title="拖动排序"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {template.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Volume2 className="w-3.5 h-3.5" />
                                {formatNoiseType(template.noiseType)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-amber-500">
                                {stars.split('').map((s, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      'w-3.5 h-3.5',
                                      s === '★' ? 'fill-current' : 'fill-transparent stroke-current opacity-40',
                                    )}
                                  />
                                ))}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <LocationIcon className="w-3.5 h-3.5" />
                                {formatLocation(template.location)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<ArrowUp className="w-3.5 h-3.5" />}
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="h-8 w-8 p-0"
                              title="上移"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<ArrowDown className="w-3.5 h-3.5" />}
                              onClick={() => handleMoveDown(index)}
                              disabled={index === sortedTemplates.length - 1}
                              className="h-8 w-8 p-0"
                              title="下移"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenEdit(template)}
                              className="h-8 w-8 p-0"
                              title="编辑"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                              onClick={() => handleDelete(template)}
                              className="h-8 w-8 p-0 hover:text-rose-600"
                              title="删除"
                            />
                          </div>
                        </div>

                        {impactTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {impactTags.slice(0, 5).map((tag) =>
                              tag ? (
                                <Badge key={tag.id} variant="neutral" size="sm">
                                  {tag.name}
                                </Badge>
                              ) : null,
                            )}
                            {impactTags.length > 5 && (
                              <Badge variant="gray" size="sm">
                                +{impactTags.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}

                        {template.description && (
                          <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                            {truncateText(template.description, 100)}
                          </p>
                        )}

                        <div className="mt-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<FileText className="w-3.5 h-3.5" />}
                            onClick={() => handleUseTemplate(template)}
                          >
                            使用此模板
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            'animate-fade-in-up',
            'rounded-2xl border-2 border-dashed border-slate-200',
            'py-16 px-8 text-center',
            'bg-white/50',
          )}
          style={{ opacity: 0 }}
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
            <div className="relative">
              <FileText className="w-8 h-8 text-slate-400" />
              <div className="absolute -top-1 -right-1">
                <Tag className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            还没有模板
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
            创建模板来保存常用的噪音记录配置，下次快速新建记录
          </p>
          <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            新建模板
          </Button>
        </div>
      )}

      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="新建模板"
        subtitle="保存常用的噪音记录配置"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              取消
            </Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={handleCreateSubmit}>
              保存
            </Button>
          </div>
        }
      >
        <TemplateFormContent
          formState={formState}
          updateFormField={updateFormField}
          error={formError}
        />
      </Modal>

      <Modal
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTemplate(null);
        }}
        title="编辑模板"
        subtitle="修改模板的配置信息"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingTemplate(null);
              }}
            >
              取消
            </Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={handleEditSubmit}>
              保存
            </Button>
          </div>
        }
      >
        <TemplateFormContent
          formState={formState}
          updateFormField={updateFormField}
          error={formError}
        />
      </Modal>
    </div>
  );
};

interface TemplateFormContentProps {
  formState: TemplateFormState;
  updateFormField: <K extends keyof TemplateFormState>(
    key: K,
    value: TemplateFormState[K]
  ) => void;
  error: string;
}

const TemplateFormContent: React.FC<TemplateFormContentProps> = ({
  formState,
  updateFormField,
  error,
}) => {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          模板名称
          <span className="text-rose-500 ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={formState.name}
          onChange={(e) => updateFormField('name', e.target.value)}
          placeholder="请输入模板名称，如：楼上深夜脚步声"
          className={cn(
            'w-full px-3 py-2.5 text-sm rounded-lg border bg-white text-slate-700 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 transition-all',
            error
              ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400'
              : 'border-slate-200 focus:ring-primary/20 focus:border-primary',
          )}
        />
        {error && (
          <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
            <X className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">噪音类型</p>
        <NoiseTypePicker
          value={formState.noiseType}
          onChange={(t) => updateFormField('noiseType', t)}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">噪音强度</p>
        <IntensitySlider
          value={formState.intensity}
          onChange={(n) => updateFormField('intensity', n)}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">来源位置</p>
        <LocationPicker
          value={formState.location}
          onChange={(l) => updateFormField('location', l)}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">生活影响</p>
        <ImpactTagPicker
          selectedIds={formState.impactTagIds}
          onChange={(ids) => updateFormField('impactTagIds', ids)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          描述
        </label>
        <textarea
          value={formState.description}
          onChange={(e) => updateFormField('description', e.target.value)}
          placeholder="模板的默认描述内容..."
          rows={3}
          className={cn(
            'w-full px-3 py-2.5 text-sm rounded-lg border bg-white text-slate-700 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all',
          )}
        />
      </div>
    </div>
  );
};

Templates.displayName = 'Templates';

export default Templates;

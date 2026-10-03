'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconDatabase,
  IconPlus,
  IconTrash,
  IconTable,
  IconColumns,
  IconSearch,
  IconX,
  IconCheck,
  IconRefresh,
  IconListDetails,
  IconCurrencyDollar,
  IconHash,
  IconLetterCase,
  IconCalendar,
  IconMail,
  IconToggleLeft,
  IconLink,
  IconEye,
  IconArrowUp,
  IconArrowDown,
  IconLinkOff,
  IconLayersLinked,
  IconWorld,
  IconDownload,
  IconUpload,
  IconFilter,
  IconCopy,
  IconArrowBackUp,
  IconTrashX,
} from '@tabler/icons-react';
import {
  fetchObjectSchemas,
  createObjectSchema,
  updateObjectSchema,
  deleteObjectSchema,
  fetchRecords,
  fetchRecordDetail,
  fetchRelatedRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  queryRecords,
  bulkDeleteRecords,
  restoreRecords,
  exportRecords,
  importRecords,
  ApiError,
  type RecordFilter,
  type ObjectSchema,
  type ObjectRecord,
  type ObjectField,
  type RelatedGroup,
} from '../../lib/customObjectsApi';
import { RelationCombobox } from './RelationCombobox';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { useDialogA11y } from '../ui/useDialogA11y';
import { TableSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import {
  OPERATOR_LABELS,
  buildFilters,
  canEditInline,
  duplicateValues,
  emptyFilterRow,
  loadHidden,
  operatorsForType,
  parseInlineValue,
  plural,
  pruneSelection,
  saveHidden,
  selectionState,
  toggleAll,
  toggleHidden,
  toggleId,
  visibleFields,
  type FilterRow,
} from '../../lib/recordsView.mjs';

interface ObjectBuilderViewProps {
  projectId: string;
}

const FIELD_TYPES: Array<{ value: ObjectField['type']; label: string; icon: React.ReactNode }> = [
  { value: 'text', label: 'Text', icon: <IconLetterCase className="w-4 h-4 text-[var(--coral)]" /> },
  { value: 'number', label: 'Number', icon: <IconHash className="w-4 h-4 text-emerald-400" /> },
  { value: 'currency', label: 'Currency ($)', icon: <IconCurrencyDollar className="w-4 h-4 text-yellow-400" /> },
  { value: 'date', label: 'Date', icon: <IconCalendar className="w-4 h-4 text-purple-400" /> },
  { value: 'boolean', label: 'Boolean (Yes/No)', icon: <IconToggleLeft className="w-4 h-4 text-cyan-400" /> },
  { value: 'email', label: 'Email Address', icon: <IconMail className="w-4 h-4 text-pink-400" /> },
  { value: 'url', label: 'Website / URL', icon: <IconWorld className="w-4 h-4 text-teal-400" /> },
  { value: 'picklist', label: 'Picklist / Select', icon: <IconListDetails className="w-4 h-4 text-orange-400" /> },
  { value: 'lookup', label: 'Relation (Lookup)', icon: <IconLink className="w-4 h-4 text-[var(--coral)]" /> },
];

export function ObjectBuilderView({ projectId }: ObjectBuilderViewProps) {
  const [schemas, setSchemas] = useState<ObjectSchema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<ObjectSchema | null>(null);
  const [records, setRecords] = useState<ObjectRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mutation version counter bumped on any create/update/delete to notify child comboboxes
  const [recordsMutationVersion, setRecordsMutationVersion] = useState(0);
  const [isCreatingRecord, setIsCreatingRecord] = useState(false);
  const [isUpdatingRecord, setIsUpdatingRecord] = useState(false);

  // Debounced search query for server-side full-dataset search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  // Schema Editor Modal State (Used for both Create & Edit)
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isEditingExistingSchema, setIsEditingExistingSchema] = useState(false);
  const [schemaLabel, setSchemaLabel] = useState('');
  const [schemaLabelPlural, setSchemaLabelPlural] = useState('');
  const [schemaApiName, setSchemaApiName] = useState('');
  const [schemaFields, setSchemaFields] = useState<ObjectField[]>([
    { api_name: 'name', label: 'Name', type: 'text', required: true },
  ]);

  // Record Create Modal State
  const [isNewRecModalOpen, setIsNewRecModalOpen] = useState(false);
  const [recordFormData, setRecordFormData] = useState<Record<string, any>>({});

  // Record Detail / Edit Modal State (with Related Records)
  const [activeRecord, setActiveRecord] = useState<ObjectRecord | null>(null);
  const [detailFormData, setDetailFormData] = useState<Record<string, any>>({});
  const [detailTab, setDetailTab] = useState<'fields' | 'related'>('fields');
  const [relatedGroups, setRelatedGroups] = useState<RelatedGroup[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  // CRUD upgrades: selection, filters, columns, trash, inline edit, import/export
  const toast = useToast();
  const confirm = useConfirm();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterRows, setFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<RecordFilter[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [busy, setBusy] = useState<'import' | 'export' | 'bulk' | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  // A single click opens the detail dialog, but a double-click (inline edit) must not: wait out the second click.
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPendingOpen = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
  };
  const schemaPanelRef = useRef<HTMLDivElement>(null);
  const newRecPanelRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const loadSchemas = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchObjectSchemas(projectId);
      setSchemas(data);
      if (data.length > 0 && (!selectedSchema || !data.some((s) => s.id === selectedSchema.id))) {
        setSelectedSchema(data[0]);
      }
    } catch (err) {
      console.error('Failed to load schemas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Plain list when nothing special is asked for (keeps the cheap GET path); POST query for filters/trash.
  const fetchPage = (
    schema: ObjectSchema,
    skip: number,
    sBy: string,
    sDesc: boolean,
    search: string,
    filters: RecordFilter[],
    trash: boolean
  ) =>
    filters.length > 0 || trash
      ? queryRecords(projectId, schema.api_name, {
          filters,
          search,
          skip,
          sortBy: sBy,
          sortDesc: sDesc,
          deleted: trash ? 'only' : 'exclude',
        })
      : fetchRecords(projectId, schema.api_name, 50, skip, sBy, sDesc, search);

  const loadRecords = async (
    schema: ObjectSchema,
    sBy: string = sortBy,
    sDesc: boolean = sortDesc,
    search: string = debouncedSearch,
    filters: RecordFilter[] = appliedFilters,
    trash: boolean = showTrash
  ) => {
    if (!projectId || !schema) return;
    setRecordsLoading(true);
    try {
      const resp = await fetchPage(schema, 0, sBy, sDesc, search, filters, trash);
      setRecords(resp.records);
      setTotalRecords(resp.total);
      setHasMore(resp.has_more);
    } catch (err) {
      console.error('Failed to load records:', err);
      setRecords([]);
      setTotalRecords(0);
      setHasMore(false);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!projectId || !selectedSchema || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const resp = await fetchPage(selectedSchema, records.length, sortBy, sortDesc, debouncedSearch, appliedFilters, showTrash);
      setRecords((prev) => [...prev, ...resp.records]);
      setTotalRecords(resp.total);
      setHasMore(resp.has_more);
    } catch (err) {
      console.error('Failed to load more records:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSort = (field: string) => {
    const isSameField = sortBy === field;
    const newDesc = isSameField ? !sortDesc : true;
    setSortBy(field);
    setSortDesc(newDesc);
    if (selectedSchema) {
      loadRecords(selectedSchema, field, newDesc, debouncedSearch);
    }
  };

  useEffect(() => {
    loadSchemas();
  }, [projectId]);

  useEffect(() => {
    if (selectedSchema) {
      loadRecords(selectedSchema, sortBy, sortDesc, debouncedSearch);
    } else {
      setRecords([]);
    }
  }, [selectedSchema?.id, debouncedSearch, appliedFilters, showTrash]);

  // Per-object UI state: reset filters/selection/trash when switching objects, restore saved column choices.
  useEffect(() => {
    setSelectedIds(new Set());
    setFilterRows([]);
    setAppliedFilters([]);
    setShowTrash(false);
    setEditingCell(null);
    setFiltersOpen(false);
    setColumnsOpen(false);
    setHiddenCols(selectedSchema ? loadHidden(typeof window !== 'undefined' ? window.localStorage : undefined, projectId, selectedSchema.id) : []);
  }, [selectedSchema?.id, projectId]);

  // Selection only ever refers to rows currently on screen.
  useEffect(() => {
    setSelectedIds((prev) => pruneSelection(prev, records.map((r) => r.id)));
  }, [records]);

  const openCreateSchemaModal = () => {
    setIsEditingExistingSchema(false);
    setSchemaLabel('');
    setSchemaLabelPlural('');
    setSchemaApiName('');
    setSchemaFields([{ api_name: 'name', label: 'Name', type: 'text', required: true }]);
    setIsSchemaModalOpen(true);
  };

  const openEditSchemaModal = (schema: ObjectSchema) => {
    setIsEditingExistingSchema(true);
    setSchemaLabel(schema.label);
    setSchemaLabelPlural(schema.label_plural || '');
    setSchemaApiName(schema.api_name);
    setSchemaFields(
      schema.fields?.map((f) => ({
        ...f,
        type: f.type === 'relation' ? 'lookup' : (f.type === 'select' ? 'picklist' : f.type),
      })) || []
    );
    setIsSchemaModalOpen(true);
  };

  const openNewRecordModal = () => {
    setRecordFormData({});
    setIsNewRecModalOpen(true);
  };

  const openRecordDetail = async (record: ObjectRecord) => {
    setActiveRecord(record);
    const dataVals = record.values || record.data || {};
    setDetailFormData({ ...dataVals });
    setDetailTab('fields');
    setLoadingRelated(true);
    try {
      const resp = await fetchRelatedRecords(record.id);
      setRelatedGroups(resp.related || []);
    } catch (err) {
      console.error('Failed to load related records:', err);
      setRelatedGroups([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const coerceFormData = (schema: ObjectSchema, rawData: Record<string, any>): Record<string, any> => {
    const coerced: Record<string, any> = {};
    const fieldMap = new Map((schema.fields || []).map((f) => [f.api_name, f]));

    for (const [k, v] of Object.entries(rawData)) {
      const f = fieldMap.get(k);
      if (!f) {
        coerced[k] = v;
        continue;
      }
      if (v === '' || v === null || v === undefined) {
        coerced[k] = null;
        continue;
      }
      const ftype = f.type === 'relation' ? 'lookup' : (f.type === 'select' ? 'picklist' : f.type);
      if (ftype === 'number' || ftype === 'currency') {
        if (typeof v === 'number') {
          coerced[k] = v;
        } else {
          const cleaned = String(v).replace(/[$,]/g, '').trim();
          const parsed = Number(cleaned);
          coerced[k] = isNaN(parsed) ? v : parsed;
        }
      } else if (ftype === 'boolean') {
        coerced[k] = Boolean(v);
      } else {
        coerced[k] = v;
      }
    }
    return coerced;
  };

  const handleSchemaLabelChange = (val: string) => {
    setSchemaLabel(val);
    if (!isEditingExistingSchema) {
      const snake = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setSchemaApiName(snake);
    }
  };

  const handleAddField = () => {
    setSchemaFields([
      ...schemaFields,
      {
        api_name: `field_${schemaFields.length + 1}`,
        label: `Field ${schemaFields.length + 1}`,
        type: 'text',
        required: false,
      },
    ]);
  };

  const handleRemoveField = (idx: number) => {
    setSchemaFields(schemaFields.filter((_, i) => i !== idx));
  };

  const handleUpdateField = (idx: number, patch: Partial<ObjectField>) => {
    setSchemaFields(
      schemaFields.map((f, i) => {
        if (i !== idx) return f;
        const updated = { ...f, ...patch };
        if (patch.label && !isEditingExistingSchema && !patch.api_name) {
          updated.api_name = patch.label
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_');
        }
        return updated;
      })
    );
  };

  const handleSchemaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    const label = schemaLabel.trim();
    const apiName = schemaApiName.trim();
    if (!label || !apiName) {
      toast.error('Entity label and API name are required.');
      return;
    }
    const badField = schemaFields.find(
      (f) => !String(f.label || '').trim() || !String(f.api_name || '').trim(),
    );
    if (badField) {
      toast.error('Every field needs a label and API name before you can save the schema.');
      return;
    }

    try {
      if (isEditingExistingSchema && selectedSchema) {
        const updated = await updateObjectSchema(projectId, selectedSchema.id, {
          label,
          label_plural: schemaLabelPlural || `${label}s`,
          fields: schemaFields,
        });
        setSelectedSchema(updated);
      } else {
        const created = await createObjectSchema(projectId, {
          api_name: apiName,
          label,
          label_plural: schemaLabelPlural || `${label}s`,
          fields: schemaFields,
        });
        setSelectedSchema(created);
      }
      setIsSchemaModalOpen(false);
      await loadSchemas();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save schema');
    }
  };

  const handleDeleteSchema = async (schema: ObjectSchema) => {
    if (!projectId) return;
    const ok = await confirm({
      title: `Delete object '${schema.label}'?`,
      message: 'All of its records will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete object',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteObjectSchema(projectId, schema.id);
      if (selectedSchema?.id === schema.id) {
        setSelectedSchema(null);
      }
      await loadSchemas();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete object');
    }
  };

  const handleCreateRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedSchema || isCreatingRecord) return;
    const missing = (selectedSchema.fields || [])
      .filter((f) => f.required)
      .filter((f) => {
        const v = recordFormData[f.api_name];
        return v == null || String(v).trim() === '';
      })
      .map((f) => f.label || f.api_name);
    if (missing.length) {
      toast.error(`Fill required fields: ${missing.join(', ')}`);
      return;
    }
    setIsCreatingRecord(true);
    try {
      const cleanData = coerceFormData(selectedSchema, recordFormData);
      await createRecord(projectId, selectedSchema.id, cleanData);
      setIsNewRecModalOpen(false);
      setRecordFormData({});
      setRecordsMutationVersion((v) => v + 1);
      await loadRecords(selectedSchema, sortBy, sortDesc, debouncedSearch);
    } catch (err: any) {
      reportError(err, 'Failed to create record');
    } finally {
      setIsCreatingRecord(false);
    }
  };

  const handleUpdateRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedSchema || !activeRecord || isUpdatingRecord) return;
    setIsUpdatingRecord(true);
    setSavingRecord(true);
    try {
      const cleanData = coerceFormData(selectedSchema, detailFormData);
      const updated = await updateRecord(projectId, selectedSchema.id, activeRecord.id, cleanData, activeRecord.version ?? 1);
      setActiveRecord(updated);
      setRecordsMutationVersion((v) => v + 1);
      await loadRecords(selectedSchema, sortBy, sortDesc, debouncedSearch);
      toast.success('Record saved');
    } catch (err: any) {
      if (err instanceof ApiError && err.isConflict) {
        toast.error('Someone else changed this record while you were editing. Reopen it to see the latest version.');
        await loadRecords(selectedSchema, sortBy, sortDesc, debouncedSearch);
      } else {
        reportError(err, 'Failed to update record');
      }
    } finally {
      setIsUpdatingRecord(false);
      setSavingRecord(false);
    }
  };

  /** Quota errors get an Upgrade action; everything else is a plain error toast. */
  const reportError = (err: unknown, fallback: string) => {
    const message = err instanceof Error && err.message ? err.message : fallback;
    if (err instanceof ApiError && err.upgradeRequired) {
      toast.error(message, { action: { label: 'Upgrade', onClick: () => window.location.assign('/billing') } });
    } else {
      toast.error(message);
    }
  };

  const reload = () => (selectedSchema ? loadRecords(selectedSchema) : Promise.resolve());

  /** Soft delete with Undo: records move to the trash (30 days) instead of vanishing. */
  const softDelete = async (ids: string[]) => {
    if (!projectId || !selectedSchema || ids.length === 0) return;
    const schemaId = selectedSchema.id;
    setBusy('bulk');
    try {
      const res = await bulkDeleteRecords(projectId, schemaId, ids);
      if (activeRecord && ids.includes(activeRecord.id)) setActiveRecord(null);
      setSelectedIds(new Set());
      toast.success(`${plural(res.deleted, 'record')} moved to trash`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await restoreRecords(projectId, schemaId, ids);
              toast.success('Restored');
              await reload();
            } catch (err) {
              reportError(err, 'Could not restore');
            }
          },
        },
      });
      await reload();
    } catch (err) {
      reportError(err, 'Failed to delete records');
    } finally {
      setBusy(null);
    }
  };

  const restoreSelected = async (ids: string[]) => {
    if (!projectId || !selectedSchema || ids.length === 0) return;
    setBusy('bulk');
    try {
      const res = await restoreRecords(projectId, selectedSchema.id, ids);
      setSelectedIds(new Set());
      toast.success(`${plural(res.restored, 'record')} restored`);
      await reload();
    } catch (err) {
      reportError(err, 'Failed to restore records');
    } finally {
      setBusy(null);
    }
  };

  /** Permanent delete (trash view only). Unlinks lookups that point at the record. */
  const deleteForever = async (ids: string[]) => {
    if (!projectId || !selectedSchema || ids.length === 0) return;
    const ok = await confirm({
      title: `Permanently delete ${plural(ids.length, 'record')}?`,
      message: 'This cannot be undone. Records that link to them will have the link cleared.',
      confirmLabel: 'Delete forever',
      danger: true,
    });
    if (!ok) return;
    setBusy('bulk');
    try {
      for (const id of ids) await deleteRecord(projectId, selectedSchema.id, id, 'nullify');
      setSelectedIds(new Set());
      toast.success(`${plural(ids.length, 'record')} permanently deleted`);
      await reload();
    } catch (err) {
      reportError(err, 'Failed to delete records');
    } finally {
      setBusy(null);
    }
  };

  const handleDuplicate = (r: ObjectRecord) => {
    if (!selectedSchema) return;
    setRecordFormData(duplicateValues(selectedSchema.fields || [], r.values || r.data || {}));
    setIsNewRecModalOpen(true);
  };

  const commitInline = async (r: ObjectRecord, field: ObjectField, raw: unknown) => {
    if (!projectId || !selectedSchema) return;
    const parsed = parseInlineValue(field, raw);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    const current = (r.values || r.data || {})[field.api_name] ?? null;
    if (JSON.stringify(current) === JSON.stringify(parsed.value)) {
      setEditingCell(null);
      return;
    }
    try {
      const updated = await updateRecord(projectId, selectedSchema.id, r.id, { [field.api_name]: parsed.value }, r.version ?? 1);
      setRecords((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated, resolved_relations: x.resolved_relations } : x)));
      setEditingCell(null);
    } catch (err) {
      setEditingCell(null);
      if (err instanceof ApiError && err.isConflict) {
        toast.error('Someone else changed this record. Showing the latest version.');
        await reload();
      } else {
        reportError(err, 'Failed to save change');
      }
    }
  };

  const applyFilters = () => {
    if (!selectedSchema) return;
    setAppliedFilters(buildFilters(filterRows, selectedSchema.fields || []) as RecordFilter[]);
  };

  const clearFilters = () => {
    setFilterRows([]);
    setAppliedFilters([]);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!projectId || !selectedSchema) return;
    setBusy('export');
    try {
      await exportRecords(projectId, selectedSchema.id, format);
    } catch (err) {
      reportError(err, 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file || !projectId || !selectedSchema) return;
    setBusy('import');
    try {
      const res = await importRecords(projectId, selectedSchema.id, file);
      const parts = [`Imported ${plural(res.created, 'record')}`];
      if (res.failed) parts.push(`${plural(res.failed, 'row')} skipped`);
      if (res.unmapped_columns?.length) parts.push(`ignored columns: ${res.unmapped_columns.slice(0, 4).join(', ')}`);
      const firstErrors = (res.errors || []).slice(0, 2).map((e) => `row ${e.row ?? (e.index ?? 0) + 2}: ${e.error}`);
      const message = [parts.join(' · '), ...firstErrors].join('\n');
      if (res.failed) toast.error(message, { duration: 12000 });
      else toast.success(message);
      await reload();
    } catch (err) {
      reportError(err, 'Import failed');
    } finally {
      setBusy(null);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const toggleColumn = (apiName: string) => {
    if (!selectedSchema) return;
    const next = toggleHidden(hiddenCols, apiName, selectedSchema.fields || []);
    setHiddenCols(next);
    saveHidden(typeof window !== 'undefined' ? window.localStorage : undefined, projectId, selectedSchema.id, next);
  };

  const scheduleOpenDetail = (r: ObjectRecord) => {
    cancelPendingOpen();
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      openRecordDetail(r);
    }, 230);
  };

  useEffect(() => cancelPendingOpen, []);

  const shownFields = visibleFields(selectedSchema?.fields || [], hiddenCols) as ObjectField[];
  const visibleIds = records.map((r) => r.id);
  const sel = selectionState(selectedIds, visibleIds);

  const cellText = (r: ObjectRecord, f: ObjectField): string => {
    const val = (r.data || r.values || {})[f.api_name];
    if (val === undefined || val === null || val === '') return '—';
    if (f.type === 'currency' && typeof val === 'number') return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (f.type === 'boolean') return val ? 'Yes' : 'No';
    if (f.type === 'lookup' || f.type === 'relation') return r.resolved_relations?.[f.api_name]?.display_label ?? String(val);
    return String(val);
  };

  useDialogA11y(isSchemaModalOpen, schemaPanelRef, () => setIsSchemaModalOpen(false));
  useDialogA11y(isNewRecModalOpen, newRecPanelRef, () => setIsNewRecModalOpen(false), !isCreatingRecord);
  useDialogA11y(Boolean(activeRecord), detailPanelRef, () => setActiveRecord(null), !isUpdatingRecord);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full min-h-[640px]">
      {/* ── Left Sidebar: Object Schemas Directory ── */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <IconDatabase className="w-5 h-5 text-[var(--coral)]" />
            <span className="font-semibold text-[var(--text-primary)] text-sm">Custom Entities</span>
          </div>
          <button
            onClick={openCreateSchemaModal}
            className="p-1.5 rounded-lg bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white transition-colors shadow-sm cursor-pointer"
            title="Create Custom Object"
          >
            <IconPlus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[560px] pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading entities...</div>
          ) : schemas.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
              No custom objects defined. Click + to build your first entity.
            </div>
          ) : (
            schemas.map((schema) => {
              const isSelected = selectedSchema?.id === schema.id;
              return (
                <div
                  key={schema.id}
                  onClick={() => setSelectedSchema(schema)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[var(--coral)]/10 border-[var(--coral)]/40 shadow-sm'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                      {schema.label}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                      {schema.api_name} • {schema.fields?.length || 0} fields
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSchema(schema);
                      }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 text-red-500 transition-colors"
                      title="Delete entity"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Content Area: Record List Data Grid ── */}
      <div className="flex-1 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        {selectedSchema ? (
          <>
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--coral)]/12 text-[var(--coral)]">
                  <IconTable className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--text-primary)] text-base">
                      {selectedSchema.label} Records
                    </h3>
                    <button
                      onClick={() => openEditSchemaModal(selectedSchema)}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--surface-2)] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-[var(--border)] transition-colors cursor-pointer"
                    >
                      Edit Schema
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                    api_name: {selectedSchema.api_name} | Total: {totalRecords} records
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <IconSearch className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Filter records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--surface-2)] border-none text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--coral)] w-44"
                  />
                </div>
                <button
                  onClick={openNewRecordModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  <span>Add Record</span>
                </button>
                <button
                  onClick={() => selectedSchema && loadRecords(selectedSchema)}
                  className="p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  title="Refresh data"
                >
                  <IconRefresh className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Toolbar: filters, columns, trash, import / export */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                  appliedFilters.length ? 'border-[var(--coral)] text-[var(--coral)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <IconFilter className="w-3.5 h-3.5" />
                Filters{appliedFilters.length ? ` (${appliedFilters.length})` : ''}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColumnsOpen((o) => !o)}
                  aria-expanded={columnsOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <IconColumns className="w-3.5 h-3.5" />
                  Columns{hiddenCols.length ? ` (${shownFields.length}/${selectedSchema.fields?.length ?? 0})` : ''}
                </button>
                {columnsOpen && (
                  <div
                    role="group"
                    aria-label="Visible columns"
                    className="absolute z-20 mt-1 w-52 max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl p-2"
                  >
                    {(selectedSchema.fields || []).map((f) => (
                      <label key={f.api_name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--text-primary)] hover:bg-[var(--surface-2)] cursor-pointer">
                        <input type="checkbox" checked={!hiddenCols.includes(f.api_name)} onChange={() => toggleColumn(f.api_name)} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowTrash((t) => !t)}
                aria-pressed={showTrash}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                  showTrash ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <IconTrash className="w-3.5 h-3.5" />
                {showTrash ? 'Viewing trash' : 'Trash'}
              </button>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={busy === 'import'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
              >
                <IconUpload className="w-3.5 h-3.5" />
                {busy === 'import' ? 'Importing…' : 'Import'}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.tsv,.json,.jsonl,.ndjson,.xlsx"
                className="sr-only"
                aria-label="Import records from a file"
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />
              <div className="flex rounded-xl border border-[var(--border)] overflow-hidden" role="group" aria-label="Export records">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  disabled={busy === 'export'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  disabled={busy === 'export'}
                  className="px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] border-l border-[var(--border)] disabled:opacity-50 cursor-pointer"
                >
                  JSON
                </button>
              </div>
            </div>

            {filtersOpen && (
              <div className="mt-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 flex flex-col gap-2" role="group" aria-label="Record filters">
                {filterRows.length === 0 && <p className="text-xs text-[var(--text-muted)]">No filters yet. Add one to narrow the list.</p>}
                {filterRows.map((row, idx) => {
                  const field = (selectedSchema.fields || []).find((f) => f.api_name === row.field);
                  const ops = operatorsForType(field?.type || 'text') as string[];
                  const update = (patch: Partial<FilterRow>) => setFilterRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
                  return (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Filter field"
                        value={row.field}
                        onChange={(e) => {
                          const f = (selectedSchema.fields || []).find((x) => x.api_name === e.target.value);
                          update({ field: e.target.value, operator: operatorsForType(f?.type || 'text')[0], value: '' });
                        }}
                        className="px-2 py-1.5 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]"
                      >
                        {(selectedSchema.fields || []).map((f) => (
                          <option key={f.api_name} value={f.api_name}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filter operator"
                        value={row.operator}
                        onChange={(e) => update({ operator: e.target.value })}
                        className="px-2 py-1.5 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]"
                      >
                        {ops.map((op) => (
                          <option key={op} value={op}>{(OPERATOR_LABELS as Record<string, string>)[op] ?? op}</option>
                        ))}
                      </select>
                      {field?.type === 'boolean' ? (
                        <select
                          aria-label="Filter value"
                          value={String(row.value)}
                          onChange={(e) => update({ value: e.target.value })}
                          className="px-2 py-1.5 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]"
                        >
                          <option value="">—</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <input
                          aria-label="Filter value"
                          type={field?.type === 'number' || field?.type === 'currency' ? 'text' : field?.type === 'date' ? 'date' : 'text'}
                          inputMode={field?.type === 'number' || field?.type === 'currency' ? 'decimal' : undefined}
                          placeholder={row.operator === 'in' ? 'a, b, c' : 'Value'}
                          value={String(row.value ?? '')}
                          onChange={(e) => update({ value: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                          className="px-2 py-1.5 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] w-40"
                        />
                      )}
                      <button
                        type="button"
                        aria-label="Remove filter"
                        onClick={() => setFilterRows((rows) => rows.filter((_, i) => i !== idx))}
                        className="p-1 text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                      >
                        <IconX className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterRows((rows) => [...rows, emptyFilterRow(selectedSchema.fields || []) as FilterRow])}
                    className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] cursor-pointer"
                  >
                    + Add filter
                  </button>
                  <button type="button" onClick={applyFilters} className="px-2.5 py-1 text-xs rounded-lg bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white font-medium cursor-pointer">
                    Apply
                  </button>
                  {(filterRows.length > 0 || appliedFilters.length > 0) && (
                    <button type="button" onClick={clearFilters} className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bulk action bar */}
            {sel.count > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3 px-3 py-2 rounded-xl bg-[var(--coral)]/10 border border-[var(--coral)]/30" role="status">
                <span className="text-xs font-medium text-[var(--text-primary)]">{plural(sel.count, 'record')} selected</span>
                {showTrash ? (
                  <>
                    <button type="button" disabled={busy === 'bulk'} onClick={() => restoreSelected([...selectedIds])} className="flex items-center gap-1 text-xs font-medium text-[var(--coral)] hover:underline disabled:opacity-50 cursor-pointer">
                      <IconArrowBackUp className="w-3.5 h-3.5" /> Restore
                    </button>
                    <button type="button" disabled={busy === 'bulk'} onClick={() => deleteForever([...selectedIds])} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:underline disabled:opacity-50 cursor-pointer">
                      <IconTrashX className="w-3.5 h-3.5" /> Delete forever
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={busy === 'bulk'} onClick={() => softDelete([...selectedIds])} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:underline disabled:opacity-50 cursor-pointer">
                    <IconTrash className="w-3.5 h-3.5" /> Move to trash
                  </button>
                )}
                <button type="button" onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                  Clear selection
                </button>
              </div>
            )}

            {/* Records Data Table */}
            <div className="flex-1 mt-4">
              {recordsLoading ? (
                <TableSkeleton rows={6} cols={Math.min(6, shownFields.length + 2)} />
              ) : records.length === 0 ? (
                <EmptyState
                  icon={<IconColumns className="w-8 h-8" />}
                  title={showTrash ? 'Trash is empty' : appliedFilters.length || debouncedSearch ? 'No records match' : 'No records found'}
                  hint={
                    showTrash
                      ? 'Deleted records stay here for 30 days and can be restored.'
                      : appliedFilters.length || debouncedSearch
                        ? 'Try removing a filter or changing the search.'
                        : "Insert records manually with 'Add Record', import a CSV, use conversational agent queries, or live connectors."
                  }
                  action={
                    !showTrash && !appliedFilters.length && !debouncedSearch ? (
                      <button type="button" onClick={openNewRecordModal} className="px-3 py-1.5 text-xs rounded-lg bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white font-medium cursor-pointer">
                        Add Record
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <>
                  {/* Desktop: table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse" aria-label={`${selectedSchema.label} records`}>
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                          <th scope="col" className="w-8 py-2.5 px-3">
                            <input
                              type="checkbox"
                              aria-label="Select all records on this page"
                              checked={sel.all}
                              ref={(el) => {
                                if (el) el.indeterminate = sel.some;
                              }}
                              onChange={() => setSelectedIds(toggleAll(selectedIds, visibleIds))}
                            />
                          </th>
                          <th scope="col" aria-sort={sortBy === 'id' ? (sortDesc ? 'descending' : 'ascending') : 'none'} className="py-2.5 px-3 font-semibold">
                            <button type="button" onClick={() => handleSort('id')} className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white cursor-pointer">
                              <span>Record ID</span>
                              {sortBy === 'id' && (sortDesc ? <IconArrowDown className="w-3 h-3" /> : <IconArrowUp className="w-3 h-3" />)}
                            </button>
                          </th>
                          {shownFields.map((f) => (
                            <th key={f.api_name} scope="col" aria-sort={sortBy === f.api_name ? (sortDesc ? 'descending' : 'ascending') : 'none'} className="py-2.5 px-3 font-semibold">
                              <button type="button" onClick={() => handleSort(f.api_name)} className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white cursor-pointer">
                                <span>{f.label}</span>
                                {sortBy === f.api_name && (sortDesc ? <IconArrowDown className="w-3 h-3" /> : <IconArrowUp className="w-3 h-3" />)}
                              </button>
                            </th>
                          ))}
                          <th scope="col" className="py-2.5 px-3 font-semibold">Origin</th>
                          <th scope="col" className="py-2.5 px-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                        {records.map((r) => {
                          const isSel = selectedIds.has(r.id);
                          return (
                            <tr
                              key={r.id}
                              tabIndex={0}
                              aria-selected={isSel}
                              onClick={() => !showTrash && scheduleOpenDetail(r)}
                              onKeyDown={(e) => {
                                if (e.target !== e.currentTarget) return;
                                if (e.key === 'Enter' && !showTrash) openRecordDetail(r);
                                if (e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedIds(toggleId(selectedIds, r.id));
                                }
                              }}
                              className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--coral)] ${
                                isSel ? 'bg-[var(--coral)]/5' : 'hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40'
                              } ${showTrash ? '' : 'cursor-pointer'}`}
                            >
                              <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  aria-label={`Select record ${r.id}`}
                                  checked={isSel}
                                  onChange={() => setSelectedIds(toggleId(selectedIds, r.id))}
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">{r.id.slice(0, 12)}...</td>
                              {shownFields.map((f) => {
                                const val = (r.data || r.values || {})[f.api_name];
                                const editing = editingCell?.id === r.id && editingCell.field === f.api_name;
                                const editable = !showTrash && canEditInline(f);
                                const isOverridden = r.overridden_fields?.includes(f.api_name);
                                return (
                                  <td
                                    key={f.api_name}
                                    className="py-2.5 px-3 text-neutral-900 dark:text-neutral-200"
                                    onDoubleClick={editable ? (e) => { e.stopPropagation(); cancelPendingOpen(); setEditingCell({ id: r.id, field: f.api_name }); } : undefined}
                                    title={editable ? 'Double-click to edit' : undefined}
                                  >
                                    {editing ? (
                                      <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                                        <InlineEditor field={f} value={val} onCommit={(v) => commitInline(r, f, v)} onCancel={() => setEditingCell(null)} />
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        {(f.type === 'lookup' || f.type === 'relation') && val ? (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--coral)]/10 text-[var(--coral)] font-mono text-[11px]">
                                            <IconLink className="w-3 h-3" />
                                            {cellText(r, f)}
                                          </span>
                                        ) : (
                                          <span>{cellText(r, f)}</span>
                                        )}
                                        {isOverridden && (
                                          <span className="px-1 py-0.5 text-[9px] rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium" title="Manual user override protected from connector overwrite">
                                            override
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-2.5 px-3 text-[11px]">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-medium ${
                                    r.origin.startsWith('sync')
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : r.origin === 'agent'
                                        ? 'bg-[var(--coral)]/10 text-[var(--coral)]'
                                        : 'bg-neutral-500/10 text-neutral-600 dark:text-[var(--text-muted)]'
                                  }`}
                                >
                                  {r.origin}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  {showTrash ? (
                                    <>
                                      <button type="button" onClick={() => restoreSelected([r.id])} aria-label="Restore record" title="Restore" className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--coral)] cursor-pointer">
                                        <IconArrowBackUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" onClick={() => deleteForever([r.id])} aria-label="Delete record forever" title="Delete forever" className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 cursor-pointer">
                                        <IconTrashX className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button type="button" onClick={() => openRecordDetail(r)} aria-label="View or edit record details" title="View/Edit Details & Relations" className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--coral)] transition-colors cursor-pointer">
                                        <IconEye className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" onClick={() => handleDuplicate(r)} aria-label="Duplicate record" title="Duplicate" className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--coral)] transition-colors cursor-pointer">
                                        <IconCopy className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" onClick={() => softDelete([r.id])} aria-label="Move record to trash" title="Move to trash" className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer">
                                        <IconTrash className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: cards */}
                  <ul className="md:hidden flex flex-col gap-2" aria-label={`${selectedSchema.label} records`}>
                    {records.map((r) => {
                      const isSel = selectedIds.has(r.id);
                      const [titleField, ...rest] = shownFields;
                      return (
                        <li key={r.id} className={`rounded-xl border p-3 ${isSel ? 'border-[var(--coral)] bg-[var(--coral)]/5' : 'border-[var(--border)]'}`}>
                          <div className="flex items-start gap-3">
                            <input type="checkbox" className="mt-1" aria-label={`Select record ${r.id}`} checked={isSel} onChange={() => setSelectedIds(toggleId(selectedIds, r.id))} />
                            <button type="button" disabled={showTrash} onClick={() => openRecordDetail(r)} className="flex-1 min-w-0 text-left cursor-pointer">
                              <div className="text-sm font-medium text-[var(--text-primary)] truncate">{titleField ? cellText(r, titleField) : r.id}</div>
                              <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                                {rest.slice(0, 4).map((f) => (
                                  <div key={f.api_name} className="min-w-0">
                                    <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{f.label}</dt>
                                    <dd className="text-xs text-[var(--text-primary)] truncate">{cellText(r, f)}</dd>
                                  </div>
                                ))}
                              </dl>
                            </button>
                            {showTrash ? (
                              <button type="button" onClick={() => restoreSelected([r.id])} aria-label="Restore record" className="p-1 text-[var(--coral)] cursor-pointer">
                                <IconArrowBackUp className="w-4 h-4" />
                              </button>
                            ) : (
                              <button type="button" onClick={() => softDelete([r.id])} aria-label="Move record to trash" className="p-1 text-[var(--text-muted)] hover:text-red-500 cursor-pointer">
                                <IconTrash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            {/* Pagination / Load More Footer */}
            {records.length > 0 && (
              <div className="py-2.5 px-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-neutral-50/50 dark:bg-neutral-800/30 rounded-xl mt-3">
                <span className="text-xs text-[var(--text-muted)]">
                  Showing {records.length} of {totalRecords} records{records.length < totalRecords ? ' (partial)' : ''}
                </span>
                {hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-3 py-1.5 text-xs rounded-lg bg-[var(--coral)] hover:bg-[var(--coral-dark)] disabled:opacity-50 text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {loadingMore ? 'Loading...' : `Load More (${totalRecords - records.length} remaining)`}
                  </button>
                ) : (
                  records.length === totalRecords && totalRecords > 0 && (
                    <span className="text-[11px] text-[var(--text-muted)]">All records loaded</span>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--text-muted)]">
            <IconDatabase className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-600" />
            <h4 className="font-semibold text-[var(--text-primary)] text-base">Select or Create an Object</h4>
            <p className="text-xs max-w-sm mt-1">
              Choose a custom object from the directory on the left to view records, or create a new entity schema.
            </p>
          </div>
        )}
      </div>

      {/* ── Modal: Object Manager (Create / Edit Schema) ── */}
      <AnimatePresence>
        {isSchemaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              ref={schemaPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label={isEditingExistingSchema ? 'Edit object schema' : 'Create custom object'}
              tabIndex={-1}
              className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] outline-none"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <IconDatabase className="w-5 h-5 text-[var(--coral)]" />
                  <h3 className="font-semibold text-base text-[var(--text-primary)]">
                    {isEditingExistingSchema ? `Edit Schema: ${selectedSchema?.label}` : 'Create Custom Object'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsSchemaModalOpen(false)}
                  className="p-1 text-[var(--text-muted)] hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSchemaSubmit} className="flex flex-col gap-4 mt-4 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Entity Label
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Deal, Contact, Invoice"
                      value={schemaLabel}
                      onChange={(e) => handleSchemaLabelChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Plural Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Deals, Contacts"
                      value={schemaLabelPlural}
                      onChange={(e) => setSchemaLabelPlural(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    API Name: <span className="font-semibold text-[var(--coral)]">{schemaApiName || '—'}</span>
                    {isEditingExistingSchema && ' (read-only)'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Entity Fields & Relations
                    </label>
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="text-xs font-medium text-[var(--coral)] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <IconPlus className="w-3 h-3" /> Add Field
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {schemaFields.map((field, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border)] bg-neutral-50/50 dark:bg-neutral-800/40"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Field Label"
                            value={field.label}
                            onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => handleUpdateField(idx, { type: e.target.value as any })}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                              className="rounded border-neutral-300 text-[var(--coral)]"
                            />
                            Req
                          </label>
                          {schemaFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveField(idx)}
                              className="p-1 text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                              title="Remove field"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Additional configuration for Relation / Lookup fields */}
                        {(field.type === 'lookup' || field.type === 'relation') && (
                          <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/50 dark:border-white/5">
                            <span className="text-[11px] text-[var(--coral)] font-medium flex items-center gap-1">
                              <IconLink className="w-3 h-3" /> Target Entity:
                            </span>
                            <select
                              required
                              value={field.relation_target_object_id || field.reference_object || ''}
                              onChange={(e) =>
                                handleUpdateField(idx, {
                                  relation_target_object_id: e.target.value,
                                  reference_object: e.target.value,
                                })
                              }
                              className="flex-1 px-2 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                            >
                              <option value="">Select target custom object...</option>
                              {schemas.map((s) => (
                                <option key={s.id} value={s.api_name}>
                                  {s.label} ({s.api_name})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Additional configuration for Picklist / Select fields */}
                        {(field.type === 'picklist' || field.type === 'select') && (
                          <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/50 dark:border-white/5">
                            <span className="text-[11px] text-orange-500 font-medium">Options:</span>
                            <input
                              type="text"
                              required
                              placeholder="Comma-separated: Open, In Progress, Won, Lost"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) =>
                                handleUpdateField(idx, {
                                  options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                })
                              }
                              className="flex-1 px-2 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIsSchemaModalOpen(false)}
                    className="px-4 py-2 text-xs rounded-xl border border-[var(--border)] text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs rounded-xl bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white font-medium shadow-sm cursor-pointer"
                  >
                    {isEditingExistingSchema ? 'Save Schema Updates' : 'Create Object'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Add New Record ── */}
      <AnimatePresence>
        {isNewRecModalOpen && selectedSchema && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              ref={newRecPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="New record"
              tabIndex={-1}
              className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] outline-none"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <h3 className="font-semibold text-base text-[var(--text-primary)]">
                  Add {selectedSchema.label} Record
                </h3>
                <button
                  onClick={() => setIsNewRecModalOpen(false)}
                  className="p-1 text-[var(--text-muted)] hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRecordSubmit} className="flex flex-col gap-3.5 mt-4 overflow-y-auto pr-1">
                {selectedSchema.fields?.map((f) => {
                  const targetRef = f.relation_target_object_id || f.reference_object;
                  const isRelation = f.type === 'lookup' || f.type === 'relation';
                  const isSelect = f.type === 'picklist' || f.type === 'select';
                  const targetSchema = schemas.find((s) => s.api_name === targetRef || s.id === targetRef);

                  return (
                    <div key={f.api_name}>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </label>

                      {isRelation && targetRef ? (
                        <RelationCombobox
                          projectId={projectId}
                          targetObject={targetRef}
                          targetLabel={targetSchema?.label || targetRef}
                          value={recordFormData[f.api_name] || ''}
                          onChange={(recId) =>
                            setRecordFormData((prev) => ({ ...prev, [f.api_name]: recId }))
                          }
                          required={f.required}
                          disabled={isCreatingRecord}
                          mutationVersion={recordsMutationVersion}
                        />
                      ) : isSelect ? (
                        <select
                          required={f.required}
                          value={recordFormData[f.api_name] || ''}
                          onChange={(e) => setRecordFormData({ ...recordFormData, [f.api_name]: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                        >
                          <option value="">Select option...</option>
                          {f.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : f.type === 'boolean' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(recordFormData[f.api_name])}
                            onChange={(e) => setRecordFormData({ ...recordFormData, [f.api_name]: e.target.checked })}
                            className="rounded border-neutral-300 text-[var(--coral)] w-4 h-4"
                          />
                          <span className="text-xs text-neutral-600 dark:text-[var(--text-muted)]">Yes / True</span>
                        </div>
                      ) : (
                        <input
                          type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          step={f.type === 'currency' ? '0.01' : 'any'}
                          required={f.required}
                          placeholder={`Enter ${f.label.toLowerCase()}...`}
                          value={recordFormData[f.api_name] ?? ''}
                          onChange={(e) => setRecordFormData({ ...recordFormData, [f.api_name]: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                        />
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] mt-2">
                  <button
                    type="button"
                    disabled={isCreatingRecord}
                    onClick={() => setIsNewRecModalOpen(false)}
                    className="px-4 py-2 text-xs rounded-xl border border-[var(--border)] text-neutral-700 dark:text-neutral-300 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingRecord}
                    className="px-4 py-2 text-xs rounded-xl bg-[var(--coral)] hover:bg-[var(--coral-dark)] disabled:opacity-50 text-white font-medium shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    {isCreatingRecord ? (
                      <>
                        <IconRefresh className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      'Save Record'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal / Drawer: Record Detail & Edit + Related Records ── */}
      <AnimatePresence>
        {activeRecord && selectedSchema && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              ref={detailPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Record details"
              tabIndex={-1}
              className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] outline-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[var(--coral)]/12 text-[var(--coral)]">
                    <IconEye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">
                      {selectedSchema.label} Detail
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono">
                      ID: {activeRecord.id} • Origin: {activeRecord.origin}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveRecord(null)}
                  className="p-1 text-[var(--text-muted)] hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* View Tabs: Fields Form vs Related Records Panel */}
              <div className="flex items-center gap-2 pt-3 border-b border-[var(--border)]">
                <button
                  onClick={() => setDetailTab('fields')}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    detailTab === 'fields'
                      ? 'border-indigo-600 text-[var(--coral)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Fields & Attributes
                </button>
                <button
                  onClick={() => setDetailTab('related')}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    detailTab === 'related'
                      ? 'border-indigo-600 text-[var(--coral)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <IconLayersLinked className="w-3.5 h-3.5" />
                  <span>Related Records ({relatedGroups.reduce((acc, g) => acc + g.count, 0)})</span>
                </button>
              </div>

              {/* Tab 1: Fields Form */}
              {detailTab === 'fields' && (
                <form onSubmit={handleUpdateRecordSubmit} className="flex flex-col gap-4 mt-4 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {selectedSchema.fields?.map((f) => {
                      const targetRef = f.relation_target_object_id || f.reference_object;
                      const isRelation = f.type === 'lookup' || f.type === 'relation';
                      const isSelect = f.type === 'picklist' || f.type === 'select';
                      const isOverridden = activeRecord.overridden_fields?.includes(f.api_name);
                      const targetSchema = schemas.find((s) => s.api_name === targetRef || s.id === targetRef);

                      return (
                        <div key={f.api_name} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                              {f.label} {f.required && <span className="text-red-500">*</span>}
                            </label>
                            {isOverridden && (
                              <span className="text-[10px] text-amber-500 font-medium">Overridden</span>
                            )}
                          </div>

                          {isRelation && targetRef ? (
                            <RelationCombobox
                              projectId={projectId}
                              targetObject={targetRef}
                              targetLabel={targetSchema?.label || targetRef}
                              value={detailFormData[f.api_name] || ''}
                              onChange={(recId) =>
                                setDetailFormData((prev) => ({ ...prev, [f.api_name]: recId }))
                              }
                              required={f.required}
                              disabled={savingRecord || isUpdatingRecord}
                              mutationVersion={recordsMutationVersion}
                            />
                          ) : isSelect ? (
                            <select
                              required={f.required}
                              value={detailFormData[f.api_name] || ''}
                              onChange={(e) => setDetailFormData({ ...detailFormData, [f.api_name]: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                            >
                              <option value="">Select option...</option>
                              {f.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : f.type === 'boolean' ? (
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="checkbox"
                                checked={Boolean(detailFormData[f.api_name])}
                                onChange={(e) => setDetailFormData({ ...detailFormData, [f.api_name]: e.target.checked })}
                                className="rounded border-neutral-300 text-[var(--coral)] w-4 h-4"
                              />
                              <span className="text-xs text-neutral-600 dark:text-[var(--text-muted)]">Yes / True</span>
                            </div>
                          ) : (
                            <input
                              type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                              step={f.type === 'currency' ? '0.01' : 'any'}
                              required={f.required}
                              value={detailFormData[f.api_name] ?? ''}
                              onChange={(e) => setDetailFormData({ ...detailFormData, [f.api_name]: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] mt-2">
                    <button
                      type="button"
                      onClick={() => softDelete([activeRecord.id])}
                      className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <IconTrash className="w-4 h-4" /> Move to trash
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={savingRecord || isUpdatingRecord}
                        onClick={() => setActiveRecord(null)}
                        className="px-4 py-2 text-xs rounded-xl border border-[var(--border)] text-neutral-700 dark:text-neutral-300 cursor-pointer disabled:opacity-50"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        disabled={savingRecord || isUpdatingRecord}
                        className="px-4 py-2 text-xs rounded-xl bg-[var(--coral)] hover:bg-[var(--coral-dark)] disabled:opacity-50 text-white font-medium shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        {(savingRecord || isUpdatingRecord) ? (
                          <>
                            <IconRefresh className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Tab 2: Related Records Panel */}
              {detailTab === 'related' && (
                <div className="flex flex-col gap-4 mt-4 overflow-y-auto pr-1">
                  {loadingRelated ? (
                    <div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading related records...</div>
                  ) : relatedGroups.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                      <IconLinkOff className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No related records found</p>
                      <p className="text-xs text-[var(--text-muted)] max-w-xs">
                        No other custom objects currently have relations referencing this record.
                      </p>
                    </div>
                  ) : (
                    relatedGroups.map((group) => (
                      <div
                        key={group.object_id}
                        className="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--border)] bg-neutral-50/50 dark:bg-neutral-800/40"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                          <span className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                            <IconLink className="w-3.5 h-3.5 text-[var(--coral)]" />
                            {group.object_label} ({group.count})
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            via field: {group.field_name}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                          {group.records.map((cr) => {
                            const crData = cr.data || cr.values || {};
                            const title = crData.name || crData.title || crData.label || cr.id;
                            return (
                              <div
                                key={cr.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs hover:border-[var(--coral)]/40 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[var(--text-primary)]">{title}</span>
                                  <span className="font-mono text-[10px] text-[var(--text-muted)]">{cr.id.slice(0, 10)}...</span>
                                </div>
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  {crData.amount ? `$${crData.amount}` : crData.status || '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setActiveRecord(null)}
                      className="px-4 py-2 text-xs rounded-xl border border-[var(--border)] text-neutral-700 dark:text-neutral-300 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Cell editor: Enter or blur saves, Esc cancels. Booleans toggle immediately. */
function InlineEditor({
  field,
  value,
  onCommit,
  onCancel,
}: {
  field: ObjectField;
  value: unknown;
  onCommit: (v: unknown) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<string>(value === null || value === undefined ? '' : String(value));
  const done = useRef(false);
  const finish = (v: unknown) => {
    if (done.current) return;
    done.current = true;
    onCommit(v);
  };
  const common = {
    autoFocus: true,
    'aria-label': `Edit ${field.label}`,
    className: 'w-full min-w-[6rem] px-1.5 py-1 text-xs rounded-md bg-[var(--surface)] border border-[var(--coral)] text-[var(--text-primary)] focus:outline-none',
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        done.current = true;
        onCancel();
      }
      if (e.key === 'Enter') finish(draft);
    },
  };
  if (field.type === 'boolean') {
    return (
      <input
        type="checkbox"
        autoFocus
        aria-label={`Edit ${field.label}`}
        defaultChecked={Boolean(value)}
        onChange={(e) => finish(e.target.checked)}
        onBlur={onCancel}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
    );
  }
  if (field.type === 'picklist' || field.type === 'select') {
    return (
      <select {...common} value={draft} onChange={(e) => finish(e.target.value)} onBlur={() => finish(draft)}>
        <option value="">—</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      {...common}
      type={field.type === 'date' ? 'date' : 'text'}
      inputMode={field.type === 'number' || field.type === 'currency' ? 'decimal' : undefined}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(draft)}
    />
  );
}

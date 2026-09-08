'use client';

import React, { useState, useEffect } from 'react';
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
  type ObjectSchema,
  type ObjectRecord,
  type ObjectField,
  type RelatedGroup,
} from '../../lib/customObjectsApi';
import { RelationCombobox } from './RelationCombobox';

interface ObjectBuilderViewProps {
  projectId: string;
}

const FIELD_TYPES: Array<{ value: ObjectField['type']; label: string; icon: React.ReactNode }> = [
  { value: 'text', label: 'Text', icon: <IconLetterCase className="w-4 h-4 text-blue-400" /> },
  { value: 'number', label: 'Number', icon: <IconHash className="w-4 h-4 text-emerald-400" /> },
  { value: 'currency', label: 'Currency ($)', icon: <IconCurrencyDollar className="w-4 h-4 text-yellow-400" /> },
  { value: 'date', label: 'Date', icon: <IconCalendar className="w-4 h-4 text-purple-400" /> },
  { value: 'boolean', label: 'Boolean (Yes/No)', icon: <IconToggleLeft className="w-4 h-4 text-cyan-400" /> },
  { value: 'email', label: 'Email Address', icon: <IconMail className="w-4 h-4 text-pink-400" /> },
  { value: 'url', label: 'Website / URL', icon: <IconWorld className="w-4 h-4 text-teal-400" /> },
  { value: 'picklist', label: 'Picklist / Select', icon: <IconListDetails className="w-4 h-4 text-orange-400" /> },
  { value: 'lookup', label: 'Relation (Lookup)', icon: <IconLink className="w-4 h-4 text-indigo-400" /> },
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

  const loadRecords = async (
    schema: ObjectSchema,
    sBy: string = sortBy,
    sDesc: boolean = sortDesc,
    search: string = debouncedSearch
  ) => {
    if (!projectId || !schema) return;
    setRecordsLoading(true);
    try {
      const resp = await fetchRecords(projectId, schema.api_name, 50, 0, sBy, sDesc, search);
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
      const resp = await fetchRecords(projectId, selectedSchema.api_name, 50, records.length, sortBy, sortDesc, debouncedSearch);
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
  }, [selectedSchema?.id, debouncedSearch]);

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
    if (!projectId || !schemaLabel || !schemaApiName) return;

    try {
      if (isEditingExistingSchema && selectedSchema) {
        const updated = await updateObjectSchema(projectId, selectedSchema.id, {
          label: schemaLabel,
          label_plural: schemaLabelPlural || `${schemaLabel}s`,
          fields: schemaFields,
        });
        setSelectedSchema(updated);
      } else {
        const created = await createObjectSchema(projectId, {
          api_name: schemaApiName,
          label: schemaLabel,
          label_plural: schemaLabelPlural || `${schemaLabel}s`,
          fields: schemaFields,
        });
        setSelectedSchema(created);
      }
      setIsSchemaModalOpen(false);
      await loadSchemas();
    } catch (err: any) {
      alert(err.message || 'Failed to save schema');
    }
  };

  const handleDeleteSchema = async (schema: ObjectSchema) => {
    if (!projectId) return;
    if (!confirm(`Are you sure you want to delete entity '${schema.label}'? All records will be permanently removed.`)) {
      return;
    }
    try {
      await deleteObjectSchema(projectId, schema.id);
      if (selectedSchema?.id === schema.id) {
        setSelectedSchema(null);
      }
      await loadSchemas();
    } catch (err: any) {
      alert(err.message || 'Failed to delete entity');
    }
  };

  const handleCreateRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedSchema || isCreatingRecord) return;
    setIsCreatingRecord(true);
    try {
      const cleanData = coerceFormData(selectedSchema, recordFormData);
      await createRecord(projectId, selectedSchema.id, cleanData);
      setIsNewRecModalOpen(false);
      setRecordFormData({});
      setRecordsMutationVersion((v) => v + 1);
      await loadRecords(selectedSchema, sortBy, sortDesc, debouncedSearch);
    } catch (err: any) {
      alert(err.message || 'Failed to create record');
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
      const updated = await updateRecord(projectId, selectedSchema.id, activeRecord.id, cleanData);
      setActiveRecord(updated);
      setRecordsMutationVersion((v) => v + 1);
      await loadRecords(selectedSchema, sortBy, sortDesc, debouncedSearch);
      alert('Record updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update record');
    } finally {
      setIsUpdatingRecord(false);
      setSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!projectId || !selectedSchema) return;
    try {
      // Pre-flight check for referencing child records
      const relCheck = await fetchRelatedRecords(recordId);
      const groups = relCheck.related || [];
      const totalReferencing = groups.reduce((acc, g) => acc + g.count, 0);

      let confirmMsg = 'Are you sure you want to delete this record?';
      if (totalReferencing > 0) {
        const entityBreakdown = groups.map((g) => `${g.count} in ${g.object_label}`).join(', ');
        confirmMsg = `⚠️ WARNING: This record is currently referenced by ${totalReferencing} record(s) (${entityBreakdown}).\n\nDeleting will automatically UNLINK these references (clearing the foreign lookup). Are you sure you want to proceed?`;
      }

      if (!confirm(confirmMsg)) return;

      const res = await deleteRecord(projectId, selectedSchema.id, recordId, 'nullify');
      if (activeRecord?.id === recordId) {
        setActiveRecord(null);
      }
      setRecordsMutationVersion((v) => v + 1);
      await loadRecords(selectedSchema, sortBy, sortDesc, debouncedSearch);
      if (res.unlinked_references && res.unlinked_references > 0) {
        alert(`Record deleted and ${res.unlinked_references} foreign reference(s) cleanly unlinked.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full min-h-[640px]">
      {/* ── Left Sidebar: Object Schemas Directory ── */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <IconDatabase className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-neutral-900 dark:text-white text-sm">Custom Entities</span>
          </div>
          <button
            onClick={openCreateSchemaModal}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm cursor-pointer"
            title="Create Custom Object"
          >
            <IconPlus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[560px] pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-neutral-500">Loading entities...</div>
          ) : schemas.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-white/10 text-center text-xs text-neutral-500">
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
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/50 shadow-sm'
                      : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-white/5 hover:border-neutral-300 dark:hover:border-white/15'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                      {schema.label}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
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
      <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        {selectedSchema ? (
          <>
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <IconTable className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
                      {selectedSchema.label} Records
                    </h3>
                    <button
                      onClick={() => openEditSchemaModal(selectedSchema)}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-white/10 transition-colors cursor-pointer"
                    >
                      Edit Schema
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                    api_name: {selectedSchema.api_name} | Total: {totalRecords} records
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <IconSearch className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Filter records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 border-none text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
                  />
                </div>
                <button
                  onClick={openNewRecordModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  <span>Add Record</span>
                </button>
                <button
                  onClick={() => selectedSchema && loadRecords(selectedSchema)}
                  className="p-1.5 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  title="Refresh data"
                >
                  <IconRefresh className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Records Data Table */}
            <div className="flex-1 overflow-x-auto mt-4">
              {recordsLoading ? (
                <div className="py-20 text-center text-xs text-neutral-500">Loading records...</div>
              ) : records.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-2">
                  <IconColumns className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No records found</p>
                  <p className="text-xs text-neutral-500 max-w-xs">
                    Insert records manually with &apos;Add Record&apos;, conversational agent queries, or live connectors.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-400">
                      <th
                        onClick={() => handleSort('id')}
                        className="py-2.5 px-3 font-semibold cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                      >
                        <div className="flex items-center gap-1">
                          <span>Record ID</span>
                          {sortBy === 'id' && (sortDesc ? <IconArrowDown className="w-3 h-3" /> : <IconArrowUp className="w-3 h-3" />)}
                        </div>
                      </th>
                      {selectedSchema.fields?.map((f) => (
                        <th
                          key={f.api_name}
                          onClick={() => handleSort(f.api_name)}
                          className="py-2.5 px-3 font-semibold cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                        >
                          <div className="flex items-center gap-1">
                            <span>{f.label}</span>
                            {sortBy === f.api_name && (sortDesc ? <IconArrowDown className="w-3 h-3" /> : <IconArrowUp className="w-3 h-3" />)}
                          </div>
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-semibold">Origin</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                    {records.map((r) => {
                      const rData = r.data || r.values || {};
                      return (
                        <tr
                          key={r.id}
                          onClick={() => openRecordDetail(r)}
                          className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-500">{r.id.slice(0, 12)}...</td>
                          {selectedSchema.fields?.map((f) => {
                            const val = rData[f.api_name];
                            let display = val === undefined || val === null ? '—' : String(val);
                            if (f.type === 'currency' && typeof val === 'number') {
                              display = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                            } else if (f.type === 'boolean') {
                              display = val ? 'Yes' : 'No';
                            } else if (f.type === 'lookup' || f.type === 'relation') {
                              const resolved = r.resolved_relations?.[f.api_name];
                              if (resolved) {
                                display = resolved.display_label;
                              }
                            }
                            const isOverridden = r.overridden_fields?.includes(f.api_name);

                            return (
                              <td key={f.api_name} className="py-2.5 px-3 text-neutral-900 dark:text-neutral-200">
                                <div className="flex items-center gap-1.5">
                                  {(f.type === 'lookup' || f.type === 'relation') && val ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                                      <IconLink className="w-3 h-3" />
                                      {display}
                                    </span>
                                  ) : (
                                    <span>{display}</span>
                                  )}
                                  {isOverridden && (
                                    <span
                                      className="px-1 py-0.5 text-[9px] rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                                      title="Manual user override protected from connector overwrite"
                                    >
                                      override
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-[11px]">
                            <span
                              className={`px-2 py-0.5 rounded-full font-medium ${
                                r.origin.startsWith('sync')
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : r.origin === 'agent'
                                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                  : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
                              }`}
                            >
                              {r.origin}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openRecordDetail(r)}
                                className="p-1 rounded text-neutral-400 hover:text-indigo-500 transition-colors cursor-pointer"
                                title="View/Edit Details & Relations"
                              >
                                <IconEye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(r.id)}
                                className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete record"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination / Load More Footer */}
            {records.length > 0 && (
              <div className="py-2.5 px-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-xl mt-3">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Showing {records.length} of {totalRecords} records{records.length < totalRecords ? ' (partial)' : ''}
                </span>
                {hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {loadingMore ? 'Loading...' : `Load More (${totalRecords - records.length} remaining)`}
                  </button>
                ) : (
                  records.length === totalRecords && totalRecords > 0 && (
                    <span className="text-[11px] text-neutral-400">All records loaded</span>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400">
            <IconDatabase className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-600" />
            <h4 className="font-semibold text-neutral-900 dark:text-white text-base">Select or Create an Entity</h4>
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
              className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <IconDatabase className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-base text-neutral-900 dark:text-white">
                    {isEditingExistingSchema ? `Edit Schema: ${selectedSchema?.label}` : 'Create Custom Entity'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsSchemaModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    API Name: <span className="font-semibold text-indigo-500">{schemaApiName || '—'}</span>
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
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <IconPlus className="w-3 h-3" /> Add Field
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {schemaFields.map((field, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 p-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-800/40"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Field Label"
                            value={field.label}
                            onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => handleUpdateField(idx, { type: e.target.value as any })}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-[11px] text-neutral-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                              className="rounded border-neutral-300 text-indigo-600"
                            />
                            Req
                          </label>
                          {schemaFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveField(idx)}
                              className="p-1 text-neutral-400 hover:text-red-500 cursor-pointer"
                              title="Remove field"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Additional configuration for Relation / Lookup fields */}
                        {(field.type === 'lookup' || field.type === 'relation') && (
                          <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/50 dark:border-white/5">
                            <span className="text-[11px] text-indigo-500 font-medium flex items-center gap-1">
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
                              className="flex-1 px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
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
                              className="flex-1 px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsSchemaModalOpen(false)}
                    className="px-4 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm cursor-pointer"
                  >
                    {isEditingExistingSchema ? 'Save Schema Updates' : 'Create Entity'}
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
              className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-white/10">
                <h3 className="font-semibold text-base text-neutral-900 dark:text-white">
                  Add {selectedSchema.label} Record
                </h3>
                <button
                  onClick={() => setIsNewRecModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
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
                          className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
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
                            className="rounded border-neutral-300 text-indigo-600 w-4 h-4"
                          />
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">Yes / True</span>
                        </div>
                      ) : (
                        <input
                          type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          step={f.type === 'currency' ? '0.01' : 'any'}
                          required={f.required}
                          placeholder={`Enter ${f.label.toLowerCase()}...`}
                          value={recordFormData[f.api_name] ?? ''}
                          onChange={(e) => setRecordFormData({ ...recordFormData, [f.api_name]: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        />
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-white/10 mt-2">
                  <button
                    type="button"
                    disabled={isCreatingRecord}
                    onClick={() => setIsNewRecModalOpen(false)}
                    className="px-4 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingRecord}
                    className="px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium shadow-sm cursor-pointer flex items-center gap-1.5"
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
              className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <IconEye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-neutral-900 dark:text-white">
                      {selectedSchema.label} Detail
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      ID: {activeRecord.id} • Origin: {activeRecord.origin}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveRecord(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* View Tabs: Fields Form vs Related Records Panel */}
              <div className="flex items-center gap-2 pt-3 border-b border-neutral-200 dark:border-white/10">
                <button
                  onClick={() => setDetailTab('fields')}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    detailTab === 'fields'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Fields & Attributes
                </button>
                <button
                  onClick={() => setDetailTab('related')}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    detailTab === 'related'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
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
                              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
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
                                className="rounded border-neutral-300 text-indigo-600 w-4 h-4"
                              />
                              <span className="text-xs text-neutral-600 dark:text-neutral-400">Yes / True</span>
                            </div>
                          ) : (
                            <input
                              type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                              step={f.type === 'currency' ? '0.01' : 'any'}
                              required={f.required}
                              value={detailFormData[f.api_name] ?? ''}
                              onChange={(e) => setDetailFormData({ ...detailFormData, [f.api_name]: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-white/10 mt-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(activeRecord.id)}
                      className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <IconTrash className="w-4 h-4" /> Delete Record
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={savingRecord || isUpdatingRecord}
                        onClick={() => setActiveRecord(null)}
                        className="px-4 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 cursor-pointer disabled:opacity-50"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        disabled={savingRecord || isUpdatingRecord}
                        className="px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium shadow-sm cursor-pointer flex items-center gap-1.5"
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
                    <div className="py-12 text-center text-xs text-neutral-500">Loading related records...</div>
                  ) : relatedGroups.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                      <IconLinkOff className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No related records found</p>
                      <p className="text-xs text-neutral-500 max-w-xs">
                        No other custom objects currently have relations referencing this record.
                      </p>
                    </div>
                  ) : (
                    relatedGroups.map((group) => (
                      <div
                        key={group.object_id}
                        className="flex flex-col gap-2 p-3.5 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-800/40"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/5">
                          <span className="font-semibold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                            <IconLink className="w-3.5 h-3.5 text-indigo-500" />
                            {group.object_label} ({group.count})
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
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
                                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 text-xs hover:border-indigo-300 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-neutral-900 dark:text-white">{title}</span>
                                  <span className="font-mono text-[10px] text-neutral-400">{cr.id.slice(0, 10)}...</span>
                                </div>
                                <span className="text-[11px] text-neutral-400">
                                  {crData.amount ? `$${crData.amount}` : crData.status || '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveRecord(null)}
                      className="px-4 py-2 text-xs rounded-xl border border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 cursor-pointer"
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

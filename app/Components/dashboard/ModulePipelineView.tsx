'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  IconComponents,
  IconPlus,
  IconArrowRight,
  IconCheck,
  IconPackage,
  IconUsers,
  IconReceipt,
  IconRefresh,
  IconTrash,
  IconExternalLink,
  IconHierarchy2,
  IconCode,
} from '@tabler/icons-react';
import {
  fetchModuleLibrary,
  fetchProjectPipeline,
  installProjectModule,
  uninstallProjectModule,
  type ModuleTemplate,
  type ProjectPipeline,
} from '../../lib/customObjectsApi';

interface ModulePipelineViewProps {
  projectId: string;
  onRefreshLayout?: () => void;
}

export function ModulePipelineView({ projectId, onRefreshLayout }: ModulePipelineViewProps) {
  const [library, setLibrary] = useState<ModuleTemplate[]>([]);
  const [pipeline, setPipeline] = useState<ProjectPipeline>({
    project_id: projectId,
    modules: [],
    provided_capabilities: [],
  });
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [lib, pipe] = await Promise.all([
        fetchModuleLibrary(),
        fetchProjectPipeline(projectId),
      ]);
      setLibrary(lib);
      setPipeline(pipe);
    } catch (err) {
      console.error('Failed to load module pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleInstall = async (moduleId: string) => {
    setInstallingId(moduleId);
    try {
      await installProjectModule(projectId, moduleId);
      await loadData();
      if (onRefreshLayout) onRefreshLayout();
    } catch (err: any) {
      alert(err.message || 'Failed to install module');
    } finally {
      setInstallingId(null);
    }
  };

  const handleUninstall = async (instanceId: string, moduleName: string) => {
    if (!confirm(`Uninstall ${moduleName} from project pipeline?`)) return;
    try {
      await uninstallProjectModule(projectId, instanceId);
      await loadData();
      if (onRefreshLayout) onRefreshLayout();
    } catch (err: any) {
      alert(err.message || 'Failed to uninstall module');
    }
  };

  const getModuleIcon = (modId: string) => {
    if (modId.includes('inventory')) return <IconPackage className="w-5 h-5 text-emerald-400" />;
    if (modId.includes('crm')) return <IconUsers className="w-5 h-5 text-blue-400" />;
    if (modId.includes('invoicing')) return <IconReceipt className="w-5 h-5 text-yellow-400" />;
    return <IconComponents className="w-5 h-5 text-indigo-400" />;
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <IconHierarchy2 className="w-6 h-6 text-indigo-500" />
            Module Pipeline & Deterministic Catalog
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Pre-built, tested business logic modules with version-pinned custom schemas, dependency wiring, and zero hallucination.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh pipeline"
        >
          <IconRefresh className="w-4 h-4" />
        </button>
      </div>

      {/* ── Active Pipeline Flow Graph ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white uppercase tracking-wider text-xs">
            Active Project Pipeline ({pipeline.modules?.length || 0} installed)
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {pipeline.provided_capabilities?.map((cap) => (
              <span
                key={cap}
                className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono border border-indigo-500/20"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {pipeline.modules?.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-white/10 text-center flex flex-col items-center justify-center gap-2">
            <IconComponents className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No modules installed in this project</p>
            <p className="text-xs text-neutral-500 max-w-sm">
              Explore the deterministic module catalog below and install ready-made business templates into your workspace.
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 overflow-x-auto py-2">
            {pipeline.modules.map((m, idx) => {
              const tmpl = library.find((l) => l.id === m.module_id);
              const isLast = idx === pipeline.modules.length - 1;

              return (
                <React.Fragment key={m.instance_id}>
                  <div className="flex-1 min-w-[240px] p-4 rounded-2xl bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-white/10 shadow-sm flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                          {getModuleIcon(m.module_id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                              #{m.order}
                            </span>
                            <h4 className="font-semibold text-xs text-neutral-900 dark:text-white">
                              {tmpl?.name || m.module_id}
                            </h4>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono">v1 pinned</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUninstall(m.instance_id, tmpl?.name || m.module_id)}
                        className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                        title="Uninstall module"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {tmpl?.provides?.map((p) => (
                        <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                          +{p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!isLast && (
                    <div className="hidden md:flex items-center justify-center text-neutral-400">
                      <IconArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Deterministic Module Catalog Library ── */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-white uppercase tracking-wider text-xs">
          Deterministic ERP Catalog Templates
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {library.map((template) => {
            const isInstalled = pipeline.modules?.some((m) => m.module_id === template.id);
            const isInstalling = installingId === template.id;

            return (
              <div
                key={template.id}
                className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-white/10 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                      {getModuleIcon(template.id)}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      v{template.version} seed
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-neutral-900 dark:text-white mb-1">
                    {template.name}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
                    {template.description}
                  </p>

                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-[11px] mb-4">
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>Custom Objects:</span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">
                        {template.objects?.map((o) => o.api_name).join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>Dashboard Screens:</span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">
                        {template.screens?.length || 0} widgets
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-white/5">
                  {isInstalled ? (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-xl">
                      <IconCheck className="w-4 h-4" /> Installed
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInstall(template.id)}
                      disabled={isInstalling}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>{isInstalling ? 'Installing...' : 'Install Module'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

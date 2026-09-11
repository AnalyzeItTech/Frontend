'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconPlus,
  IconLayoutGrid,
  IconSearch,
  IconSparkles,
  IconCheck,
  IconX,
  IconLayoutDashboard,
  IconEdit,
  IconTrash,
  IconCopy,
  IconUser,
  IconFolder,
  IconFolderPlus,
  IconDownload,
  IconFileTypePdf,
  IconFileTypePpt,
  IconFileSpreadsheet,
  IconFileTypeDoc,
  IconShare,
  IconChevronDown,
  IconPlayerPlay,
  IconDatabase,
  IconBrandStripe,
  IconComponents,
  IconFileZip,
  IconArrowUpRight,
  IconRefresh,
  IconLogout,
  IconWorld,
} from '@tabler/icons-react';
import {
  getProjectLayout,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProjectLayout,
  type WidgetSpec,
  type ProjectSummary,
} from '../lib/chatApi';
import {
  getStoredUser,
  fetchMe,
  logout,
  updateUserProfile,
  changePassword,
  type UserProfile,
} from '../lib/auth';
import { downloadProjectZip, duplicateProject } from '../lib/exportApi';
import { SandboxedWidgetRenderer } from '../Components/dashboard/WidgetRenderer';
import { LayoutSwitcher } from '../Components/dashboard/LayoutSwitcher';
import { ObjectBuilderView } from '../Components/dashboard/ObjectBuilderView';
import { ConnectorsView } from '../Components/dashboard/ConnectorsView';
import { ModulePipelineView } from '../Components/dashboard/ModulePipelineView';
import {
  exportDashboardToPdf,
  exportDashboardToPptx,
  exportDashboardToXlsx,
  exportDashboardToDocx,
  copyShareableLink,
} from '../lib/exportUtils';
import {
  CURATED_TEMPLATES,
  type DashboardTemplate,
} from '../lib/dashboardTemplates';
import { redactClientError } from '../lib/apiErrors';

export default function DashboardPage() {
  const router = useRouter();

  // Navigation rail tab state
  const [studioTab, setStudioTab] = useState<'canvas' | 'objects' | 'connectors' | 'pipeline' | 'templates'>('canvas');
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Active Scoped Project & Generative Canvas State ─────────────────────────
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string>('Workspace Canvas');
  const [layoutVersion, setLayoutVersion] = useState<number>(1);
  const [updatedBy, setUpdatedBy] = useState<string>('system');
  const [currentLayout, setCurrentLayout] = useState<{ widgets: WidgetSpec[] }>({
    widgets: [],
  });

  // ─── User & Projects State ──────────────────────────────────────────────────
  const [user, setUser] = useState<UserProfile | null>(null);
  const [serverProjects, setServerProjects] = useState<ProjectSummary[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // ─── Export Menu & Toast State ───────────────────────────────────────────────
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportToastMsg, setExportToastMsg] = useState<string | null>(null);

  // ─── Curated Templates State ─────────────────────────────────────────────────
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>('All');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState<string | null>(null);

  // ─── Modals State ────────────────────────────────────────────────────────────
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const [projectToRename, setProjectToRename] = useState<ProjectSummary | null>(null);
  const [renameName, setRenameName] = useState('');
  const [isRenamingProject, setIsRenamingProject] = useState(false);

  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isDuplicatingProject, setIsDuplicatingProject] = useState<string | null>(null);

  // ─── User Profile & Settings Modal ──────────────────────────────────────────
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);
  const [userActionErr, setUserActionErr] = useState<string | null>(null);

  // ─── Initial Load & Hydration ────────────────────────────────────────────────
  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    updateOnlineState();
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled && !finished) {
        setIsLoadingProjects(false);
        setWorkspaceError('This is taking longer than expected. Check your connection and try again.');
      }
    }, 12000);

    async function loadWorkspace() {
      setIsLoadingProjects(true);
      setWorkspaceError(null);
      try {
        const stored = getStoredUser();
        if (stored) {
          setUser(stored);
          setEditName(stored.name || '');
        }
        try {
          const fresh = await fetchMe();
          if (fresh) {
            setUser(fresh);
            setEditName(fresh.name || '');
          }
        } catch {
          // Token expired or invalid
        }

        const projs = await getProjects();
        if (cancelled) return;
        setServerProjects(projs);

        if (projs.length > 0) {
          const first = projs[0];
          setActiveProjectId(first.id);
          setActiveProjectName(first.name);

          try {
            const layoutData = await getProjectLayout(first.id);
            if (layoutData && layoutData.layout_json?.widgets) {
              setCurrentLayout(layoutData.layout_json);
              setLayoutVersion(layoutData.version);
              setUpdatedBy(layoutData.updated_by || 'system');
            } else {
              setCurrentLayout({ widgets: [] });
            }
          } catch {
            setCurrentLayout({ widgets: [] });
          }
        } else {
          setActiveProjectId(null);
          setActiveProjectName('Workspace Canvas');
          setCurrentLayout({ widgets: [] });
        }
      } catch (err) {
        if (cancelled) return;
        setServerProjects([]);
        setCurrentLayout({ widgets: [] });
        setWorkspaceError(redactClientError(err, 'Couldn’t load your dashboard.'));
      } finally {
        finished = true;
        if (!cancelled) setIsLoadingProjects(false);
      }
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [loadKey]);

  // ─── Switch Active Project ──────────────────────────────────────────────────
  const handleSelectProject = async (proj: ProjectSummary) => {
    setActiveProjectId(proj.id);
    setActiveProjectName(proj.name);
    try {
      const layoutData = await getProjectLayout(proj.id);
      if (layoutData && layoutData.layout_json?.widgets) {
        setCurrentLayout(layoutData.layout_json);
        setLayoutVersion(layoutData.version);
        setUpdatedBy(layoutData.updated_by || 'user');
      } else {
        setCurrentLayout({ widgets: [] });
        setLayoutVersion(layoutData?.version || 1);
      }
    } catch (err) {
      console.warn('Failed to load layout for project:', err);
      setCurrentLayout({ widgets: [] });
      setExportToastMsg(err instanceof Error ? err.message : 'Could not load this project layout.');
      setTimeout(() => setExportToastMsg(null), 5000);
    }
  };

  const refreshActiveProjectLayout = async () => {
    if (!activeProjectId) return;
    try {
      const layoutData = await getProjectLayout(activeProjectId);
      if (layoutData && layoutData.layout_json?.widgets) {
        setCurrentLayout(layoutData.layout_json);
        setLayoutVersion(layoutData.version);
        setUpdatedBy(layoutData.updated_by || 'agent');
      }
    } catch (err) {
      console.warn('Failed to refresh layout:', err);
    }
  };

  // ─── Project CRUD Handlers ──────────────────────────────────────────────────
  const handleCreateProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newProjectName.trim();
    if (!name || isCreatingProject) return;

    setIsCreatingProject(true);
    try {
      const created = await createProject(name, user?.id);
      setServerProjects((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      setActiveProjectName(created.name);
      setCurrentLayout({ widgets: [] });
      setLayoutVersion(created.layout_version || 1);
      setIsNewProjectOpen(false);
      setNewProjectName('');
      setExportToastMsg(`Project "${created.name}" created!`);
      setTimeout(() => setExportToastMsg(null), 3000);
    } catch (err: any) {
      setExportToastMsg(err?.message || 'Failed to create project');
      setTimeout(() => setExportToastMsg(null), 5000);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleUseTemplate = async (template: DashboardTemplate) => {
    if (isApplyingTemplate) return;
    setIsApplyingTemplate(template.id);
    try {
      const created = await createProject(template.name, user?.id);
      if (template.widgets.length > 0) {
        await updateProjectLayout(created.id, 1, { widgets: template.widgets }, 'user');
      }
      setServerProjects((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      setActiveProjectName(created.name);
      setCurrentLayout({ widgets: template.widgets });
      setLayoutVersion(1);
      setStudioTab('canvas');
      setExportToastMsg(`Project created from "${template.name}" template!`);
      setTimeout(() => setExportToastMsg(null), 3000);
    } catch (err: any) {
      setExportToastMsg(err?.message || 'Failed to instantiate template project');
      setTimeout(() => setExportToastMsg(null), 5000);
    } finally {
      setIsApplyingTemplate(null);
    }
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!projectToRename || !renameName.trim() || isRenamingProject) return;

    setIsRenamingProject(true);
    try {
      const updated = await updateProject(projectToRename.id, renameName.trim());
      setServerProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, name: updated.name } : p))
      );
      if (activeProjectId === updated.id) {
        setActiveProjectName(updated.name);
      }
      setProjectToRename(null);
      setRenameName('');
    } catch (err: any) {
      setExportToastMsg(err?.message || 'Failed to rename project');
      setTimeout(() => setExportToastMsg(null), 5000);
    } finally {
      setIsRenamingProject(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!projectToDelete || isDeletingProject) return;

    setIsDeletingProject(true);
    try {
      await deleteProject(projectToDelete.id);
      const remaining = serverProjects.filter((p) => p.id !== projectToDelete.id);
      setServerProjects(remaining);

      if (activeProjectId === projectToDelete.id) {
        if (remaining.length > 0) {
          handleSelectProject(remaining[0]);
        } else {
          setActiveProjectId(null);
          setActiveProjectName('Workspace Canvas');
          setCurrentLayout({ widgets: [] });
        }
      }
      setProjectToDelete(null);
    } catch (err: any) {
      setExportToastMsg(err?.message || 'Failed to delete project');
      setTimeout(() => setExportToastMsg(null), 5000);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleDuplicateProject = async (project: ProjectSummary) => {
    if (isDuplicatingProject) return;
    setIsDuplicatingProject(project.id);
    try {
      const duplicated = await duplicateProject(project.id);
      const summary = await getProjectById(duplicated.project_id);
      setServerProjects((prev) => [summary, ...prev]);
      setActiveProjectId(summary.id);
      setActiveProjectName(summary.name);
      const layoutData = await getProjectLayout(summary.id);
      setCurrentLayout(layoutData.layout_json || { widgets: [] });
      setLayoutVersion(layoutData.version || 1);
      setIsProjectsModalOpen(false);
      setExportToastMsg(`Project duplicated as "${summary.name}"`);
      setTimeout(() => setExportToastMsg(null), 3000);
    } catch (err) {
      setExportToastMsg(err instanceof Error ? err.message : 'Failed to duplicate project');
      setTimeout(() => setExportToastMsg(null), 5000);
    } finally {
      setIsDuplicatingProject(null);
    }
  };

  // ─── User Management Handlers ────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || isUpdatingProfile) return;
    setIsUpdatingProfile(true);
    setUserActionMsg(null);
    setUserActionErr(null);
    try {
      const updated = await updateUserProfile({ name: editName.trim() });
      setUser(updated);
      setUserActionMsg('Profile updated successfully!');
    } catch (err: any) {
      setUserActionErr(err?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass || isChangingPass) return;
    if (newPass !== confirmPass) {
      setUserActionErr('New passwords do not match');
      return;
    }
    if (newPass.length < 8) {
      setUserActionErr('Password must be at least 8 characters long');
      return;
    }

    setIsChangingPass(true);
    setUserActionMsg(null);
    setUserActionErr(null);
    try {
      await changePassword(currentPass, newPass);
      setUserActionMsg('Password changed successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      setUserActionErr(err?.message || 'Failed to change password');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setIsUserSettingsOpen(false);
    router.push('/login');
  };

  // Agent chat lives on /research — dashboard is display-only.

  const handleWidgetAction = (widgetId: string, action: string) => {
    if (action === 'delete' || action === 'remove_widget') {
      setCurrentLayout((prev) => ({
        ...prev,
        widgets: prev.widgets.filter((w) => w.id !== widgetId),
      }));
      setExportToastMsg('Widget removed from canvas');
      setTimeout(() => setExportToastMsg(null), 2500);
    } else if (action === 'duplicate' || action === 'duplicate_widget') {
      setCurrentLayout((prev) => {
        const target = prev.widgets.find((w) => w.id === widgetId);
        if (!target) return prev;
        const newWidget = {
          ...target,
          id: `${target.id}_copy_${Date.now()}`,
          title: target.title ? `${target.title} (Copy)` : 'Duplicated Widget',
        };
        const idx = prev.widgets.findIndex((w) => w.id === widgetId);
        const nextWidgets = [...prev.widgets];
        nextWidgets.splice(idx + 1, 0, newWidget);
        return { ...prev, widgets: nextWidgets };
      });
      setExportToastMsg('Widget duplicated successfully');
      setTimeout(() => setExportToastMsg(null), 2500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewProjectOpen) setIsNewProjectOpen(false);
        if (projectToRename) setProjectToRename(null);
        if (projectToDelete) setProjectToDelete(null);
        if (isUserSettingsOpen) setIsUserSettingsOpen(false);
        if (isExportMenuOpen) setIsExportMenuOpen(false);
        if (isProjectsModalOpen) setIsProjectsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewProjectOpen, projectToRename, projectToDelete, isUserSettingsOpen, isExportMenuOpen, isProjectsModalOpen]);

  // Separate KPI cards from analytical charts and dense tables
  const kpiWidgets = currentLayout.widgets.filter((w) => w.type === 'metric_card' || (w.type as any) === 'kpi');
  const analyticalWidgets = currentLayout.widgets.filter((w) => w.type !== 'metric_card' && (w.type as any) !== 'kpi');

  return (
    <AppShell active="dashboard" flush>
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--text-primary)] font-sans antialiased">
      {isExportMenuOpen && (
        <div className="fixed inset-0 z-20 cursor-default" onClick={() => setIsExportMenuOpen(false)} />
      )}

      <div className="px-6 pt-4">
        <PageTitle title="Dashboard" />
      </div>

      <div className="mx-6 mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setStudioTab('canvas')} className={studioTab === 'canvas' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>Canvas</button>
        <Link href="/objects" className="btn-secondary text-xs">Objects</Link>
        <Link href="/connectors" className="btn-secondary text-xs">Connectors</Link>
        <button type="button" onClick={() => setStudioTab('pipeline')} className={studioTab === 'pipeline' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>Pipeline</button>
        <button type="button" onClick={() => setStudioTab('templates')} className={studioTab === 'templates' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>Templates</button>
        <button type="button" onClick={() => setIsProjectsModalOpen(true)} className="btn-secondary text-xs">Projects</button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ─── ZONE 2: SLIM TOP BAR (56px) ─── */}
        <header className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] z-20">
          <div className="flex items-center gap-3 min-w-0">
            {serverProjects.length > 1 ? (
              <select
                value={activeProjectId || ''}
                onChange={(e) => {
                  const found = serverProjects.find((p) => p.id === e.target.value);
                  if (found) handleSelectProject(found);
                }}
                className="app-card text-xs py-1 px-2.5 max-w-[200px] truncate"
              >
                {serverProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#14171B] text-[#EDEFF2]">
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="text-sm font-medium truncate">{activeProjectName}</h2>
            )}

            {/* Live Indicator with motion-safe pulse */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#4A4238]/12 text-[11px] text-[#6B6155]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E3836C] motion-safe:animate-pulse" />
              <span className="font-mono text-[10px]">v{layoutVersion}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03] text-xs font-medium text-[#8B93A1] hover:text-[#EDEFF2] transition-all cursor-pointer"
              >
                <IconDownload size={14} className="text-[#3D6FE0]" />
                <span className="hidden sm:inline">Export</span>
                <IconChevronDown size={12} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isExportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-white/[0.12] bg-[#14171B] shadow-2xl p-2 z-50 space-y-1"
                  >
                    <div className="px-3 py-1.5 border-b border-white/[0.08]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B93A1]">
                        Document Export Suite
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportDashboardToPdf(activeProjectName, currentLayout.widgets);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#EDEFF2] hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <IconFileTypePdf size={16} className="text-[#EF6C6C] shrink-0" />
                      <div>
                        <div className="font-medium">Printable PDF Report</div>
                        <div className="text-[10px] text-[#8B93A1]">High-DPI editorial layout</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportDashboardToPptx(activeProjectName, currentLayout.widgets);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#EDEFF2] hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <IconFileTypePpt size={16} className="text-[#D98F3F] shrink-0" />
                      <div>
                        <div className="font-medium">Slide Deck (PPTX)</div>
                        <div className="text-[10px] text-[#8B93A1]">Executive presentation</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportDashboardToXlsx(activeProjectName, currentLayout.widgets);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#EDEFF2] hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <IconFileSpreadsheet size={16} className="text-[#3FB68C] shrink-0" />
                      <div>
                        <div className="font-medium">Spreadsheet (XLSX)</div>
                        <div className="text-[10px] text-[#8B93A1]">Multi-table workbook</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportDashboardToDocx(activeProjectName, currentLayout.widgets);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#EDEFF2] hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <IconFileTypeDoc size={16} className="text-[#3D6FE0] shrink-0" />
                      <div>
                        <div className="font-medium">Narrative Brief (Word)</div>
                        <div className="text-[10px] text-[#8B93A1]">Editable document</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsExportMenuOpen(false);
                        if (!activeProjectId) return;
                        try {
                          await downloadProjectZip(activeProjectId);
                          setExportToastMsg('Project archive ZIP downloaded!');
                          setTimeout(() => setExportToastMsg(null), 3000);
                        } catch {
                          setExportToastMsg('Failed to download project ZIP archive');
                          setTimeout(() => setExportToastMsg(null), 3000);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#EDEFF2] hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <IconFileZip size={16} className="text-[#8B5CF6] shrink-0" />
                      <div>
                        <div className="font-medium">Project Bundle (ZIP)</div>
                        <div className="text-[10px] text-[#8B93A1]">Schemas, records, layout</div>
                      </div>
                    </button>

                    <div className="pt-1 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsExportMenuOpen(false);
                          try {
                            await copyShareableLink(activeProjectId);
                            setExportToastMsg('Shareable link copied to clipboard!');
                            setTimeout(() => setExportToastMsg(null), 3000);
                          } catch (err) {
                            setExportToastMsg(err instanceof Error ? err.message : 'Failed to create shareable link');
                            setTimeout(() => setExportToastMsg(null), 5000);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#5B8CF5] hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                      >
                        <IconShare size={16} className="shrink-0" />
                        <div>
                          <div className="font-medium">Copy Shareable Link</div>
                          <div className="text-[10px] text-[#8B93A1]">Direct URL to active canvas</div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <LayoutSwitcher
              projectId={activeProjectId}
              currentLayout={currentLayout}
              onLoadLayout={(layout) =>
                setCurrentLayout({ widgets: (layout.widgets as WidgetSpec[]) || [] })
              }
            />

            {/* Share Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await copyShareableLink(activeProjectId);
                  setExportToastMsg('Shareable link copied to clipboard!');
                  setTimeout(() => setExportToastMsg(null), 3000);
                } catch (err) {
                  setExportToastMsg(err instanceof Error ? err.message : 'Failed to create shareable link');
                  setTimeout(() => setExportToastMsg(null), 5000);
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03] text-xs font-medium text-[#8B93A1] hover:text-[#EDEFF2] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <IconShare size={14} />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* New Project CTA */}
            <button
              type="button"
              onClick={() => {
                setNewProjectName('');
                setIsNewProjectOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D6FE0] hover:bg-[#4D7FF0] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <IconPlus size={14} />
              <span>New Project</span>
            </button>

            {/* Interactive Studio Link */}
            <Link
              href={activeProjectId ? `/new-project?projectId=${activeProjectId}` : '/new-project'}
              className="p-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.16] text-[#8B93A1] hover:text-[#EDEFF2] transition-colors cursor-pointer"
              title="Open full analysis studio with terminal & chat"
            >
              <IconArrowUpRight size={16} />
            </Link>
          </div>
        </header>

        {/* ─── ZONE 3: MAIN CANVAS WITH REAL GUTTERS & DISTINCT SURFACES ─── */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6 lg:p-8 space-y-6 chat-scroll">

          {/* ─── TAB: DASHBOARD CANVAS ─── */}
          {studioTab === 'canvas' && (
            <>
              {isLoadingProjects ? (
                <div role="status" aria-live="polite" className="space-y-4">
                  <div className="h-24 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] animate-pulse" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-64 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] animate-pulse" />
                    <div className="h-64 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] animate-pulse" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">Loading your dashboard…</p>
                </div>
              ) : workspaceError ? (
                <div role="alert" className="app-card py-16 px-6 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto">
                  <h3 className="text-lg font-medium">Couldn’t load your dashboard</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{workspaceError}</p>
                  <button type="button" className="btn-primary min-h-11 px-5" onClick={() => setLoadKey((k) => k + 1)}>
                    Retry
                  </button>
                </div>
              ) : currentLayout.widgets.length > 0 ? (
                <div className="space-y-6">
                  {/* 1. Hero KPI Strip (Compact, High-Density 28px Tabular Figures) */}
                  {kpiWidgets.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {kpiWidgets.map((w) => (
                        <div key={w.id} className="col-span-1">
                          <SandboxedWidgetRenderer
                            widget={w}
                            onWidgetAction={handleWidgetAction}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. Analytical Surfaces (Charts with Airy Padding, Tables with Tighter Rows) */}
                  {analyticalWidgets.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {analyticalWidgets.map((w) => (
                        <div
                          key={w.id}
                          className={
                            w.type === 'line_chart' || w.type === 'annotated_chart' || w.type === 'table'
                              ? 'col-span-1 lg:col-span-2'
                              : 'col-span-1'
                          }
                        >
                          <SandboxedWidgetRenderer
                            widget={w}
                            onWidgetAction={handleWidgetAction}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Instrument-Grade Empty State */
                <div className="app-card py-16 px-6 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
                  <div className="w-12 h-12 rounded-xl bg-[#E3836C]/15 text-[#E3836C] flex items-center justify-center">
                    <IconLayoutDashboard size={24} />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h3 className="text-lg font-medium">
                      {activeProjectId ? 'This canvas is empty' : 'Create your first project'}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {activeProjectId
                        ? 'Ask in Chat or apply a template. The dashboard only displays widgets you save — it does not start research on its own.'
                        : 'A project holds charts and KPIs from Chat. You need an account to save work — you are already signed in.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {!activeProjectId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNewProjectName('');
                          setIsNewProjectOpen(true);
                        }}
                        className="btn-primary min-h-11 px-5 text-sm"
                      >
                        Create first project
                      </button>
                    ) : (
                      <Link href="/research" className="btn-primary min-h-11 px-5 text-sm">
                        Continue in Chat
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setStudioTab('templates')}
                      className="btn-secondary min-h-11 px-5 text-sm"
                    >
                      Explore templates
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── TAB: CUSTOM OBJECTS STUDIO ─── */}
          {studioTab === 'objects' && (
            <ObjectBuilderView projectId={activeProjectId || serverProjects[0]?.id || 'default'} />
          )}

          {/* ─── TAB: LIVE CONNECTORS HUB ─── */}
          {studioTab === 'connectors' && (
            <ConnectorsView projectId={activeProjectId || serverProjects[0]?.id || 'default'} />
          )}

          {/* ─── TAB: MODULE PIPELINE ─── */}
          {studioTab === 'pipeline' && (
            <ModulePipelineView
              projectId={activeProjectId || serverProjects[0]?.id || 'default'}
              onRefreshLayout={refreshActiveProjectLayout}
            />
          )}

          {/* ─── TAB: STARTER TEMPLATES GALLERY ─── */}
          {studioTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-lg font-medium text-[var(--text-primary)]">Curated Starter Workspaces</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Pre-configured dashboards with verified schemas, telemetry bindings, and analytical views
                  </p>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['All', 'Revenue', 'Marketing', 'Telemetry', 'Finance'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveTemplateCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTemplateCategory === cat
                          ? 'bg-[#E3836C] text-white shadow-xs'
                          : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {CURATED_TEMPLATES.filter(
                  (t) => activeTemplateCategory === 'All' || t.category === activeTemplateCategory
                ).map((template) => {
                  const isApplying = isApplyingTemplate === template.id;
                  return (
                    <div
                      key={template.id}
                      className="app-card p-5 flex flex-col justify-between space-y-4 transition-all group hover:border-[#E3836C]/30"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3D6FE0]/15 text-[#5B8CF5] border border-[#3D6FE0]/30">
                            {template.badge}
                          </span>
                          <span className="text-[10px] font-mono text-[#8B93A1]">
                            {template.widgets.length} widget{template.widgets.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-[#EDEFF2] group-hover:text-white transition-colors">
                            {template.name}
                          </h3>
                          <p className="text-xs text-[#8B93A1] mt-1 line-clamp-2 leading-relaxed">
                            {template.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {template.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-[#8B93A1]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUseTemplate(template)}
                        disabled={isApplyingTemplate !== null}
                        className="w-full py-2 px-3 rounded-lg bg-[#1C2025] hover:bg-[#3D6FE0] text-[#EDEFF2] hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/[0.08] disabled:opacity-50"
                      >
                        {isApplying ? (
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <IconPlayerPlay size={13} />
                        )}
                        <span>{isApplying ? 'Provisioning…' : 'Use Template'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Chat entry — dashboard stays display-only; research happens in Chat */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          href="/research"
          className="flex items-center gap-2 rounded-full bg-[#E3836C] px-4 py-2.5 text-xs font-medium text-white shadow-xl transition-all hover:bg-[#ED967F] hover:scale-105"
          title="Open Chat to ask questions or research"
        >
          <IconSparkles size={16} />
          <span>Ask in Chat</span>
        </Link>
      </div>

      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="status"
            className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#D98F3F]/40 bg-[#2A2117] px-4 py-2.5 text-xs font-medium text-[#F2C078] shadow-2xl"
          >
            You are offline. Changes will not reach the workspace until the connection returns.
          </motion.div>
        )}
        {exportToastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="status"
            aria-live="polite"
            className={`fixed bottom-6 left-20 z-50 px-4 py-2.5 rounded-xl bg-[#1C2025] border text-[#EDEFF2] text-xs font-medium shadow-2xl flex items-center gap-2 ${/failed|could not|error|expired|unauthorized|conflict/i.test(exportToastMsg) ? 'border-[#EF6C6C]/40' : 'border-white/[0.15]'}`}
          >
            {/failed|could not|error|expired|unauthorized|conflict/i.test(exportToastMsg) ? <IconX size={16} className="text-[#EF6C6C]" /> : <IconCheck size={16} className="text-[#3FB68C]" />}
            <span>{exportToastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: MANAGE / SWITCH PROJECTS ─── */}
      <AnimatePresence>
        {isProjectsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#14171B] border border-white/[0.12] rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#3D6FE0]/15 text-[#3D6FE0] flex items-center justify-center">
                    <IconFolder size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-[#EDEFF2]">Analysis Workspaces</h3>
                    <p className="text-xs text-[#8B93A1]">Switch active workspace or manage projects</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProjectsModalOpen(false)}
                  className="p-1 text-[#8B93A1] hover:text-[#EDEFF2] cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              {/* Search projects */}
              <div className="relative">
                <IconSearch size={14} className="absolute left-3 top-3 text-[#8B93A1]" />
                <input
                  type="text"
                  placeholder="Filter workspaces by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#1C2025] border border-white/[0.08] text-[#EDEFF2] placeholder-[#8B93A1]/60 focus:outline-none focus:ring-1 focus:ring-[#3D6FE0]"
                />
              </div>

              {/* Project list */}
              <div className="overflow-y-auto max-h-[50vh] divide-y divide-white/[0.04]">
                {serverProjects
                  .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((proj) => {
                    const isActive = activeProjectId === proj.id;
                    return (
                      <div
                        key={proj.id}
                        className={`py-3 px-3.5 flex items-center justify-between rounded-xl transition-colors cursor-pointer ${
                          isActive ? 'bg-[#1C2025] border border-[#3D6FE0]/30' : 'hover:bg-white/[0.03]'
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isActive}
                        onClick={() => {
                          handleSelectProject(proj);
                          setIsProjectsModalOpen(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelectProject(proj);
                            setIsProjectsModalOpen(false);
                          }
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#EDEFF2]">{proj.name}</span>
                            {isActive && (
                              <span className="text-[10px] font-mono text-[#3FB68C] px-1.5 py-0.5 rounded bg-[#3FB68C]/15">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[#8B93A1]">ID: {proj.id.slice(0, 16)}...</span>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setProjectToRename(proj);
                              setRenameName(proj.name);
                            }}
                            className="p-1.5 text-[#8B93A1] hover:text-[#EDEFF2] transition-colors"
                            title="Rename"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            onClick={() => setProjectToDelete(proj)}
                            className="p-1.5 text-[#8B93A1] hover:text-[#EF6C6C] transition-colors"
                            title="Delete"
                          >
                            <IconTrash size={14} />
                          </button>
                          <button
                            onClick={() => void handleDuplicateProject(proj)}
                            disabled={isDuplicatingProject !== null}
                            className="p-1.5 text-[#8B93A1] hover:text-[#5B8CF5] transition-colors disabled:opacity-40"
                            title="Duplicate"
                          >
                            {isDuplicatingProject === proj.id ? <IconRefresh size={14} className="animate-spin" /> : <IconCopy size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {!isLoadingProjects && serverProjects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-[#8B93A1]">{searchQuery ? 'No workspaces match this filter.' : 'No workspaces yet.'}</p>
                    {!searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProjectsModalOpen(false);
                          setNewProjectName('');
                          setIsNewProjectOpen(true);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#3D6FE0] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        <IconPlus size={14} /> Create workspace
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setIsProjectsModalOpen(false);
                    setNewProjectName('');
                    setIsNewProjectOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D6FE0] hover:bg-[#4D7FF0] text-white text-xs font-medium cursor-pointer"
                >
                  <IconPlus size={14} />
                  <span>New Workspace</span>
                </button>
                <button
                  onClick={() => setIsProjectsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#8B93A1] hover:text-[#EDEFF2]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: CREATE NEW PROJECT ─── */}
      <AnimatePresence>
        {isNewProjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14171B] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#3D6FE0]/15 text-[#3D6FE0] flex items-center justify-center">
                    <IconFolderPlus size={18} />
                  </div>
                  <h3 className="text-base font-medium text-[#EDEFF2]">Create New Project</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="p-1 text-[#8B93A1] hover:text-[#EDEFF2] cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8B93A1]">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Q4 Revenue & Retention Audit"
                    autoFocus
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#1C2025] border border-white/[0.08] text-xs text-[#EDEFF2] placeholder-[#8B93A1]/60 focus:outline-none focus:ring-1 focus:ring-[#3D6FE0]"
                  />
                  <p className="text-[11px] text-[#8B93A1]">
                    Saved securely in MongoDB with continuous telemetry and layout state.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectOpen(false)}
                    className="px-3.5 py-2 text-xs rounded-xl border border-white/[0.08] text-[#8B93A1] hover:text-[#EDEFF2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProject || !newProjectName.trim()}
                    className="px-4 py-2 rounded-xl bg-[#3D6FE0] hover:bg-[#4D7FF0] text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingProject ? 'Creating…' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: RENAME PROJECT ─── */}
      <AnimatePresence>
        {projectToRename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14171B] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-[#EDEFF2]">Rename Workspace</h3>
                <button
                  type="button"
                  onClick={() => setProjectToRename(null)}
                  className="p-1 text-[#8B93A1] hover:text-[#EDEFF2]"
                >
                  <IconX size={16} />
                </button>
              </div>

              <form onSubmit={handleRenameSubmit} className="space-y-4">
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#1C2025] border border-white/[0.08] text-xs text-[#EDEFF2] focus:outline-none focus:ring-1 focus:ring-[#3D6FE0]"
                />
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setProjectToRename(null)}
                    className="px-3.5 py-2 text-xs rounded-xl border border-white/[0.08] text-[#8B93A1] hover:text-[#EDEFF2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRenamingProject || !renameName.trim()}
                    className="px-4 py-2 rounded-xl bg-[#3D6FE0] hover:bg-[#4D7FF0] text-white text-xs font-medium disabled:opacity-50"
                  >
                    {isRenamingProject ? 'Saving…' : 'Save Name'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: DELETE PROJECT ─── */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14171B] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-base font-medium text-[#EDEFF2]">Delete Project</h3>
              <p className="text-xs text-[#8B93A1]">
                Are you sure you want to delete <strong className="text-[#EDEFF2]">{projectToDelete.name}</strong>? All layout widgets and custom records will be permanently removed.
              </p>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  className="px-3.5 py-2 text-xs rounded-xl border border-white/[0.08] text-[#8B93A1] hover:text-[#EDEFF2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isDeletingProject}
                  className="px-4 py-2 rounded-xl bg-[#EF6C6C] hover:bg-red-600 text-white text-xs font-medium disabled:opacity-50"
                >
                  {isDeletingProject ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: USER PROFILE & SETTINGS ─── */}
      <AnimatePresence>
        {isUserSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#14171B] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#3D6FE0]/15 text-[#3D6FE0] flex items-center justify-center">
                    <IconUser size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-[#EDEFF2]">Account &amp; Security</h3>
                    <p className="text-xs text-[#8B93A1]">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUserSettingsOpen(false)}
                  className="p-1 text-[#8B93A1] hover:text-[#EDEFF2]"
                >
                  <IconX size={16} />
                </button>
              </div>

              {userActionMsg && (
                <div className="p-2.5 rounded-lg bg-[#3FB68C]/15 border border-[#3FB68C]/30 text-[#3FB68C] text-xs">
                  {userActionMsg}
                </div>
              )}
              {userActionErr && (
                <div className="p-2.5 rounded-lg bg-[#EF6C6C]/15 border border-[#EF6C6C]/30 text-[#EF6C6C] text-xs">
                  {userActionErr}
                </div>
              )}

              {/* Edit Display Name */}
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <label className="text-xs font-medium text-[#8B93A1]">Display Name</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#1C2025] border border-white/[0.08] text-xs text-[#EDEFF2] focus:outline-none focus:ring-1 focus:ring-[#3D6FE0]"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="px-3.5 py-2 rounded-xl bg-[#1C2025] hover:bg-white/[0.08] border border-white/[0.12] text-xs text-[#EDEFF2]"
                  >
                    Save
                  </button>
                </div>
              </form>

              {/* Change Password */}
              <form onSubmit={handleChangePassword} className="space-y-3 pt-3 border-t border-white/[0.08]">
                <span className="text-xs font-medium text-[#8B93A1]">Change Password</span>
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1C2025] border border-white/[0.08] text-xs text-[#EDEFF2] focus:outline-none focus:ring-1 focus:ring-[#3D6FE0]"
                />
                <input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1C2025] border border-white/[0.08] text-xs text-[#EDEFF2] focus:outline-none focus:ring-1 focus:ring-[#3D6FE0]"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1C2025] border border-white/[0.08] text-xs text-[#EDEFF2] focus:outline-none focus:ring-1 focus:ring-[#3D6FE0]"
                />
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="submit"
                    disabled={isChangingPass || !currentPass || !newPass}
                    className="px-3.5 py-2 rounded-xl bg-[#3D6FE0] hover:bg-[#4D7FF0] text-white text-xs font-medium disabled:opacity-50"
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-[#EF6C6C] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <IconLogout size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </AppShell>
  );
}

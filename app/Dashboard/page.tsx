'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconPlus,
  IconWorld,
  IconLayoutGrid,
  IconList,
  IconTrendingUp,
  IconAlertTriangle,
  IconActivity,
  IconArrowUpRight,
  IconSearch,
  IconShieldLock,
  IconSparkles,
  IconCheck,
  IconX,
  IconDeviceAnalytics,
  IconLayoutDashboard,
  IconChartLine,
  IconSend,
  IconEdit,
  IconTrash,
  IconSettings,
  IconUser,
  IconLock,
  IconFolder,
  IconFolderPlus,
  IconKey,
  IconDownload,
  IconFileTypePdf,
  IconFileTypePpt,
  IconFileSpreadsheet,
  IconFileTypeDoc,
  IconShare,
  IconChevronDown,
  IconPlayerPlay,
  IconInfoCircle,
} from '@tabler/icons-react';
import { ThemeToggle } from '../Components/ui/ThemeToggle';
import { useTheme } from '../Components/ui/ThemeProvider';
import {
  getProjectLayout,
  applyUIAction,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  updateProjectLayout,
  streamChat,
  resolveWidgetData,
  type WidgetSpec,
  type UIProposalPayload,
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
import { SandboxedWidgetRenderer } from '../Components/dashboard/WidgetRenderer';
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

const EarthGlobe = dynamic(
  () => import('../Components/3d/EarthGlobe').then((mod) => mod.EarthGlobe),
  { ssr: false }
);

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();

  const [isGlobeExpanded, setIsGlobeExpanded] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Active Scoped Project & Generative Canvas State ─────────────────────────
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string>('Workspace Canvas');
  const [layoutVersion, setLayoutVersion] = useState<number>(1);
  const [updatedBy, setUpdatedBy] = useState<string>('system');
  const [currentLayout, setCurrentLayout] = useState<{ widgets: WidgetSpec[] }>({
    widgets: [],
  });

  // ─── Agent Proposal State ───────────────────────────────────────────────────
  const [pendingProposal, setPendingProposal] = useState<UIProposalPayload | null>(null);
  const [agentPrompt, setAgentPrompt] = useState<string>('');
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // ─── User & Projects State ──────────────────────────────────────────────────
  const [user, setUser] = useState<UserProfile | null>(null);
  const [serverProjects, setServerProjects] = useState<ProjectSummary[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);

  // ─── Export Menu & Toast State ───────────────────────────────────────────────
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportToastMsg, setExportToastMsg] = useState<string | null>(null);

  // ─── Curated Templates State ─────────────────────────────────────────────────
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>('All');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState<string | null>(null);

  // ─── Incognito Explainer Tooltip State ───────────────────────────────────────
  const [showIncognitoTooltip, setShowIncognitoTooltip] = useState(false);

  // ─── Modals State ────────────────────────────────────────────────────────────
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const [projectToRename, setProjectToRename] = useState<ProjectSummary | null>(null);
  const [renameName, setRenameName] = useState('');
  const [isRenamingProject, setIsRenamingProject] = useState(false);

  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // ─── User Profile & Settings Modal ──────────────────────────────────────────
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ─── Data Initialization ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadWorkspace() {
      setIsLoadingProjects(true);
      let currentUser = getStoredUser();
      setUser(currentUser);
      if (currentUser?.name) setEditName(currentUser.name);

      try {
        const refreshedUser = await fetchMe();
        if (refreshedUser) {
          currentUser = refreshedUser;
          setUser(refreshedUser);
          if (refreshedUser.name) setEditName(refreshedUser.name);
        }
      } catch (err) {
        console.warn('Session verification fallback:', err);
      }

      try {
        const projs = await getProjects(currentUser?.id);
        const projectList = projs || [];
        setServerProjects(projectList);

        if (projectList.length > 0) {
          const first = projectList[0];
          setActiveProjectId(first.id);
          setActiveProjectName(first.name);

          try {
            const layoutData = await getProjectLayout(first.id);
            if (layoutData && layoutData.layout_json?.widgets) {
              setCurrentLayout(layoutData.layout_json);
              setLayoutVersion(layoutData.version);
              setUpdatedBy(layoutData.updated_by || 'user');
            } else {
              setCurrentLayout({ widgets: [] });
              setLayoutVersion(layoutData?.version || 1);
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
        console.warn('Could not load remote projects:', err);
        setServerProjects([]);
        setCurrentLayout({ widgets: [] });
      } finally {
        setIsLoadingProjects(false);
      }
    }

    loadWorkspace();
  }, []);

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
      router.push(`/new-project?projectId=${created.id}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to create project');
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
      setExportToastMsg(`Project created from "${template.name}" template!`);
      setTimeout(() => setExportToastMsg(null), 3000);
      router.push(`/new-project?projectId=${created.id}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to instantiate template project');
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
      alert(err?.message || 'Failed to rename project');
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
      alert(err?.message || 'Failed to delete project');
    } finally {
      setIsDeletingProject(false);
    }
  };

  // ─── User Management Handlers ────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || isUpdatingProfile) return;
    setIsUpdatingProfile(true);
    setUserActionMsg(null);
    try {
      const updated = await updateUserProfile({ name: editName.trim() });
      setUser(updated);
      setUserActionMsg({ type: 'success', text: 'Display name updated successfully' });
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err?.message || 'Failed to update profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setUserActionMsg({ type: 'error', text: 'Please fill in both current and new passwords' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setUserActionMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setUserActionMsg({ type: 'error', text: 'New password must be at least 8 characters long' });
      return;
    }

    setIsChangingPassword(true);
    setUserActionMsg(null);
    try {
      await changePassword(currentPassword, newPassword);
      setUserActionMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err?.message || 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = '/login';
  };

  // ─── Agent Proposal & Copilot Handlers ───────────────────────────────────────
  const handlePromptAgent = async (promptOverride?: string) => {
    const text = (promptOverride || agentPrompt).trim();
    if (!text || isAgentRunning) return;

    let targetProjectId = activeProjectId;
    if (!targetProjectId) {
      try {
        const created = await createProject('Quick Analysis Project', user?.id);
        setServerProjects((prev) => [created, ...prev]);
        setActiveProjectId(created.id);
        setActiveProjectName(created.name);
        targetProjectId = created.id;
      } catch (err) {
        console.error('Failed to create project for agent prompt:', err);
        return;
      }
    }

    setIsAgentRunning(true);
    setAgentStatus('Agent analyzing request & evaluating layout…');
    try {
      const res = await streamChat({
        message: text,
        projectId: targetProjectId,
        runId: activeRunId || undefined,
        onEvent: (event) => {
          if (event.event === 'ui_proposal') {
            const proposal = event.payload as unknown as UIProposalPayload;
            if (!proposal.project_id && targetProjectId) {
              proposal.project_id = targetProjectId;
            }
            setPendingProposal(proposal);
            setAgentStatus('');
          } else if (event.event === 'error') {
            setAgentStatus('Agent returned an error');
          }
        },
      });
      if (res.runId) {
        setActiveRunId(res.runId);
      }
    } catch (err) {
      console.error(err);
      setAgentStatus('Connection to agent failed');
    } finally {
      setIsAgentRunning(false);
      setAgentPrompt('');
    }
  };

  const handleAcceptProposal = async () => {
    if (!pendingProposal) return;
    const targetProjId = pendingProposal.project_id || activeProjectId;
    if (!targetProjId) return;

    setIsApplying(true);
    try {
      let res: any = null;
      if (pendingProposal.action_id) {
        try {
          res = await applyUIAction(targetProjId, pendingProposal.action_id, true);
        } catch (apiErr) {
          console.warn('Backend applyUIAction failed, applying fallback merge:', apiErr);
        }
      }

      // 1. Check if backend returned an updated layout with widgets
      if (res && res.applied && res.layout && Array.isArray(res.layout.widgets) && res.layout.widgets.length > 0) {
        setCurrentLayout(res.layout);
        if (res.layout_version) setLayoutVersion(res.layout_version);
        setUpdatedBy('agent');
      } else {
        // 2. Extract proposed widgets from proposal for immediate local & durable update
        const proposedWidgets: WidgetSpec[] = [];
        if (Array.isArray(pendingProposal.widgets) && pendingProposal.widgets.length > 0) {
          proposedWidgets.push(...pendingProposal.widgets);
        } else if (pendingProposal.widget_spec) {
          proposedWidgets.push(pendingProposal.widget_spec);
        }

        if (proposedWidgets.length > 0) {
          const mergedWidgets = [...currentLayout.widgets];
          for (const pw of proposedWidgets) {
            const idx = mergedWidgets.findIndex((w) => w.id === pw.id);
            if (idx >= 0) {
              mergedWidgets[idx] = pw;
            } else {
              mergedWidgets.push(pw);
            }
          }

          const newLayout = { widgets: mergedWidgets };
          setCurrentLayout(newLayout);
          const nextVersion = layoutVersion + 1;
          setLayoutVersion(nextVersion);
          setUpdatedBy('agent');

          // Persist the merged layout to MongoDB Atlas
          try {
            await updateProjectLayout(targetProjId, layoutVersion, newLayout, 'agent');
          } catch (updateErr) {
            console.warn('Failed to persist layout update to backend:', updateErr);
          }
        } else {
          // Re-sync with canonical layout from server
          const updated = await getProjectLayout(targetProjId);
          if (updated && updated.layout_json) {
            setCurrentLayout(updated.layout_json);
            setLayoutVersion(updated.version);
            setUpdatedBy(updated.updated_by || 'agent');
          }
        }
      }

      setExportToastMsg('Dashboard updated successfully!');
      setTimeout(() => setExportToastMsg(null), 3000);
      setPendingProposal(null);
    } catch (err) {
      console.error('Failed to accept proposal:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!pendingProposal) return;
    const targetProjId = pendingProposal.project_id || activeProjectId;
    if (pendingProposal.action_id && targetProjId) {
      try {
        await applyUIAction(targetProjId, pendingProposal.action_id, false);
      } catch (err) {
        console.warn('Failed to reject proposal on backend:', err);
      }
    }
    setPendingProposal(null);
  };

  const handleWidgetAction = (widgetId: string, action: string, _payload?: unknown) => {
    if (action === 'delete' || action === 'remove_widget') {
      setCurrentLayout((prev) => ({
        ...prev,
        widgets: prev.widgets.filter((w) => w.id !== widgetId),
      }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isGlobeExpanded) setIsGlobeExpanded(false);
        if (isNewProjectOpen) setIsNewProjectOpen(false);
        if (projectToRename) setProjectToRename(null);
        if (projectToDelete) setProjectToDelete(null);
        if (isUserSettingsOpen) setIsUserSettingsOpen(false);
        if (isExportMenuOpen) setIsExportMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobeExpanded, isNewProjectOpen, projectToRename, projectToDelete, isUserSettingsOpen, isExportMenuOpen]);

  const filteredProjects = serverProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-[#F3EDE4] dark:bg-[#171514] text-[#4A4238] dark:text-[#F4EDE5] transition-colors duration-500 overflow-x-hidden">
      
      {/* ─── LAYER 1: FULLSCREEN 3D EARTH MODAL (ON DEMAND ONLY) ─────────── */}
      {isGlobeExpanded && (
        <EarthGlobe
          isExpanded={true}
          onToggleExpand={setIsGlobeExpanded}
        />
      )}

      {/* Backdrop for open dropdowns */}
      {isExportMenuOpen && (
        <div
          className="fixed inset-0 z-20 cursor-default"
          onClick={() => setIsExportMenuOpen(false)}
        />
      )}

      {/* ─── LAYER 2: FLOATING DASHBOARD DECK ─────────────────────────────── */}
      <div
        className={`relative z-10 min-h-screen flex flex-col transition-all duration-500 ${
          isGlobeExpanded ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 px-6 sm:px-10 py-4 flex items-center justify-between border-b border-[#4A4238]/08 dark:border-[#3A3430] bg-[#F3EDE4]/75 dark:bg-[#171514]/80 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/logo.png"
                alt="AnalyzeIt"
                width={130}
                height={30}
                className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <span className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-widest text-[#4A4238]/40 dark:text-[#91867E] ml-1">
                Workspace
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Export / Document Generation Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#4A4238]/15 dark:border-[#3A3430] hover:border-[#E3836C] dark:hover:border-[#E3836C] bg-white/60 dark:bg-[#211E1C] text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] transition-all cursor-pointer shadow-xs"
              >
                <IconDownload size={14} className="text-[#E3836C]" />
                <span className="hidden sm:inline">Export / Generate</span>
                <span className="sm:hidden">Export</span>
                <IconChevronDown size={12} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isExportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl glass-card border border-[#4A4238]/15 dark:border-[#3A3430] bg-[#F3EDE4] dark:bg-[#211E1C] shadow-2xl p-2 z-50 space-y-1"
                  >
                    <div className="px-3 py-1.5 border-b border-[#4A4238]/10 dark:border-[#3A3430]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#91867E]">
                        Executive Document Suite
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportDashboardToPdf(activeProjectName, currentLayout.widgets);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] hover:bg-[#E3836C]/10 dark:hover:bg-[#292522] hover:text-[#E3836C] transition-colors cursor-pointer text-left"
                    >
                      <IconFileTypePdf size={16} className="text-red-500 shrink-0" />
                      <div>
                        <div className="font-semibold">Printable PDF Report</div>
                        <div className="text-[10px] text-[#91867E]">High-DPI editorial print layout</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportDashboardToPptx(activeProjectName, currentLayout.widgets);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] hover:bg-[#E3836C]/10 dark:hover:bg-[#292522] hover:text-[#E3836C] transition-colors cursor-pointer text-left"
                    >
                      <IconFileTypePpt size={16} className="text-amber-500 shrink-0" />
                      <div>
                        <div className="font-semibold">Slide Deck (Presentation)</div>
                        <div className="text-[10px] text-[#91867E]">Executive HTML5 presentation</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportDashboardToXlsx(activeProjectName, currentLayout.widgets);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] hover:bg-[#E3836C]/10 dark:hover:bg-[#292522] hover:text-[#E3836C] transition-colors cursor-pointer text-left"
                    >
                      <IconFileSpreadsheet size={16} className="text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-semibold">Spreadsheet (XLSX / Data)</div>
                        <div className="text-[10px] text-[#91867E]">Multi-table workbook export</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportDashboardToDocx(activeProjectName, currentLayout.widgets);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] hover:bg-[#E3836C]/10 dark:hover:bg-[#292522] hover:text-[#E3836C] transition-colors cursor-pointer text-left"
                    >
                      <IconFileTypeDoc size={16} className="text-blue-500 shrink-0" />
                      <div>
                        <div className="font-semibold">Narrative Brief (Word)</div>
                        <div className="text-[10px] text-[#91867E]">Editable Word / Docs brief</div>
                      </div>
                    </button>

                    <div className="pt-1 border-t border-[#4A4238]/10 dark:border-[#3A3430]">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsExportMenuOpen(false);
                          await copyShareableLink(activeProjectId);
                          setExportToastMsg('Shareable link copied to clipboard!');
                          setTimeout(() => setExportToastMsg(null), 3000);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#E3836C] hover:bg-[#E3836C]/10 dark:hover:bg-[#292522] transition-colors cursor-pointer text-left"
                      >
                        <IconShare size={16} className="shrink-0" />
                        <div>
                          <div className="font-semibold">Copy Shareable Link</div>
                          <div className="text-[10px] text-[#91867E]">Direct link to active canvas</div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* New Project CTA Button */}
            <button
              type="button"
              onClick={() => {
                setNewProjectName('');
                setIsNewProjectOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#4A4238] hover:bg-[#383129] dark:bg-[#E9DDD2] dark:hover:bg-[#F4EDE5] dark:text-[#302824] text-[#F3EDE4] text-xs font-mono uppercase tracking-wider transition-all shadow-sm transform hover:scale-[1.02] cursor-pointer"
            >
              <IconPlus size={14} className="text-[#E3836C]" />
              <span>New Project</span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile / Auth State */}
            {user ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setUserActionMsg(null);
                    setEditName(user.name || '');
                    setIsUserSettingsOpen(true);
                  }}
                  className="w-8 h-8 rounded-full bg-[#E8C4A0] dark:bg-[#302B28] border border-[#4A4238]/20 dark:border-[#504740] flex items-center justify-center font-mono text-xs font-bold text-[#4A4238] dark:text-[#F4EDE5] hover:ring-2 hover:ring-[#E3836C]/40 transition-all cursor-pointer"
                  title={`Account Settings: ${user.name} (${user.email})`}
                >
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-[11px] font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#C5B9AE]/50 hover:text-red-500 transition-colors cursor-pointer"
                  title="Sign out of your account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs font-mono uppercase tracking-wider text-[#E3836C] hover:text-[#ED967F] hover:underline font-semibold"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
          
          {/* ─── HERO SECTION: BALANCED 2-COLUMN HERO (SOLVES FOLD EATING) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Greeting, Telemetry Pills, and AI Copilot Prompt Bar */}
            <div className="lg:col-span-2 flex flex-col justify-between space-y-5 glass-card rounded-3xl p-6 sm:p-8 border border-[#4A4238]/12 dark:border-[#3A3430] shadow-xl">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-mono text-[#E3836C] uppercase tracking-widest flex items-center gap-1.5">
                    <IconSparkles size={14} /> Continuous Intelligence Engine
                  </div>
                  
                  {/* Incognito Pill with explainer tooltip */}
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowIncognitoTooltip(true)}
                      onMouseLeave={() => setShowIncognitoTooltip(false)}
                      onClick={() => router.push('/new-project')}
                      className="px-3 py-1 rounded-full glass-card text-[11px] font-mono text-[#4A4238]/70 dark:text-[#C5B9AE] flex items-center gap-1.5 hover:border-[#E3836C]/40 transition-all cursor-pointer"
                    >
                      <IconShieldLock size={13} className="text-[#A99BB5]" />
                      <span>Incognito Session</span>
                    </button>
                    {showIncognitoTooltip && (
                      <div className="absolute right-0 top-full mt-2 w-56 p-2.5 rounded-xl bg-[#211E1C] text-[#C5B9AE] text-[10px] font-mono border border-[#3A3430] shadow-2xl z-30 pointer-events-none">
                        Ephemeral session-only workspace. In-memory state is discarded upon window close.
                      </div>
                    )}
                  </div>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5] leading-tight">
                  Good day,{' '}
                  <span className="italic text-[#E3836C]">
                    {user?.name ? user.name.split(' ')[0] : 'Explorer'}
                  </span>
                </h1>
                <p className="text-sm text-[#4A4238]/70 dark:text-[#C5B9AE] mt-1">
                  Continuous telemetry &amp; live generative dashboard synthesis connected to MongoDB Atlas.
                </p>

                {/* Quick Stats Pill Bar */}
                <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-[#4A4238]/08 dark:border-[#3A3430]">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/5 dark:bg-[#292522] text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[#4A4238]/60 dark:text-[#91867E]">Projects:</span>
                    <strong className="text-[#4A4238] dark:text-[#F4EDE5]">{serverProjects.length}</strong>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/5 dark:bg-[#292522] text-xs font-mono">
                    <IconLayoutDashboard size={13} className="text-[#E3836C]" />
                    <span className="text-[#4A4238]/60 dark:text-[#91867E]">Active Widgets:</span>
                    <strong className="text-[#4A4238] dark:text-[#F4EDE5]">{currentLayout.widgets.length}</strong>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/5 dark:bg-[#292522] text-xs font-mono">
                    <span className="text-[10px] uppercase font-bold text-[#E3836C]">Atlas DB</span>
                    <span className="text-[#4A4238]/60 dark:text-[#91867E]">Latency:</span>
                    <strong className="text-emerald-500">18ms</strong>
                  </div>
                </div>
              </div>

              {/* Primary AI Prompt Bar */}
              <div className="space-y-2 pt-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePromptAgent()}
                    placeholder="Ask AI Copilot to modify this dashboard (e.g. 'Add a line chart for MRR Trend' or 'Add CAC metric card')…"
                    disabled={isAgentRunning}
                    className="w-full pl-4 pr-24 py-3 rounded-2xl text-xs sm:text-sm bg-white/60 dark:bg-[#292522] border border-[#4A4238]/15 dark:border-[#3A3430] text-[#4A4238] dark:text-[#F4EDE5] placeholder-current/40 dark:placeholder-[#80766F] focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => handlePromptAgent()}
                    disabled={isAgentRunning || !agentPrompt.trim()}
                    className="absolute right-2 px-3.5 py-2 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                  >
                    {isAgentRunning ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <IconSend size={14} />
                    )}
                    <span>Propose</span>
                  </button>
                </div>

                {agentStatus && (
                  <div className="text-xs font-mono text-[#E3836C] flex items-center gap-2 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#E3836C]" />
                    {agentStatus}
                  </div>
                )}

                {/* Quick prompt trigger chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-mono text-[#91867E]">Suggestions:</span>
                  <button
                    type="button"
                    onClick={() => handlePromptAgent('Add a line chart for MRR Trend')}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#4A4238]/05 dark:bg-[#292522] text-[#4A4238]/80 dark:text-[#C5B9AE] hover:bg-[#E3836C]/15 hover:text-[#E3836C] dark:hover:bg-[#E3836C]/20 dark:hover:text-[#E3836C] transition-all cursor-pointer disabled:opacity-50"
                  >
                    + MRR Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePromptAgent('Add a metric card for Active Telemetry Nodes')}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#4A4238]/05 dark:bg-[#292522] text-[#4A4238]/80 dark:text-[#C5B9AE] hover:bg-[#E3836C]/15 hover:text-[#E3836C] dark:hover:bg-[#E3836C]/20 dark:hover:text-[#E3836C] transition-all cursor-pointer disabled:opacity-50"
                  >
                    + Telemetry Card
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePromptAgent('Add a table widget for Regional Health')}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#4A4238]/05 dark:bg-[#292522] text-[#4A4238]/80 dark:text-[#C5B9AE] hover:bg-[#E3836C]/15 hover:text-[#E3836C] dark:hover:bg-[#E3836C]/20 dark:hover:text-[#E3836C] transition-all cursor-pointer disabled:opacity-50"
                  >
                    + Regional Table
                  </button>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Compact 3D Planetary Mesh Telemetry Card */}
            <div className="glass-card rounded-3xl p-5 border border-[#4A4238]/12 dark:border-[#3A3430] shadow-xl flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E3836C] animate-pulse" />
                  <div>
                    <h3 className="font-serif text-base tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                      Global Telemetry Mesh
                    </h3>
                    <p className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                      10 Ingestion Hubs · Active WebGL
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGlobeExpanded(true)}
                  className="px-2.5 py-1 rounded-xl border border-[#4A4238]/15 dark:border-[#3A3430] hover:border-[#E3836C] text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer text-[#E3836C]"
                  title="Expand to immersive fullscreen 3D Google Earth exploration"
                >
                  <IconWorld size={13} />
                  <span>Expand</span>
                </button>
              </div>

              {/* Compact 3D Canvas Stage */}
              <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-[#E8DFD3]/40 dark:bg-[#171514] border border-[#4A4238]/10 dark:border-[#3A3430]">
                <EarthGlobe
                  isExpanded={false}
                  onToggleExpand={setIsGlobeExpanded}
                  className="!absolute inset-0 !z-0"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#91867E] pt-1 border-t border-[#4A4238]/08 dark:border-[#3A3430]">
                <span>Ingestion Status: <strong className="text-emerald-500">Nominal</strong></span>
                <span>Mesh P99: <strong className="text-emerald-500">18.4ms</strong></span>
              </div>
            </div>

          </div>

          {/* ─── ONBOARDING EMPTY STATE (When 0 active projects exist) ──────── */}
          {!isLoadingProjects && serverProjects.length === 0 && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-[#E3836C]/30 bg-gradient-to-br from-[#E3836C]/10 via-[#211E1C] to-[#5A332C]/20 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#E3836C] font-semibold uppercase tracking-wider">
                    <IconSparkles size={16} /> Welcome to AnalyzeIt
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                    Your Continuous Intelligence Studio
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4A4238]/70 dark:text-[#C5B9AE] font-mono">
                    Get started in seconds: instantiate a curated business template below, start with a blank canvas, or prompt the AI Copilot above to synthesize custom charts.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('curated-templates-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono font-medium flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <IconLayoutDashboard size={15} />
                    <span>Browse Templates</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProjectName('');
                      setIsNewProjectOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[#4A4238]/15 dark:border-[#504740] bg-white/60 dark:bg-[#292522] text-[#4A4238] dark:text-[#F4EDE5] text-xs font-mono flex items-center gap-2 hover:border-[#E3836C]/40 transition-all cursor-pointer"
                  >
                    <IconPlus size={15} />
                    <span>Blank Canvas</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── CURATED DASHBOARD STARTER TEMPLATES ───────────────────────── */}
          <div id="curated-templates-section" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E3836C]" />
                  <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                    Curated Starter Templates
                  </h2>
                </div>
                <p className="text-xs font-mono text-[#4A4238]/60 dark:text-[#C5B9AE] mt-0.5">
                  Instant 1-click workspaces with verified schemas, telemetry bindings, and AI Copilot customization
                </p>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['All', 'Revenue', 'Marketing', 'Telemetry', 'Finance'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveTemplateCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      activeTemplateCategory === cat
                        ? 'bg-[#E3836C] text-[#FFF7F1] shadow-xs'
                        : 'bg-black/5 dark:bg-[#292522] text-[#4A4238]/70 dark:text-[#C5B9AE] hover:text-[#E3836C]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {CURATED_TEMPLATES.filter(
                (t) => activeTemplateCategory === 'All' || t.category === activeTemplateCategory
              ).map((template) => {
                const isApplying = isApplyingTemplate === template.id;

                return (
                  <div
                    key={template.id}
                    className="glass-card rounded-2xl p-4.5 border border-[#4A4238]/10 dark:border-[#3A3430] hover:border-[#E3836C]/40 flex flex-col justify-between space-y-3 transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${template.badgeColor}`}>
                          {template.badge}
                        </span>
                        <span className="text-[10px] font-mono text-[#91867E]">
                          {template.widgets.length} widget{template.widgets.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-serif text-base font-medium text-[#4A4238] dark:text-[#F4EDE5] group-hover:text-[#E3836C] transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-xs text-[#4A4238]/70 dark:text-[#C5B9AE] mt-1 line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-[#292522] text-[#91867E]"
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
                      className="w-full mt-2 py-2 px-3 rounded-xl bg-[#4A4238] hover:bg-[#383129] dark:bg-[#292522] dark:hover:bg-[#E3836C] dark:hover:text-[#FFF7F1] text-white dark:text-[#F4EDE5] text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
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

          {/* ─── GENERATIVE PROJECT WORKSPACE CANVAS (AGENTIC UI) ─────────── */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#4A4238]/12 dark:border-[#3A3430] shadow-xl space-y-6">
            
            {/* Header & Scoped Project Metadata */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#4A4238]/10 dark:border-[#3A3430]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E3836C]/15 text-[#E3836C] flex items-center justify-center shrink-0">
                  <IconLayoutDashboard size={22} />
                </div>
                <div>
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#91867E] mb-0.5">
                    <span>AnalyzeIt</span>
                    <span>/</span>
                    <span>Workspaces</span>
                    <span>/</span>
                    <span className="text-[#E3836C] truncate max-w-[140px] sm:max-w-xs">{activeProjectName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                      {activeProjectName}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E3836C]/10 text-[#E3836C] font-semibold">
                      v{layoutVersion}
                    </span>
                  </div>
                  
                  <p className="text-xs font-mono text-[#4A4238]/60 dark:text-[#C5B9AE] mt-0.5">
                    ID: <span className="underline">{activeProjectId || 'none'}</span> · Updated by <span className="font-semibold text-[#E3836C]">{updatedBy}</span>
                  </p>
                </div>
              </div>

              {/* Project Switcher + Direct Export Button */}
              <div className="flex flex-wrap items-center gap-2">
                {serverProjects.length > 1 && (
                  <select
                    value={activeProjectId || ''}
                    onChange={(e) => {
                      const found = serverProjects.find((p) => p.id === e.target.value);
                      if (found) handleSelectProject(found);
                    }}
                    aria-label="Switch active project"
                    className="px-3 py-1.5 rounded-xl text-xs font-mono bg-[#4A4238]/05 dark:bg-[#292522] border border-[#4A4238]/10 dark:border-[#3A3430] text-[#4A4238] dark:text-[#F4EDE5] focus:outline-none focus:ring-1 focus:ring-[#E3836C]/40 cursor-pointer"
                  >
                    {serverProjects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#F3EDE4] dark:bg-[#211E1C]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => exportDashboardToPdf(activeProjectName, currentLayout.widgets)}
                  disabled={currentLayout.widgets.length === 0}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono border border-[#4A4238]/15 dark:border-[#3A3430] hover:border-[#E3836C] bg-black/5 dark:bg-[#292522] text-[#4A4238] dark:text-[#F4EDE5] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  title="Export active canvas as PDF report"
                >
                  <IconFileTypePdf size={14} className="text-red-500" />
                  <span>Export PDF</span>
                </button>

                <Link
                  href={activeProjectId ? `/new-project?projectId=${activeProjectId}` : '/new-project'}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="Open full interactive analysis room with live chat & canvas"
                >
                  <span>Open Studio</span>
                  <IconArrowUpRight size={14} />
                </Link>
              </div>
            </div>

            {/* ─── PENDING PROPOSAL CONFIRMATION CARD (SAFETY GATE) ─── */}
            <AnimatePresence>
              {pendingProposal && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl p-5 bg-gradient-to-r from-[#E3836C]/15 via-[#5A332C]/30 to-[#E3836C]/10 border-2 border-[#E3836C]/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#E3836C] font-bold uppercase tracking-wider">
                      <IconSparkles size={15} />
                      Agent Proposed Dashboard Modification
                    </div>
                    {(() => {
                      const isMulti = Array.isArray(pendingProposal.widgets) && pendingProposal.widgets.length > 0;
                      const pType =
                        pendingProposal.widget_spec?.component ||
                        pendingProposal.widget_spec?.type ||
                        (isMulti ? `Composite (${pendingProposal.widgets!.length} widgets)` : 'Composite');
                      const pTitle =
                        (pendingProposal.widget_spec?.props?.title as string) ||
                        pendingProposal.widget_spec?.title ||
                        (isMulti ? pendingProposal.widgets![0]?.title || 'Composite Dashboard' : 'Untitled Proposal');

                      return (
                        <p className="text-sm font-serif text-[#4A4238] dark:text-[#F4EDE5]">
                          Proposal: <span className="font-semibold capitalize">{pendingProposal.action.replace('_', ' ')}</span> of type{' '}
                          <span className="font-semibold text-[#E3836C]">
                            {pType}
                          </span>{' '}
                          (
                          <em>
                            &quot;{pTitle}&quot;
                          </em>
                          )
                        </p>
                      );
                    })()}
                    <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                      Action ID: {pendingProposal.action_id} · Safety Gate: User Confirmation Required
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleRejectProposal}
                      disabled={isApplying}
                      className="px-3.5 py-2 rounded-xl border border-[#4A4238]/20 dark:border-[#3A3430] hover:bg-black/5 dark:hover:bg-[#292522] text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <IconX size={14} />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptProposal}
                      disabled={isApplying}
                      className="px-4 py-2 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isApplying ? (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <IconCheck size={14} />
                      )}
                      <span>Accept &amp; Apply</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── WIDGETS GRID CANVAS ─── */}
            {currentLayout.widgets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {currentLayout.widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className={
                      widget.type === 'line_chart' || widget.type === 'table'
                        ? 'md:col-span-2'
                        : 'col-span-1'
                    }
                  >
                    <SandboxedWidgetRenderer
                      widget={widget}
                      onWidgetAction={handleWidgetAction}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-[#4A4238]/15 dark:border-[#3A3430] flex flex-col items-center justify-center text-center space-y-3 bg-black/[0.01] dark:bg-[#211E1C]/50">
                <div className="w-12 h-12 rounded-2xl bg-[#E3836C]/10 text-[#E3836C] flex items-center justify-center">
                  <IconLayoutDashboard size={24} />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="font-serif text-base text-[#4A4238] dark:text-[#F4EDE5]">
                    {activeProjectId ? 'Canvas is ready for widgets' : 'No project loaded'}
                  </h3>
                  <p className="text-xs text-[#4A4238]/60 dark:text-[#C5B9AE] font-mono">
                    {activeProjectId
                      ? 'This workspace has no widgets yet. Type an analytical prompt above or select a starter template to populate your canvas.'
                      : 'Choose a template above or create a new project to begin visualizing your data.'}
                  </p>
                </div>
                {!activeProjectId && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewProjectName('');
                      setIsNewProjectOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <IconPlus size={14} />
                    <span>Create First Project</span>
                  </button>
                )}
              </div>
            )}

          </div>

          {/* ─── REAL USER ANALYSIS WORKSPACES (PROJECT CRUD) ─────────────── */}
          <div className="space-y-4">
            
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E3836C]" />
                <h2 className="font-serif text-2xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                  Analysis Workspaces
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#4A4238]/06 dark:bg-[#292522] text-[#4A4238]/60 dark:text-[#C5B9AE]">
                  {serverProjects.length} Saved in MongoDB
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <IconSearch
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4238]/40 dark:text-[#91867E] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects…"
                    className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white/60 dark:bg-[#292522] border border-[#4A4238]/10 dark:border-[#3A3430] text-[#4A4238] dark:text-[#F4EDE5] placeholder-current/30 dark:placeholder-[#80766F] focus:outline-none focus:ring-1 focus:ring-[#E3836C]/40 transition-all w-48 sm:w-60"
                  />
                </div>

                {/* Grid / List Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-[#292522] border border-[#4A4238]/10 dark:border-[#3A3430]">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      layoutMode === 'grid'
                        ? 'bg-white dark:bg-[#302B28] text-[#4A4238] dark:text-[#F4EDE5] shadow-xs'
                        : 'text-[#4A4238]/40 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5]'
                    }`}
                    title="Grid view"
                  >
                    <IconLayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      layoutMode === 'list'
                        ? 'bg-white dark:bg-[#302B28] text-[#4A4238] dark:text-[#F4EDE5] shadow-xs'
                        : 'text-[#4A4238]/40 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5]'
                    }`}
                    title="List view"
                  >
                    <IconList size={14} />
                  </button>
                </div>

                {/* "+ New Project" Button */}
                <button
                  type="button"
                  onClick={() => {
                    setNewProjectName('');
                    setIsNewProjectOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <IconPlus size={14} />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* Projects Grid / List with Loading Skeleton */}
            {isLoadingProjects ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] space-y-3 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-4 rounded-full bg-[#4A4238]/10 dark:bg-[#292522]" />
                      <div className="w-20 h-3 rounded bg-[#4A4238]/10 dark:bg-[#292522]" />
                    </div>
                    <div className="space-y-2">
                      <div className="w-3/4 h-5 rounded bg-[#4A4238]/10 dark:bg-[#292522]" />
                      <div className="w-1/2 h-3 rounded bg-[#4A4238]/10 dark:bg-[#292522]" />
                    </div>
                    <div className="pt-3 border-t border-[#4A4238]/08 dark:border-[#3A3430] flex items-center justify-between">
                      <div className="w-16 h-4 rounded bg-[#4A4238]/10 dark:bg-[#292522]" />
                      <div className="w-12 h-4 rounded bg-[#4A4238]/10 dark:bg-[#292522]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div
                className={`grid gap-4 ${
                  layoutMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {filteredProjects.map((project) => {
                  const isActive = project.id === activeProjectId;
                  const dateStr = project.created_at
                    ? new Date(project.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recently';

                  return (
                    <div
                      key={project.id}
                      className={`glass-card rounded-2xl p-5 flex flex-col justify-between border transition-all group ${
                        isActive
                          ? 'border-[#8A4D40] bg-[#E3836C]/10 dark:bg-[#5A332C] dark:border-[#8A4D40] dark:text-[#F4EDE5] shadow-md ring-1 ring-[#E3836C]/40'
                          : 'border-[#4A4238]/10 dark:border-[#3A3430] hover:border-[#E3836C]/30 hover:dark:border-[#E3836C]/40'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                                isActive
                                  ? 'bg-[#E3836C] text-[#FFF7F1]'
                                  : 'bg-[#4A4238]/08 dark:bg-[#292522] text-[#4A4238]/70 dark:text-[#C5B9AE]'
                              }`}
                            >
                              {isActive ? 'Active Canvas' : `v${project.layout_version}`}
                            </span>
                            <span className="text-[10px] font-mono text-[#4A4238]/40 dark:text-[#91867E]">
                              {project.widget_count ?? 0} widget{(project.widget_count ?? 0) === 1 ? '' : 's'}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-[#4A4238]/40 dark:text-[#91867E]">
                            {dateStr}
                          </span>
                        </div>

                        <div>
                          <h3
                            onClick={() => handleSelectProject(project)}
                            className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5] hover:text-[#E3836C] cursor-pointer transition-colors truncate"
                            title={project.name}
                          >
                            {project.name}
                          </h3>
                          <p className="text-xs text-[#4A4238]/60 dark:text-[#91867E] font-mono mt-0.5 truncate">
                            ID: {project.id}
                          </p>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="pt-4 mt-3 border-t border-[#4A4238]/08 dark:border-[#3A3430] flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => handleSelectProject(project)}
                              className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-[#292522] hover:bg-[#E3836C]/15 dark:hover:bg-[#E3836C]/20 hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors cursor-pointer text-[11px]"
                              title="Preview on top generative canvas"
                            >
                              Select
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setProjectToRename(project);
                              setRenameName(project.name);
                            }}
                            className="p-1.5 rounded-lg text-[#4A4238]/60 dark:text-[#C5B9AE] hover:text-[#E3836C] hover:bg-black/5 dark:hover:bg-[#292522] transition-colors cursor-pointer"
                            title="Rename project"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjectToDelete(project)}
                            className="p-1.5 rounded-lg text-[#4A4238]/60 dark:text-[#C5B9AE] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete project"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>

                        <Link
                          href={`/new-project?projectId=${project.id}`}
                          className="flex items-center gap-1 text-[#E3836C] hover:text-[#ED967F] font-semibold transition-colors cursor-pointer"
                          title="Open full interactive workspace with chat and canvas"
                        >
                          <span>Open</span>
                          <IconArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 px-6 glass-card rounded-3xl border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E3836C]/10 text-[#E3836C] flex items-center justify-center">
                  <IconFolderPlus size={28} />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="font-serif text-lg text-[#4A4238] dark:text-[#F4EDE5]">
                    {searchQuery ? 'No matching projects found' : 'No analysis projects yet'}
                  </h3>
                  <p className="text-xs text-[#4A4238]/60 dark:text-[#C5B9AE] font-mono">
                    {searchQuery
                      ? `No projects matched "${searchQuery}". Try a different search query or clear the filter.`
                      : 'Create your first project to start saving visual canvases, telemetry bindings, and AI agent runs durably in MongoDB Atlas.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewProjectName('');
                    setIsNewProjectOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <IconPlus size={16} />
                  <span>Create First Project</span>
                </button>
              </div>
            )}

          </div>

        </main>
      </div>

      {/* ─── TOAST NOTIFICATION ─────────────────────────────────────────── */}
      <AnimatePresence>
        {exportToastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#E3836C] text-[#FFF7F1] text-xs font-mono shadow-2xl flex items-center gap-2"
          >
            <IconCheck size={16} />
            <span>{exportToastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 1: CREATE NEW PROJECT ─────────────────────────────────── */}
      <AnimatePresence>
        {isNewProjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-[#4A4238]/15 dark:border-[#504740] shadow-2xl space-y-5 bg-[#F3EDE4] dark:bg-[#302B28]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E3836C]/15 text-[#E3836C] flex items-center justify-center">
                    <IconFolderPlus size={18} />
                  </div>
                  <h3 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                    Create New Project
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="p-1.5 rounded-xl text-[#4A4238]/40 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5] transition-colors cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/60 dark:text-[#C5B9AE]">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Q4 Revenue & Retention Audit"
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-[#292522] border border-[#4A4238]/15 dark:border-[#3A3430] text-sm text-[#4A4238] dark:text-[#F4EDE5] placeholder-[#4A4238]/30 dark:placeholder-[#80766F] focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40 transition-all"
                  />
                  <p className="text-[11px] font-mono text-[#4A4238]/50 dark:text-[#91867E]">
                    A durable workspace saved in MongoDB with live charts and full revision history.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectOpen(false)}
                    disabled={isCreatingProject}
                    className="px-4 py-2.5 rounded-xl border border-[#4A4238]/15 dark:border-[#504740] text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] hover:bg-black/5 dark:hover:bg-[#292522] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProject || !newProjectName.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingProject ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <IconPlus size={14} />
                    )}
                    <span>Create &amp; Open</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: RENAME PROJECT ─────────────────────────────────────── */}
      <AnimatePresence>
        {projectToRename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-[#4A4238]/15 dark:border-[#504740] shadow-2xl space-y-5 bg-[#F3EDE4] dark:bg-[#302B28]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E3836C]/15 text-[#E3836C] flex items-center justify-center">
                    <IconEdit size={18} />
                  </div>
                  <h3 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                    Rename Project
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectToRename(null)}
                  className="p-1.5 rounded-xl text-[#4A4238]/40 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5] transition-colors cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <form onSubmit={handleRenameSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/60 dark:text-[#C5B9AE]">
                    New Project Name
                  </label>
                  <input
                    type="text"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-[#292522] border border-[#4A4238]/15 dark:border-[#3A3430] text-sm text-[#4A4238] dark:text-[#F4EDE5] focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40 transition-all"
                  />
                  <p className="text-[11px] font-mono text-[#4A4238]/50 dark:text-[#91867E]">
                    ID: {projectToRename.id}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setProjectToRename(null)}
                    disabled={isRenamingProject}
                    className="px-4 py-2.5 rounded-xl border border-[#4A4238]/15 dark:border-[#504740] text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] hover:bg-black/5 dark:hover:bg-[#292522] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRenamingProject || !renameName.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isRenamingProject ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <IconCheck size={14} />
                    )}
                    <span>Save Name</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: DELETE PROJECT CONFIRMATION ─────────────────────────── */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-red-500/20 dark:border-red-500/30 shadow-2xl space-y-5 bg-[#F3EDE4] dark:bg-[#302B28]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center">
                    <IconAlertTriangle size={18} />
                  </div>
                  <h3 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                    Delete Project
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  className="p-1.5 rounded-xl text-[#4A4238]/40 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5] transition-colors cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-[#4A4238] dark:text-[#F4EDE5]">
                  Are you sure you want to delete <span className="font-bold">&quot;{projectToDelete.name}&quot;</span>?
                </p>
                <div className="p-3.5 rounded-xl bg-red-500/10 dark:bg-[#382522] border border-red-500/20 dark:border-[#D97870]/30 text-xs font-mono text-red-600 dark:text-[#D97870] space-y-1">
                  <p className="font-bold">Cascade Cleanup Warning:</p>
                  <p>
                    This permanently deletes the project layout, all widget configurations, UI action histories, AI chat runs, events, and saved artifacts from MongoDB.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  disabled={isDeletingProject}
                  className="px-4 py-2.5 rounded-xl border border-[#4A4238]/15 dark:border-[#504740] text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] hover:bg-black/5 dark:hover:bg-[#292522] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isDeletingProject}
                  className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isDeletingProject ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <IconTrash size={14} />
                  )}
                  <span>Delete Permanently</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 4: USER MANAGEMENT & ACCOUNT SETTINGS ───────────────────── */}
      <AnimatePresence>
        {isUserSettingsOpen && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-[#4A4238]/15 dark:border-[#504740] shadow-2xl space-y-6 bg-[#F3EDE4] dark:bg-[#302B28] max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#4A4238]/10 dark:border-[#3A3430]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E3836C]/15 text-[#E3836C] flex items-center justify-center">
                    <IconUser size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#F4EDE5]">
                      Account &amp; User Management
                    </h3>
                    <p className="text-xs font-mono text-[#4A4238]/50 dark:text-[#91867E]">
                      Managed in MongoDB Atlas
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUserSettingsOpen(false)}
                  className="p-1.5 rounded-xl text-[#4A4238]/40 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5] transition-colors cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              {/* Status feedback message */}
              {userActionMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                    userActionMsg.type === 'success'
                      ? 'bg-emerald-500/10 dark:bg-[#283329] text-emerald-600 dark:text-[#9EBB9A] border border-emerald-500/20 dark:border-[#9EBB9A]/30'
                      : 'bg-red-500/10 dark:bg-[#382522] text-red-600 dark:text-[#D97870] border border-red-500/20 dark:border-[#D97870]/30'
                  }`}
                >
                  {userActionMsg.type === 'success' ? <IconCheck size={14} /> : <IconAlertTriangle size={14} />}
                  <span>{userActionMsg.text}</span>
                </div>
              )}

              {/* Section A: Account Info & Profile */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#E3836C] font-bold">
                  User Profile
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#C5B9AE]">
                      Email Address
                    </label>
                    <input
                      type="text"
                      value={user.email}
                      disabled
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-[#211E1C] border border-[#4A4238]/10 dark:border-[#3A3430] text-xs font-mono text-[#4A4238]/60 dark:text-[#80766F] cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#C5B9AE]">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={user.id}
                      disabled
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-[#211E1C] border border-[#4A4238]/10 dark:border-[#3A3430] text-xs font-mono text-[#4A4238]/60 dark:text-[#80766F] cursor-not-allowed truncate"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#C5B9AE]">
                    Display Name
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 rounded-xl bg-white/70 dark:bg-[#292522] border border-[#4A4238]/15 dark:border-[#3A3430] text-xs text-[#4A4238] dark:text-[#F4EDE5] focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingProfile || editName === user.name}
                      className="px-3 py-2 rounded-xl bg-[#4A4238] dark:bg-[#E9DDD2] text-white dark:text-[#302824] text-xs font-mono hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 font-medium"
                    >
                      {isUpdatingProfile ? 'Saving…' : 'Update Name'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Section B: Change Password */}
              <form onSubmit={handleChangePassword} className="space-y-3 pt-3 border-t border-[#4A4238]/10 dark:border-[#3A3430]">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#E3836C] font-bold flex items-center gap-1.5">
                  <IconKey size={14} /> Change Password
                </h4>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#C5B9AE]">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-[#292522] border border-[#4A4238]/15 dark:border-[#3A3430] text-xs text-[#4A4238] dark:text-[#F4EDE5] focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#C5B9AE]">
                        New Password (min 8 chars)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-[#292522] border border-[#4A4238]/15 dark:border-[#3A3430] text-xs text-[#4A4238] dark:text-[#F4EDE5] focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#C5B9AE]">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-[#292522] border border-[#4A4238]/15 dark:border-[#3A3430] text-xs text-[#4A4238] dark:text-[#F4EDE5] focus:outline-none focus:ring-2 focus:ring-[#E3836C]/40"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !currentPassword || !newPassword}
                      className="px-4 py-2 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-xs font-mono transition-all shadow-sm cursor-pointer disabled:opacity-40"
                    >
                      {isChangingPassword ? 'Changing…' : 'Change Password'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Section C: Sign Out */}
              <div className="pt-3 border-t border-[#4A4238]/10 dark:border-[#3A3430] flex items-center justify-between">
                <span className="text-xs font-mono text-[#4A4238]/50 dark:text-[#91867E]">
                  Active JWT session
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
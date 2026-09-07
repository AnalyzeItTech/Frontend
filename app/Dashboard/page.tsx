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
          setActiveProjectName('No Active Workspace');
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
          setActiveProjectName('No Active Workspace');
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

    if (!activeProjectId) {
      try {
        const created = await createProject('Quick Analysis Project', user?.id);
        setServerProjects((prev) => [created, ...prev]);
        setActiveProjectId(created.id);
        setActiveProjectName(created.name);
      } catch (err) {
        console.error('Failed to create project for agent prompt:', err);
        return;
      }
    }

    const targetProjectId = activeProjectId || 'default';
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
    if (!pendingProposal || !pendingProposal.action_id || !activeProjectId) return;
    setIsApplying(true);
    try {
      const res = await applyUIAction(activeProjectId, pendingProposal.action_id, true);
      if (res.applied && res.layout) {
        setCurrentLayout(res.layout);
        if (res.layout_version) setLayoutVersion(res.layout_version);
        setUpdatedBy('agent');
      } else {
        const updated = await getProjectLayout(activeProjectId);
        setCurrentLayout(updated.layout_json);
        setLayoutVersion(updated.version);
        setUpdatedBy(updated.updated_by || 'agent');
      }
      setPendingProposal(null);
    } catch (err) {
      console.error('Failed to apply proposal:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!pendingProposal || !pendingProposal.action_id || !activeProjectId) return;
    try {
      await applyUIAction(activeProjectId, pendingProposal.action_id, false);
      setPendingProposal(null);
    } catch (err) {
      console.error('Failed to reject proposal:', err);
      setPendingProposal(null);
    }
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobeExpanded, isNewProjectOpen, projectToRename, projectToDelete, isUserSettingsOpen]);

  const filteredProjects = serverProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-[#F3EDE4] dark:bg-[#161311] text-[#4A4238] dark:text-[#EDE6DC] transition-colors duration-500 overflow-x-hidden">
      
      {/* ─── LAYER 1: 3D EARTH GLOBE BACKGROUND & EXPANDED MODAL ──────────── */}
      <EarthGlobe
        isExpanded={isGlobeExpanded}
        onToggleExpand={setIsGlobeExpanded}
      />

      {/* ─── LAYER 2: FLOATING DASHBOARD DECK ─────────────────────────────── */}
      <div
        className={`relative z-10 min-h-screen flex flex-col transition-all duration-500 ${
          isGlobeExpanded ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 px-6 sm:px-10 py-4 flex items-center justify-between border-b border-[#4A4238]/08 dark:border-white/08 bg-[#F3EDE4]/75 dark:bg-[#161311]/75 backdrop-blur-md">
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
              <span className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-widest text-[#4A4238]/40 dark:text-white/40 ml-1">
                Workspace
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* New Project CTA Button */}
            <button
              type="button"
              onClick={() => {
                setNewProjectName('');
                setIsNewProjectOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#4A4238] hover:bg-[#383129] dark:bg-[#EDE6DC] dark:hover:bg-white dark:text-[#161311] text-[#F3EDE4] text-xs font-mono uppercase tracking-wider transition-all shadow-sm transform hover:scale-[1.02] cursor-pointer"
            >
              <IconPlus size={14} className="text-[#D4826A]" />
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
                  className="w-8 h-8 rounded-full bg-[#E8C4A0] dark:bg-[#3D352E] border border-[#4A4238]/20 dark:border-white/15 flex items-center justify-center font-mono text-xs font-bold text-[#4A4238] dark:text-[#EDE6DC] hover:ring-2 hover:ring-[#D4826A]/40 transition-all cursor-pointer"
                  title={`Account Settings: ${user.name} (${user.email})`}
                >
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-[11px] font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#EDE6DC]/50 hover:text-red-500 transition-colors cursor-pointer"
                  title="Sign out of your account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs font-mono uppercase tracking-wider text-[#D4826A] hover:text-[#C0734E] hover:underline font-semibold"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
          
          {/* Welcome Greeting */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#D4826A] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <IconSparkles size={13} /> Continuous Intelligence Engine
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                Good day,{' '}
                <span className="italic text-[#D4826A]">
                  {user?.name ? user.name.split(' ')[0] : 'Explorer'}
                </span>
              </h1>
              <p className="text-sm text-[#4A4238]/60 dark:text-[#EDE6DC]/60 mt-1">
                {serverProjects.length} active project{serverProjects.length === 1 ? '' : 's'} saved in MongoDB Atlas · Continuous intelligence ready
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsGlobeExpanded(true)}
                className="px-4 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-md transition-all transform hover:scale-[1.02] cursor-pointer"
              >
                <IconWorld size={16} />
                <span>Fullscreen 3D Earth</span>
              </button>

              <Link
                href="/new-project"
                className="px-3.5 py-2 rounded-xl glass-card text-xs font-mono text-[#4A4238] dark:text-[#EDE6DC] flex items-center gap-2 hover:border-[#D4826A]/40 transition-all cursor-pointer"
              >
                <IconShieldLock size={15} className="text-purple-400" />
                <span>Incognito Session</span>
              </Link>
            </div>
          </div>

          {/* ─── FEATURED 3D PLANET EARTH TELEMETRY STAGE ─────────────────── */}
          <div className="glass-card rounded-3xl p-6 border border-[#4A4238]/12 dark:border-white/12 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#D4826A] animate-pulse" />
                <div>
                  <h2 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                    Global Telemetry Mesh &amp; 3D Planetary Map
                  </h2>
                  <p className="text-xs font-mono text-[#4A4238]/60 dark:text-[#EDE6DC]/60">
                    Active Three.js WebGL Earth with real-time continuous data ingestion across 10 global hubs
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGlobeExpanded(true)}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-[#4A4238]/15 dark:border-white/15 hover:border-[#D4826A] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <IconWorld size={14} className="text-[#D4826A]" />
                <span>Expand Fullscreen</span>
              </button>
            </div>

            {/* Embedded 3D Canvas Stage */}
            <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-[#E8DFD3]/40 dark:bg-[#110F0D]/60 border border-[#4A4238]/10 dark:border-white/10">
              <EarthGlobe
                isExpanded={false}
                onToggleExpand={setIsGlobeExpanded}
                className="!absolute inset-0 !z-0"
              />
            </div>
          </div>

          {/* ─── GENERATIVE PROJECT WORKSPACE CANVAS (AGENTIC UI) ─────────── */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#4A4238]/12 dark:border-white/12 shadow-xl space-y-6">
            
            {/* Header & Scoped Project Metadata */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#4A4238]/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4826A]/15 text-[#D4826A] flex items-center justify-center">
                  <IconLayoutDashboard size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                      {activeProjectName}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#D4826A]/10 text-[#D4826A] font-semibold">
                      v{layoutVersion}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#4A4238]/60 dark:text-[#EDE6DC]/60 mt-0.5">
                    Project ID: <span className="underline">{activeProjectId}</span> · Canvas updated by <span className="font-semibold">{updatedBy}</span>
                  </p>
                </div>
              </div>

              {/* Quick AI Trigger Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePromptAgent('Add a line chart for MRR Trend')}
                  disabled={isAgentRunning}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-50"
                >
                  + Add MRR Trend
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptAgent('Add a metric card for Active Telemetry Nodes')}
                  disabled={isAgentRunning}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-50"
                >
                  + Add Telemetry Card
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptAgent('Add a table widget for Regional Health')}
                  disabled={isAgentRunning}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-50"
                >
                  + Add Regional Table
                </button>
              </div>
            </div>

            {/* Agent Copilot Prompt Input Bar */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePromptAgent()}
                placeholder="Ask agent to modify this dashboard (e.g. 'Add a line chart for Revenue Trend' or 'Add metric card for Conversion Rate')…"
                disabled={isAgentRunning}
                className="w-full pl-4 pr-24 py-3 rounded-2xl text-xs sm:text-sm bg-white/60 dark:bg-white/05 border border-[#4A4238]/15 dark:border-white/15 placeholder-current/40 focus:outline-none focus:ring-2 focus:ring-[#D4826A]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => handlePromptAgent()}
                disabled={isAgentRunning || !agentPrompt.trim()}
                className="absolute right-2 px-3.5 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
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
              <div className="text-xs font-mono text-[#D4826A] flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#D4826A]" />
                {agentStatus}
              </div>
            )}

            {/* ─── PENDING PROPOSAL CONFIRMATION CARD (SAFETY GATE) ─── */}
            <AnimatePresence>
              {pendingProposal && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl p-5 bg-gradient-to-r from-[#D4826A]/15 via-[#E8C4A0]/20 to-[#D4826A]/10 border-2 border-[#D4826A]/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#D4826A] font-bold uppercase tracking-wider">
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
                        <p className="text-sm font-serif text-[#4A4238] dark:text-[#EDE6DC]">
                          Proposal: <span className="font-semibold capitalize">{pendingProposal.action.replace('_', ' ')}</span> of type{' '}
                          <span className="font-semibold text-[#D4826A]">
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
                    <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                      Action ID: {pendingProposal.action_id} · Safety Gate: User Confirmation Required
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleRejectProposal}
                      disabled={isApplying}
                      className="px-3.5 py-2 rounded-xl border border-[#4A4238]/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-mono text-[#4A4238] dark:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <IconX size={14} />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptProposal}
                      disabled={isApplying}
                      className="px-4 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
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
              <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-[#4A4238]/15 dark:border-white/15 flex flex-col items-center justify-center text-center space-y-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="w-12 h-12 rounded-2xl bg-[#D4826A]/10 text-[#D4826A] flex items-center justify-center">
                  <IconLayoutDashboard size={24} />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="font-serif text-base text-[#4A4238] dark:text-[#EDE6DC]">
                    {activeProjectId ? 'Canvas is ready for widgets' : 'No project loaded'}
                  </h3>
                  <p className="text-xs text-[#4A4238]/60 dark:text-[#EDE6DC]/60 font-mono">
                    {activeProjectId
                      ? 'This workspace has no widgets yet. Type an analytical prompt above or use the quick chips to add your first visual widget.'
                      : 'Create a new project or select an existing one below to begin visualizing your data.'}
                  </p>
                </div>
                {!activeProjectId && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewProjectName('');
                      setIsNewProjectOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
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
                <div className="w-2.5 h-2.5 rounded-full bg-[#D4826A]" />
                <h2 className="font-serif text-2xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                  Analysis Workspaces
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#4A4238]/06 dark:bg-white/10 text-[#4A4238]/60 dark:text-[#EDE6DC]/60">
                  {serverProjects.length} Saved in MongoDB
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <IconSearch
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4238]/40 dark:text-white/40 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects…"
                    className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white/60 dark:bg-white/05 border border-[#4A4238]/10 dark:border-white/10 placeholder-current/30 focus:outline-none focus:ring-1 focus:ring-[#D4826A]/40 transition-all w-48 sm:w-60"
                  />
                </div>

                {/* Grid / List Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[#4A4238]/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      layoutMode === 'grid'
                        ? 'bg-white dark:bg-[#24201D] text-[#4A4238] dark:text-white shadow-xs'
                        : 'text-[#4A4238]/40 dark:text-white/40 hover:text-[#4A4238] dark:hover:text-white'
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
                        ? 'bg-white dark:bg-[#24201D] text-[#4A4238] dark:text-white shadow-xs'
                        : 'text-[#4A4238]/40 dark:text-white/40 hover:text-[#4A4238] dark:hover:text-white'
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
                  className="px-3.5 py-1.5 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <IconPlus size={14} />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* Projects Grid / List */}
            {isLoadingProjects ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-xs font-mono text-[#4A4238]/50 dark:text-white/50">
                <span className="w-5 h-5 border-2 border-[#D4826A] border-t-transparent rounded-full animate-spin" />
                <span>Loading projects from MongoDB Atlas…</span>
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
                          ? 'border-[#D4826A]/60 bg-[#D4826A]/05 dark:bg-[#D4826A]/10 shadow-md ring-1 ring-[#D4826A]/30'
                          : 'border-[#4A4238]/10 dark:border-white/10 hover:border-[#D4826A]/30'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                                isActive
                                  ? 'bg-[#D4826A] text-white'
                                  : 'bg-[#4A4238]/08 dark:bg-white/10 text-[#4A4238]/70 dark:text-[#EDE6DC]/70'
                              }`}
                            >
                              {isActive ? 'Active Canvas' : `v${project.layout_version}`}
                            </span>
                            <span className="text-[10px] font-mono text-[#4A4238]/40 dark:text-white/40">
                              {project.widget_count ?? 0} widget{(project.widget_count ?? 0) === 1 ? '' : 's'}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-[#4A4238]/40 dark:text-white/40">
                            {dateStr}
                          </span>
                        </div>

                        <div>
                          <h3
                            onClick={() => handleSelectProject(project)}
                            className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#EDE6DC] hover:text-[#D4826A] cursor-pointer transition-colors truncate"
                            title={project.name}
                          >
                            {project.name}
                          </h3>
                          <p className="text-xs text-[#4A4238]/60 dark:text-[#EDE6DC]/60 font-mono mt-0.5 truncate">
                            ID: {project.id}
                          </p>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="pt-4 mt-3 border-t border-[#4A4238]/08 dark:border-white/08 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => handleSelectProject(project)}
                              className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-colors cursor-pointer text-[11px]"
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
                            className="p-1.5 rounded-lg text-[#4A4238]/60 dark:text-white/60 hover:text-[#D4826A] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Rename project"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjectToDelete(project)}
                            className="p-1.5 rounded-lg text-[#4A4238]/60 dark:text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete project"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>

                        <Link
                          href={`/new-project?projectId=${project.id}`}
                          className="flex items-center gap-1 text-[#D4826A] hover:text-[#C0734E] font-semibold transition-colors cursor-pointer"
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
              <div className="py-16 px-6 glass-card rounded-3xl border border-[#4A4238]/10 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#D4826A]/10 text-[#D4826A] flex items-center justify-center">
                  <IconFolderPlus size={28} />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="font-serif text-lg text-[#4A4238] dark:text-[#EDE6DC]">
                    {searchQuery ? 'No matching projects found' : 'No analysis projects yet'}
                  </h3>
                  <p className="text-xs text-[#4A4238]/60 dark:text-[#EDE6DC]/60 font-mono">
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
                  className="px-4 py-2.5 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <IconPlus size={16} />
                  <span>Create First Project</span>
                </button>
              </div>
            )}

          </div>

        </main>
      </div>

      {/* ─── MODAL 1: CREATE NEW PROJECT ─────────────────────────────────── */}
      <AnimatePresence>
        {isNewProjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-[#4A4238]/15 dark:border-white/15 shadow-2xl space-y-5 bg-[#F3EDE4] dark:bg-[#1E1B18]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#D4826A]/15 text-[#D4826A] flex items-center justify-center">
                    <IconFolderPlus size={18} />
                  </div>
                  <h3 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                    Create New Project
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="p-1.5 rounded-xl text-[#4A4238]/40 dark:text-white/40 hover:text-[#4A4238] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/60 dark:text-[#EDE6DC]/60">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Q4 Revenue & Retention Audit"
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-white/05 border border-[#4A4238]/15 dark:border-white/15 text-sm text-[#4A4238] dark:text-[#EDE6DC] placeholder-[#4A4238]/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4826A]/40 transition-all"
                  />
                  <p className="text-[11px] font-mono text-[#4A4238]/50 dark:text-white/50">
                    A durable workspace saved in MongoDB with live charts and full revision history.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectOpen(false)}
                    disabled={isCreatingProject}
                    className="px-4 py-2.5 rounded-xl border border-[#4A4238]/15 dark:border-white/15 text-xs font-mono text-[#4A4238] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProject || !newProjectName.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
              className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-[#4A4238]/15 dark:border-white/15 shadow-2xl space-y-5 bg-[#F3EDE4] dark:bg-[#1E1B18]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#D4826A]/15 text-[#D4826A] flex items-center justify-center">
                    <IconEdit size={18} />
                  </div>
                  <h3 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                    Rename Project
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectToRename(null)}
                  className="p-1.5 rounded-xl text-[#4A4238]/40 dark:text-white/40 hover:text-[#4A4238] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <form onSubmit={handleRenameSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/60 dark:text-[#EDE6DC]/60">
                    New Project Name
                  </label>
                  <input
                    type="text"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-white/05 border border-[#4A4238]/15 dark:border-white/15 text-sm text-[#4A4238] dark:text-[#EDE6DC] focus:outline-none focus:ring-2 focus:ring-[#D4826A]/40 transition-all"
                  />
                  <p className="text-[11px] font-mono text-[#4A4238]/50 dark:text-white/50">
                    ID: {projectToRename.id}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setProjectToRename(null)}
                    disabled={isRenamingProject}
                    className="px-4 py-2.5 rounded-xl border border-[#4A4238]/15 dark:border-white/15 text-xs font-mono text-[#4A4238] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRenamingProject || !renameName.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
              className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-red-500/20 shadow-2xl space-y-5 bg-[#F3EDE4] dark:bg-[#1E1B18]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center">
                    <IconAlertTriangle size={18} />
                  </div>
                  <h3 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                    Delete Project
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  className="p-1.5 rounded-xl text-[#4A4238]/40 dark:text-white/40 hover:text-[#4A4238] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-[#4A4238] dark:text-[#EDE6DC]">
                  Are you sure you want to delete <span className="font-bold">&quot;{projectToDelete.name}&quot;</span>?
                </p>
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-600 dark:text-red-400 space-y-1">
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
                  className="px-4 py-2.5 rounded-xl border border-[#4A4238]/15 dark:border-white/15 text-xs font-mono text-[#4A4238] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
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
              className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-[#4A4238]/15 dark:border-white/15 shadow-2xl space-y-6 bg-[#F3EDE4] dark:bg-[#1E1B18] max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#4A4238]/10 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#D4826A]/15 text-[#D4826A] flex items-center justify-center">
                    <IconUser size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                      Account &amp; User Management
                    </h3>
                    <p className="text-xs font-mono text-[#4A4238]/50 dark:text-white/50">
                      Managed in MongoDB Atlas
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUserSettingsOpen(false)}
                  className="p-1.5 rounded-xl text-[#4A4238]/40 dark:text-white/40 hover:text-[#4A4238] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              {/* Status feedback message */}
              {userActionMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                    userActionMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  }`}
                >
                  {userActionMsg.type === 'success' ? <IconCheck size={14} /> : <IconAlertTriangle size={14} />}
                  <span>{userActionMsg.text}</span>
                </div>
              )}

              {/* Section A: Account Info & Profile */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#D4826A] font-bold">
                  User Profile
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                      Email Address
                    </label>
                    <input
                      type="text"
                      value={user.email}
                      disabled
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/05 border border-[#4A4238]/10 dark:border-white/10 text-xs font-mono text-[#4A4238]/60 dark:text-white/60 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={user.id}
                      disabled
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/05 border border-[#4A4238]/10 dark:border-white/10 text-xs font-mono text-[#4A4238]/60 dark:text-white/60 cursor-not-allowed truncate"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                    Display Name
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/05 border border-[#4A4238]/15 dark:border-white/15 text-xs text-[#4A4238] dark:text-[#EDE6DC] focus:outline-none focus:ring-2 focus:ring-[#D4826A]/40"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingProfile || editName === user.name}
                      className="px-3 py-2 rounded-xl bg-[#4A4238] dark:bg-[#EDE6DC] text-white dark:text-[#161311] text-xs font-mono hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
                    >
                      {isUpdatingProfile ? 'Saving…' : 'Update Name'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Section B: Change Password */}
              <form onSubmit={handleChangePassword} className="space-y-3 pt-3 border-t border-[#4A4238]/10 dark:border-white/10">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#D4826A] font-bold flex items-center gap-1.5">
                  <IconKey size={14} /> Change Password
                </h4>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-white/05 border border-[#4A4238]/15 dark:border-white/15 text-xs text-[#4A4238] dark:text-[#EDE6DC] focus:outline-none focus:ring-2 focus:ring-[#D4826A]/40"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                        New Password (min 8 chars)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-white/05 border border-[#4A4238]/15 dark:border-white/15 text-xs text-[#4A4238] dark:text-[#EDE6DC] focus:outline-none focus:ring-2 focus:ring-[#D4826A]/40"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-white/05 border border-[#4A4238]/15 dark:border-white/15 text-xs text-[#4A4238] dark:text-[#EDE6DC] focus:outline-none focus:ring-2 focus:ring-[#D4826A]/40"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !currentPassword || !newPassword}
                      className="px-4 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono transition-all shadow-sm cursor-pointer disabled:opacity-40"
                    >
                      {isChangingPassword ? 'Changing…' : 'Change Password'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Section C: Sign Out */}
              <div className="pt-3 border-t border-[#4A4238]/10 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono text-[#4A4238]/50 dark:text-white/50">
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
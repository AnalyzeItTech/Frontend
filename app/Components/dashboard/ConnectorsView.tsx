'use client';

import React, { useState, useEffect } from 'react';
import {
  IconPlugConnected,
  IconBrandStripe,
  IconBrandGithub,
  IconCloud,
  IconRefresh,
  IconCheck,
  IconTrash,
  IconArrowUpRight,
  IconShieldLock,
  IconClock,
  IconDatabase,
  IconChartBar,
  IconSparkles,
  IconTable,
} from '@tabler/icons-react';
import {
  fetchAvailableConnectors,
  fetchProjectConnectors,
  authorizeConnector,
  syncConnector,
  revokeConnector,
  connectProvider,
  updateConnector,
  type Connector,
} from '../../lib/customObjectsApi';

interface ConnectorsViewProps {
  projectId: string;
}

type FormKind =
  | 'postgres'
  | 'sqlite'
  | 'stripe'
  | 'salesforce'
  | 'kaggle'
  | 'huggingface'
  | 'openml'
  | null;

type AuthMode = 'oauth' | 'connection' | 'catalog';

export function ConnectorsView({ projectId }: ConnectorsViewProps) {
  const [available, setAvailable] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormKind>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sqlBusy, setSqlBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pgHost, setPgHost] = useState('localhost');
  const [pgPort, setPgPort] = useState('5432');
  const [pgDb, setPgDb] = useState('');
  const [pgUser, setPgUser] = useState('');
  const [pgPassword, setPgPassword] = useState('');
  const [sqlitePath, setSqlitePath] = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [sfInstance, setSfInstance] = useState('');
  const [sfToken, setSfToken] = useState('');
  const [sfUsername, setSfUsername] = useState('');
  const [sfPassword, setSfPassword] = useState('');
  const [sfSecToken, setSfSecToken] = useState('');
  const [sfClientId, setSfClientId] = useState('');
  const [sfClientSecret, setSfClientSecret] = useState('');
  const [sfAdvanced, setSfAdvanced] = useState(false);
  const [catalogRef, setCatalogRef] = useState('');
  const [kaggleUser, setKaggleUser] = useState('');
  const [kaggleKey, setKaggleKey] = useState('');
  const [hfConfig, setHfConfig] = useState('');
  const [hfSplit, setHfSplit] = useState('');
  const [displayName, setDisplayName] = useState('');

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [avail, conns] = await Promise.all([
        fetchAvailableConnectors(),
        fetchProjectConnectors(projectId),
      ]);
      setAvailable(avail);
      setConnectors(conns);
    } catch (err) {
      console.error('Failed to load connectors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleConnectOAuth = async (provider: string) => {
    try {
      const redirectUri = window.location.origin + '/dashboard';
      const res = await authorizeConnector(projectId, provider, redirectUri);
      if (res.auth_url) {
        window.open(res.auth_url, '_blank', 'width=600,height=700');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate OAuth');
    }
  };

  const connectionPayload = (): Record<string, unknown> | null => {
    if (form === 'sqlite') return { path: sqlitePath };
    if (form === 'postgres') {
      return {
        host: pgHost,
        port: Number(pgPort) || 5432,
        database: pgDb,
        user: pgUser,
        password: pgPassword,
      };
    }
    if (form === 'stripe') return { api_key: stripeKey };
    if (form === 'salesforce') {
      if (sfAdvanced) {
        return {
          username: sfUsername,
          password: sfPassword,
          security_token: sfSecToken,
          client_id: sfClientId,
          client_secret: sfClientSecret,
          login_host: sfInstance || 'https://login.salesforce.com',
        };
      }
      return { instance_url: sfInstance, access_token: sfToken };
    }
    if (form === 'kaggle') {
      return { dataset: catalogRef, username: kaggleUser, api_key: kaggleKey };
    }
    if (form === 'huggingface') {
      return { dataset: catalogRef, config: hfConfig || undefined, split: hfSplit || undefined };
    }
    if (form === 'openml') return { dataset: catalogRef };
    return null;
  };

  const handleConnectForm = async () => {
    if (!form) return;
    setSqlBusy(true);
    setFormError(null);
    try {
      const connection = connectionPayload();
      if (!connection) return;
      if (editingId) {
        const patch: Record<string, unknown> = { connection };
        if (displayName.trim()) patch.name = displayName.trim();
        await updateConnector(editingId, patch);
      } else {
        await connectProvider(projectId, form, connection, displayName.trim() || undefined);
      }
      setForm(null);
      setEditingId(null);
      setPgPassword('');
      setStripeKey('');
      setSfToken('');
      setSfPassword('');
      setSfClientSecret('');
      setKaggleKey('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to connect');
    } finally {
      setSqlBusy(false);
    }
  };

  const handleSync = async (connectorId: string) => {
    setSyncingId(connectorId);
    try {
      const result = await syncConnector(connectorId);
      if (result?.status === 'skipped' || result?.data_mode === 'preview') {
        alert(result.note || 'Live provider pull is not available yet. Credentials stay in the vault.');
      } else if (result?.note) {
        alert(result.note);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (connectorId: string, providerName: string) => {
    if (
      !confirm(
        `Are you sure you want to disconnect ${providerName}? All encrypted credentials will be purged from the vault.`
      )
    )
      return;
    try {
      await revokeConnector(connectorId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect');
    }
  };

  const PROVIDER_METAS: Record<
    string,
    { name: string; icon: React.ReactNode; desc: string; authMode: AuthMode }
  > = {
    stripe: {
      name: 'Stripe Connect',
      icon: <IconBrandStripe className="w-6 h-6 text-[var(--coral)]" />,
      desc: 'OAuth Connect or a restricted secret key. Tokens stay vault-encrypted for read-only customers, charges, and subscriptions.',
      authMode: 'oauth',
    },
    salesforce: {
      name: 'Salesforce CRM',
      icon: <IconCloud className="w-6 h-6 text-[var(--coral)]" />,
      desc: 'OAuth or access token. Live read-only sync of Accounts and Contacts via SOQL.',
      authMode: 'oauth',
    },
    github: {
      name: 'GitHub Repositories',
      icon: <IconBrandGithub className="w-6 h-6 text-neutral-800 dark:text-neutral-100" />,
      desc: 'OAuth connect. Sync your repos into AnalyzeIt objects (read-only live pull).',
      authMode: 'oauth',
    },
    postgres: {
      name: 'PostgreSQL',
      icon: <IconDatabase className="w-6 h-6 text-emerald-500" />,
      desc: 'Read-only SELECT via vaulted credentials. Use sql_query widget bindings for live data.',
      authMode: 'connection',
    },
    sqlite: {
      name: 'SQLite',
      icon: <IconDatabase className="w-6 h-6 text-amber-500" />,
      desc: 'Read-only SELECT against a local SQLite file. Path is vault-encrypted.',
      authMode: 'connection',
    },
    kaggle: {
      name: 'Kaggle Datasets',
      icon: <IconChartBar className="w-6 h-6 text-sky-500" />,
      desc: 'Import a public Kaggle dataset (owner/slug). Username + API key are vault-encrypted for download.',
      authMode: 'catalog',
    },
    huggingface: {
      name: 'Hugging Face Datasets',
      icon: <IconSparkles className="w-6 h-6 text-yellow-500" />,
      desc: 'Import a public Hugging Face dataset by id or URL. Rows sync through the datasets-server API.',
      authMode: 'catalog',
    },
    openml: {
      name: 'OpenML',
      icon: <IconTable className="w-6 h-6 text-indigo-500" />,
      desc: 'Import a public OpenML dataset by numeric id or openml.org URL.',
      authMode: 'catalog',
    },
  };

  const providerIds =
    available.length > 0
      ? available.map((a) => a.id as string)
      : ['stripe', 'salesforce', 'github', 'postgres', 'sqlite', 'kaggle', 'huggingface', 'openml'];

  const allProviders = providerIds.map((id) => ({
    id,
    ...(PROVIDER_METAS[id] || {
      name: id,
      icon: <IconDatabase className="w-6 h-6" />,
      desc: '',
      authMode: (available.find((a) => a.id === id)?.auth_mode as AuthMode) || 'oauth',
    }),
  }));

  const openForm = (kind: FormKind, connector?: Connector) => {
    setForm(kind);
    setFormError(null);
    setEditingId(connector?.id || null);
    setDisplayName(connector?.name || '');
  };

  const formTitle =
    form === 'postgres'
      ? 'PostgreSQL'
      : form === 'sqlite'
        ? 'SQLite'
        : form === 'stripe'
          ? 'Stripe'
          : form === 'salesforce'
            ? 'Salesforce'
            : form === 'kaggle'
              ? 'Kaggle'
              : form === 'huggingface'
                ? 'Hugging Face'
                : form === 'openml'
                  ? 'OpenML'
                  : '';

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <IconPlugConnected className="w-6 h-6 text-emerald-500" />
            Connectors
          </h2>
          <p className="text-xs text-[var(--text-muted)] dark:text-neutral-400 mt-1">
            OAuth, API keys, SQL, and online datasets (Kaggle, Hugging Face, OpenML). Credentials stay
            vault-encrypted on Backend A.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <IconShieldLock className="w-4 h-4" />
            <span>Vault Encrypted</span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh connectors"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {form && (
        <div className="app-card p-5 space-y-3 border-[var(--success)]/30">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            {editingId ? 'Update' : 'Connect'} {formTitle}
          </h3>
          <label className="block text-xs text-[var(--text-muted)]">
            Display name (optional)
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={formTitle}
            />
          </label>
          {form === 'sqlite' && (
            <label className="block text-xs text-[var(--text-muted)]">
              Absolute file path
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                value={sqlitePath}
                onChange={(e) => setSqlitePath(e.target.value)}
                placeholder="/path/to/data.sqlite"
              />
            </label>
          )}
          {form === 'postgres' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs text-[var(--text-muted)]">
                Host
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  value={pgHost}
                  onChange={(e) => setPgHost(e.target.value)}
                />
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                Port
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  value={pgPort}
                  onChange={(e) => setPgPort(e.target.value)}
                />
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                Database
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  value={pgDb}
                  onChange={(e) => setPgDb(e.target.value)}
                />
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                User
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  value={pgUser}
                  onChange={(e) => setPgUser(e.target.value)}
                />
              </label>
              <label className="block text-xs text-[var(--text-muted)] sm:col-span-2">
                Password
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  value={pgPassword}
                  onChange={(e) => setPgPassword(e.target.value)}
                />
              </label>
            </div>
          )}
          {form === 'stripe' && (
            <label className="block text-xs text-[var(--text-muted)]">
              Restricted or secret key (rk_… or sk_…)
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                placeholder="rk_live_… preferred (read-only)"
              />
            </label>
          )}
          {form === 'salesforce' && (
            <div className="space-y-3">
              <button
                type="button"
                className="text-[11px] text-[var(--coral)]"
                onClick={() => setSfAdvanced((v) => !v)}
              >
                {sfAdvanced ? 'Use access token instead' : 'Use username / password instead'}
              </button>
              {sfAdvanced ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs text-[var(--text-muted)]">
                    Username
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={sfUsername}
                      onChange={(e) => setSfUsername(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-[var(--text-muted)]">
                    Password
                    <input
                      type="password"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={sfPassword}
                      onChange={(e) => setSfPassword(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-[var(--text-muted)]">
                    Security token
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={sfSecToken}
                      onChange={(e) => setSfSecToken(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-[var(--text-muted)]">
                    Login host
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={sfInstance}
                      onChange={(e) => setSfInstance(e.target.value)}
                      placeholder="https://login.salesforce.com"
                    />
                  </label>
                  <label className="block text-xs text-[var(--text-muted)]">
                    Connected App client id
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={sfClientId}
                      onChange={(e) => setSfClientId(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-[var(--text-muted)]">
                    Connected App client secret
                    <input
                      type="password"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={sfClientSecret}
                      onChange={(e) => setSfClientSecret(e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <label className="block text-xs text-[var(--text-muted)]">
                    Instance URL
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={sfInstance}
                      onChange={(e) => setSfInstance(e.target.value)}
                      placeholder="https://yourorg.my.salesforce.com"
                    />
                  </label>
                  <label className="block text-xs text-[var(--text-muted)]">
                    Access token
                    <input
                      type="password"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={sfToken}
                      onChange={(e) => setSfToken(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
          {(form === 'kaggle' || form === 'huggingface' || form === 'openml') && (
            <div className="space-y-3">
              <label className="block text-xs text-[var(--text-muted)]">
                {form === 'kaggle'
                  ? 'Dataset URL or owner/slug'
                  : form === 'huggingface'
                    ? 'Dataset URL or id (owner/name)'
                    : 'OpenML URL or numeric id'}
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  value={catalogRef}
                  onChange={(e) => setCatalogRef(e.target.value)}
                  placeholder={
                    form === 'kaggle'
                      ? 'https://www.kaggle.com/datasets/owner/slug'
                      : form === 'huggingface'
                        ? 'https://huggingface.co/datasets/imdb'
                        : 'https://www.openml.org/d/61'
                  }
                />
              </label>
              {form === 'kaggle' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs text-[var(--text-muted)]">
                    Kaggle username
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={kaggleUser}
                      onChange={(e) => setKaggleUser(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-[var(--text-muted)]">
                    API key
                    <input
                      type="password"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={kaggleKey}
                      onChange={(e) => setKaggleKey(e.target.value)}
                    />
                  </label>
                </div>
              )}
              {form === 'huggingface' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs text-[var(--text-muted)]">
                    Config (optional)
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={hfConfig}
                      onChange={(e) => setHfConfig(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-[var(--text-muted)]">
                    Split (optional)
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      value={hfSplit}
                      onChange={(e) => setHfSplit(e.target.value)}
                      placeholder="train"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
          {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setEditingId(null);
                setFormError(null);
              }}
              className="px-3 py-2 text-xs rounded-xl text-[var(--text-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sqlBusy}
              onClick={handleConnectForm}
              className="px-4 py-2 text-xs rounded-xl bg-[var(--coral)] text-white font-semibold disabled:opacity-50"
            >
              {sqlBusy ? 'Working…' : editingId ? 'Save' : 'Save & import'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {allProviders.map((p) => {
          const activeConn = connectors.find((c) => c.provider === p.id && (c.status === 'connected' || c.status === 'healthy'));
          const isConnected = Boolean(activeConn);
          const isSyncing = syncingId === activeConn?.id;
          const availMeta = available.find((a) => a.id === p.id) as
            | {
                coming_soon?: boolean;
                coming_soon_reason?: string;
                oauth_configured?: boolean;
                supports_connection?: boolean;
                auth_mode?: string;
              }
            | undefined;
          const isComingSoon = !isConnected && Boolean(availMeta?.coming_soon);
          const comingSoonHint = availMeta?.coming_soon_reason || 'Coming soon';
          const hasError = connectors.some((c) => c.provider === p.id && c.status === 'error');
          const oauthReady = Boolean(availMeta?.oauth_configured) || p.id === 'github';
          const canConnectForm =
            p.authMode === 'connection' ||
            p.authMode === 'catalog' ||
            Boolean(availMeta?.supports_connection) ||
            p.id === 'stripe' ||
            p.id === 'salesforce';

          return (
            <div
              key={p.id}
              className={`flex flex-col justify-between p-6 rounded-2xl border transition-all ${
                isConnected
                  ? 'bg-[var(--surface)] border-[var(--success)]/35 shadow-sm'
                  : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-[var(--surface-2)]">{p.icon}</div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-base">{p.name}</h3>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {p.authMode === 'catalog'
                          ? 'Online dataset'
                          : p.authMode === 'connection'
                            ? 'Read-only SQL'
                            : 'OAuth 2.0'}
                      </span>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)] text-xs font-medium border border-[var(--success)]/25">
                      <IconCheck className="w-3.5 h-3.5" /> Connected
                    </span>
                  ) : hasError ? (
                    <span className="px-2.5 py-1 rounded-full bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-medium border border-[var(--danger)]/25">
                      Error
                    </span>
                  ) : isComingSoon ? (
                    <span className="px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs font-medium border border-[var(--border)]">
                      Coming soon
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs font-medium border border-[var(--border)]">
                      Ready to connect
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{p.desc}</p>

                {isConnected && activeConn && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] mb-4 text-xs">
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <IconClock className="w-3.5 h-3.5" /> Last activity:
                      </span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {activeConn.last_sync_at
                          ? new Date(activeConn.last_sync_at).toLocaleTimeString()
                          : 'Connected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <IconDatabase className="w-3.5 h-3.5" /> Data mode:
                      </span>
                      <span className="font-mono text-amber-700 dark:text-amber-300">
                        {activeConn.data_mode === 'live_readonly'
                          ? 'Live read-only'
                          : activeConn.data_mode === 'seed_demo'
                            ? 'Sample fixtures'
                            : 'Preview'}
                      </span>
                    </div>
                    {p.authMode === 'connection' && (
                      <p className="text-[10px] text-neutral-400 font-mono mt-1">
                        id={activeConn.id} — bind widgets with query_type=sql_query
                      </p>
                    )}
                    {p.authMode === 'catalog' && activeConn.connection_meta?.dataset && (
                      <p className="text-[10px] text-neutral-400 font-mono mt-1">
                        dataset={String(activeConn.connection_meta.dataset)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
                {isConnected && activeConn ? (
                  <>
                    <button
                      onClick={() => handleSync(activeConn.id)}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      <IconRefresh className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>
                        {isSyncing
                          ? 'Working…'
                          : p.authMode === 'connection'
                            ? 'Test connection'
                            : 'Sync'}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      {canConnectForm && (
                        <button
                          onClick={() => openForm(p.id as FormKind, activeConn)}
                          className="px-3 py-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnect(activeConn.id, p.name)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--danger)] text-xs transition-colors"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </>
                ) : isComingSoon ? (
                  <span className="ml-auto text-xs text-[var(--text-muted)]">{comingSoonHint}</span>
                ) : (
                  <div className="flex flex-wrap gap-2 ml-auto">
                    {oauthReady && p.authMode !== 'catalog' && p.authMode !== 'connection' && (
                      <button
                        onClick={() => handleConnectOAuth(p.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white text-xs font-semibold transition-colors shadow-sm"
                      >
                        <span>Connect {p.name}</span>
                        <IconArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                    {canConnectForm && (
                      <button
                        onClick={() => openForm(p.id as FormKind)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm ${
                          oauthReady && p.authMode !== 'catalog' && p.authMode !== 'connection'
                            ? 'border border-[var(--border)] text-[var(--text-primary)] bg-[var(--surface)]'
                            : 'bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white'
                        }`}
                      >
                        <span>
                          {p.id === 'stripe'
                            ? 'Use API key'
                            : p.id === 'salesforce'
                              ? 'Use token'
                              : `Connect ${p.name}`}
                        </span>
                        <IconArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

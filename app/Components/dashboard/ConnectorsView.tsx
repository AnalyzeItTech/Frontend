'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/Toast';
import { AgentAccessPanel } from './AgentAccessPanel';
import { DigestPanel } from './DigestPanel';
import { TeamPanel } from './TeamPanel';
import { SyncedDataLinks } from './SyncedDataLinks';
import { useConfirm } from '../ui/ConfirmDialog';
import {
  IconPlugConnected,
  IconBrandStripe,
  IconCurrencyRupee,
  IconBrandGithub,
  IconBrandGoogleDrive,
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
  authorizeGoogleDrive,
  syncConnector,
  revokeConnector,
  connectProvider,
  updateConnector,
  type AvailableConnector,
  type Connector,
} from '../../lib/customObjectsApi';
import {
  availableConnectorIds,
  connectionForProvider,
  connectorSetupState,
  dataModeLabel,
  providerLabel,
  readSyncResult,
  syncFailureView,
  type ConnectorCallback,
  type SyncResultView,
} from '../../lib/connectorState.mjs';

interface ConnectorsViewProps {
  projectId: string;
  notice?: ConnectorCallback | null;
}

type FormKind =
  | 'postgres'
  | 'sqlite'
  | 'stripe'
  | 'razorpay'
  | 'salesforce'
  | 'kaggle'
  | 'huggingface'
  | 'openml'
  | null;

type AuthMode = 'oauth' | 'connection' | 'catalog';

export function ConnectorsView({ projectId, notice = null }: ConnectorsViewProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [available, setAvailable] = useState<AvailableConnector[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncReports, setSyncReports] = useState<Record<string, SyncResultView>>({});
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);
  const [authorizeErrors, setAuthorizeErrors] = useState<Record<string, string>>({});
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
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpSecret, setRzpSecret] = useState('');
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
    setLoadError(null);
    try {
      const [avail, conns] = await Promise.all([
        fetchAvailableConnectors(),
        fetchProjectConnectors(projectId),
      ]);
      setAvailable(avail);
      setConnectors(conns);
    } catch (err) {
      setAvailable([]);
      setConnectors([]);
      setLoadError(err instanceof Error ? err.message : 'Couldn’t load connectors.');
    } finally {
      setLoading(false);
    }
  };

  const callbackProvider = notice?.kind === 'success' ? notice.provider || 'connected' : '';

  useEffect(() => {
    loadData();
  }, [projectId]);

  // OAuth returns to /connectors?connected=google_drive. Refetch the project
  // connector rows so the new Drive connection is the one just saved.
  useEffect(() => {
    if (!projectId || !callbackProvider) return;
    let cancelled = false;
    fetchProjectConnectors(projectId, { strict: true })
      .then((rows) => {
        if (!cancelled) setConnectors(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Couldn’t refresh connectors.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, callbackProvider]);

  const handleConnectOAuth = async (provider: string) => {
    setAuthorizeErrors((prev) => ({ ...prev, [provider]: '' }));
    setAuthorizingId(provider);
    try {
      if (provider === 'google_drive') {
        // Drive authorize takes { project_id } only. The backend owns the redirect
        // and sends the browser back to /connectors?connected=google_drive.
        const url = await authorizeGoogleDrive(projectId);
        window.location.assign(url);
        return;
      }
      const redirectUri = window.location.origin + '/dashboard';
      const res = await authorizeConnector(projectId, provider, redirectUri);
      if (res.auth_url && /^https:\/\//i.test(res.auth_url)) {
        window.open(res.auth_url, '_blank', 'width=600,height=700');
        setAuthorizingId(null);
        return;
      }
      throw new Error('The server did not return a sign-in link.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Couldn’t start authorization.';
      setAuthorizeErrors((prev) => ({ ...prev, [provider]: message }));
      setAuthorizingId(null);
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
    if (form === 'razorpay') return { key_id: rzpKeyId.trim(), key_secret: rzpSecret.trim() };
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
      setRzpSecret('');
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
    setSyncReports((prev) => {
      const next = { ...prev };
      delete next[connectorId];
      return next;
    });
    try {
      const parsed = readSyncResult(await syncConnector(connectorId));
      setSyncReports((prev) => ({ ...prev, [connectorId]: parsed }));
      if (parsed.toast) {
        if (parsed.phase === 'failed' || parsed.ingestStatus === 'failed') toast.error(parsed.toast);
        else toast.toast(parsed.toast);
      }
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      const failure = syncFailureView(message);
      setSyncReports((prev) => ({ ...prev, [connectorId]: failure }));
      if (failure.phase === 'failed') toast.error(failure.toast || message);
      else toast.toast(failure.toast || message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (connectorId: string, providerName: string) => {
    const ok = await confirm({
      title: `Disconnect ${providerName}?`,
      message: 'All encrypted credentials will be purged from the vault.',
      confirmLabel: 'Disconnect',
      danger: true,
    });
    if (!ok) return;
    try {
      await revokeConnector(connectorId);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect');
    }
  };

  const PROVIDER_METAS: Record<
    string,
    { name: string; icon: React.ReactNode; desc: string; authMode: AuthMode }
  > = {
    razorpay: {
      name: 'Razorpay',
      icon: <IconCurrencyRupee className="w-6 h-6 text-[var(--coral)]" />,
      desc: 'Read-only payments and refunds, kept current, so you can ask where payments fail and when it started. Customer email, phone, card and UPI details are never stored.',
      authMode: 'connection',
    },
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
    google_drive: {
      name: 'Google Drive',
      icon: <IconBrandGoogleDrive className="w-6 h-6 text-[var(--text-primary)]" />,
      desc: 'Read-only sync of Drive files. Docs, Sheets, and Slides export to text or CSV.',
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

  const providerIds = availableConnectorIds(available);

  // Razorpay first: it is the connection most of our users can actually use.
  const orderedIds = [...providerIds].sort((a, b) => Number(b === 'razorpay') - Number(a === 'razorpay'));
  const allProviders = orderedIds.map((id) => {
    const row = available.find((item) => item.id === id);
    const meta = PROVIDER_METAS[id];
    return {
      id,
      name: row?.name || meta?.name || providerLabel(id),
      icon: meta?.icon || <IconDatabase className="w-6 h-6" />,
      desc: row?.description || meta?.desc || '',
      authMode: (meta?.authMode || row?.auth_mode || 'oauth') as AuthMode,
      setup: connectorSetupState(row),
    };
  });

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
        : form === 'razorpay'
          ? 'Razorpay'
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
      <AgentAccessPanel projectId={projectId} />
      <DigestPanel projectId={projectId} />
      <TeamPanel projectId={projectId} />
      <SyncedDataLinks projectId={projectId} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <IconPlugConnected className="w-6 h-6 text-emerald-500" />
            Your sources
          </h2>
          <p className="text-xs text-[var(--text-muted)] dark:text-neutral-400 mt-1">
            Only sources this server reports as configured are listed. Credentials stay vault-encrypted.
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
          {form === 'razorpay' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                In Razorpay, open Account &amp; Settings, then API Keys, and generate a key. Paste the key id and secret here. AnalyzeIt only reads payments and refunds, never
                moves money, and never stores customer email, phone, card or UPI details. Start with a test-mode key if you want to look first.
              </p>
              <label className="block text-xs text-[var(--text-muted)]">
                Key id (starts with rzp_live_ or rzp_test_)
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  value={rzpKeyId}
                  onChange={(e) => setRzpKeyId(e.target.value)}
                  placeholder="rzp_live_…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                Key secret
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  value={rzpSecret}
                  onChange={(e) => setRzpSecret(e.target.value)}
                  autoComplete="off"
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

      {notice && notice.kind !== 'none' ? (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === 'error'
              ? 'border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]'
              : 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
          }`}
        >
          {notice.kind === 'success'
            ? `${notice.message} The list below is refreshed from the server.`
            : notice.message}
        </div>
      ) : null}

      {loadError ? (
        <div role="alert" className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
          <p>{loadError}</p>
          <button type="button" onClick={loadData} className="mt-3 min-h-11 rounded-xl bg-[var(--coral)] px-4 text-xs font-semibold text-white">
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !loadError && allProviders.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No connectors are configured on this server.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {allProviders.map((p) => {
          const activeConn = connectionForProvider(connectors, p.id);
          const isHealthy = Boolean(activeConn && (activeConn.status === 'connected' || activeConn.status === 'healthy'));
          const hasError = activeConn?.status === 'error';
          const isLinked = Boolean(activeConn);
          const isSyncing = Boolean(activeConn && syncingId === activeConn.id);
          const setup = p.setup;
          const isUnavailable = !isLinked && setup.kind === 'unavailable';
          const isComingSoon = !isLinked && setup.kind === 'coming_soon';
          const oauthReady = setup.kind === 'ready' && setup.oauth;
          const canConnectForm = setup.kind === 'ready' && setup.connection && (
            p.id === 'postgres' || p.id === 'sqlite' || p.id === 'stripe' || p.id === 'salesforce'
            || p.id === 'kaggle' || p.id === 'huggingface' || p.id === 'openml'
          );
          const syncReport = activeConn ? syncReports[activeConn.id] : undefined;
          const authorizeError = authorizeErrors[p.id];

          return (
            <div
              key={p.id}
              className={`flex flex-col justify-between p-5 sm:p-6 rounded-2xl border transition-all ${
                isHealthy
                  ? 'bg-[var(--surface)] border-[var(--success)]/35 shadow-sm'
                  : 'bg-[var(--surface)] border-[var(--border)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 rounded-xl bg-[var(--surface-2)] shrink-0">{p.icon}</div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--text-primary)] text-base">{p.name}</h3>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {p.id === 'google_drive'
                          ? 'OAuth 2.0 · read-only'
                          : p.authMode === 'catalog'
                            ? 'Online dataset'
                            : (p.id === 'stripe' || p.id === 'salesforce') && setup.connection && !setup.oauth
                              ? 'API key'
                              : p.authMode === 'connection'
                                ? 'Read-only SQL'
                                : 'OAuth 2.0'}
                      </span>
                    </div>
                  </div>

                  {isHealthy ? (
                    <span className="flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)] text-xs font-medium border border-[var(--success)]/25">
                      <IconCheck className="w-3.5 h-3.5" /> Connected
                    </span>
                  ) : hasError ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-medium border border-[var(--danger)]/25">
                      Needs attention
                    </span>
                  ) : isUnavailable ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs font-medium border border-[var(--border)]">
                      Unavailable
                    </span>
                  ) : isComingSoon ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs font-medium border border-[var(--border)]">
                      Coming soon
                    </span>
                  ) : (
                    <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs font-medium border border-[var(--border)]">
                      Ready to connect
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{p.desc}</p>

                {isLinked && activeConn && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] mb-4 text-xs">
                    <div className="flex items-center justify-between gap-3 text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <IconClock className="w-3.5 h-3.5" /> Last sync
                      </span>
                      <span className="font-mono text-[var(--text-primary)] text-right">
                        {activeConn.last_sync_at
                          ? new Date(activeConn.last_sync_at).toLocaleString()
                          : 'No sync time reported'}
                      </span>
                    </div>
                    {dataModeLabel(activeConn.data_mode) ? (
                      <div className="flex items-center justify-between gap-3 text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <IconDatabase className="w-3.5 h-3.5" /> Data mode
                        </span>
                        <span className="font-mono text-[var(--text-primary)]">
                          {dataModeLabel(activeConn.data_mode)}
                        </span>
                      </div>
                    ) : null}
                    {activeConn.error_message ? (
                      <p className="text-[var(--danger)]">{activeConn.error_message}</p>
                    ) : null}
                    {p.authMode === 'connection' && p.id !== 'stripe' && p.id !== 'salesforce' && (
                      <p className="text-[10px] text-neutral-400 font-mono mt-1 break-all">
                        id={activeConn.id} — bind widgets with query_type=sql_query
                      </p>
                    )}
                    {p.authMode === 'catalog' && activeConn.connection_meta?.dataset && (
                      <p className="text-[10px] text-neutral-400 font-mono mt-1 break-all">
                        dataset={String(activeConn.connection_meta.dataset)}
                      </p>
                    )}
                    {(isSyncing || syncReport) && (
                      <div role="status" className="mt-1 border-t border-[var(--border)] pt-2 text-[var(--text-secondary)]">
                        <p>{isSyncing ? 'Sync in progress' : (syncReport?.headline || 'Sync returned.')}</p>
                        {!isSyncing && syncReport?.note && syncReport.note !== syncReport.headline ? (
                          <p className="mt-1">{syncReport.note}</p>
                        ) : null}
                        {!isSyncing && syncReport?.dataMode ? (
                          <p className="mt-1">Data mode: {dataModeLabel(syncReport.dataMode)}</p>
                        ) : null}
                        {!isSyncing && syncReport?.truncated ? (
                          <p className="mt-1">This listing was truncated, so it does not include every file.</p>
                        ) : null}
                        {syncReport && syncReport.counts.length > 0 ? (
                          <ul className="mt-1 space-y-0.5">
                            {syncReport.counts.map((count) => (
                              <li key={count.key} className="flex justify-between gap-3 font-mono text-[var(--text-primary)]">
                                <span>{count.label}</span>
                                <span>{count.value}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {!isSyncing && syncReport && (syncReport.phase === 'failed' || syncReport.ingestStatus === 'failed') && syncReport.errors.length > 0 ? (
                          <ul className="mt-1 space-y-0.5 text-[var(--danger)]">
                            {syncReport.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
                {isLinked && activeConn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSync(activeConn.id)}
                      disabled={isSyncing}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--coral)] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[var(--coral-dark)] disabled:opacity-50 sm:w-auto"
                    >
                      <IconRefresh className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>
                        {isSyncing
                          ? 'Sync in progress'
                          : p.authMode === 'connection' && p.id !== 'stripe' && p.id !== 'salesforce'
                            ? 'Test connection'
                            : 'Sync'}
                      </span>
                    </button>
                    <div className="flex items-center justify-end gap-1">
                      {canConnectForm && (
                        <button
                          type="button"
                          onClick={() => openForm(p.id as FormKind, activeConn)}
                          className="min-h-11 px-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDisconnect(activeConn.id, p.name)}
                        className="inline-flex min-h-11 items-center gap-1.5 px-3 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </>
                ) : isUnavailable || isComingSoon ? (
                  <p className="text-xs leading-relaxed text-[var(--text-muted)]">{setup.reason}</p>
                ) : (
                  <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                    {oauthReady && (
                      <button
                        type="button"
                        onClick={() => handleConnectOAuth(p.id)}
                        disabled={authorizingId === p.id}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--coral)] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--coral-dark)] disabled:opacity-50 sm:w-auto"
                      >
                        <span>
                          {authorizingId === p.id
                            ? (p.id === 'google_drive' ? 'Opening Google…' : 'Opening…')
                            : `Connect ${p.name}`}
                        </span>
                        <IconArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                    {canConnectForm && (
                      <button
                        type="button"
                        onClick={() => openForm(p.id as FormKind)}
                        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold shadow-sm transition-colors sm:w-auto ${
                          oauthReady
                            ? 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]'
                            : 'bg-[var(--coral)] text-white hover:bg-[var(--coral-dark)]'
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
                    {authorizeError ? (
                      <p role="alert" className="w-full text-xs text-[var(--danger)] sm:text-right">{authorizeError}</p>
                    ) : null}
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

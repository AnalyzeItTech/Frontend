'use client';

import React, { useState, useEffect } from 'react';
import {
  IconPlugConnected,
  IconBrandStripe,
  IconCloud,
  IconRefresh,
  IconCheck,
  IconTrash,
  IconArrowUpRight,
  IconShieldLock,
  IconClock,
  IconDatabase,
} from '@tabler/icons-react';
import {
  fetchAvailableConnectors,
  fetchProjectConnectors,
  authorizeConnector,
  syncConnector,
  revokeConnector,
  connectSqlConnector,
  type Connector,
} from '../../lib/customObjectsApi';

interface ConnectorsViewProps {
  projectId: string;
}

export function ConnectorsView({ projectId }: ConnectorsViewProps) {
  const [available, setAvailable] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [sqlForm, setSqlForm] = useState<'postgres' | 'sqlite' | null>(null);
  const [sqlBusy, setSqlBusy] = useState(false);
  const [pgHost, setPgHost] = useState('localhost');
  const [pgPort, setPgPort] = useState('5432');
  const [pgDb, setPgDb] = useState('');
  const [pgUser, setPgUser] = useState('');
  const [pgPassword, setPgPassword] = useState('');
  const [sqlitePath, setSqlitePath] = useState('');

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

  const handleConnectSql = async () => {
    if (!sqlForm) return;
    setSqlBusy(true);
    try {
      if (sqlForm === 'sqlite') {
        await connectSqlConnector(projectId, 'sqlite', { path: sqlitePath });
      } else {
        await connectSqlConnector(projectId, 'postgres', {
          host: pgHost,
          port: Number(pgPort) || 5432,
          database: pgDb,
          user: pgUser,
          password: pgPassword,
        });
      }
      setSqlForm(null);
      setPgPassword('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to connect database');
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
    { name: string; icon: React.ReactNode; desc: string; authMode: 'oauth' | 'connection' }
  > = {
    stripe: {
      name: 'Stripe Connect',
      icon: <IconBrandStripe className="w-6 h-6 text-indigo-400" />,
      desc: 'OAuth preview. Tokens vault-encrypted. Live Stripe pulls are not implemented yet.',
      authMode: 'oauth',
    },
    salesforce: {
      name: 'Salesforce CRM',
      icon: <IconCloud className="w-6 h-6 text-blue-400" />,
      desc: 'OAuth preview. Tokens vault-encrypted. Live Salesforce pulls are not implemented yet.',
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
  };

  const providerIds =
    available.length > 0
      ? available.map((a) => a.id as string)
      : ['stripe', 'salesforce', 'postgres', 'sqlite'];

  const allProviders = providerIds.map((id) => ({
    id,
    ...(PROVIDER_METAS[id] || {
      name: id,
      icon: <IconDatabase className="w-6 h-6" />,
      desc: '',
      authMode: (available.find((a) => a.id === id)?.auth_mode as 'oauth' | 'connection') || 'oauth',
    }),
  }));

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <IconPlugConnected className="w-6 h-6 text-emerald-500" />
            Connectors
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            OAuth previews + read-only SQL (Postgres/SQLite). Credentials stay vault-encrypted on Backend A.
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
            className="p-2 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Refresh connectors"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {sqlForm && (
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-white dark:bg-neutral-900/80 space-y-3">
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
            Connect {sqlForm === 'postgres' ? 'PostgreSQL' : 'SQLite'} (read-only)
          </h3>
          {sqlForm === 'sqlite' ? (
            <label className="block text-xs text-neutral-500">
              Absolute file path
              <input
                className="mt-1 w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                value={sqlitePath}
                onChange={(e) => setSqlitePath(e.target.value)}
                placeholder="/path/to/data.sqlite"
              />
            </label>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs text-neutral-500">
                Host
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                  value={pgHost}
                  onChange={(e) => setPgHost(e.target.value)}
                />
              </label>
              <label className="block text-xs text-neutral-500">
                Port
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                  value={pgPort}
                  onChange={(e) => setPgPort(e.target.value)}
                />
              </label>
              <label className="block text-xs text-neutral-500">
                Database
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                  value={pgDb}
                  onChange={(e) => setPgDb(e.target.value)}
                />
              </label>
              <label className="block text-xs text-neutral-500">
                User
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                  value={pgUser}
                  onChange={(e) => setPgUser(e.target.value)}
                />
              </label>
              <label className="block text-xs text-neutral-500 sm:col-span-2">
                Password
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                  value={pgPassword}
                  onChange={(e) => setPgPassword(e.target.value)}
                />
              </label>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setSqlForm(null)}
              className="px-3 py-2 text-xs rounded-xl text-neutral-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sqlBusy}
              onClick={handleConnectSql}
              className="px-4 py-2 text-xs rounded-xl bg-[var(--coral)] text-white font-semibold disabled:opacity-50"
            >
              {sqlBusy ? 'Testing…' : 'Save & test'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {allProviders.map((p) => {
          const activeConn = connectors.find((c) => c.provider === p.id && c.status === 'connected');
          const isConnected = Boolean(activeConn);
          const isSyncing = syncingId === activeConn?.id;
          const isSql = p.authMode === 'connection';

          return (
            <div
              key={p.id}
              className={`flex flex-col justify-between p-6 rounded-2xl border transition-all ${
                isConnected
                  ? 'bg-white dark:bg-neutral-900/80 border-emerald-500/30 dark:border-emerald-500/30 shadow-sm'
                  : 'bg-white dark:bg-neutral-900/50 border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">{p.icon}</div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white text-base">{p.name}</h3>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {isSql ? 'Read-only SQL' : 'OAuth 2.0'}
                      </span>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                      <IconCheck className="w-3.5 h-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-xs font-medium">
                      Not Connected
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">{p.desc}</p>

                {isConnected && activeConn && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-white/5 mb-4 text-xs">
                    <div className="flex items-center justify-between text-neutral-500">
                      <span className="flex items-center gap-1">
                        <IconClock className="w-3.5 h-3.5" /> Last activity:
                      </span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">
                        {activeConn.last_sync_at
                          ? new Date(activeConn.last_sync_at).toLocaleTimeString()
                          : 'Connected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-500">
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
                    {isSql && (
                      <p className="text-[10px] text-neutral-400 font-mono mt-1">
                        id={activeConn.id} — bind widgets with query_type=sql_query
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-100 dark:border-white/5">
                {isConnected && activeConn ? (
                  <>
                    <button
                      onClick={() => handleSync(activeConn.id)}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      <IconRefresh className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Checking…' : isSql ? 'Test connection' : 'Sync'}</span>
                    </button>
                    <button
                      onClick={() => handleDisconnect(activeConn.id, p.name)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-neutral-400 hover:text-red-500 text-xs transition-colors"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() =>
                      isSql ? setSqlForm(p.id as 'postgres' | 'sqlite') : handleConnectOAuth(p.id)
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white text-xs font-semibold transition-colors shadow-sm ml-auto"
                  >
                    <span>Connect {p.name}</span>
                    <IconArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

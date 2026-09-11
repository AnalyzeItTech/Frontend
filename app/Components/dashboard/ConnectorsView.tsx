'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  IconPlugConnected,
  IconBrandStripe,
  IconCloud,
  IconRefresh,
  IconCheck,
  IconAlertTriangle,
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

  const handleConnect = async (provider: string) => {
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

  const handleSync = async (connectorId: string) => {
    setSyncingId(connectorId);
    try {
      const result = await syncConnector(connectorId);
      if (result?.status === 'skipped' || result?.data_mode === 'preview') {
        alert(result.note || 'Live provider pull is not available yet. Credentials stay in the vault.');
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

  // Provider configuration helpers
  const PROVIDER_METAS: Record<
    string,
    { name: string; icon: React.ReactNode; color: string; desc: string }
  > = {
    stripe: {
      name: 'Stripe Connect',
      icon: <IconBrandStripe className="w-6 h-6 text-indigo-400" />,
      color: 'indigo',
      desc: 'Connect with OAuth. Tokens are vault-encrypted. Live Stripe customer/charge pulls are not implemented yet.',
    },
    salesforce: {
      name: 'Salesforce CRM',
      icon: <IconCloud className="w-6 h-6 text-blue-400" />,
      color: 'blue',
      desc: 'Connect with OAuth. Tokens are vault-encrypted. Live Salesforce object pulls are not implemented yet.',
    },
  };

  const allProviders = [
    { id: 'stripe', ...(PROVIDER_METAS.stripe || {}) },
    { id: 'salesforce', ...(PROVIDER_METAS.salesforce || {}) },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <IconPlugConnected className="w-6 h-6 text-emerald-500" />
            Preview Connectors
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            OAuth is real and tokens stay in the vault. Provider APIs are not queried yet — sample sync exists only in local/dev.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <IconShieldLock className="w-4 h-4" />
            <span>Vault Encrypted</span>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Refresh connectors"
          >
            <IconRefresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {allProviders.map((p) => {
          const activeConn = connectors.find((c) => c.provider === p.id && c.status === 'connected');
          const isConnected = Boolean(activeConn);
          const isSyncing = syncingId === activeConn?.id;

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
                      <span className="text-[11px] font-mono text-neutral-400">OAuth 2.0 PKCE</span>
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
                        {activeConn.last_sync_at ? new Date(activeConn.last_sync_at).toLocaleTimeString() : 'Connected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-500">
                      <span className="flex items-center gap-1">
                        <IconDatabase className="w-3.5 h-3.5" /> Data mode:
                      </span>
                      <span className="font-mono text-amber-700 dark:text-amber-300">
                        {activeConn.data_mode === 'seed_demo' ? 'Sample fixtures' : 'Preview (no live pull)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-100 dark:border-white/5">
                {isConnected && activeConn ? (
                  <>
                    {activeConn.seed_demo_sync_allowed ? (
                      <button
                        onClick={() => handleSync(activeConn.id)}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
                      >
                        <IconRefresh className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Loading sample…' : 'Load sample data'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Live pull not available yet
                      </span>
                    )}
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
                    onClick={() => handleConnect(p.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold transition-colors shadow-sm ml-auto"
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

export type ConnectorSetup = {
  kind: 'ready' | 'unavailable' | 'coming_soon';
  oauth: boolean;
  connection: boolean;
  reason: string;
};

export type ConnectorCallback = {
  kind: 'success' | 'error' | 'none';
  provider: string | null;
  message: string;
};

export type SyncCount = {
  key: string;
  label: string;
  value: number;
};

export type SyncResultView = {
  phase: 'in_progress' | 'failed' | 'succeeded' | 'skipped' | 'unknown';
  counts: SyncCount[];
  message: string | null;
};

export function connectorSetupState(entry: {
  id?: string;
  name?: string;
  status?: string;
  auth_mode?: string;
  oauth_configured?: boolean;
  supports_oauth?: boolean;
  supports_connection?: boolean;
  coming_soon?: boolean;
  coming_soon_reason?: string | null;
  unavailable_reason?: string | null;
  reason?: string | null;
} | null | undefined): ConnectorSetup;

export function availableConnectorIds(rows: Array<{ id?: string }> | null | undefined): string[];

export function providerLabel(id?: string | null): string;

export function googleDriveAuthorizeBody(projectId?: string | null): { project_id: string };

export function oauthRedirectUrl(body: unknown): string | null;

export function readConnectorCallback(
  source:
    | { get(name: string): string | null }
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): ConnectorCallback;

export function readSyncResult(body: unknown): SyncResultView;

export function syncFailurePhase(message?: string | null): 'in_progress' | 'failed';

export function connectionForProvider<T extends { id?: string; provider?: string; status?: string }>(
  connectors: T[] | null | undefined,
  providerId: string,
): T | null;

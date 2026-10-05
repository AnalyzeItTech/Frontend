'use client';

import { getProjects } from '../../lib/chatApi';
import {
  decideOnboarding,
  loadProgress,
  readIsNewAccount,
  saveProgress,
  workspaceLooksUnused,
  type OnboardingDecision,
} from '../../lib/onboarding.mjs';

/** Read local progress, and only call projects when a recent account has no record yet. */
export async function resolveFirstRun(user: { id: string; created_at?: string }): Promise<OnboardingDecision> {
  const stored = loadProgress(localStorage, user.id);
  const isNewAccount = readIsNewAccount(sessionStorage);
  const now = Date.now();
  let decision = decideOnboarding({
    userId: user.id,
    stored,
    isNewAccount,
    createdAt: user.created_at,
    projectCount: null,
    now,
  });
  if (decision.action === 'check-workspace') {
    const projects = await getProjects();
    decision = decideOnboarding({
      userId: user.id,
      stored,
      isNewAccount,
      createdAt: user.created_at,
      projectCount: projects.length,
      workspaceUnused: workspaceLooksUnused(projects),
      now,
    });
  }
  if (decision.persist && decision.progress) saveProgress(localStorage, decision.progress);
  return decision;
}

'use client';

import React from 'react';
import type { DrawerDetail } from './InspectDrawer';

export const LandingProgressContext = React.createContext<{
  setInspectedDetail: (detail: DrawerDetail | null) => void;
}>({
  setInspectedDetail: () => {},
});

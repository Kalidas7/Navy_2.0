/**
 * Subsystem key → panel component.
 *
 * Shared by the desktop `RailPanel` (a 360px side dock) and the mobile bottom
 * sheet, so both surfaces render the EXACT same panels from one mapping. Each
 * panel is self-sufficient: it reads its own live data from context and takes
 * no props.
 */
import type { ComponentType } from 'react';
import type { CompKey } from '@/types';
import { DrivesPanel } from './DrivesPanel';
import { FanPanel } from './FanPanel';
import { NetPanel } from './NetPanel';
import { PowerPanel } from './PowerPanel';
import { ScreenPanel } from './ScreenPanel';
import { StatusPanel } from './StatusPanel';

export const PANELS: Record<CompKey, ComponentType> = {
  screen: ScreenPanel,
  drives: DrivesPanel,
  fan: FanPanel,
  net: NetPanel,
  power: PowerPanel,
  status: StatusPanel,
};

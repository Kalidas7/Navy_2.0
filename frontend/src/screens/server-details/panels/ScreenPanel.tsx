/** Display Panel (screen) — sub-tabbed: SYSTEM / NETWORK / RADAR / POWER / LOGS. */
import { useApp } from '@/app/AppContext';
import { useGraphValues } from '@/hooks/useGraphValues';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { useComponents } from '@/hooks/useComponents';
import { isLiveHost } from '@/data/fleet';
import { ToggleChip } from '@/components/common/ToggleChip';
import { SCREEN_TABS } from '@/config/components';
import { SystemView } from './screen/SystemView';
import { NetworkView } from './screen/NetworkView';
import { RadarView } from './screen/RadarView';
import { PowerView } from './screen/PowerView';
import { LogsView } from './screen/LogsView';
import type { ScreenView } from '@/types';

export function ScreenPanel() {
  const { state, setScreenView } = useApp();
  // Only the localhost rack has a real feed. Others are "offline" — their
  // panels render "—" instead of numbers. Both hooks run unconditionally
  // (rules of hooks); we just pick the source and the offline flag.
  const isLocal = isLiveHost(state.activeServerId);
  const offlineValues = useGraphValues();
  const live = useSystemMetrics();
  const g = isLocal ? live.g : offlineValues;
  const comp = useComponents();
  const offline = !isLocal;
  const view = state.screenView;

  return (
    <>
      <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
        {SCREEN_TABS.map((t) => (
          <ToggleChip
            key={t.key}
            label={t.label}
            active={view === t.key}
            onClick={() => setScreenView(t.key as ScreenView)}
            padding="6px 11px"
            fontSize={12.5}
          />
        ))}
      </div>

      {view === 'system' && <SystemView g={g} offline={offline} cpuHist={live.cpuHist} />}
      {view === 'network' && <NetworkView g={g} offline={offline} />}
      {view === 'radar' && <RadarView contacts={comp.contacts} />}
      {view === 'power' && <PowerView g={g} rails={comp.psuRails} offline={offline} />}
      {view === 'logs' && <LogsView logs={state.logs} />}
    </>
  );
}

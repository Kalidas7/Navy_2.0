/** Display-panel LOGS tab: mission/system log; new entries prepend live. */
import { colors } from '@/config/tokens';
import type { LogEntry } from '@/types';

export function LogsView({ logs }: { logs: LogEntry[] }) {
  return (
    <>
      <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 8 }}>
        MISSION / SYSTEM LOG
      </div>
      {logs.map((l) => (
        <div key={l.id} style={{ display: 'flex', gap: 9, padding: '5px 0', borderBottom: '1px solid #0e1b21' }}>
          <span className="mono" style={{ fontSize: 10, color: colors.textMuted2, width: 52, flexShrink: 0 }}>
            {l.t}
          </span>
          <span
            className="mono"
            style={{ fontSize: 9.5, color: l.color, width: 42, flexShrink: 0, letterSpacing: '.05em' }}
          >
            {l.lvl}
          </span>
          <span className="mono" style={{ fontSize: 11, color: '#b6d2c8' }}>
            {l.msg}
          </span>
        </div>
      ))}
    </>
  );
}

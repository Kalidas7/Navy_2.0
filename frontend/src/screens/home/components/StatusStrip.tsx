/** Row of four stat chips: total / online / warning / critical. */
import type { FleetCounts } from '@/app/selectors';

interface ChipProps {
  value: number;
  caption: React.ReactNode;
  numberColor: string;
  captionColor: string;
  border: string;
  bg: string;
}

function StatChip({ value, caption, numberColor, captionColor, border, bg }: ChipProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 14px',
        border: `1px solid ${border}`,
        background: bg,
      }}
    >
      <span className="cond" style={{ fontSize: 24, fontWeight: 700, color: numberColor }}>
        {value}
      </span>
      <span
        className="mono"
        style={{ fontSize: 10, color: captionColor, letterSpacing: '.1em', lineHeight: 1.2 }}
      >
        {caption}
      </span>
    </div>
  );
}

export function StatusStrip({ counts }: { counts: FleetCounts }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '18px 0' }}>
      <StatChip
        value={counts.total}
        caption={
          <>
            RACKS
            <br />
            DEPLOYED
          </>
        }
        numberColor="#cfe7dd"
        captionColor="#5d7a74"
        border="#14242c"
        bg="#0a1318"
      />
      <StatChip
        value={counts.online}
        caption="ONLINE"
        numberColor="#2bf0a0"
        captionColor="#3a7a5e"
        border="#133327"
        bg="rgba(11,30,22,.5)"
      />
      <StatChip
        value={counts.warn}
        caption="WARNING"
        numberColor="#ffb84d"
        captionColor="#7a5a2a"
        border="#33291a"
        bg="rgba(30,24,11,.5)"
      />
      <StatChip
        value={counts.crit}
        caption="CRITICAL"
        numberColor="#ff5a5a"
        captionColor="#7a2a2a"
        border="#331a1a"
        bg="rgba(30,11,11,.5)"
      />
    </div>
  );
}

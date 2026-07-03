/**
 * The STATIC half of a rack card: identity header (code + vessel·pennant), the
 * status pill, and the role line. Everything here is tick-invariant for a given
 * rack, so the component is wrapped in React.memo and receives ONLY primitive
 * props — its shallow prop compare passes on every 800ms simulation tick and
 * React skips re-rendering this whole subtree. The live numbers (CPU/MEM/TEMP)
 * and the sparkline live as separate leaves in RackCard, so only they update.
 *
 * IMPORTANT: props must stay primitive (no objects/arrays/children), or the memo
 * compare fails and the skip is lost. The StatusMeta object is assembled INSIDE
 * this component from four primitive props for exactly that reason.
 */
import { memo } from 'react';
import { StatusPill } from '@/components/common/StatusPill';
import { colors } from '@/config/tokens';

interface RackCardStaticProps {
  code: string;
  vessel: string;
  pennant: string;
  role: string;
  statusColor: string;
  statusLabel: string;
  statusBd: string;
  statusBg: string;
}

export const RackCardStatic = memo(function RackCardStatic({
  code,
  vessel,
  pennant,
  role,
  statusColor,
  statusLabel,
  statusBd,
  statusBg,
}: RackCardStaticProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 11,
        }}
      >
        <div>
          <div
            className="cond"
            style={{ fontSize: 19, fontWeight: 700, letterSpacing: '.05em', color: colors.textHi, lineHeight: 1 }}
          >
            {code}
          </div>
          <div className="mono" style={{ fontSize: 10, color: colors.textMuted, letterSpacing: '.06em', marginTop: 3 }}>
            {vessel} · {pennant}
          </div>
        </div>
        <StatusPill
          meta={{ color: statusColor, label: statusLabel, bd: statusBd, bg: statusBg }}
          dot={6}
          fontSize={9}
          padding="3px 8px"
          gap={6}
          letterSpacing=".08em"
        />
      </div>

      <div className="mono" style={{ fontSize: 10.5, color: '#7c9a90', letterSpacing: '.04em', marginBottom: 12 }}>
        {role}
      </div>
    </>
  );
});

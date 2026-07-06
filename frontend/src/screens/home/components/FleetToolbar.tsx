/** Search input + live filter chips. */
import { useApp } from '@/app/AppContext';
import { ToggleChip } from '@/components/common/ToggleChip';
import { colors } from '@/config/tokens';
import type { FilterChipVM } from '@/app/selectors';

export function FleetToolbar({ chips }: { chips: FilterChipVM[] }) {
  const { state, setQuery, setFilter } = useApp();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 220,
          maxWidth: 380,
          padding: '9px 13px',
          borderRadius: 8,
          border: `1px solid ${colors.borderInput}`,
          background: colors.panelBg,
        }}
      >
        <span style={{ color: colors.textMuted2, fontSize: 13 }}>⌕</span>
        <input
          value={state.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rack · vessel · role…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: colors.textBody,
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <ToggleChip
            key={c.key}
            label={`${c.label} · ${c.count}`}
            active={state.filterStatus === c.key}
            onClick={() => setFilter(c.key)}
          />
        ))}
      </div>
    </div>
  );
}

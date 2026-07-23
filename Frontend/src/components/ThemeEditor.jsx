import { useEffect, useState } from 'react'
import apiFetch from '../lib/apiClient'
import { PRESETS, applyThemeFromName } from '../lib/theme'

const THEME_LABELS = {
  default: 'Green',
  corporate: 'Blue',
}

export default function ThemeEditor() {
  const [current, setCurrent] = useState('default')

  useEffect(() => {
    apiFetch('/settings/theme')
      .then(d => {
        if (d && d.themePalette) {
          setCurrent(d.themePalette)
          applyThemeFromName(d.themePalette)
        }
      })
      .catch(() => {})
  }, [])

  function select(name) {
    setCurrent(name)
    applyThemeFromName(name)
    apiFetch('/settings/theme', { method: 'PUT', body: JSON.stringify({ themePalette: name }) }).catch(() => {})
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {Object.keys(PRESETS).map(name => (
          <button key={name}
            onClick={() => select(name)}
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              cursor: 'pointer',
              border: current === name ? '2px solid var(--brand)' : '1px solid rgba(15, 23, 42, 0.12)',
              background: current === name ? 'rgba(var(--brand-rgb), 0.12)' : 'var(--surface)',
              color: 'var(--text)',
              fontWeight: 700,
              transition: 'all 0.2s ease',
              boxShadow: current === name ? '0 12px 24px rgba(var(--brand-rgb), 0.14)' : 'none',
            }}
          >
            {THEME_LABELS[name] || name}
          </button>
        ))}
      </div>
    </div>
  )
}

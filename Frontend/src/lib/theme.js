const PRESETS = {
  default: {
    brand: '#00c472',
    brand2: '#00a85a',
    brandRgb: '0,196,114',
    brand2Rgb: '0,168,90',
    bg: '#ffffff',
    surface: '#ffffff',
    surfaceStrong: '#f8fafc',
    text: '#1a1a2e',
    muted: '#6b7280',
    pageBg: '#f5f7fa',
  },
  corporate: {
    brand: '#0d6efd',
    brand2: '#0b5ed7',
    brandRgb: '13,110,253',
    brand2Rgb: '11,94,215',
    bg: '#ffffff',
    surface: '#ffffff',
    surfaceStrong: '#eef4ff',
    text: '#0f1724',
    muted: '#475569',
    pageBg: '#f8fafc',
  },
}

export function applyThemeFromName(name) {
  const theme = PRESETS[name] || PRESETS.default
  applyTheme(theme)
}

export function applyTheme(theme) {
  if (!theme) return
  const root = document.documentElement
  Object.entries(theme).forEach(([k, v]) => {
    const cssVarName = k
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
      .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
      .toLowerCase()
    root.style.setProperty(`--${cssVarName}`, v)
  })
  // smooth transition for color changes
  root.style.setProperty('--theme-transition', 'background-color 220ms, color 220ms, border-color 220ms')
}

export { PRESETS }

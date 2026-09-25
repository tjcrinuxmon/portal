import React from 'react'

// Logo oficial del INE (Manual de Identidad Institucional 2026, sección 2.3).
// No se redibuja: se usa el archivo maestro provisto en /logo-ine-completo.png.
export default function BrandLogo({ width = 190, className = '', alt = 'Instituto Nacional Electoral' }) {
  return (
    <img
      src="/logo-ine-completo.png"
      alt={alt}
      className={className}
      style={{ width, height: 'auto', display: 'block', flexShrink: 0 }}
    />
  )
}

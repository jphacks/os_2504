export const generateMemberId = (name: string): string => {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'member'
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`
}

export const buildQrSource = (url: string, size = 240): string => {
  const encoded = encodeURIComponent(url)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
}

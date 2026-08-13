export function Avatar({
  src,
  name,
  size = 'md',
}: {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const initial = (name || '?').slice(0, 1).toUpperCase()
  const className = `vf-avatar size-${size}`
  if (src) {
    return <img alt={name} className={className} src={src} />
  }
  return <span className={className}>{initial}</span>
}

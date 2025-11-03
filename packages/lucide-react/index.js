const React = require('react')

const Loader2 = React.forwardRef(function Loader2(
  { color = 'currentColor', size = 24, strokeWidth = 2, className, ...rest },
  ref
) {
  const resolvedSize = typeof size === 'number' ? size : Number.parseInt(size, 10) || 24
  return React.createElement(
    'svg',
    {
      ref,
      className,
      width: resolvedSize,
      height: resolvedSize,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ...rest,
    },
    React.createElement('path', {
      d: 'M21 12a9 9 0 1 1-6.219-8.56',
    })
  )
})

Loader2.displayName = 'Loader2'

module.exports = {
  Loader2,
}

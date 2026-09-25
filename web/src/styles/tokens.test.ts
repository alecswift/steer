import { describe, expect, it } from 'vitest'
import tokensCss from './tokens.css?raw'
import { mapColors } from './tokens'

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function cssMapColors(): Record<string, string> {
  const found: Record<string, string> = {}
  for (const [, name, value] of tokensCss.matchAll(/--map-([\w-]+):\s*([^;]+);/g)) {
    found[name] = value.trim()
  }
  return found
}

describe('design tokens', () => {
  it('mirrors every map colour from tokens.ts in tokens.css', () => {
    const expected = Object.fromEntries(
      Object.entries(mapColors).map(([name, value]) => [kebab(name), value]),
    )
    expect(cssMapColors()).toEqual(expected)
  })

  it('uses only well-formed hex colours', () => {
    const hexes = tokensCss.match(/#[0-9a-fA-F]+\b/g) ?? []
    expect(hexes.length).toBeGreaterThan(0)
    for (const hex of hexes) {
      expect(hex).toMatch(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
    }
  })
})

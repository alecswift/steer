import { describe, expect, it } from 'vitest'
import { demTileUrl } from './config'

describe('map config', () => {
  it('uses a z/x/y tile template for the DEM source', () => {
    expect(demTileUrl).toMatch(/\{z\}\/\{x\}\/\{y\}\.png$/)
  })
})

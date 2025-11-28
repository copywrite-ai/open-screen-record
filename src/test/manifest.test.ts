import manifest from '../../manifest.json'
import { describe, it, expect } from 'vitest'

describe('Manifest V3 Configuration', () => {
  it('should have manifest_version 3', () => {
    expect(manifest.manifest_version).toBe(3)
  })

  it('should have required permissions', () => {
    const requiredPermissions = ['tabCapture', 'storage', 'scripting', 'activeTab', 'offscreen']
    expect(manifest.permissions).toEqual(expect.arrayContaining(requiredPermissions))
  })

  it('should define background service worker', () => {
    expect(manifest.background).toBeDefined()
    expect(manifest.background?.service_worker).toBeTruthy()
    expect(manifest.background?.type).toBe('module')
  })

  it('should define content scripts', () => {
    expect(manifest.content_scripts).toBeDefined()
    expect(manifest.content_scripts?.length).toBeGreaterThan(0)
    expect(manifest.content_scripts?.[0].matches).toContain('<all_urls>')
  })
})

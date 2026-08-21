// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryX } from '../src/index'

describe('SSR fallback (no window)', () => {
    afterEach(() => {
        delete (globalThis as any)._oOMemoryXOo_
    })

    it('works without a window object', () => {
        expect(typeof window).toBe('undefined')
        const memory = new MemoryX('ssr')
        memory.set('a.b', 1)
        expect(memory.get('a.b')).toBe(1)
    })

    it('shares state through globalThis', () => {
        const a = new MemoryX('ssr-shared')
        const b = new MemoryX('ssr-shared')
        a.set('x', 42)
        expect(b.get('x')).toBe(42)
        expect((globalThis as any)._oOMemoryXOo_['ssr-shared'].x).toBe(42)
    })

    it('full CRUD lifecycle on the server', () => {
        const memory = new MemoryX('ssr-lifecycle')
        memory.set('user.name', 'Alice')
        expect(memory.has('user.name')).toBe(true)
        memory.del('user.name')
        expect(memory.has('user.name')).toBe(false)
        memory.destroy()
        expect(MemoryX.namespaces).not.toContain('ssr-lifecycle')
    })
})

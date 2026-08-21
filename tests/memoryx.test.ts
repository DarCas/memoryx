import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryX } from '../src/index'

describe('MemoryX core', () => {
    beforeEach(() => {
        delete (window as any)._oOMemoryXOo_
    })

    it('stores and retrieves values', () => {
        const memory = new MemoryX('core')
        memory.set('user.name', 'John')
        memory.set('user.age', 30)
        expect(memory.get('user.name')).toBe('John')
        expect(memory.get('user.age')).toBe(30)
    })

    it('returns the default for missing paths', () => {
        const memory = new MemoryX('core')
        expect(memory.get('nope')).toBeNull()
        expect(memory.get('nope', 'fallback')).toBe('fallback')
    })

    it('has() and del()', () => {
        const memory = new MemoryX('core')
        memory.set('a.b', 1)
        expect(memory.has('a.b')).toBe(true)
        memory.del('a.b')
        expect(memory.has('a.b')).toBe(false)
    })

    it('isolates namespaces', () => {
        const a = new MemoryX('ns-a')
        const b = new MemoryX('ns-b')
        a.set('key', 'from-a')
        b.set('key', 'from-b')
        expect(a.get('key')).toBe('from-a')
        expect(b.get('key')).toBe('from-b')
    })

    it('shares state between instances of the same namespace', () => {
        const a = new MemoryX('shared')
        const b = new MemoryX('shared')
        a.set('x', 1)
        expect(b.get('x')).toBe(1)
    })

    it('uses the _global namespace by default', () => {
        const memory = new MemoryX()
        expect(memory.namespace).toBe('_global')
    })

    it('lists namespaces via the static getter', () => {
        new MemoryX('alpha')
        new MemoryX('beta')
        const names = MemoryX.namespaces
        expect(names).toContain('alpha')
        expect(names).toContain('beta')
    })

    it('destroy() clears the namespace and lazily recreates it on next use', () => {
        const memory = new MemoryX('doomed')
        memory.set('a.b', 1)
        memory.destroy()
        expect(MemoryX.namespaces).not.toContain('doomed')

        expect(memory.has('a.b')).toBe(false)

        memory.set('c.d', 2)
        expect(memory.get('c.d')).toBe(2)
        expect(MemoryX.namespaces).toContain('doomed')
    })

    it('keeps other namespaces alive after destroy()', () => {
        const keeper = new MemoryX('keeper')
        const doomed = new MemoryX('doomed-2')
        keeper.set('k', 1)
        doomed.destroy()
        expect(keeper.get('k')).toBe(1)
    })
})

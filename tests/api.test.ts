import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryX } from '../src/index'

describe('extended API', () => {
    beforeEach(() => {
        delete (window as any)._oOMemoryXOo_
    })

    it('all() returns a shallow copy of the namespace', () => {
        const memory = new MemoryX('api')
        memory.set('a.b', 1)
        const snapshot = memory.all()
        snapshot.c = 2
        expect(memory.has('c')).toBe(false)
    })

    it('keys() lists top-level keys', () => {
        const memory = new MemoryX('api')
        memory.set('a', 1)
        memory.set('b', 2)
        expect(memory.keys().sort()).toStrictEqual(['a', 'b'])
    })

    it('merge() deep-merges objects at a path', () => {
        const memory = new MemoryX('api')
        memory.set('user', { name: 'Alice', address: { city: 'Bari' } })
        memory.merge('user', { address: { zip: '70010' }, age: 30 })
        expect(memory.get('user')).toStrictEqual({
            name: 'Alice',
            age: 30,
            address: { city: 'Bari', zip: '70010' },
        })
    })

    it('merge() on a missing path starts from an empty object', () => {
        const memory = new MemoryX('api')
        memory.merge('settings.theme', { dark: true })
        expect(memory.get('settings.theme')).toStrictEqual({ dark: true })
    })

    it('push() appends to arrays and creates them when missing', () => {
        const memory = new MemoryX('api')
        memory.push('list', 'a')
        memory.push('list', 'b')
        expect(memory.get('list')).toStrictEqual(['a', 'b'])
    })

    it('push() replaces non-array values with a fresh array', () => {
        const memory = new MemoryX('api')
        memory.set('scalar', 42)
        memory.push('scalar', 'a')
        expect(memory.get('scalar')).toStrictEqual(['a'])
    })

    it('inc() and dec() update numeric counters', () => {
        const memory = new MemoryX('api')
        memory.inc('counter')
        memory.inc('counter')
        expect(memory.get('counter')).toBe(2)
        memory.dec('counter')
        expect(memory.get('counter')).toBe(1)
    })

    it('inc() treats missing or non-numeric values as zero', () => {
        const memory = new MemoryX('api')
        memory.inc('missing', 5)
        expect(memory.get('missing')).toBe(5)
        memory.set('text', 'abc')
        memory.inc('text')
        expect(memory.get('text')).toBe(1)
    })

    it('snapshot() and restore() round-trip the namespace', () => {
        const memory = new MemoryX('api')
        memory.set('a.b', [1, 2])
        memory.set('c', { d: true })

        const json = memory.snapshot()
        memory.del('a.b')
        memory.restore(json)

        expect(memory.get('a.b')).toStrictEqual([1, 2])
        expect(memory.get('c')).toStrictEqual({ d: true })
    })

    it('restore() replaces existing content entirely', () => {
        const memory = new MemoryX('api')
        memory.set('old', 1)

        const source = new MemoryX('api-source')
        source.set('new', 2)
        memory.restore(source.snapshot())

        expect(memory.has('old')).toBe(false)
        expect(memory.get('new')).toBe(2)
    })

    it('restore() throws on invalid JSON objects', () => {
        const memory = new MemoryX('api')
        expect(() => memory.restore('"just a string"')).toThrow(TypeError)
        expect(() => memory.restore('not json')).toThrow()
    })
})

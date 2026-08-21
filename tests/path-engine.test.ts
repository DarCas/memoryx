import { beforeEach, describe, expect, it } from 'vitest'
import lodashGet from 'lodash/get'
import lodashHas from 'lodash/has'
import lodashSet from 'lodash/set'
import lodashUnset from 'lodash/unset'
import { MemoryX, type PropertyPath } from '../src/index'

/**
 * Differential tests: the internal path engine must behave exactly like
 * the lodash functions it replaced. Every case runs the same operation
 * against a plain object driven by lodash and against a MemoryX
 * instance, then compares both results.
 */

const PATHS: PropertyPath[] = [
    'a',
    'a.b',
    'a.b.c',
    'a[0]',
    'a[0].b',
    'a.0',
    'a.0.b',
    'a[1][2]',
    'a["b.c"]',
    "a['b.c']",
    'a.b[0]["c.d"].e',
    'x',
    '',
    '.',
    '.lead',
    'trail.',
    'a..b',
    'a[]',
    '[0]',
    'a[-1]',
    'list[2]',
    'list[0].name',
    'deep.a.b[0]["k.l"][1].end',
]

const PROBES: PropertyPath[] = ['a', 'a.b', 'a[0]', 'a.0', 'a["b.c"]', '', 'missing', 'missing.deep']

function fresh(): { ref: Record<string, unknown>; memory: MemoryX } {
    return { ref: {}, memory: new MemoryX('parity') }
}

describe('path engine parity with lodash', () => {
    beforeEach(() => {
        delete (window as any)._oOMemoryXOo_
    })

    describe('set', () => {
        for (const path of PATHS) {
            it(`set(${JSON.stringify(path)})`, () => {
                const { ref, memory } = fresh()
                lodashSet(ref, path as any, 'value')
                memory.set(path, 'value')
                expect(JSON.stringify(memory.all())).toBe(JSON.stringify(ref))
            })
        }
    })

    describe('get / has after set', () => {
        for (const path of PATHS) {
            it(`roundtrip ${JSON.stringify(path)}`, () => {
                const { ref, memory } = fresh()
                lodashSet(ref, path as any, 'value')
                memory.set(path, 'value')

                for (const probe of PROBES) {
                    expect(memory.get(probe)).toStrictEqual(lodashGet(ref, probe as any) ?? null)
                    expect(memory.has(probe)).toBe(lodashHas(ref, probe as any))
                }

                expect(memory.get(path, 'default')).toBe(lodashGet(ref, path as any, 'default'))
            })
        }
    })

    describe('unset', () => {
        for (const path of PATHS) {
            it(`del(${JSON.stringify(path)})`, () => {
                const { ref, memory } = fresh()
                lodashSet(ref, path as any, 'value')
                memory.set(path, 'value')

                lodashUnset(ref, path as any)
                memory.del(path)

                expect(JSON.stringify(memory.all())).toBe(JSON.stringify(ref))
                expect(memory.has(path)).toBe(lodashHas(ref, path as any))
            })
        }
    })

    it('array path form matches lodash', () => {
        const { ref, memory } = fresh()
        lodashSet(ref, ['a', 0, 'b'] as any, 1)
        memory.set(['a', 0, 'b'], 1)
        expect(JSON.stringify(memory.all())).toBe(JSON.stringify(ref))
        expect(memory.get(['a', 0, 'b'])).toBe(lodashGet(ref, ['a', 0, 'b'] as any))
    })

    it('numeric intermediate keys create arrays like lodash', () => {
        const { ref, memory } = fresh()
        lodashSet(ref, 'a.0', 1)
        memory.set('a.0', 1)
        expect(Array.isArray((memory.all() as any).a)).toBe(true)
        expect(JSON.stringify(memory.all())).toBe(JSON.stringify(ref))
    })

    it('blocks prototype pollution like lodash', () => {
        const { ref, memory } = fresh()
        lodashSet(ref, '__proto__.polluted', 'x')
        memory.set('__proto__.polluted', 'x')
        expect(({} as any).polluted).toBeUndefined()
        expect((globalThis as any).polluted).toBeUndefined()

        lodashSet(ref, 'constructor.prototype.polluted', 'y')
        memory.set('constructor.prototype.polluted', 'y')
        expect(({} as any).polluted).toBeUndefined()
    })

    it('sparse array tail has() matches lodash', () => {
        const { ref, memory } = fresh()
        ;(ref as any).arr = new Array(3)
        ;(memory.storage as any).arr = new Array(3)
        expect(memory.has('arr[2]')).toBe(lodashHas(ref, 'arr[2]' as any))
        expect(memory.has('arr[3]')).toBe(lodashHas(ref, 'arr[3]' as any))
    })
})

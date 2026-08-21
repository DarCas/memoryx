import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryX } from '../src/index'

describe('reactivity', () => {
    beforeEach(() => {
        delete (window as any)._oOMemoryXOo_
    })

    it('notifies on set with new and previous value', () => {
        const memory = new MemoryX('rx')
        const listener = vi.fn()
        memory.subscribe('user.name', listener)

        memory.set('user.name', 'Alice')
        expect(listener).toHaveBeenCalledOnce()
        expect(listener).toHaveBeenCalledWith('Alice', undefined)

        memory.set('user.name', 'Bob')
        expect(listener).toHaveBeenCalledWith('Bob', 'Alice')
    })

    it('notifies ancestors of the changed path', () => {
        const memory = new MemoryX('rx')
        const ancestor = vi.fn()
        memory.subscribe('user', ancestor)

        memory.set('user.name', 'Alice')
        expect(ancestor).toHaveBeenCalledOnce()

        memory.set('user.address.city', 'Bari')
        expect(ancestor).toHaveBeenCalledTimes(2)
    })

    it('does not notify descendants or unrelated paths', () => {
        const memory = new MemoryX('rx')
        const child = vi.fn()
        const other = vi.fn()
        memory.subscribe('user.name', child)
        memory.subscribe('other', other)

        memory.set('user', {})
        expect(child).not.toHaveBeenCalled()
        expect(other).not.toHaveBeenCalled()
    })

    it('supports the * wildcard for any change in the namespace', () => {
        const memory = new MemoryX('rx')
        const listener = vi.fn()
        memory.subscribe('*', listener)

        memory.set('a.b', 1)
        memory.del('a.b')
        expect(listener).toHaveBeenCalledTimes(2)
    })

    it('unsubscribe stops notifications', () => {
        const memory = new MemoryX('rx')
        const listener = vi.fn()
        const unsubscribe = memory.subscribe('a', listener)

        memory.set('a', 1)
        unsubscribe()
        memory.set('a', 2)

        expect(listener).toHaveBeenCalledOnce()
    })

    it('notifies on del with undefined value', () => {
        const memory = new MemoryX('rx')
        const listener = vi.fn()
        memory.set('a.b', 1)
        memory.subscribe('a.b', listener)

        memory.del('a.b')
        expect(listener).toHaveBeenCalledWith(undefined, 1)
    })

    it('does not notify when a forbidden path is written', () => {
        const memory = new MemoryX('rx')
        const listener = vi.fn()
        memory.subscribe('*', listener)

        memory.set('__proto__.polluted', 1)
        expect(listener).not.toHaveBeenCalled()
        expect(({} as any).polluted).toBeUndefined()
    })

    it('subscriptions are per-instance (per namespace)', () => {
        const a = new MemoryX('rx-a')
        const b = new MemoryX('rx-b')
        const listener = vi.fn()
        a.subscribe('x', listener)

        b.set('x', 1)
        expect(listener).not.toHaveBeenCalled()

        a.set('x', 1)
        expect(listener).toHaveBeenCalledOnce()
    })
})

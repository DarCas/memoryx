/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2024-2026 Casertano Dario – All rights reserved.
 * MIT
 */

import {
    baseGet,
    baseSet,
    baseUnset,
    castPath,
    deepMerge,
    hasPath,
    isObject,
    isPrefix,
} from './utils'
import type { PropertyPath, PropertyName } from './utils'

/**
 * Change listener invoked by {@link MemoryX.subscribe} after every
 * matching mutation.
 *
 * @param value - The new value (`undefined` after a deletion).
 * @param previous - The value held before the change.
 */
type Listener = (value: unknown, previous: unknown) => void

interface Subscription {
    listener: Listener
    segments: PropertyKey[] | null
}

declare global {
    interface Window {
        _oOMemoryXOo_?: Record<string, Record<string, unknown>>
    }
}

const ROOT_KEY = '_oOMemoryXOo_'

const root: any = typeof window !== 'undefined' ? window : globalThis

function ensureStore(): Record<string, Record<string, unknown>> {
    let store: unknown = root[ ROOT_KEY ]

    if (!isObject(store)) {
        store = {}
        root[ ROOT_KEY ] = store
    }

    return store as Record<string, Record<string, unknown>>
}

/**
 * Namespaced in-memory key-value store backed by the shared global
 * `window._oOMemoryXOo_` object (falls back to `globalThis` in SSR).
 *
 * Instances of the same namespace share state; different namespaces are
 * fully isolated. All path-based methods accept lodash-compatible deep
 * paths (dot notation, array form, bracket syntax).
 */
export class MemoryX {
    private subscriptions: Subscription[] = []

    /**
     * Creates an instance bound to a namespace, creating it in the
     * shared store if missing.
     *
     * @param namespace - Isolation scope; defaults to `'_global'`.
     */
    constructor(readonly namespace: string = '_global') {
        const store = ensureStore()

        if (!isObject(store[ namespace ])) {
            store[ namespace ] = {}
        }

        this.namespace = namespace
    }

    /** Names of all namespaces currently present in the shared store. */
    static get namespaces(): string[] {
        return Object.keys(ensureStore())
    }

    /**
     * Removes the entire namespace from the shared store and notifies
     * wildcard subscribers. The instance stays usable: the namespace is
     * lazily recreated on the next access.
     */
    destroy(): void {
        const store = ensureStore()
        const previous = store[ this.namespace ]
        delete store[ this.namespace ]

        this.notify([], undefined, previous)
    }

    /**
     * Reads the value at a deep path.
     *
     * @param path - Deep path to resolve.
     * @param def - Value returned when the path resolves to `undefined`.
     * @returns The stored value or `def` (defaults to `null`).
     */
    get<T = unknown>(path: PropertyPath, def: T | null = null): T {
        const value = baseGet(this.storage, path)

        return ( value === undefined ? def : value ) as T
    }

    /**
     * Writes a value at a deep path, creating intermediate containers as
     * needed. Writes through prototype-chain keys are silently ignored.
     * Notifies subscribers of the path and of its ancestors.
     *
     * @param path - Deep path to write.
     * @param value - Value to store.
     */
    set<T = unknown>(path: PropertyPath, value: T): void {
        const target = this.storage
        const previous = baseGet(target, path)

        if (baseSet(target, path, value)) {
            this.notify(castPath(path, target), value, previous)
        }
    }

    /**
     * Removes the value at a deep path. Missing paths are a no-op.
     * Notifies subscribers only when something was actually deleted.
     *
     * @param path - Deep path to remove.
     */
    del(path: PropertyPath): void {
        const target = this.storage
        const previous = baseGet(target, path)

        if (baseUnset(target, path)) {
            this.notify(castPath(path, target), undefined, previous)
        }
    }

    /**
     * Tests existence of a deep path without reading its value.
     *
     * @param path - Deep path to check.
     * @returns `true` when the path exists in the namespace.
     */
    has(path: PropertyPath): boolean {
        return hasPath(this.storage, path)
    }

    /**
     * Returns a shallow copy of all data in the namespace; mutating the
     * result does not affect the store.
     *
     * @returns Copy of the namespace content.
     */
    all(): Record<string, unknown> {
        return {...this.storage}
    }

    /**
     * Lists the top-level keys of the namespace.
     *
     * @returns Array of own enumerable keys.
     */
    keys(): string[] {
        return Object.keys(this.storage)
    }

    /**
     * Deep-merges a patch into the plain object at a deep path. Missing
     * paths start from an empty object; arrays are replaced wholesale.
     *
     * @param path - Deep path of the object to merge into.
     * @param patch - Partial object merged over the current value.
     */
    merge(path: PropertyPath, patch: Record<string, unknown>): void {
        const current = this.get<unknown>(path)

        this.set(path, deepMerge(isObject(current) && !Array.isArray(current) ? current : {}, patch))
    }

    /**
     * Appends a value to the array at a deep path, creating the array
     * when missing. A non-array current value is replaced by a fresh
     * single-element array.
     *
     * @param path - Deep path of the array.
     * @param value - Value to append.
     */
    push(path: PropertyPath, value: unknown): void {
        const current = this.get<unknown>(path)

        this.set(path, Array.isArray(current) ? [...current, value] : [value])
    }

    /**
     * Increments the numeric value at a deep path. Missing or non-numeric
     * values are treated as `0`. Notifies subscribers like {@link set}.
     *
     * @param path - Deep path of the counter.
     * @param by - Increment amount; defaults to `1`.
     */
    inc(path: PropertyPath, by: number = 1): void {
        const current = this.get<unknown>(path)

        this.set(path, ( typeof current === 'number' ? current : 0 ) + by)
    }

    /**
     * Decrements the numeric value at a deep path (see {@link inc}).
     *
     * @param path - Deep path of the counter.
     * @param by - Decrement amount; defaults to `1`.
     */
    dec(path: PropertyPath, by: number = 1): void {
        this.inc(path, -by)
    }

    /**
     * Serializes the entire namespace content to a JSON string.
     *
     * @returns JSON representation of the namespace.
     */
    snapshot(): string {
        return JSON.stringify(this.storage)
    }

    /**
     * Replaces the entire namespace content with the parsed snapshot.
     * Notifies every subscriber via the `'*'` wildcard.
     *
     * @param json - A string produced by {@link snapshot}.
     * @throws TypeError when the JSON does not decode to an object.
     */
    restore(json: string): void {
        const parsed: unknown = JSON.parse(json)

        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new TypeError('Invalid snapshot: expected a JSON object')
        }

        const storage = this.storage
        for (const key of Object.keys(storage)) {
            delete storage[ key ]
        }

        Object.assign(storage, parsed)

        this.notify('*', undefined, undefined)
    }

    /**
     * Subscribes a listener to changes at a deep path. The listener also
     * fires for descendant changes; the `'*'` wildcard matches every
     * change in the namespace. Listeners run synchronously after each
     * mutation.
     *
     * @param path - Deep path to watch, or `'*'` for all changes.
     * @param listener - Callback receiving `(value, previous)`.
     * @returns Unsubscribe function that detaches the listener.
     */
    subscribe(path: PropertyPath | '*', listener: Listener): () => void {
        const wildcard = path === '*'
        const subscription: Subscription = {
            listener,
            segments: wildcard ? null : castPath(path as PropertyPath, this.storage),
        }

        this.subscriptions.push(subscription)

        return () => {
            const index = this.subscriptions.indexOf(subscription)

            if (index !== -1) {
                this.subscriptions.splice(index, 1)
            }
        }
    }

    /**
     * Lazily resolves the namespace container, recreating it when it was
     * removed by {@link destroy} or external deletion.
     */
    protected get storage(): Record<string, unknown> {
        const store = ensureStore()
        let space = store[ this.namespace ]

        if (!isObject(space)) {
            space = {}
            store[ this.namespace ] = space
        }

        return space as Record<string, unknown>
    }

    private notify(path: PropertyPath | '*', value: unknown, previous: unknown): void {
        const segments = path === '*' ? null : castPath(path)

        for (const subscription of this.subscriptions.slice()) {
            if (subscription.segments === null ||
                segments === null ||
                isPrefix(subscription.segments, segments)
            ) {
                subscription.listener(value, previous)
            }
        }
    }
}

export type {
    PropertyPath,
    PropertyName,
}

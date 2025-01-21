/**
 * @author      Dario Casertano <dario@casertano.name>
 * @copyright   Copyright (c) 2024-present Casertano Dario – All rights reserved.
 * @license     MIT
 */

import { type Dictionary, type PropertyPath } from 'lodash'
import get from 'lodash/get'
import has from 'lodash/has'
import keys from 'lodash/keys'
import set from 'lodash/set'
import unset from 'lodash/unset'

declare global {
    interface Window {
        _oOMemoryXOo_?: Dictionary<Dictionary<unknown>>
    }
}

export class MemoryX {
    readonly namespace: string

    constructor(namespace: string = '_global') {
        if (!( '_oOMemoryXOo_' in window )) {
            window._oOMemoryXOo_ = {}
        }

        if (!( namespace in window._oOMemoryXOo_! )) {
            window._oOMemoryXOo_![ namespace ] = {}
        }

        this.namespace = namespace
    }

    destroy(): void {
        delete window._oOMemoryXOo_![ this.namespace ]
    }

    static get namespaces(): string[] {
        return keys(window._oOMemoryXOo_)
    }

    get<T = unknown>(
        path: PropertyPath,
        def: T | null = null,
    ): T {
        return get(this.storage, path, def) as T
    }

    set<T = unknown>(
        path: PropertyPath,
        value: T,
    ): void {
        set(this.storage, path, value)
    }

    del(path: PropertyPath): void {
        unset(this.storage, path)
    }

    has(path: PropertyPath): boolean {
        return has(this.storage, path)
    }

    protected get storage(): Dictionary<unknown> {
        return window._oOMemoryXOo_![ this.namespace ]
    }
}

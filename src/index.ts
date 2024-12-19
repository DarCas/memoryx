/**
 * @author      Dario Casertano <dario@casertano.name>
 * @copyright   Copyright (c) 2024 Casertano Dario – All rights reserved.
 * @license     Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International.
 */

import { type Dictionary, type PropertyPath } from 'lodash'
import get from 'lodash/get'
import has from 'lodash/has'
import keys from 'lodash/keys'
import set from 'lodash/set'
import unset from 'lodash/unset'

declare global {
    interface Window {
        _oOMemoryXOo_?: Dictionary<Dictionary<any>>
    }
}

class MemoryX {
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

    get<T = never>(
        path: PropertyPath,
        def: T | null = null,
    ): T {
        return get(this.storage, path, def) as T
    }

    set<T = never>(
        path: PropertyPath,
        value: T,
    ): void {
        set(this.storage, path, value)
    }

    del(path: PropertyPath): void {
        unset(this.storage, path)
    }

    has(path: string): boolean {
        return has(this.storage, path)
    }

    protected get storage(): Dictionary<any> {
        return window._oOMemoryXOo_![ this.namespace ]
    }
}

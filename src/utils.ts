/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2024-2026 Casertano Dario – All rights reserved.
 * MIT
 */

/**
 * A property name accepted as a single path segment.
 */
export type PropertyName = string | number | symbol

/**
 * A deep property path: either a single {@link PropertyName} or an array
 * of segment names. String paths support lodash dot-notation and bracket
 * syntax (`'a.b'`, `'a[0]'`, `'a["k.k"]'`).
 */
export type PropertyPath = PropertyName | PropertyName[]

/* ------------------------------------------------------------------ *
 * Path engine — drop-in replacement for the lodash functions used by
 * this library (get/set/has/unset), kept semantically identical so
 * that existing consumers observe exactly the same behaviour.
 * ------------------------------------------------------------------ */

/** Largest safe integer value, used as the default bound for index checks. */
const MAX_SAFE_INTEGER = 9007199254740991

/** Matches canonical non-negative integer strings (`'0'`, `'12'`). */
const reIsUint = /^(?:0|[1-9]\d*)$/

/**
 * Tokenizes a deep path string into segments: bare names, numeric
 * brackets, quoted brackets (single/double, escape-aware) and empty
 * segments produced by leading/doubled dots or empty brackets.
 */
const rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)]|(?=(?:\.|\[])(?:\.|\[]|$))/g

/** Unescapes `\'` / `\"` backslash sequences inside quoted path segments. */
const reEscapeChar = /\\(\\)?/g

/** Detects strings that must be parsed as deep paths (contain `.` or `[...]`). */
const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)]/

/** Detects simple single-segment identifiers (`'foo'`, `''`). */
const reIsPlainProp = /^\w*$/

/**
 * Keys whose traversal would enable prototype pollution; writing through
 * them aborts the whole operation.
 */
const FORBIDDEN_KEYS: PropertyKey[] = ['__proto__', 'constructor', 'prototype']

/**
 * Checks whether a path segment is forbidden for write operations.
 *
 * @param key - The normalized segment to test.
 * @returns `true` when the segment targets the prototype chain.
 */
function isForbidden(key: PropertyKey): boolean {
    return FORBIDDEN_KEYS.indexOf(key) !== -1
}

/**
 * Tests whether a value is a non-null object or function.
 *
 * @param value - The value to test.
 * @returns `true` when the value can hold properties.
 */
export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
    const type = typeof value

    return value !== null &&
        ( type === 'object' || type === 'function' )
}

/**
 * Tests whether a value is a plain data object (not an array).
 *
 * @param value - The value to test.
 * @returns `true` for non-array objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
}

/**
 * Tests whether a value acts as a valid array index below `length`.
 *
 * @param value - Candidate index (number or numeric string).
 * @param length - Exclusive upper bound; defaults to `MAX_SAFE_INTEGER`.
 * @returns `true` when the value is a non-negative integer in range.
 */
function isIndex(value: unknown, length: number = MAX_SAFE_INTEGER): boolean {
    if (!length || typeof value === 'symbol') {
        return false
    }

    const str = String(value)
    if (!reIsUint.test(str)) {
        return false
    }

    const num = Number(str)

    return num > -1 &&
        num % 1 === 0 &&
        num < length
}

/**
 * Normalizes a path segment into its property-key form, preserving the
 * `-0` edge case like lodash's `toKey`.
 *
 * @param value - The raw segment.
 * @returns The key usable for property access.
 */
function toKey(value: PropertyKey): PropertyKey {
    if (typeof value === 'string' || typeof value === 'symbol') {
        return value
    }

    const result = String(value)

    return result === '0' && ( 1 / Number(value) === -Infinity ) ? '-0' : result
}

/** Memoization cache for parsed path strings. */
const pathCache = new Map<string, PropertyKey[]>()

/**
 * Parses a deep path string into an array of segments using
 * {@link rePropName}, with memoization for repeated paths.
 *
 * @param string - The raw path string (e.g. `'a.b[0]["c.d"]'`).
 * @returns The ordered list of path segments.
 */
function stringToPath(string: string): PropertyKey[] {
    const cached = pathCache.get(string)
    if (cached) {
        return cached
    }

    const result: PropertyKey[] = []
    if (string.charCodeAt(0) === 46 /* . */) {
        result.push('')
    }

    string.replace(rePropName, (match: string, number: string, quote: string, subString: string) => {
        result.push(quote ? subString.replace(reEscapeChar, '$1') : ( number || match ))

        return match
    })

    pathCache.set(string, result)

    return result
}

/**
 * Tests whether a path value should be treated as a single literal key
 * rather than being parsed as a deep path (lodash `isKey` semantics).
 *
 * @param value - The candidate path.
 * @param object - Optional host object; a matching own/inherited key
 *   forces single-key treatment even for deep-prop-looking strings.
 * @returns `true` when the value maps to exactly one segment.
 */
function isKey(value: unknown, object?: unknown): boolean {
    if (Array.isArray(value)) {
        return false
    }

    const type = typeof value

    if (type === 'number' ||
        type === 'symbol' ||
        type === 'boolean' ||
        value === null ||
        value === undefined
    ) {
        return true
    }

    const str = String(value)

    return reIsPlainProp.test(str) ||
        !reIsDeepProp.test(str) ||
        ( object != null && str in Object(object) )
}

/**
 * Converts any accepted path form into its ordered segment list,
 * parsing deep strings only when necessary.
 *
 * @param value - The path in string, primitive or array form.
 * @param object - Optional host object used by {@link isKey}.
 * @returns A copy of the path segments.
 */
export function castPath(value: PropertyPath, object?: unknown): PropertyKey[] {
    if (Array.isArray(value)) {
        return value.slice()
    }

    if (typeof value === 'number' ||
        typeof value === 'symbol'
    ) {
        return [value]
    }

    if (isKey(value, object)) {
        return [value as PropertyKey]
    }

    return stringToPath(String(value))
}

/**
 * Resolves the value at a deep path without creating anything
 * (lodash `baseGet` semantics).
 *
 * @param object - The root object to traverse.
 * @param path - The deep path to resolve.
 * @returns The resolved value, or `undefined` when the path cannot be
 *   fully traversed.
 */
export function baseGet(object: any, path: PropertyPath): unknown {
    const segments = castPath(path, object)
    let index = 0

    const length = segments.length

    while (object != null && index < length) {
        object = object[ toKey(segments[ index++ ]) ]
    }

    return index && ( index === length ) ? object : undefined
}

/**
 * Tests existence of a deep path via own-property checks, with a
 * fallback for sparse-array trailing indices (lodash `has` semantics).
 *
 * @param object - The root object to inspect.
 * @param path - The deep path to check.
 * @returns `true` when the path exists on the object.
 */
export function hasPath(object: any, path: PropertyPath): boolean {
    const segments = castPath(path, object)
    let index = -1
    const length = segments.length
    let result = false
    let key: PropertyKey = ''

    while (++index < length) {
        key = toKey(segments[ index ])

        if (!( result = object != null && Object.prototype.hasOwnProperty.call(object, key) )) {
            break
        }

        object = object[ key ]
    }

    if (result || ++index !== length) {
        return result
    }

    const size = object == null ? 0 : object.length

    const isValidLength = ( typeof size === 'number' ) &&
        size > -1 &&
        size % 1 === 0 &&
        size <= MAX_SAFE_INTEGER

    return !!size &&
        isValidLength &&
        isIndex(key, size) &&
        Array.isArray(object)
}

/**
 * Writes a value at a deep path, creating intermediate containers with
 * lodash rules (array when the next segment is an index, object
 * otherwise). Traversal stops at forbidden prototype keys.
 *
 * @param object - The root object to mutate.
 * @param path - The deep path to write.
 * @param value - The value to store at the path.
 * @returns `true` when at least one assignment was performed.
 */
export function baseSet(object: any, path: PropertyPath, value: unknown): boolean {
    if (!isObject(object)) {
        return false
    }

    const segments = castPath(path, object)
    const length = segments.length
    const lastIndex = length - 1
    let nested: any = object
    let index = -1
    let changed = false

    while (nested != null && ++index < length) {
        const key = toKey(segments[ index ])

        if (isForbidden(key)) {
            break
        }

        let newValue: unknown = value

        if (index !== lastIndex) {
            const objValue = nested[ key ]
            newValue = isObject(objValue) ? objValue : ( isIndex(segments[ index + 1 ]) ? [] : {} )
        }

        nested[ key ] = newValue
        changed = true
        nested = nested[ key ]
    }

    return changed
}

/**
 * Removes the value at a deep path via `delete`, leaving array holes
 * intact (lodash `unset` semantics). Missing paths are a no-op.
 *
 * @param object - The root object to mutate.
 * @param path - The deep path to remove.
 * @returns `true` when a property was actually deleted.
 */
export function baseUnset(object: any, path: PropertyPath): boolean {
    const segments = castPath(path, object)
    const parent = segments.length === 1 ? object : baseGet(object, segments.slice(0, -1))

    return parent == null ||
        delete parent[ toKey(segments[ segments.length - 1 ]) ]
}

/**
 * Recursively merges a patch object into a base object without mutating
 * either input; arrays and non-plain values are replaced wholesale.
 *
 * @param base - The current value found at the target path.
 * @param patch - The partial object to merge in.
 * @returns A new object combining both inputs.
 */
export function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {...base}

    for (const key of Object.keys(patch)) {
        const patchValue = patch[ key ]
        const baseValue = out[ key ]

        out[ key ] = isRecord(baseValue) && isRecord(patchValue) ?
            deepMerge(baseValue, patchValue) :
            patchValue
    }

    return out
}

/**
 * Tests whether `prefix` matches the leading segments of `segments`,
 * used to fan out change notifications from child paths to ancestors.
 *
 * @param prefix - The subscribed path segments.
 * @param segments - The changed path segments.
 * @returns `true` when `segments` starts with `prefix`.
 */
export function isPrefix(prefix: PropertyKey[], segments: PropertyKey[]): boolean {
    if (prefix.length > segments.length) {
        return false
    }

    for (let i = 0; i < prefix.length; i++) {
        if (prefix[ i ] !== segments[ i ]) {
            return false
        }
    }
    
    return true
}


# MemoryX

![NPM Last Update](https://img.shields.io/npm/last-update/%40darcas%2Fmemoryx?style=for-the-badge)
![NPM Version](https://img.shields.io/npm/v/%40darcas%2Fmemoryx?style=for-the-badge)
![NPM Downloads](https://img.shields.io/npm/dy/%40darcas%2Fmemoryx?style=for-the-badge)

![NPM License](https://img.shields.io/npm/l/%40darcas%2Fmemoryx?style=for-the-badge)

MemoryX is a simple, lightweight, and browser-based key-value storage utility. It allows you to store, retrieve, and manage data in a global memory object that is scoped by a namespace. This enables you to organize your data into isolated storage areas within the browser.

## Features

- **Namespace Support**: Store data in separate namespaces to avoid collisions.
- **CRUD Operations**: Easily get, set, delete, and check the existence of data.
- **Global Storage**: Uses the `window` object to persist data globally within the browser session.
- **Memory Management**: Clear and manage data for each namespace individually.

## Installation

To install `MemoryX` in your project, run the following npm command:

```bash
npm install @darcas/memoryx
```

Or, if you're using yarn:

```bash
yarn add @darcas/memoryx
```

## Usage

```ts
import { MemoryX } from '@darcas/memoryx';

// Create a new instance with a custom namespace (default is '_global')
const memory = new MemoryX('myNamespace');

// Store data
memory.set('user.name', 'John Doe');
memory.set('user.age', 30);

// Retrieve data
const name = memory.get('user.name'); // 'John Doe'
const age = memory.get('user.age'); // 30

// Check if a key exists
const hasName = memory.has('user.name'); // true
const hasEmail = memory.has('user.email'); // false

// Delete data
memory.del('user.age');

// Clear the namespace
memory.destroy();
```

## API

### `MemoryX(namespace: string)`

The constructor takes an optional `namespace` argument. If not provided, the default namespace `_global` will be used.

- **Parameters**:
  - `namespace` (optional): A string that defines the namespace under which the data will be stored. Default is `_global`.

### `destroy()`

Clears all the data stored under the current namespace.

```ts
memory.destroy();
```

### `get<T = unknown>(path: PropertyPath, def: T | null = null): T`

Retrieves the value stored at the specified `path`. If the path doesn't exist, it returns the provided default value (or `null` if no default is provided).

- **Parameters**:
  - `path`: A string or array representing the key path.
  - `def`: The default value to return if the key doesn't exist (optional).

- **Returns**: The value stored at the specified `path`.

```ts
const name = memory.get('user.name', 'Default Name'); // 'John Doe' or 'Default Name'
```

### `set<T = unknown>(path: PropertyPath, value: T): void`

Stores a value at the specified `path`.

- **Parameters**:
  - `path`: The key path where the value should be stored.
  - `value`: The value to be stored.

```ts
memory.set('user.email', 'john@example.com');
```

### `del(path: PropertyPath): void`

Deletes the value stored at the specified `path`.

- **Parameters**:
  - `path`: The key path to be deleted.

```ts
memory.del('user.email');
```

### `has(path: string): boolean`

Checks if a value exists at the specified `path`.

- **Parameters**:
  - `path`: The key path to check.

- **Returns**: `true` if the key exists, `false` otherwise.

```ts
const exists = memory.has('user.name'); // true or false
```

### `namespaces`

Static getter that returns an array of all namespaces currently stored in memory.

```ts
const namespaces = MemoryX.namespaces; // ['_global', 'myNamespace']
```

### `subscribe(path | '*', listener): () => void`

Subscribes a listener to changes at the specified `path`. The listener is also notified when any descendant path changes. Use the `'*'` wildcard to listen to every change in the namespace. Returns an unsubscribe function.

```ts
const unsubscribe = memory.subscribe('user', (value, previous) => {
    console.log('changed:', value, 'was:', previous);
});

memory.set('user.name', 'Bob'); // listener fires
unsubscribe(); // stop listening
```

### `all(): Record<string, unknown>`

Returns a shallow copy of all data in the current namespace.

### `keys(): string[]`

Returns the top-level keys of the current namespace.

### `merge(path, patch): void`

Deep-merges a plain object into the value stored at `path`.

```ts
memory.merge('user', { age: 31 });
```

### `push(path, value): void`

Appends a value to the array stored at `path` (creates the array if missing).

### `inc(path, by?): void` / `dec(path, by?): void`

Increments/decrements the numeric value at `path` by `by` (default `1`). Missing or non-numeric values are treated as `0`.

### `snapshot(): string` / `restore(json): void`

Exports the namespace as a JSON string and restores it back. `restore` replaces the entire namespace content and throws a `TypeError` on invalid input.

## Server-side rendering

MemoryX resolves its global root from `window` when available and falls back to `globalThis`, so it can be used safely in Node/SSR environments.

## Testing

```bash
npm test
```

The test suite (Vitest) includes differential tests against lodash to guarantee that path resolution behaves exactly like the lodash functions it replaced.

## Example

Here is a full example:

```ts
import { MemoryX } from '@darcas/memoryx';

// Create a new instance
const memory = new MemoryX('myNamespace');

// Set values
memory.set('user.name', 'Alice');
memory.set('user.email', 'alice@example.com');

// Get values
console.log(memory.get('user.name')); // 'Alice'
console.log(memory.get('user.email')); // 'alice@example.com'

// Check existence
console.log(memory.has('user.name')); // true
console.log(memory.has('user.phone')); // false

// Delete a value
memory.del('user.email');

// Clear the namespace
memory.destroy();
```

## Behavior notes and limitations

Things worth knowing before relying on MemoryX in production:

### Reactivity

- Notifications are **synchronous** and fire **once per mutation**: three consecutive `set()` calls trigger three notifications. There is no built-in batching, debounce, or async mode — wrap multi-write sequences in your own logic if you need coalescing.
- Listeners run after the mutation is applied; `previous` is the value held immediately before that single mutation.
- Subscriptions are **per instance** (per namespace): an instance does not observe writes made through a different instance of another namespace.
- A listener that throws propagates the exception to the caller of `set`/`del`/etc. Do not let listeners throw.

### Values and serialization

- The store holds values **by reference**: `all()` returns a shallow copy, so mutating a nested object obtained from `get()` mutates the store. Copy explicitly if you need isolation.
- `snapshot()`/`restore()` use JSON: `Map`, `Set`, functions, `undefined`, and class instances are lost or degraded (`NaN` → `null`, `Date` → ISO string). Round-trip only JSON-safe data.
- Storing `undefined` via `set(path, undefined)` creates the path but `get()` cannot distinguish it from a missing path (both return the default). Use `has()` for existence checks.

### Lifecycle

- Instances of the same namespace **share state**, including across separate bundles on the same page.
- `destroy()` removes the namespace from the store. Every instance of that namespace is affected (they all read the same store), and each one lazily recreates it on its next access.
- `restore()` replaces the whole namespace content and notifies every subscriber.

### Path engine

- Path resolution is a verified drop-in replacement for lodash's `get`/`set`/`has`/`unset` (differential-tested against real lodash), including array-vs-object intermediate creation and sparse-array `has()`.
- One intentional divergence: writing to any path containing `__proto__`, `constructor`, or `prototype` **aborts the entire operation** (lodash would skip only the offending segment). This guards against prototype pollution.

### Environment

- ESM-only package (`"type": "module"`). CommonJS consumers must use dynamic `import()`.
- Output targets ES2015: no IE11 support.
- In SSR/Node the shared store lives on `globalThis`: state is per-process and not shared across workers or server instances.

## Contributing

If you'd like to contribute to the project, feel free to fork it and create a pull request. Please ensure that your changes are well-tested and properly documented.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

---

Made with ❤️ by [Dario Casertano (DarCas)](https://github.com/DarCas).

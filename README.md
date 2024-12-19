
# MemoryX

[![npm version](https://badge.fury.io/js/@darcas%2Fmemoryx.svg)](https://badge.fury.io/js/@darcas%2Fmemoryx)
![NPM License](https://img.shields.io/npm/l/%40darcas%2Fmemoryx)
![NPM Downloads](https://img.shields.io/npm/dy/%40darcas%2Fmemoryx)

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
import MemoryX from '@darcas/memoryx';

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

### `get<T = never>(path: PropertyPath, def: T | null = null): T`

Retrieves the value stored at the specified `path`. If the path doesn't exist, it returns the provided default value (or `null` if no default is provided).

- **Parameters**:
  - `path`: A string or array representing the key path.
  - `def`: The default value to return if the key doesn't exist (optional).

- **Returns**: The value stored at the specified `path`.

```ts
const name = memory.get('user.name', 'Default Name'); // 'John Doe' or 'Default Name'
```

### `set<T = never>(path: PropertyPath, value: T): void`

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

### `namespaces(): string[]`

Returns an array of all namespaces currently stored in memory.

```ts
const namespaces = MemoryX.namespaces(); // ['_global', 'myNamespace']
```

## Example

Here is a full example:

```ts
import MemoryX from '@darcas/memoryx';

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

## Contributing

If you'd like to contribute to the project, feel free to fork it and create a pull request. Please ensure that your changes are well-tested and properly documented.

## License

MemoryX is licensed under the MIT License. See the LICENSE file for more information.

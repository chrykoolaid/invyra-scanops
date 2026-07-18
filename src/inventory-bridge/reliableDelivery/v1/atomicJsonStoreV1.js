import {
  chmodSync,
  existsSync,
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertPlainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
}

export function createAtomicJsonStoreV1(options = {}) {
  const directory = typeof options.directory === 'string' ? options.directory.trim() : '';
  const fileName = typeof options.fileName === 'string' ? options.fileName.trim() : '';
  assertPlainObject(options.initialState, 'initialState must be a plain object.');
  if (!directory) throw new Error('An explicit persistence directory is required.');
  if (!fileName || basename(fileName) !== fileName || !/^[a-z0-9._-]+$/i.test(fileName)) {
    throw new Error('fileName must be a simple file name.');
  }

  const root = resolve(directory);
  const filePath = join(root, fileName);
  let opened = false;
  let state = null;
  let revision = 0;

  function persist(nextState) {
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    let fileDescriptor = null;
    try {
      fileDescriptor = openSync(tempPath, 'w', 0o600);
      writeFileSync(fileDescriptor, `${JSON.stringify(nextState, null, 2)}\n`, { encoding: 'utf8' });
      fsyncSync(fileDescriptor);
    } finally {
      if (fileDescriptor !== null) closeSync(fileDescriptor);
    }
    chmodSync(tempPath, 0o600);
    renameSync(tempPath, filePath);
    chmodSync(filePath, 0o600);
    try {
      const directoryDescriptor = openSync(root, 'r');
      try { fsyncSync(directoryDescriptor); } finally { closeSync(directoryDescriptor); }
    } catch {
      // Directory fsync is not available on every supported platform.
    }
  }

  function open() {
    if (opened) return { opened: false, reason: 'STORE_ALREADY_OPEN', filePath, revision };
    mkdirSync(root, { recursive: true, mode: 0o700 });
    chmodSync(root, 0o700);
    if (existsSync(filePath)) {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
      assertPlainObject(parsed, 'Persisted reliable-delivery state is invalid.');
      state = parsed;
    } else {
      state = clone(options.initialState);
      persist(state);
    }
    opened = true;
    revision += 1;
    return { opened: true, filePath, revision };
  }

  function assertOpen() {
    if (!opened) throw new Error('Reliable-delivery store is not open.');
  }

  function getSnapshot() {
    assertOpen();
    return clone(state);
  }

  function mutate(mutator) {
    assertOpen();
    if (typeof mutator !== 'function') throw new Error('mutator must be a function.');
    const draft = clone(state);
    const result = mutator(draft);
    assertPlainObject(draft, 'Reliable-delivery state mutation produced invalid state.');
    persist(draft);
    state = draft;
    revision += 1;
    return { result: clone(result ?? null), snapshot: clone(state), revision };
  }

  function close() {
    if (!opened) return { closed: false, reason: 'STORE_NOT_OPEN', revision };
    opened = false;
    state = null;
    return { closed: true, revision };
  }

  function destroyForTest() {
    if (opened) close();
    rmSync(filePath, { force: true });
  }

  return Object.freeze({
    filePath,
    open,
    getSnapshot,
    mutate,
    close,
    destroyForTest,
    isOpen: () => opened,
    getRevision: () => revision,
  });
}

import { onDestroy, untrack as svelteUntrack } from "svelte";

export type Accessor<T> = () => T;
export type Setter<T> = (value: T | ((previous: T) => T)) => T;

interface CleanupScope {
  cleanups: Array<() => void>;
}

interface OnOptions {
  defer?: boolean;
}

const cleanupScopes: CleanupScope[] = [];

const runCleanups = (scope: CleanupScope): void => {
  for (let index = scope.cleanups.length - 1; index >= 0; index -= 1) {
    scope.cleanups[index]();
  }
  scope.cleanups.length = 0;
};

const withCleanupScope = <T>(scope: CleanupScope, callback: () => T): T => {
  cleanupScopes.push(scope);
  try {
    return callback();
  } finally {
    cleanupScopes.pop();
  }
};

export const createSignal = <T>(initialValue: T): [Accessor<T>, Setter<T>] => {
  let value = $state.raw(initialValue);

  const read = (): T => value;
  const write = (next: T | ((previous: T) => T)): T => {
    value = typeof next === "function" ? (next as (previous: T) => T)(value) : next;
    return value;
  };

  return [read, write];
};

export const createMemo = <T>(compute: () => T): Accessor<T> => {
  const derivedValue = $derived.by(compute);
  return () => derivedValue;
};

export const createEffect = (effect: () => void | (() => void)): void => {
  $effect(() => {
    const scope: CleanupScope = { cleanups: [] };
    const returnedCleanup = withCleanupScope(scope, effect);
    if (typeof returnedCleanup === "function") {
      scope.cleanups.push(returnedCleanup);
    }
    return () => runCleanups(scope);
  });
};

export const onMount = (mount: () => void | (() => void)): void => {
  $effect(() => {
    const scope: CleanupScope = { cleanups: [] };
    withCleanupScope(scope, () => {
      const cleanup = svelteUntrack(mount);
      if (typeof cleanup === "function") {
        scope.cleanups.push(cleanup);
      }
    });
    return () => runCleanups(scope);
  });
};

export const onCleanup = (cleanup: () => void): void => {
  const scope = cleanupScopes[cleanupScopes.length - 1];
  if (scope) {
    scope.cleanups.push(cleanup);
    return;
  }
  onDestroy(cleanup);
};

export const untrack = <T>(callback: () => T): T => svelteUntrack(callback);

export const batch = <T>(callback: () => T): T => callback();

interface OnFunction {
  <T, R>(
    dependency: Accessor<T>,
    callback: (value: T, previous: T | undefined) => R,
    options?: OnOptions,
  ): () => void;
  <T extends readonly unknown[], R>(
    dependencies: { [K in keyof T]: Accessor<T[K]> },
    callback: (value: T, previous: T | undefined) => R,
    options?: OnOptions,
  ): () => void;
}

export const on: OnFunction = (
  dependencies: Accessor<unknown> | Accessor<unknown>[],
  callback: (value: never, previous: never) => unknown,
  options: OnOptions = {},
): (() => void) => {
  const dependencyList = Array.isArray(dependencies) ? dependencies : [dependencies];
  const hasDeferredFirstRun = options.defer === true;
  let isFirstRun = true;
  let previousValue: unknown;

  return () => {
    const values = dependencyList.map((dependency) => dependency());
    const nextValue: unknown = Array.isArray(dependencies) ? values : values[0];
    const previous = previousValue;
    previousValue = nextValue;

    if (isFirstRun) {
      isFirstRun = false;
      if (hasDeferredFirstRun) return;
    }

    untrack(() => callback(nextValue as never, previous as never));
  };
};

export const mapArray = <Item, Mapped>(
  list: Accessor<Item[]>,
  map: (item: Item, index: number) => Mapped,
): Accessor<Mapped[]> => {
  const derivedValue = $derived.by(() => list().map((item, index) => map(item, index)));
  return () => derivedValue;
};

interface ResourceActions {
  refetch: () => void;
  loading: Accessor<boolean>;
  error: Accessor<unknown>;
}

export const createResource = <Source, Value>(
  source: Accessor<Source>,
  fetcher: (source: Source) => Promise<Value>,
): [Accessor<Value | undefined>, ResourceActions] => {
  let value = $state.raw<Value | undefined>(undefined);
  let loading = $state.raw(false);
  let error = $state.raw<unknown>(undefined);
  let requestVersion = 0;

  const run = (sourceValue: Source): void => {
    const currentVersion = ++requestVersion;
    loading = true;
    void Promise.resolve(fetcher(sourceValue))
      .then((result) => {
        if (currentVersion !== requestVersion) return;
        value = result;
        error = undefined;
        loading = false;
      })
      .catch((caughtError: unknown) => {
        if (currentVersion !== requestVersion) return;
        error = caughtError;
        loading = false;
      });
  };

  createEffect(on(source, run));

  return [() => value, { refetch: () => run(untrack(source)), loading: () => loading, error: () => error }];
};

export const createRoot = <T>(root: (dispose: () => void) => T): T => {
  let result: T | undefined;
  let teardown: (() => void) | undefined;
  const scope: CleanupScope = { cleanups: [] };
  let isDisposed = false;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    runCleanups(scope);
    teardown?.();
  };

  teardown = $effect.root(() => {
    result = withCleanupScope(scope, () => root(dispose));
  });

  return result as T;
};

type ProduceFunction<Draft> = ((draft: Draft) => void) & { [PRODUCE_MARKER]?: boolean };

const PRODUCE_MARKER = Symbol("produce");

export const produce = <Draft>(mutator: (draft: Draft) => void): ProduceFunction<Draft> => {
  const producer = (draft: Draft): void => mutator(draft);
  producer[PRODUCE_MARKER] = true;
  return producer;
};

const applyPathValue = (root: unknown, path: PropertyKey[], lastValue: unknown): void => {
  let target: Record<PropertyKey, unknown> = root as Record<PropertyKey, unknown>;
  for (let index = 0; index < path.length - 1; index += 1) {
    target = target[path[index]] as Record<PropertyKey, unknown>;
  }
  const lastKey = path[path.length - 1];
  target[lastKey] =
    typeof lastValue === "function"
      ? (lastValue as (previous: unknown) => unknown)(target[lastKey])
      : lastValue;
};

interface StoreSetter<State> {
  (producer: ProduceFunction<State>): void;
  (...pathAndValue: [...PropertyKey[], unknown]): void;
}

export const createStore = <State extends object>(
  initialState: State,
): [State, StoreSetter<State>] => {
  const store = $state(initialState);

  const setStore: StoreSetter<State> = (...args: unknown[]): void => {
    if (args.length === 1) {
      const [producer] = args;
      if (typeof producer === "function") {
        (producer as (draft: unknown) => void)(store);
      }
      return;
    }
    applyPathValue(store, args.slice(0, -1) as PropertyKey[], args[args.length - 1]);
  };

  return [store, setStore];
};

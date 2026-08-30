export function createAutosave<T>(
  persist: (value: T) => Promise<void>,
  delayMs = 400,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;
  let chain: Promise<void> = Promise.resolve();

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    chain = chain.then(async () => {
      while (pending !== null) {
        const value = pending;
        pending = null;
        await persist(value);
      }
    });
    return chain;
  };

  return {
    queue(value: T) {
      pending = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, delayMs);
    },
    flush,
  };
}

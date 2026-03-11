function streamKey(taskId, agent = null) {
  return `${taskId}::${agent || "*"}`;
}

export function isTerminalEvent(eventType) {
  return eventType === "completed" || eventType === "failed";
}

function createStreamState() {
  return {
    history: [],
    subscribers: new Set(),
    waiters: new Set(),
    nextCursor: 1,
    closed: false
  };
}

function createSubscriber(stream) {
  const queue = stream.history.map((record) => record.event);
  let notify = null;
  let done = false;

  if (stream.closed && queue.length === 0) {
    done = true;
  }

  const iterator = {
    next() {
      if (queue.length > 0) {
        return Promise.resolve({ value: queue.shift(), done: false });
      }
      if (done || stream.closed) {
        done = true;
        stream.subscribers.delete(subscriber);
        return Promise.resolve({ value: undefined, done: true });
      }

      return new Promise((resolve) => {
        notify = resolve;
      });
    },
    return() {
      done = true;
      stream.subscribers.delete(subscriber);
      if (notify) {
        notify({ value: undefined, done: true });
        notify = null;
      }
      return Promise.resolve({ value: undefined, done: true });
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };

  const subscriber = {
    push(event) {
      if (done) return;
      if (notify) {
        const resolve = notify;
        notify = null;
        resolve({ value: event, done: false });
        return;
      }
      queue.push(event);
    },
    close() {
      done = true;
      if (notify) {
        const resolve = notify;
        notify = null;
        resolve({ value: undefined, done: true });
      }
    },
    iterator
  };

  return subscriber;
}

export function createTaskEventHub({ historyLimit = 20 } = {}) {
  const streams = new Map();

  function getStream(taskId, agent = null) {
    const key = streamKey(taskId, agent);
    if (!streams.has(key)) {
      streams.set(key, createStreamState());
    }
    return streams.get(key);
  }

  function applyEvent(stream, event) {
    const record = {
      cursor: stream.nextCursor++,
      event
    };
    stream.history.push(record);
    if (stream.history.length > historyLimit) {
      stream.history.splice(0, stream.history.length - historyLimit);
    }
    for (const subscriber of stream.subscribers) {
      subscriber.push(event);
    }
    for (const waiter of stream.waiters) {
      waiter({
        events: stream.history.filter((item) => item.cursor > waiter.cursor),
        next_cursor: stream.nextCursor - 1,
        done: isTerminalEvent(event?.event_type)
      });
    }
    stream.waiters.clear();
    if (isTerminalEvent(event?.event_type)) {
      stream.closed = true;
      for (const subscriber of stream.subscribers) {
        subscriber.close();
      }
      stream.subscribers.clear();
    }
  }

  return {
    publish(event) {
      const taskId = event?.task_id;
      const agent = event?.agent ?? null;
      applyEvent(getStream(taskId, agent), event);
      if (agent !== null) {
        applyEvent(getStream(taskId, null), event);
      }
    },

    subscribe(taskId, agent = null) {
      const stream = getStream(taskId, agent);
      const subscriber = createSubscriber(stream);
      if (!stream.closed) {
        stream.subscribers.add(subscriber);
      }
      return subscriber.iterator;
    },

    async waitForEvents(taskId, agent = null, { cursor = 0, timeoutMs = 0 } = {}) {
      const stream = getStream(taskId, agent);
      const immediate = stream.history.filter((item) => item.cursor > cursor);
      if (immediate.length > 0 || stream.closed || timeoutMs <= 0) {
        return {
          events: immediate,
          next_cursor: immediate.at(-1)?.cursor ?? cursor,
          done: stream.closed
        };
      }

      return new Promise((resolve) => {
        const waiter = Object.assign(
          (payload) => {
            clearTimeout(timer);
            resolve(payload);
          },
          { cursor }
        );
        stream.waiters.add(waiter);
        const timer = setTimeout(() => {
          stream.waiters.delete(waiter);
          resolve({
            events: [],
            next_cursor: cursor,
            done: stream.closed
          });
        }, timeoutMs);
      });
    }
  };
}

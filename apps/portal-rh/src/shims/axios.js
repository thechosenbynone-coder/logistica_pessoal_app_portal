function createInterceptorManager() {
  const handlers = [];
  return {
    use(onFulfilled, onRejected) {
      handlers.push({ onFulfilled, onRejected });
      return handlers.length - 1;
    },
    handlers,
  };
}

async function runInterceptors(handlers, payload, mode) {
  let current = payload;
  for (const handler of handlers) {
    if (mode === 'fulfilled' && typeof handler.onFulfilled === 'function') {
      current = await handler.onFulfilled(current);
    }
    if (mode === 'rejected' && typeof handler.onRejected === 'function') {
      current = await handler.onRejected(current);
    }
  }
  return current;
}

function create(config = {}) {
  const defaults = {
    baseURL: config.baseURL || '',
    headers: config.headers || {},
  };

  const interceptors = {
    request: createInterceptorManager(),
    response: createInterceptorManager(),
  };

  async function request(method, url, data, requestConfig = {}) {
    let cfg = {
      method,
      url,
      data,
      headers: { ...defaults.headers, ...(requestConfig.headers || {}) },
      ...requestConfig,
    };

    cfg = await runInterceptors(interceptors.request.handlers, cfg, 'fulfilled');

    const fullUrl = `${defaults.baseURL || ''}${cfg.url}`;
    const fetchOptions = {
      method: cfg.method,
      headers: cfg.headers,
    };

    if (cfg.data !== undefined) {
      fetchOptions.body = JSON.stringify(cfg.data);
      fetchOptions.headers = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      };
    }

    try {
      const response = await fetch(fullUrl, fetchOptions);
      const text = await response.text();
      let parsed = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      let normalized = {
        data: parsed,
        status: response.status,
        config: cfg,
        headers: {},
      };

      normalized = await runInterceptors(interceptors.response.handlers, normalized, 'fulfilled');

      if (!response.ok) {
        const err = new Error(`Request failed with status ${response.status}`);
        err.response = normalized;
        err.config = cfg;
        throw err;
      }

      return normalized;
    } catch (error) {
      let err = error;
      err.config = err.config || cfg;
      try {
        err = await runInterceptors(interceptors.response.handlers, err, 'rejected');
      } catch (interceptedError) {
        err = interceptedError;
      }
      throw err;
    }
  }

  return {
    interceptors,
    get(url, requestConfig) {
      return request('GET', url, undefined, requestConfig);
    },
    post(url, data, requestConfig) {
      return request('POST', url, data, requestConfig);
    },
  };
}

export default { create };

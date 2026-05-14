import express from 'express';

let patched = false;

export function patchAsyncErrors() {
  if (patched) return;

  // Correção: captura throw/reject assíncrono sem reescrever todas as rotas.
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const methods = ['use', 'get', 'post', 'put', 'patch', 'delete', 'options', 'all'];

  for (const method of methods) {
    const original = express.Router.prototype[method];
    express.Router.prototype[method] = function patchedMethod(...handlers) {
      const wrapped = handlers.map((handler) => {
        if (typeof handler !== 'function') return handler;
        if (handler.length === 4) return handler;
        return wrap(handler);
      });
      return original.call(this, ...wrapped);
    };
  }

  patched = true;
}

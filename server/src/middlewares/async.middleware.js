import express from 'express';

let patched = false;

function wrapHandler(handler) {
  if (typeof handler !== 'function') return handler;
  if (handler.length === 4) return handler;
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function flattenAndWrapHandlers(handlers) {
  const result = [];

  for (const handler of handlers) {
    if (Array.isArray(handler)) {
      result.push(...flattenAndWrapHandlers(handler));
      continue;
    }
    result.push(wrapHandler(handler));
  }

  return result;
}

export function patchAsyncErrors() {
  if (patched) return;

  // Correção: suporte a arrays aninhados de middlewares sem perder captura de async throw/reject.
  const methods = ['use', 'get', 'post', 'put', 'patch', 'delete', 'options', 'all'];

  for (const method of methods) {
    const original = express.Router.prototype[method];
    express.Router.prototype[method] = function patchedMethod(...handlers) {
      return original.call(this, ...flattenAndWrapHandlers(handlers));
    };
  }

  patched = true;
}

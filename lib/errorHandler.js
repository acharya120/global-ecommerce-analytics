export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

// Remove anything that looks like a credential before a message leaves the server.
export function sanitizeMessage(msg) {
  return String(msg ?? 'Unknown error')
    .replace(/(api[_-]?key|token|authorization)=?[:=]?\s*[^&\s"']+/gi, '$1=[redacted]')
    .slice(0, 200);
}

// fn receives an AbortSignal that is aborted on timeout.
export async function withTimeout(fn, ms, label = 'Operation') {
  const ctrl = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new AppError(504, 'TIMEOUT', `${label} timed out after ${ms} ms`));
    }, ms);
  });
  try {
    return await Promise.race([fn(ctrl.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function errorResponse(err, extraHeaders = {}) {
  const known = err instanceof AppError;
  const status = known ? err.status : 500;
  const body = { error: { code: known ? err.code : 'INTERNAL', message: known ? err.message : 'Something went wrong on the server.' } };
  if (!known) console.error('[api] unexpected error:', sanitizeMessage(err?.message));
  return Response.json(body, { status, headers: extraHeaders });
}

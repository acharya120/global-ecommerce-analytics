import { AppError } from '../../lib/errorHandler.js';
export function unavailableAdapter(id, name, reason) {
  return { id, name, async search() { throw new AppError(503, 'UNAVAILABLE', reason); } };
}

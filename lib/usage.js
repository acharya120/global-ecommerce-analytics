// In-memory API usage log + daily call limits (per server instance; on serverless this resets on cold start).
const state = { day: '', counts: {}, log: [] };
const roll = () => {
  const d = new Date().toISOString().slice(0, 10);
  if (state.day !== d) { state.day = d; state.counts = {}; }
};
export function recordUsage(provider, meta = {}) {
  roll();
  state.counts[provider] = (state.counts[provider] || 0) + 1;
  state.log.push({ t: new Date().toISOString(), provider, ...meta });
  if (state.log.length > 100) state.log.shift();
}
export const usageCount = (p) => { roll(); return state.counts[p] || 0; };
export const underLimit = (p, max) => usageCount(p) < max;
export const getUsage = () => { roll(); return { day: state.day, counts: { ...state.counts }, recent: state.log.slice(-20) }; };
export const resetUsage = () => { state.day = ''; state.counts = {}; state.log = []; };

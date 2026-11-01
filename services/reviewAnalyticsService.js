// Rule-based review analytics (free, no external calls) + OPTIONAL OpenAI summarizer (off by default).
import { getConfig } from '../lib/config.js';
import { cached } from '../lib/cache.js';
import { recordUsage, underLimit } from '../lib/usage.js';
import { hashString, sanitizeText } from './_text.js';

export const RULE_LABEL = 'Automated rule-based insight — keyword analysis of the supplied review text, not verified AI analysis.';
export const MIN_REVIEWS = 3;

const THEMES = {
  battery: { label: 'Battery performance', conLabel: 'Battery complaints', kw: ['battery', 'charge', 'charging', 'backup', 'drain', 'drains'] },
  camera: { label: 'Camera quality', conLabel: 'Camera quality concerns', kw: ['camera', 'photo', 'photos', 'video', 'zoom', 'selfie', 'portrait'] },
  display: { label: 'Display', conLabel: 'Display issues', kw: ['display', 'screen', 'brightness', 'amoled', 'oled'] },
  performance: { label: 'Performance', conLabel: 'Performance issues', kw: ['performance', 'fast', 'smooth', 'lag', 'laggy', 'processor', 'gaming', 'speed'] },
  build: { label: 'Build quality', conLabel: 'Build quality concerns', kw: ['build', 'design', 'premium', 'body', 'finish'] },
  heating: { label: null, conLabel: 'Heating', kw: ['heat', 'heats', 'heating', 'hot', 'overheat', 'overheating', 'warm'], complaint: true },
  software: { label: null, conLabel: 'Software problems', kw: ['software', 'update', 'updates', 'bug', 'bugs', 'buggy', 'crash', 'crashes', 'glitch', 'ads'], complaint: true },
  durability: { label: null, conLabel: 'Durability', kw: ['scratch', 'scratches', 'crack', 'cracked', 'fragile', 'broke', 'broken', 'flimsy', 'dent'], complaint: true },
  value: { label: null, conLabel: 'Price / value concerns', kw: ['expensive', 'overpriced', 'costly', 'pricey'], complaint: true },
};
const POS = new Set('great excellent amazing good love loved smooth fast superb best impressive brilliant awesome solid premium bright sharp stunning crisp fantastic gorgeous incredible happy quick clean decent'.split(' '));
const NEG = new Set('bad poor worst disappointing disappointed slow lag laggy drains drain buggy annoying weak average short issue issues problem problems hot'.split(' '));
const NEGATORS = new Set(['not', 'no', 'never', "isn't", "doesn't", 'without', 'hardly']);

export function analyzeReviews(texts) {
  const reviews = (texts ?? []).filter((t) => typeof t === 'string' && t.trim().length > 3);
  if (reviews.length < MIN_REVIEWS) {
    return { sufficient: false, source: 'rules', label: RULE_LABEL, reviewsAnalyzed: reviews.length, pros: [], cons: [], verdict: `Not enough review text to analyze (${reviews.length} available, ${MIN_REVIEWS} needed). No insights were generated.`, sentiment: null };
  }
  const stats = Object.fromEntries(Object.keys(THEMES).map((k) => [k, { pos: 0, neg: 0 }]));
  let pos = 0, neg = 0;
  for (const review of reviews) {
    for (const clause of review.toLowerCase().split(/[.!?;]|\bbut\b|\bthough\b|\balthough\b/)) {
      const tokens = clause.replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
      let score = 0;
      tokens.forEach((t, i) => {
        const flip = tokens.slice(Math.max(0, i - 2), i).some((x) => NEGATORS.has(x)) ? -1 : 1;
        if (POS.has(t)) score += flip; else if (NEG.has(t)) score -= flip;
      });
      for (const [k, th] of Object.entries(THEMES)) {
        const hitIdx = tokens.findIndex((t) => th.kw.includes(t));
        if (hitIdx < 0) continue;
        const negated = tokens.slice(Math.max(0, hitIdx - 2), hitIdx).some((x) => NEGATORS.has(x));
        let s = score;
        if (th.complaint && s === 0) s = negated ? 1 : -1; // a complaint topic mentioned without praise is a complaint
        if (s > 0) stats[k].pos += 1; else if (s < 0) stats[k].neg += 1;
      }
      if (score > 0) pos += 1; else if (score < 0) neg += 1;
    }
  }
  const pros = [], cons = [];
  for (const [k, th] of Object.entries(THEMES)) {
    const { pos: p, neg: n } = stats[k];
    if (th.label && p > n) pros.push({ theme: th.label, mentions: p });
    if (n > 0 && (th.complaint || n >= p)) cons.push({ theme: th.conLabel, mentions: n });
  }
  pros.sort((a, b) => b.mentions - a.mentions); cons.sort((a, b) => b.mentions - a.mentions);
  const total = pos + neg;
  const ratio = total ? (pos - neg) / total : 0;
  const mood = ratio > 0.5 ? 'Mostly positive' : ratio > 0.15 ? 'Leaning positive' : ratio >= -0.15 ? 'Mixed' : 'Leaning negative';
  const top = pros.slice(0, 2).map((p) => p.theme.toLowerCase()).join(' and ');
  const worry = cons[0]?.theme.toLowerCase();
  const verdict = `${mood} sentiment across ${reviews.length} sample reviews.${top ? ` Praised for ${top}.` : ''}${worry ? ` Most common complaint: ${worry}.` : ''}`;
  return { sufficient: true, source: 'rules', label: RULE_LABEL, reviewsAnalyzed: reviews.length, pros: pros.slice(0, 5), cons: cons.slice(0, 5), verdict, sentiment: { positive: pos, negative: neg, mood } };
}

async function summarizeWithOpenAI(texts, config, fetchImpl, signal) {
  const sample = texts.slice(0, 30).map((t) => sanitizeText(t, 400));
  recordUsage('openai', { reviews: sample.length });
  const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.keys.openai}`, 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: config.openaiModel, temperature: 0.2, max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You summarize product reviews. Use ONLY the supplied reviews. Never invent reviews or facts. Reply as JSON: {"pros":[string],"cons":[string],"verdict":string}.' },
        { role: 'user', content: JSON.stringify(sample) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  return {
    sufficient: true, source: 'openai', reviewsAnalyzed: sample.length,
    label: 'Generated by OpenAI from the supplied review text (enabled by the site owner). Verify before relying on it.',
    pros: (parsed.pros ?? []).slice(0, 5).map((t) => ({ theme: String(t).slice(0, 80), mentions: null })),
    cons: (parsed.cons ?? []).slice(0, 5).map((t) => ({ theme: String(t).slice(0, 80), mentions: null })),
    verdict: String(parsed.verdict ?? '').slice(0, 300), sentiment: null,
  };
}

/** Insights for one product. Cached. OpenAI is used only if explicitly enabled AND under its daily limit; otherwise rules. */
export async function getInsights({ key, texts, config = getConfig(), fetchImpl = fetch }) {
  const clean = (texts ?? []).filter((t) => typeof t === 'string');
  const cacheKey = `analytics:${config.aiEnabled ? 'ai' : 'rules'}:${key}:${hashString(clean.join('|'))}`;
  const { value } = await cached(cacheKey, config.cacheTtlSeconds, async () => {
    if (config.aiEnabled && clean.length >= MIN_REVIEWS && underLimit('openai', config.aiMaxCallsPerDay)) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), config.requestTimeoutMs);
        try { return await summarizeWithOpenAI(clean, config, fetchImpl, ctrl.signal); } finally { clearTimeout(t); }
      } catch { /* no retry: fall back to free rule-based analytics */ }
    }
    return analyzeReviews(clean);
  }, config);
  return value;
}

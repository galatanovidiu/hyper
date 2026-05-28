// Pure-JS statistical primitives. No external dependencies.
//
// Public API:
//   wilsonScoreCI(successes, trials, { confidence })   — binomial proportion CI for small n.
//   clopperPearsonCI(successes, trials, { confidence }) — exact binomial CI (no normal approximation).
//   bootstrapCI(values, { statistic, resamples, confidence, rng }) — percentile-method bootstrap CI.
//   eloUpdate(ratingA, ratingB, outcomeA, { kFactor }) — standard Elo update for a head-to-head outcome.
//   median(values)                                     — convenience: median of a numeric array.

const Z_SCORES = {
  0.90: 1.6448536269514722,
  0.95: 1.959963984540054,
  0.99: 2.5758293035489004,
};

function zForConfidence(confidence) {
  const key = round4(confidence);
  if (key in Z_SCORES) return Z_SCORES[key];
  throw new Error(`Unsupported confidence level ${confidence}; supported: ${Object.keys(Z_SCORES).join(", ")}`);
}

function round4(x) {
  return Math.round(x * 1e4) / 1e4;
}

export function wilsonScoreCI(successes, trials, { confidence = 0.95 } = {}) {
  if (!Number.isInteger(successes) || !Number.isInteger(trials)) {
    throw new Error("successes and trials must be integers");
  }
  if (trials <= 0) throw new Error("trials must be positive");
  if (successes < 0 || successes > trials) throw new Error("successes out of range");

  const z = zForConfidence(confidence);
  const n = trials;
  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const radius = (z * Math.sqrt((p * (1 - p) / n) + (z2 / (4 * n * n)))) / denom;
  const lower = Math.max(0, centre - radius);
  const upper = Math.min(1, centre + radius);
  return { lower, upper, point: p, method: "wilson", confidence };
}

export function clopperPearsonCI(successes, trials, { confidence = 0.95 } = {}) {
  if (!Number.isInteger(successes) || !Number.isInteger(trials)) {
    throw new Error("successes and trials must be integers");
  }
  if (trials <= 0) throw new Error("trials must be positive");
  if (successes < 0 || successes > trials) throw new Error("successes out of range");

  const alpha = 1 - confidence;
  const k = successes;
  const n = trials;
  const lower = k === 0 ? 0 : betaQuantile(alpha / 2, k, n - k + 1);
  const upper = k === n ? 1 : betaQuantile(1 - alpha / 2, k + 1, n - k);
  return { lower, upper, point: k / n, method: "clopper-pearson", confidence };
}

export function bootstrapCI(values, {
  statistic = median,
  resamples = 1000,
  confidence = 0.95,
  rng = Math.random,
} = {}) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("bootstrapCI requires a non-empty array");
  }
  const n = values.length;
  const samples = new Array(resamples);
  const draw = new Array(n);
  for (let r = 0; r < resamples; r++) {
    for (let i = 0; i < n; i++) {
      draw[i] = values[Math.floor(rng() * n)];
    }
    samples[r] = statistic(draw);
  }
  samples.sort((a, b) => a - b);
  const alpha = 1 - confidence;
  const loIdx = Math.floor((alpha / 2) * resamples);
  const hiIdx = Math.min(resamples - 1, Math.ceil((1 - alpha / 2) * resamples) - 1);
  return {
    lower: samples[loIdx],
    upper: samples[hiIdx],
    point: statistic(values),
    method: "bootstrap-percentile",
    confidence,
    resamples,
  };
}

export function eloUpdate(ratingA, ratingB, outcomeA, { kFactor = 32 } = {}) {
  if (outcomeA < 0 || outcomeA > 1) throw new Error("outcomeA must be in [0, 1]");
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const newA = ratingA + kFactor * (outcomeA - expectedA);
  const newB = ratingB + kFactor * ((1 - outcomeA) - expectedB);
  return { ratingA: newA, ratingB: newB, expectedA, expectedB };
}

export function median(values) {
  if (!values.length) throw new Error("median requires a non-empty array");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Beta distribution quantile via bisection on a stable regularised incomplete beta CDF.
// Adequate for the small-sample sizes (n ≤ a few hundred) Hyper eval runs produce.
function betaQuantile(p, a, b) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const cdf = regularisedIncompleteBeta(mid, a, b);
    if (cdf < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-10) break;
  }
  return (lo + hi) / 2;
}

// Regularised incomplete beta I_x(a, b) via continued fraction
// (Numerical Recipes §6.4, adapted with logarithmic stability).
function regularisedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  // Use symmetry to keep the continued fraction in its fast-converging region.
  if (x < (a + 1) / (a + b + 2)) {
    return front * betaContinuedFraction(x, a, b);
  } else {
    return 1 - (Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / b) * betaContinuedFraction(1 - x, b, a);
  }
}

function betaContinuedFraction(x, a, b) {
  const MAX_ITER = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Lanczos approximation of log(Gamma(z)).
function logGamma(z) {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

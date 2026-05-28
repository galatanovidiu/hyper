import { test } from "node:test";
import assert from "node:assert/strict";

import {
  wilsonScoreCI,
  clopperPearsonCI,
  bootstrapCI,
  eloUpdate,
  median,
} from "./stats.mjs";

const EPS = 1e-3;

function approxEqual(actual, expected, eps = EPS, label = "") {
  assert.ok(
    Math.abs(actual - expected) < eps,
    `${label}: expected ${expected} ± ${eps}, got ${actual}`,
  );
}

test("wilsonScoreCI matches known value for 7/10 successes at 95%", () => {
  // Reference: Wikipedia / standard formula gives roughly (0.3968, 0.8922) for k=7, n=10, 95%.
  const ci = wilsonScoreCI(7, 10);
  approxEqual(ci.lower, 0.3968, 5e-3, "lower");
  approxEqual(ci.upper, 0.8922, 5e-3, "upper");
  assert.equal(ci.point, 0.7);
  assert.equal(ci.method, "wilson");
});

test("wilsonScoreCI handles zero successes", () => {
  const ci = wilsonScoreCI(0, 10);
  assert.equal(ci.lower, 0);
  assert.ok(ci.upper > 0 && ci.upper < 1, `upper should be in (0,1), got ${ci.upper}`);
});

test("wilsonScoreCI handles all successes", () => {
  const ci = wilsonScoreCI(10, 10);
  approxEqual(ci.upper, 1, 1e-9, "upper");
  assert.ok(ci.lower > 0 && ci.lower < 1, `lower should be in (0,1), got ${ci.lower}`);
});

test("clopperPearsonCI gives lower=0 when no successes and upper=1 when all successes", () => {
  const noneCi = clopperPearsonCI(0, 10);
  assert.equal(noneCi.lower, 0);
  approxEqual(noneCi.upper, 0.30850, 5e-3, "upper for k=0");

  const allCi = clopperPearsonCI(10, 10);
  assert.equal(allCi.upper, 1);
  approxEqual(allCi.lower, 0.69150, 5e-3, "lower for k=n");
});

test("clopperPearsonCI matches reference value for 5/10 at 95%", () => {
  // Reference: SciPy / standard tables give roughly (0.18709, 0.81291).
  const ci = clopperPearsonCI(5, 10);
  approxEqual(ci.lower, 0.18709, 5e-3, "lower");
  approxEqual(ci.upper, 0.81291, 5e-3, "upper");
});

test("bootstrapCI on constant data collapses to the constant", () => {
  const ci = bootstrapCI([7, 7, 7, 7, 7], { resamples: 200, rng: deterministicRng(1) });
  assert.equal(ci.lower, 7);
  assert.equal(ci.upper, 7);
  assert.equal(ci.point, 7);
});

test("bootstrapCI on a symmetric distribution puts the point inside the CI", () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ci = bootstrapCI(values, { resamples: 500, rng: deterministicRng(42) });
  assert.ok(ci.lower <= ci.point, `lower ${ci.lower} should be <= point ${ci.point}`);
  assert.ok(ci.upper >= ci.point, `upper ${ci.upper} should be >= point ${ci.point}`);
  assert.equal(ci.method, "bootstrap-percentile");
});

test("median of odd-length and even-length arrays", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([5]), 5);
});

test("eloUpdate: equal ratings, A wins → A gains exactly K/2", () => {
  const before = { a: 1500, b: 1500 };
  const after = eloUpdate(before.a, before.b, 1, { kFactor: 32 });
  approxEqual(after.ratingA, 1500 + 16, 1e-9, "ratingA");
  approxEqual(after.ratingB, 1500 - 16, 1e-9, "ratingB");
  approxEqual(after.expectedA, 0.5, 1e-9, "expectedA");
});

test("eloUpdate: equal ratings, draw → no rating change", () => {
  const after = eloUpdate(1500, 1500, 0.5, { kFactor: 32 });
  approxEqual(after.ratingA, 1500, 1e-9, "ratingA");
  approxEqual(after.ratingB, 1500, 1e-9, "ratingB");
});

test("eloUpdate: 400-point favourite winning gains very little", () => {
  // Standard Elo: a 400-point gap means expected score ≈ 0.909 for the favourite.
  const after = eloUpdate(1900, 1500, 1, { kFactor: 32 });
  approxEqual(after.expectedA, 0.909, 1e-2, "expectedA");
  approxEqual(after.ratingA - 1900, 32 * (1 - 0.909), 1e-1, "ratingA delta");
});

test("eloUpdate rejects out-of-range outcome", () => {
  assert.throws(() => eloUpdate(1500, 1500, 1.5));
});

// Simple LCG so bootstrap tests are deterministic without depending on test runner seed.
function deterministicRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

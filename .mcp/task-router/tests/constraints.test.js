import test from "node:test";
import assert from "node:assert/strict";

import { checkConstraint, validateConstraints } from "../lib/constraints.js";

test("checkConstraint marks empty constraint as satisfied", () => {
  const result = checkConstraint("", {});
  assert.equal(result.satisfied, true);
});

test("checkConstraint finds matching keywords in stdout", () => {
  const result = checkConstraint("implement authentication middleware", {
    stdout: "Added authentication middleware to the express server",
    stderr: "",
    diffNames: []
  });
  assert.equal(result.satisfied, true);
});

test("checkConstraint detects missing keywords", () => {
  const result = checkConstraint("implement database migration", {
    stdout: "Updated the README file with new docs",
    stderr: "",
    diffNames: []
  });
  assert.equal(result.satisfied, false);
});

test("checkConstraint checks diffNames for file-related constraints", () => {
  const result = checkConstraint("modify auth controller", {
    stdout: "",
    stderr: "",
    diffNames: ["src/controllers/auth.js"]
  });
  assert.equal(result.satisfied, true);
});

test("validateConstraints returns ok for empty constraints array", () => {
  const result = validateConstraints([], {});
  assert.equal(result.ok, true);
  assert.deepEqual(result.violated, []);
});

test("validateConstraints returns ok for null constraints", () => {
  const result = validateConstraints(null, {});
  assert.equal(result.ok, true);
});

test("validateConstraints reports violated constraints", () => {
  const result = validateConstraints(
    ["implement caching layer", "add rate limiting"],
    {
      stdout: "Implemented caching layer with Redis",
      stderr: "",
      diffNames: ["src/cache.js"]
    }
  );
  assert.equal(result.ok, false);
  assert.equal(result.violated.length, 1);
  assert.ok(result.violated[0].includes("rate limiting"));
});

test("validateConstraints passes when all constraints are satisfied", () => {
  const result = validateConstraints(
    ["add error handling", "write unit tests"],
    {
      stdout: "Added error handling and wrote unit tests for the module",
      stderr: "",
      diffNames: ["src/handler.js", "tests/handler.test.js"]
    }
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.violated, []);
});

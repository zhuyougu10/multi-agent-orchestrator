import test from "node:test";
import assert from "node:assert/strict";

import { buildPatchCommandArgs } from "../lib/merge-utils.js";

test("buildPatchCommandArgs uses committed head sha when available", () => {
  const args = buildPatchCommandArgs({
    commit: {
      attempted: true,
      head_sha: "abc123"
    }
  });

  assert.deepEqual(args, ["show", "--binary", "--format=", "abc123"]);
});

test("buildPatchCommandArgs falls back to worktree diff without commit sha", () => {
  const args = buildPatchCommandArgs({
    commit: {
      attempted: false,
      head_sha: ""
    }
  });

  assert.deepEqual(args, ["diff", "--binary"]);
});

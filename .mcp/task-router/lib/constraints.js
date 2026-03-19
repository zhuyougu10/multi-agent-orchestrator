// 约束验证模块：检查代理输出是否满足声明的约束条件
// 约束格式：纯文本字符串，表达对输出的期望

/**
 * 验证单个约束是否在输出文本中得到满足。
 * 简单策略：约束文本的关键词出现在 stdout 或 diff 中，视为满足。
 * @param {string} constraint - 约束描述文本
 * @param {object} context - { stdout, stderr, diffNames }
 * @returns {{ satisfied: boolean, constraint: string }}
 */
export function checkConstraint(constraint, context = {}) {
  const text = String(constraint || "").trim().toLowerCase();
  if (!text) {
    return { satisfied: true, constraint };
  }

  const searchPool = [
    (context.stdout || "").toLowerCase(),
    (context.stderr || "").toLowerCase(),
    ...(context.diffNames || []).map((n) => n.toLowerCase())
  ].join("\n");

  // 提取约束中有意义的关键词（过滤停用词和短词）
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "shall", "can", "must", "need", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "and", "or", "not", "no", "but", "if", "then", "else", "when", "all", "any", "both", "each",
    "that", "this", "it", "its", "use", "using", "only", "into"]);
  const keywords = text
    .replace(/[^a-z0-9_\-./\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) {
    return { satisfied: true, constraint };
  }

  // 至少一半的关键词出现在输出中
  const matchCount = keywords.filter((kw) => searchPool.includes(kw)).length;
  const threshold = Math.max(1, Math.ceil(keywords.length * 0.5));

  return {
    satisfied: matchCount >= threshold,
    constraint,
    matched_keywords: matchCount,
    total_keywords: keywords.length
  };
}

/**
 * 验证所有约束
 * @param {string[]} constraints
 * @param {object} context - { stdout, stderr, diffNames }
 * @returns {{ ok: boolean, results: Array, violated: string[] }}
 */
export function validateConstraints(constraints = [], context = {}) {
  if (!Array.isArray(constraints) || constraints.length === 0) {
    return { ok: true, results: [], violated: [] };
  }

  const results = constraints.map((c) => checkConstraint(c, context));
  const violated = results.filter((r) => !r.satisfied).map((r) => r.constraint);

  return {
    ok: violated.length === 0,
    results,
    violated
  };
}

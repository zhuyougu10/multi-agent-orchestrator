function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");
}

function hasGlobSyntax(pattern) {
  return /[*?]/.test(pattern);
}

function matchesSegment(patternSegment, fileSegment) {
  const escaped = patternSegment.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped.replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")}$`);
  return regex.test(fileSegment);
}

function matchesGlobSegments(patternSegments, fileSegments, patternIndex = 0, fileIndex = 0) {
  if (patternIndex === patternSegments.length) {
    return fileIndex === fileSegments.length;
  }

  const patternSegment = patternSegments[patternIndex];
  if (patternSegment === "**") {
    if (patternIndex === patternSegments.length - 1) {
      return true;
    }
    for (let nextFileIndex = fileIndex; nextFileIndex <= fileSegments.length; nextFileIndex++) {
      if (matchesGlobSegments(patternSegments, fileSegments, patternIndex + 1, nextFileIndex)) {
        return true;
      }
    }
    return false;
  }

  if (fileIndex >= fileSegments.length) {
    return false;
  }

  if (!matchesSegment(patternSegment, fileSegments[fileIndex])) {
    return false;
  }

  return matchesGlobSegments(patternSegments, fileSegments, patternIndex + 1, fileIndex + 1);
}

export function matchesScopePattern(pattern, filePath) {
  const normalizedPattern = normalizePath(pattern).replace(/[\/]+$/, "");
  const normalizedFile = normalizePath(filePath).replace(/[\/]+$/, "");

  if (!normalizedPattern) {
    return false;
  }

  if (!hasGlobSyntax(normalizedPattern)) {
    return normalizedFile === normalizedPattern || normalizedFile.startsWith(`${normalizedPattern}/`);
  }

  return matchesGlobSegments(
    normalizedPattern.split("/").filter(Boolean),
    normalizedFile.split("/").filter(Boolean)
  );
}

export function matchesFilesScope(filesScope = [], filePath) {
  return filesScope.some((pattern) => matchesScopePattern(pattern, filePath));
}

export function listScopedFiles(filesScope = [], files = []) {
  return [...new Set(files.filter((file) => matchesFilesScope(filesScope, file)).map((file) => normalizePath(file)))].sort();
}

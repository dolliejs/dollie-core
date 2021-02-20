import path from 'path';
import minimatch from 'minimatch';
import _ from 'lodash';

const chunk = <T>(items: Array<T>): Array<Array<T>> => {
  const result: Array<Array<T>> = [];
  for (const [index, item] of items.entries()) {
    const remainsLength = items.length - index - 1;
    if (remainsLength < 1) {
      continue;
    }
    for (let length = 2; length <= remainsLength + 1; length += 1) {
      result.push(_.take(items.slice(index), length));
    }
  }
  return items.map((item) => [item]).concat(result);
};

abstract class IgnoreMatcher {
  public matchers: Array<RegExp>;
  public abstract shouldIgnore(filename: string): boolean;
}

class GitIgnoreMatcher extends IgnoreMatcher {
  public delimiter = path.sep;
  public matchers: Array<RegExp>;
  private negated: Array<boolean>;
  private rooted: Array<boolean>;

  public constructor(content: string) {
    super();
    this.negated = [];
    this.rooted = [];
    this.matchers = (('.git\n' + content).split(/\r?\n|\r/)).map((line, index) => {
      const negatedLine = line[0] === '!';
      const rootedLine = line[0] === '/';
      let currentLine = line;

      if (negatedLine || rootedLine) {
        currentLine = line.substring(1);
      }

      const emptyLine = currentLine === '';

      if (emptyLine) {
        return null;
      }

      this.negated[index] = negatedLine;
      this.rooted[index] = rootedLine;

      return minimatch.makeRe(line);
    });
    this.shouldIgnore = this.shouldIgnore.bind(this);
  }

  public shouldIgnore(filename: string) {
    const matchResult = [];
    for (const [index, matcher] of this.matchers.entries()) {
      if (!matcher) { continue; }

      if (this.rooted[index]) {
        if (matcher.test(filename)) {
          matchResult.push(!this.negated[index]);
        }
      } else {
        const pathChunks = chunk<string>(filename.split(path.sep));
        const matchedPathChunks = pathChunks.filter((chunk) => matcher.test(chunk.join(path.sep)));
        if (matchedPathChunks.length > 0) {
          matchResult.push(!this.negated[index]);
        }
      }
    }

    return matchResult.indexOf(true) !== -1;
  }
}

/**
 * get ignored files list
 * @param content content of .gitignore file
 * @param filePaths all relative pathname that want to be pared
 */
const getGitIgnoredFiles = (content: string, filePaths: Array<string>): Array<string> => {
  if (!filePaths || !Array.isArray(filePaths)) {
    return [];
  }

  if (!content) {
    return filePaths;
  }

  const matcher = new GitIgnoreMatcher(content);
  return filePaths.filter(matcher.shouldIgnore);
};

export {
  IgnoreMatcher,
  GitIgnoreMatcher,
  getGitIgnoredFiles,
};

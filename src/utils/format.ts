export const parseSnakeToCamel = (snakeString: string): string => {
  if (!snakeString || typeof snakeString !== 'string') {
    return '';
  }

  return snakeString.split('_').reduce((result, currentSegment = '', index) => {
    if (!currentSegment) {
      return result;
    }
    if (index !== 0) {
      return `${result}${currentSegment[0].toUpperCase()}${currentSegment.slice(1).toLowerCase()}`;
    } else {
      return `${result}${currentSegment.toLowerCase()}`;
    }
  }, '');
};

export const parseCamelToSnake = (camelString: string): string => {
  if (!camelString || typeof camelString !== 'string') {
    return '';
  }

  const findMatches = (regex, currentStr, matches = []) => {
    const res = regex.exec(currentStr);
    res && matches.push(res) && findMatches(regex, currentStr, matches);
    return matches;
  };

  const matches = findMatches(/[A-Z]/g, camelString);

  if (matches.length === 0) { return camelString; }

  return camelString.split('').reduce((result, currentChar, index) => {
    if (matches.findIndex((match) => match.index === index) !== -1) {
      return `${result}_${currentChar.toLowerCase()}`;
    } else {
      return `${result}${currentChar}`;
    }
  }, '');
};

export const parseSnakeToKebab = (snakeString: string): string => {
  if (!snakeString || typeof snakeString !== 'string') {
    return '';
  }

  return snakeString.split('_').join('-').toLowerCase();
};

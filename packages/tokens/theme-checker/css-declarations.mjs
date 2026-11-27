import { tokenize, TokenType as T } from '@csstools/css-tokenizer';

function closingType(token) {
  switch (token[0]) {
    case T.Function:
    case T.OpenParen:
      return T.CloseParen;
    case T.OpenSquare:
      return T.CloseSquare;
    case T.OpenCurly:
      return T.CloseCurly;
    default:
      return undefined;
  }
}

export const tokenValue = (token) => token?.[4]?.value;

function preferenceModes(head, modes) {
  const atRule = head[0]?.[0] === T.AtKeyword;
  const media = atRule && tokenValue(head[0]).toLowerCase() === 'media';
  if (atRule && !media) return 0;

  let mask = 0;
  const groups = [];
  let negateQuery = false;
  for (const [index, token] of head.entries()) {
    const kind = token[0];
    if (kind === T.Comma && groups.length === 0) negateQuery = false;
    const name = tokenValue(token)?.toString().toLowerCase();
    const isNot = name === 'not' && kind === T.Ident;
    // A media query may negate the whole query or the next parenthesized
    // condition. Selector :not() scopes are skipped in the same way.
    if (media && isNot && index > 0 && head[index + 1]?.[0] !== T.OpenParen) {
      negateQuery = true;
    }
    const end = closingType(token);
    if (end !== undefined) {
      const previous = head[index - 1];
      groups.push({
        end,
        negated:
          (groups.at(-1)?.negated ?? false) ||
          (media && previous?.[0] === T.Ident && tokenValue(previous).toLowerCase() === 'not') ||
          (!media && kind === T.Function && name === 'not'),
      });
    } else if (kind === groups.at(-1)?.end) {
      groups.pop();
    }
    if (negateQuery || groups.at(-1)?.negated) continue;

    const key = head[index + 1];
    const separator = head[index + 2];
    const value = head[index + 3];
    if (key?.[0] !== T.Ident) continue;
    const attribute = tokenValue(key).toLowerCase();
    const setting = tokenValue(value);
    if (
      media &&
      kind === T.OpenParen &&
      separator?.[0] === T.Colon &&
      value?.[0] === T.Ident &&
      head[index + 4]?.[0] === T.CloseParen
    ) {
      mask |= modes.media.get(`${attribute}:${setting.toLowerCase()}`) ?? 0;
    }
    if (!media && kind === T.OpenSquare) {
      if (separator?.[0] === T.CloseSquare) {
        mask |= modes.attributes.get(attribute) ?? 0;
      } else if (
        separator?.[0] === T.Delim &&
        separator[1] === '=' &&
        (value?.[0] === T.Ident || value?.[0] === T.String)
      ) {
        const flag = head[index + 4];
        const insensitive = flag?.[0] === T.Ident && tokenValue(flag).toLowerCase() === 'i';
        if (
          flag?.[0] === T.CloseSquare ||
          (insensitive && head[index + 5]?.[0] === T.CloseSquare)
        ) {
          mask |=
            modes.attributes.get(`${attribute}=${insensitive ? setting.toLowerCase() : setting}`) ??
            0;
        }
      }
    }
  }
  return mask;
}

// Each frame is a CSS rule body, or a balanced block inside a prelude/value.
// CSS nesting allows a rule and a declaration in the same body. A statement
// beginning with a custom property and colon is unambiguously a declaration,
// including when its value contains a brace block (CSS Syntax 3 §5.5).
export function visitDeclarations(css, modes, visit, onSyntaxError) {
  const tokens = tokenize(
    { css },
    { onParseError: (error) => onSyntaxError(error.sourceStart) },
  ).filter(([type]) => type !== T.Comment && type !== T.Whitespace);
  const contexts = [0];
  const blocks = [];
  let start = 0;

  for (const [index, token] of tokens.entries()) {
    const type = token[0];
    const end = closingType(token);
    if (blocks.length > 0) {
      if (type === blocks.at(-1)) blocks.pop();
      else if (end !== undefined) blocks.push(end);
      continue;
    }

    const first = tokens[start];
    const property = first?.[0] === T.Ident ? tokenValue(first) : '';
    const custom =
      contexts.length > 1 && property.startsWith('--') && tokens[start + 1]?.[0] === T.Colon;
    if (type === T.OpenCurly && !custom) {
      contexts.push(contexts.at(-1) | preferenceModes(tokens.slice(start, index), modes));
      start = index + 1;
    } else if (end !== undefined) {
      blocks.push(end);
    } else if (type === T.Semicolon || type === T.CloseCurly || type === T.EOF) {
      if (custom && (property.startsWith('--ki-') || property.startsWith('--_ki-'))) {
        const value = tokens.slice(start + 2, index);
        if (
          value.at(-2)?.[0] === T.Delim &&
          value.at(-2)[1] === '!' &&
          value.at(-1)?.[0] === T.Ident &&
          tokenValue(value.at(-1)).toLowerCase() === 'important'
        ) {
          value.length -= 2;
        }
        visit(property, value, first[2], contexts.at(-1));
      }
      if (type === T.CloseCurly) {
        if (contexts.length > 1) contexts.pop();
        else onSyntaxError(token[2]);
      }
      start = index + 1;
    }
  }
  if (contexts.length > 1 || blocks.length > 0) onSyntaxError(css.length);
}

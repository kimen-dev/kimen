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

function mediaModes(head, modes) {
  let mask = 0;
  const groups = [];
  let negateQuery = false;
  for (const [index, token] of head.entries()) {
    const kind = token[0];
    if (kind === T.Comma && groups.length === 0) negateQuery = false;
    const name = tokenValue(token)?.toString().toLowerCase();
    const isNot = name === 'not' && kind === T.Ident;
    // A media query may negate the whole query or the next parenthesized condition.
    if (isNot && head[index + 1]?.[0] !== T.OpenParen) {
      negateQuery = true;
    }
    const end = closingType(token);
    if (end !== undefined) {
      const previous = head[index - 1];
      groups.push({
        end,
        negated:
          (groups.at(-1)?.negated ?? false) ||
          (previous?.[0] === T.Ident && tokenValue(previous).toLowerCase() === 'not'),
      });
    } else if (kind === groups.at(-1)?.end) {
      groups.pop();
    }
    if (negateQuery || groups.at(-1)?.negated) continue;

    const key = head[index + 1];
    const separator = head[index + 2];
    const value = head[index + 3];
    if (key?.[0] !== T.Ident) continue;
    if (
      kind === T.OpenParen &&
      separator?.[0] === T.Colon &&
      value?.[0] === T.Ident &&
      head[index + 4]?.[0] === T.CloseParen
    ) {
      mask |= modes.get(`${tokenValue(key).toLowerCase()}:${tokenValue(value).toLowerCase()}`) ?? 0;
    }
  }
  return mask;
}

const selectorMatch = () => ({ root: false, setting: 0, own: 0, ancestor: 0 });
const selectorScope = () => ({
  match: selectorMatch(),
  alternatives: selectorMatch(),
  start: true,
});

function mergeMatch(target, source, compound = true) {
  // A root and a setting combine within a compound. Separate alternatives
  // keep their own matches from requiring both on the same element.
  if (compound) {
    if (target.root) target.own |= source.setting;
    if (source.root) target.own |= target.setting;
  }
  target.root ||= source.root;
  target.setting |= source.setting;
  target.own |= source.own;
  target.ancestor |= source.ancestor;
}

function attributeMatch(head, index, attributes, match) {
  const name = head[index + 1];
  if (name?.[0] !== T.Ident) return;
  const attribute = tokenValue(name).toLowerCase();
  if (attribute === 'data-ki-theme') {
    mergeMatch(match, { ...selectorMatch(), root: true });
  }
  const separator = head[index + 2];
  const value = head[index + 3];
  if (separator?.[1] !== '=' || (value?.[0] !== T.Ident && value?.[0] !== T.String)) return;
  const flag = head[index + 4];
  const modifier = flag?.[0] === T.Ident && tokenValue(flag).toLowerCase();
  if (
    flag?.[0] !== T.CloseSquare &&
    !((modifier === 'i' || modifier === 's') && head[index + 5]?.[0] === T.CloseSquare)
  )
    return;
  const setting = tokenValue(value);
  const mode = attributes.get(`${attribute}=${modifier === 'i' ? setting.toLowerCase() : setting}`);
  if (mode) mergeMatch(match, { ...selectorMatch(), setting: mode });
}

function selectorModes(head, attributes, css, parent) {
  const outer = selectorScope();
  const groups = [{ scope: outer }];
  let usesNesting = false;
  let leadingCombinator;

  const finishBranch = (scope) => {
    if (scope === outer && parent && !usesNesting && leadingCombinator !== '||') {
      scope.match.ancestor |= parent.ancestor;
      if (leadingCombinator !== '+' && leadingCombinator !== '~')
        scope.match.ancestor |= parent.own;
    }
    mergeMatch(scope.alternatives, scope.match, false);
    scope.match = selectorMatch();
    scope.start = true;
  };

  for (const [index, token] of head.entries()) {
    const { end, scope } = groups.at(-1);
    const [kind, raw] = token;
    if (kind === T.Delim && raw === '&') usesNesting = true;
    if (kind === end) {
      groups.pop();
      if (scope) {
        finishBranch(scope);
        mergeMatch(groups.at(-1).scope.match, scope.alternatives);
      }
      continue;
    }

    const close = closingType(token);
    if (!scope) {
      if (close) groups.push({ end: close });
      continue;
    }
    if (kind === T.Comma) {
      finishBranch(scope);
      if (scope === outer) {
        usesNesting = false;
        leadingCombinator = undefined;
      }
      continue;
    }

    const previous = head[index - 1];
    let combinator;
    if (kind === T.Delim && /^[>+~]$/u.test(raw)) combinator = raw;
    if (kind === T.Delim && raw === '|') {
      if (head[index + 1]?.[1] === '|' && token[3] + 1 === head[index + 1][2]) combinator = '||';
      else if (previous?.[1] === '|' && previous[3] + 1 === token[2]) continue;
    }
    if (scope === outer && scope.start && combinator) leadingCombinator = combinator;
    // Filtering the tokenizer's whitespace out of declarations is useful,
    // but selector compounds still need the descendant combinator.
    const gap = previous && css.slice(previous[3] + 1, token[2]).replace(/\/\*[\s\S]*?\*\//gu, '');
    if (combinator || (!scope.start && gap)) {
      const { own, ancestor } = scope.match;
      scope.match = selectorMatch();
      if (combinator !== '||') scope.match.ancestor = ancestor;
      if (!combinator || combinator === '>') scope.match.ancestor |= own;
      scope.start = true;
      if (combinator) continue;
    }

    const name = tokenValue(token)?.toString().toLowerCase();
    if (
      kind === T.Ident &&
      ((scope.start && name === 'html' && head[index + 1]?.[1] !== '|') ||
        (previous?.[0] === T.Colon && name === 'root' && !gap))
    ) {
      mergeMatch(scope.match, { ...selectorMatch(), root: true });
    }
    if (parent && kind === T.Delim && raw === '&') mergeMatch(scope.match, parent);
    if (kind === T.OpenSquare) attributeMatch(head, index, attributes, scope.match);
    if (close) {
      // Only these functions match the subject of their selector list.
      const matchesSubject =
        kind === T.Function && previous?.[0] === T.Colon && !gap && /^(?:is|where)$/u.test(name);
      groups.push({ end: close, scope: matchesSubject ? selectorScope() : undefined });
    }
    scope.start = false;
  }
  finishBranch(outer);
  return outer.alternatives;
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
  const contexts = [{ media: 0, selector: undefined }];
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
    const context = contexts.at(-1);
    if (type === T.OpenCurly && !custom) {
      const head = tokens.slice(start, index);
      if (first?.[0] === T.AtKeyword) {
        const media =
          tokenValue(first).toLowerCase() === 'media' ? mediaModes(head, modes.media) : 0;
        contexts.push({ ...context, media: context.media | media });
      } else {
        contexts.push({
          ...context,
          selector: selectorModes(head, modes.attributes, css, context.selector),
        });
      }
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
        const { media, selector } = context;
        visit(property, value, first[2], media | (selector?.own ?? 0) | (selector?.ancestor ?? 0));
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

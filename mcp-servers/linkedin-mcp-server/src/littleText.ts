const RESERVED = /[|{}@[\]()<>#\\*_~]/g;

/**
 * LinkedIn's Posts API parses `commentary` as "little" text, where
 * `| { } @ [ ] ( ) < > # \ * _ ~` are reserved and must be backslash-escaped
 * to appear literally — even when not part of a mention or hashtag. An
 * unescaped one (a plain "(" is enough) can make the post come out cut off.
 *
 * Real hashtags (`#` + letters/digits at a word start) are left alone so
 * they stay clickable; everything else is escaped, so mentions and markdown
 * are never interpreted.
 */
export function escapeLittleText(text: string): string {
  return text
    .split(/((?:^|(?<=\s))#[\p{L}\p{N}]+)/u)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(RESERVED, "\\$&")))
    .join("");
}

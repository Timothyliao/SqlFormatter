import { describe, it, expect } from 'vitest';
import { JsonFormatter } from '../src/formatter/JsonFormatter';

const fmt = new JsonFormatter();

describe('JsonFormatter', () => {
  it('formats valid JSON with 2-space indent', () => {
    const result = fmt.format('{"a":1,"b":2}', 2);
    expect(result.error).toBeUndefined();
    expect(result.text).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it('formats valid JSON with 4-space indent', () => {
    const result = fmt.format('{"a":1}', 4);
    expect(result.text).toBe('{\n    "a": 1\n}');
  });

  it('returns error for invalid JSON', () => {
    const result = fmt.format('{invalid}', 2);
    expect(result.error).toBeTruthy();
    expect(result.text).toBe('{invalid}');
  });

  it('returns empty text for empty input', () => {
    expect(fmt.format('', 2)).toEqual({ text: '' });
    expect(fmt.format('   ', 2)).toEqual({ text: '' });
  });

  it('handles JSON arrays', () => {
    const result = fmt.format('[1,2,3]', 2);
    expect(result.error).toBeUndefined();
    expect(result.text).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it('strips surrounding quotes from stringified JSON', () => {
    const result = fmt.format('"{\\\"a\\\":1}"', 2);
    expect(result.error).toBeUndefined();
    expect(result.text).toBe('{\n  "a": 1\n}');
  });

  it('recursively expands nested stringified JSON values', () => {
    const inner = JSON.stringify({ erp_co_id: 123, name: 'test' });
    const outer = JSON.stringify({ app_key: 'abc', biz: inner });
    const result = fmt.format(outer, 2);
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.text);
    expect(parsed.biz).toEqual({ erp_co_id: 123, name: 'test' });
  });

  it('handles triple-nested stringified JSON', () => {
    const level3 = JSON.stringify({ account: [{ id: 1 }] });
    const level2 = JSON.stringify({ args: level3 });
    const level1 = JSON.stringify({ biz: level2 });
    const result = fmt.format(level1, 2);
    const parsed = JSON.parse(result.text);
    expect(parsed.biz.args.account[0].id).toBe(1);
  });

  it('handles the real-world escaped input', () => {
    const input = `"{\\"app_key\\":\\"04e839b918c145238564e31d094ee41b\\",\\"biz\\":\\"{\\\\\\"erp_co_id\\\\\\":10180838}\\"}"`;
    const result = fmt.format(input, 2);
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.text);
    expect(parsed.app_key).toBe('04e839b918c145238564e31d094ee41b');
    expect(parsed.biz.erp_co_id).toBe(10180838);
  });

  it('preserves big integer precision (exceeds MAX_SAFE_INTEGER)', () => {
    const result = fmt.format('{"num": 2000000000011064768}', 2);
    expect(result.error).toBeUndefined();
    expect(result.text).toContain('2000000000011064768');
  });

  it('preserves negative big integer precision', () => {
    const result = fmt.format('{"n": -9007199254740993}', 2);
    expect(result.text).toContain('-9007199254740993');
  });

  it('preserves big integers in arrays', () => {
    const result = fmt.format('[2000000000011064768, 1]', 2);
    expect(result.text).toContain('2000000000011064768');
  });

  it('preserves big integers in nested stringified JSON', () => {
    const inner = '{"id": 2000000000011064768}';
    const outer = JSON.stringify({ data: inner });
    const result = fmt.format(outer, 2);
    expect(result.text).toContain('2000000000011064768');
  });

  it('does not alter safe integers', () => {
    const result = fmt.format('{"n": 9007199254740991}', 2);
    expect(result.text).toContain('9007199254740991');
    // Should remain a number, not a string
    const parsed = JSON.parse(result.text);
    expect(parsed.n).toBe(9007199254740991);
  });

  it('handles raw backslash-escaped JSON without outer quotes', () => {
    // Input like: [{\"id\":\"abc\",\"label\":\"app\"}]
    const result = fmt.format('[{\\"id\\":\\"abc\\",\\"label\\":\\"app\\"}]', 2);
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.text);
    expect(parsed[0].id).toBe('abc');
    expect(parsed[0].label).toBe('app');
  });

  it('handles raw backslash-escaped JSON object without outer quotes', () => {
    // Input like: {\"key\":\"value\",\"num\":42}
    const result = fmt.format('{\\"key\\":\\"value\\",\\"num\\":42}', 2);
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.text);
    expect(parsed.key).toBe('value');
    expect(parsed.num).toBe(42);
  });
});

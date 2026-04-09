import assert from 'node:assert/strict';
import { getVideoExportErrorMessage } from '../utils/errorHandling.ts';

interface TestCase {
  name: string;
  input: unknown;
  expected: string;
}

const testCases: TestCase[] = [
  {
    name: 'WebCodecs unsupported error',
    input: new Error('WebCodecs not supported'),
    expected: 'Trình duyệt của bạn không hỗ trợ WebCodecs. Vui lòng dùng Chrome/Edge mới nhất.',
  },
  {
    name: '413 payload too large error object',
    input: { message: '413 Payload Too Large' },
    expected: 'Video tạo ra quá lớn (vượt quá 7.5MB). Vui lòng giảm thời gian video.',
  },
  {
    name: 'Network fetch failed error',
    input: new Error('fetch failed'),
    expected: 'Lỗi mạng khi tải video lên. Vui lòng thử lại.',
  },
  {
    name: 'Discord webhook rejected string error',
    input: 'Discord API rejected webhook',
    expected: 'Lỗi từ hệ thống Discord. Vui lòng thử lại sau.',
  },
];

console.log('Running getVideoExportErrorMessage mapping tests...');

for (const testCase of testCases) {
  const actual = getVideoExportErrorMessage(testCase.input);
  assert.equal(actual, testCase.expected);
  console.log(`✓ ${testCase.name}`);
  console.log(`  input: ${String((testCase.input as { message?: string })?.message ?? testCase.input)}`);
  console.log(`  output: ${actual}`);
}

console.log(`All ${testCases.length} error mapping cases passed.`);

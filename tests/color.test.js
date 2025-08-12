import { expect, it, describe } from 'vitest';

// Load the file into JSDOM global (quick-n-dirty way)
// tests/color.test.js
import { describe, it, expect } from 'vitest';
import '../src/js/color.js'; // this runs the IIFE and attaches ToneMasterColor to globalThis

describe('ToneMaster maths parity', () => {
  it('10% tint/shade of #663399 matches original', () => {
    expect(globalThis.ToneMasterColor.tint('#663399', 10)).toBe('7547a3');
    expect(globalThis.ToneMasterColor.shade('#663399', 10)).toBe('5c2e8a');
  });
});

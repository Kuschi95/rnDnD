import { iconMap, resolveIcon } from '@/icons/icon-map';

describe('icon map', () => {
  it('keeps the drawable name the Kotlin app already writes', () => {
    expect(resolveIcon('class_rouge')).toBe(iconMap.class_rouge);
  });

  it('does not invent a key for an unknown drawable', () => {
    expect(resolveIcon('class_warrior')).toBeNull();
    expect(resolveIcon(null)).toBeNull();
  });
});

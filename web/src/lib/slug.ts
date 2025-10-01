import { uuid } from './uuid';

export const normalizeSlugInput = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLowerCase();

export const makeSlug = (name: string) => {
  const normalized = normalizeSlugInput(name);
  const s = normalized
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return s || `g-${uuid().slice(0, 8)}`;
};

export default makeSlug;

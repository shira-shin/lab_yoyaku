import { randomUUID } from 'crypto';

export const makeSlug = (name: string) => {
  const s = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return s || `g-${randomUUID().slice(0, 8)}`;
};

export default makeSlug;

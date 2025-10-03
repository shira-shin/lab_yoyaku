export const normalizeJoinInput = (value: string) =>
  value
    .replace(/\u200B/g, '')
    .replace(/\r?\n/g, '')
    .trim()
    .normalize('NFKC');

export default normalizeJoinInput;

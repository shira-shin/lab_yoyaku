declare module "bcryptjs" {
  export function genSalt(rounds?: number): Promise<string>;
  export function hash(plain: string, salt: string): Promise<string>;
  export function compare(plain: string, hash: string): Promise<boolean>;
  const _default: {
    genSalt: typeof genSalt;
    hash: typeof hash;
    compare: typeof compare;
  };
  export default _default;
}


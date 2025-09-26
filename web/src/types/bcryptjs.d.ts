declare module "bcryptjs" {
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
  export function hash(plain: string, salt: string): Promise<string>;
  export function hashSync(plain: string, salt: string | number): string;
  export function compare(plain: string, hash: string): Promise<boolean>;
  export function compareSync(plain: string, hash: string): boolean;
  const _default: {
    genSalt: typeof genSalt;
    genSaltSync: typeof genSaltSync;
    hash: typeof hash;
    hashSync: typeof hashSync;
    compare: typeof compare;
    compareSync: typeof compareSync;
  };
  export default _default;
}

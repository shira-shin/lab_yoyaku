import * as NS from "next-auth/providers/google";
// next-auth v5 のビルド/バンドル状況により default が無いケースを吸収
const Google: any = (NS as any).default ?? (NS as any);
export default Google as typeof NS.default;

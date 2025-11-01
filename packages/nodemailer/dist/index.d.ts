export interface SMTPAuth {
  user: string;
  pass: string;
}

export interface TransportOptions {
  host: string;
  port?: number;
  secure?: boolean;
  auth?: SMTPAuth;
  from?: string;
  timeout?: number;
  clientHostname?: string;
}

export interface AddressLike {
  name?: string;
  address: string;
}

export type Address = string | AddressLike;
export type AddressList = Address | Address[] | undefined;

export interface MailOptions {
  from?: AddressList;
  to?: AddressList;
  cc?: AddressList;
  bcc?: AddressList;
  subject?: string;
  text?: string;
  html?: string;
}

export interface SentMessageInfo {
  accepted: string[];
  rejected: string[];
  envelope: {
    from: string;
    to: string[];
  };
  messageId: string;
}

export interface Transporter {
  sendMail(mail: MailOptions): Promise<SentMessageInfo>;
}

export function createTransport(options: TransportOptions): Transporter;

declare const nodemailer: {
  createTransport: typeof createTransport;
};

export default nodemailer;

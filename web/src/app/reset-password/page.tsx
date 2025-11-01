import ResetPasswordForm from "./_components/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams: {
    token?: string;
  };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const tokenFromUrl = searchParams?.token ?? "";
  return <ResetPasswordForm initialToken={tokenFromUrl} />;
}

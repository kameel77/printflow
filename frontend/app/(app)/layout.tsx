import AuthWrapper from "@/components/AuthWrapper";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthWrapper>{children}</AuthWrapper>;
}

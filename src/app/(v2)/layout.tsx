export const dynamic = "force-dynamic";

export default function V2RootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}

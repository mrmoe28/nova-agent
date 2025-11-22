export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove the max-w container for wizard pages
  // Wizard pages handle their own layout with full-width backgrounds
  return <>{children}</>;
}

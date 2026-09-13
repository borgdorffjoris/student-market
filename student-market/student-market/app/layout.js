import "./globals.css";

export const metadata = {
  title: "Student Market",
  description: "Student registration for the company market day",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-body">{children}</body>
    </html>
  );
}

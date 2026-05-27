import "./globals.css";

export const metadata = {
  title: "Chat — Hanif",
  description: "AI chat — comprehensive, fast, private",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

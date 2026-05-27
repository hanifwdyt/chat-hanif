import "./globals.css";

export const metadata = {
  title: "Chat — Hanif",
  description: "AI chat — comprehensive, fast, private",
};

// Inline script to apply theme BEFORE React hydrates to avoid flash.
const themeBootstrap = `
(function(){
  try {
    var t = localStorage.getItem('chat-hanif:theme');
    var resolved = t === 'light' || t === 'dark'
      ? t
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.classList.add(resolved === 'light' ? 'theme-light' : 'theme-dark');
    document.documentElement.dataset.theme = resolved;
  } catch(e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

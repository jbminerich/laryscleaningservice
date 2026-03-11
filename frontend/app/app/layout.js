export const metadata = {
  title: "Lary's Cleaning Services",
  description: "Professional house cleaning services",
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
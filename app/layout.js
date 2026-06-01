import "./globals.css";

export const metadata = {
  title: "Lotus Hospital IT Helpdesk",
  description: "Hospital IT ticket management system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

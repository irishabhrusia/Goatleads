
import "./globals.css";



export const metadata = {
  title: "GoatLeads | B2B Revenue & Sales Pipeline CRM",
  description:
    "Multi-currency B2B CRM with 8-stage Kanban pipeline, activity timelines, automated follow-ups, and executive revenue analytics.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

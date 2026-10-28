export const metadata = {
  title: 'Next.js on Google Cloud',
  description: 'A simple Compute Engine demo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b1020', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}

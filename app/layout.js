import './globals.css';

export const metadata = {
  title: 'Toolbox — 好用的在线工具箱',
  description: '二维码、编码转换、哈希、加密与开发常用工具。',
};

export default function RootLayout({ children }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

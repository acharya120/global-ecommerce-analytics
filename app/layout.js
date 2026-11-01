import './globals.css';

export const metadata = {
  title: 'Global E-commerce Review Ranker',
  description: 'Compare smartphones by review volume across marketplaces. Free Demo Mode, optional Live Mode, automated review insights.',
};

const themeScript = `try{var t=localStorage.getItem('gea-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}

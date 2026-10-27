import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Kanban',description:'A private project Kanban workspace.',robots:{index:false,follow:false},icons:{icon:[{url:'/favicon.svg',type:'image/svg+xml',sizes:'any'}],shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}

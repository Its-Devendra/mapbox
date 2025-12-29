import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import ChatContainer from "@/components/chat/ChatContainer";
import NumberInputScrollFix from "@/components/NumberInputScrollFix";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mapbox Project Manager",
  description: "Manage your Mapbox projects, themes, landmarks, and settings",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NumberInputScrollFix />
        {children}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <ChatContainer />
      </body>
    </html>
  );
}


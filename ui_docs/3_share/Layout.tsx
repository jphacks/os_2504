import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="w-full h-[50px] bg-[#FFF4C6] shadow-md flex items-center justify-center relative">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-[#EB8D00] font-bold text-[30px] leading-none">
          いー幹事？
        </h1>
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <span className="text-[#EB8D00] font-bold text-[15px]">i-kanji?</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="w-full bg-[#242424] text-white py-6 px-8">
      <div className="max-w-md mx-auto">
        <div className="space-y-4">
          <a
            href="#"
            className="block text-xs leading-[30px] hover:underline"
          >
            プライバシーポリシー
          </a>
          <a
            href="#"
            className="block text-xs leading-[30px] hover:underline"
          >
            利用規約
          </a>
          <p className="text-[10px] text-[#BCBCBC] leading-[30px]">
            @2025 E-kanji
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-brand-dark flex flex-col items-start justify-center px-[35px] py-[25px] mt-auto">
      <a href="/privacy-policy" className="text-white text-[12px] leading-[30px] hover:underline">
        プライバシーポリシー
      </a>
      <a href="/terms" className="text-white text-[12px] leading-[30px] hover:underline">
        利用規約
      </a>
      <p className="text-brand-light-gray text-[10px] leading-[30px] mt-4">@2025 E-kanji</p>
    </footer>
  );
}

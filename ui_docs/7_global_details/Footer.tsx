export default function Footer() {
  return (
    <footer className="w-full bg-[#242424] text-white py-6 px-6 sm:px-8 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-2">
          <a href="#" className="text-xs hover:underline">
            プライバシーポリシー
          </a>
          <a href="#" className="text-xs hover:underline">
            利用規約
          </a>
        </div>
        <div className="mt-6 text-[10px] text-[#BCBCBC]">@2025 E-kanji</div>
      </div>
    </footer>
  );
}

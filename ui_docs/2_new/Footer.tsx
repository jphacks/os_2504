export default function Footer() {
    return (
      <footer className="w-full h-[171px] bg-ekanji-footer flex justify-center items-center">
        <div className="w-full h-full relative">
          <div className="absolute left-[35px] top-[25px] text-white font-noto text-[12px] leading-[30px]">
            プライバシーポリシー
          </div>
          <div className="absolute left-[35px] top-[73px] text-white font-noto text-[12px] leading-[30px]">
            利用規約
          </div>
          <div className="absolute left-[35px] top-[126px] text-[#BCBCBC] font-noto text-[10px] leading-[30px]">
            @2025 E-kanji
          </div>
        </div>
      </footer>
    );
  }
  
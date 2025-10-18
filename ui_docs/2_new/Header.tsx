export default function Header() {
    return (
      <header className="w-full h-[50px] bg-ekanji-header shadow-[0_2px_2px_0_rgba(0,0,0,0.25)] flex justify-center items-center relative">
        <h1 className="text-ekanji-orange font-noto text-[30px] font-bold leading-normal">
          いー幹事？
        </h1>
        <span className="absolute right-[53px] top-[20px] text-ekanji-orange font-noto text-[15px] font-bold">
          i-kanji?
        </span>
      </header>
    );
  }
  
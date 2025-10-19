export default function Header() {
  return (
    <header className="w-full h-[50px] bg-header shadow-[0_2px_2px_0_rgba(0,0,0,0.25)] flex items-center justify-center relative">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-[30px] font-bold text-primary leading-none">いー幹事？</h1>
      </div>
      <div className="absolute right-4 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 text-[15px] font-bold text-primary">
        i-kanji?
      </div>
    </header>
  );
}

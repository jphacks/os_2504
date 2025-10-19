export default function Index() {
  const rankingData = [
    {
      rank: "1位：3件",
      name: "最強ラーメン",
      image: "https://api.builder.io/api/v1/image/assets/TEMP/bbfa5d9f75ff5f816398d29e5a97da006811c4d5?width=100"
    },
    {
      rank: "2位：2件",
      name: "最弱ラーメン",
      image: "https://api.builder.io/api/v1/image/assets/TEMP/bbfa5d9f75ff5f816398d29e5a97da006811c4d5?width=100"
    },
    {
      rank: "3位：1件",
      name: "弱虫ラーメン",
      image: "https://api.builder.io/api/v1/image/assets/TEMP/bbfa5d9f75ff5f816398d29e5a97da006811c4d5?width=100"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="w-full h-[50px] bg-header-yellow shadow-md flex items-center justify-center relative">
        <h1 className="text-primary-orange text-[30px] font-bold">
          いー幹事？
        </h1>
        <span className="absolute right-[52px] top-[20px] text-primary-orange text-[15px] font-bold">
          i-kanji?
        </span>
      </header>

      <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 max-w-[600px] mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-[20px] font-bold text-black text-center mb-1">
            JPHACKアフター
          </h2>
          <p className="text-[12px] font-bold text-black mb-1">
            投票済みメンバー
          </p>
          <p className="text-[10px] text-black">
            りんたろう・たてそと・ワタル
          </p>
        </div>

        <div className="space-y-8 mb-8">
          {rankingData.map((item, index) => (
            <div
              key={index}
              className="bg-card-peach rounded-[20px] h-[53px] flex items-center px-4 sm:px-5 relative shadow-sm max-w-full sm:max-w-[343px] mx-auto"
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <span className="text-[18px] font-bold text-black whitespace-nowrap flex-shrink-0">
                  {item.rank}
                </span>
                <span className="text-[18px] font-bold text-black truncate">
                  {item.name}
                </span>
              </div>
              <img
                src={item.image}
                alt=""
                className="w-[50px] h-[41px] object-cover flex-shrink-0 ml-2"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-center mb-8">
          <button className="w-full max-w-[343px] sm:max-w-[301px] h-[29px] rounded-full border border-primary-orange bg-white text-primary-orange text-[13px] font-bold hover:bg-primary-orange hover:text-white transition-colors">
            投票の詳細を確認・編集
          </button>
        </div>
      </main>

      <footer className="w-full bg-footer-dark text-white px-8 py-6">
        <div className="max-w-[600px] mx-auto">
          <p className="text-[12px] mb-4">
            プライバシーポリシー
          </p>
          <p className="text-[12px] mb-6">
            ��用規約
          </p>
          <p className="text-[10px] text-[#BCBCBC]">
            @2025 E-kanji
          </p>
        </div>
      </footer>
    </div>
  );
}

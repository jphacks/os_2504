import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface VoteData {
  name: string;
  stores: string;
  checked: boolean;
}

export default function Index() {
  const voteData: VoteData[] = [
    { name: 'りんたろう', stores: '最強ラーメン、最弱ラーメン', checked: true },
    { name: 'たてそと', stores: '最強ラーメン、弱虫ラーメン', checked: true },
    { name: 'ワタル', stores: '最強ラーメン、最弱ラーメン', checked: true },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
        <div className="max-w-2xl mx-auto">
          <section className="mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">JPHACKアフター</h2>

            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-bold mb-2">投票済みメンバー</h3>
              <p className="text-[10px] sm:text-xs">りんたろう・たてそと・ワタル</p>
            </div>
          </section>

          <section className="mb-8 sm:mb-10">
            <h3 className="text-lg font-bold mb-4 sm:mb-6">投票内容</h3>

            <div className="bg-white rounded-lg overflow-hidden">
              <div className="border-b-2 border-muted">
                <div className="grid grid-cols-[auto_1fr_2fr] gap-2 sm:gap-4 py-3 px-2 sm:px-4">
                  <div className="w-6"></div>
                  <div className="text-[10px] sm:text-xs font-normal">名前</div>
                  <div className="text-[10px] sm:text-xs font-normal">いいねした店</div>
                </div>
              </div>

              {voteData.map((item, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-[auto_1fr_2fr] gap-2 sm:gap-4 py-3 px-2 sm:px-4 border-b border-muted ${
                    index === voteData.length - 1 ? 'border-b-2' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7">
                      <div className="relative w-[18px] h-[18px] rounded-sm bg-checkbox flex items-center justify-center">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 16.4L6 12.4L7.4 11L10 13.6L16.6 7L18 8.4L10 16.4Z" fill="white" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs flex items-center">{item.name}</div>
                  <div className="text-[10px] sm:text-xs flex items-center">{item.stores}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-4 sm:gap-5 max-w-md mx-auto">
            <button className="w-full h-[29px] sm:h-[35px] rounded-full border border-destructive bg-white text-destructive text-xs sm:text-sm font-bold hover:bg-destructive/5 transition-colors">
              選択したデータを削除
            </button>
            <button className="w-full h-[29px] sm:h-[35px] rounded-full border border-primary bg-white text-primary text-xs sm:text-sm font-bold hover:bg-primary/5 transition-colors">
              戻る
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Star, MessageSquare, Map, Heart, X } from "lucide-react";

export default function Index() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [
    "https://api.builder.io/api/v1/image/assets/TEMP/b94ffc0a17a09de367e25f41a131bb72fe10716d?width=696",
  ];

  const totalImages = 5;

  return (
    <div className="min-h-screen bg-cream-bg">
      <header className="fixed top-0 left-0 right-0 z-50 bg-header-bg shadow-md">
        <div className="max-w-[393px] mx-auto h-[50px] flex items-center justify-center relative">
          <div className="text-center">
            <h1 className="text-[30px] font-bold text-orange-primary leading-none" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
              いー幹事？
            </h1>
            <p className="text-[15px] font-bold text-orange-primary leading-none" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
              i-kanji?
            </p>
          </div>
        </div>
      </header>

      <main className="pt-[72px] pb-[200px] max-w-[393px] mx-auto px-4">
        <div className="bg-white rounded-[20px] shadow-lg overflow-hidden">
          <div className="relative h-[204px]">
            <img
              src={images[currentImageIndex]}
              alt="Restaurant exterior"
              className="w-full h-full object-cover"
            />
            
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-[39px] h-[39px] rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev + 1) % totalImages)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-[39px] h-[39px] rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {[...Array(totalImages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentImageIndex ? 'bg-white w-3' : 'bg-white/70'
                  }`}
                />
              ))}
            </div>

            <div className="absolute top-3 left-[149px] bg-white rounded-[20px] px-3 py-1 flex items-center gap-1">
              <span className="text-[14px] font-jp">{currentImageIndex + 1}/{totalImages}</span>
            </div>

            <div className="absolute top-3 right-[20px] bg-white rounded-[20px] px-3 py-1 flex items-center gap-1">
              <Star className="w-4 h-4 fill-[#FDA349] stroke-[#FDA349]" />
              <span className="text-[11px] font-jp">3.3</span>
            </div>
          </div>

          <div className="p-6 pt-4">
            <h2 className="text-[18px] font-bold text-center mb-3" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
              餃子の王将 TY店
            </h2>

            <div className="flex items-start gap-1 mb-3">
              <MapPin className="w-[14px] h-[14px] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#5D5D5D] font-jp">
                京都府京都市左京区北白川大堂町51
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <button className="px-6 py-1.5 rounded-full border-2 border-orange-border bg-white text-orange-primary text-[13px] font-bold hover:bg-orange-50 transition-colors">
                詳細
              </button>

              <div className="flex items-center gap-2 bg-[#D9D9D9] rounded-full px-1.5 py-0.5">
                <button className="w-[25px] h-[25px] rounded-full bg-[#E65A5A] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </button>
                <button className="w-[25px] h-[25px] rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                  <Map className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-[15px] font-jp">¥¥</span>
              <span className="px-3 py-1 bg-[#D2D2D2] rounded-[10px] text-[10px] font-bold">ramen</span>
              <span className="px-3 py-1 bg-[#D2D2D2] rounded-[10px] text-[10px] font-bold">umai</span>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-orange-border rounded-[20px] bg-ai-bg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/e3e86757f6844490d4af0e91126994606ff2b07f?width=38"
                    alt="Mogu-ta"
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-[13px] font-bold" style={{ fontFamily: 'Noto Sans, sans-serif' }}>モグ太</span>
                  <span className="px-3 py-0.5 bg-red-ai rounded-full text-white text-[12px] font-bold">AI</span>
                </div>
                <div className="text-[12px] text-red-ai leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
                  ・うまい！{'\n'}すごい{'\n'}・早い！{'\n'}早い{'\n'}・やすい！{'\n'}神
                </div>
              </div>

              <div className="border border-[#E8E8E8] rounded-[20px] bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#FDDDAC] border border-[#E2E2E2] flex items-center justify-center">
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="white">
                        <path d="M10 9.99967C9.08337 9.99967 8.29865 9.67329 7.64587 9.02051C6.9931 8.36773 6.66671 7.58301 6.66671 6.66634C6.66671 5.74967 6.9931 4.96495 7.64587 4.31217C8.29865 3.6594 9.08337 3.33301 10 3.33301C10.9167 3.33301 11.7014 3.6594 12.3542 4.31217C13.007 4.96495 13.3334 5.74967 13.3334 6.66634C13.3334 7.58301 13.007 8.36773 12.3542 9.02051C11.7014 9.67329 10.9167 9.99967 10 9.99967ZM3.33337 16.6663V14.333C3.33337 13.8608 3.4549 13.4268 3.69796 13.0309C3.94101 12.6351 4.26393 12.333 4.66671 12.1247C5.52782 11.6941 6.40282 11.3712 7.29171 11.1559C8.1806 10.9406 9.08337 10.833 10 10.833C10.9167 10.833 11.8195 10.9406 12.7084 11.1559C13.5973 11.3712 14.4723 11.6941 15.3334 12.1247C15.7362 12.333 16.0591 12.6351 16.3021 13.0309C16.5452 13.4268 16.6667 13.8608 16.6667 14.333V16.6663H3.33337Z" />
                      </svg>
                    </div>
                    <span className="text-[12px]" style={{ fontFamily: 'Noto Sans, sans-serif' }}>タンデムライオン</span>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-[#FDA349] stroke-[#FDA349]" />
                    ))}
                    {[4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-none stroke-black" />
                    ))}
                  </div>
                </div>
                <div className="text-[12px] text-comment-gray leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
                  それなりの味でした。{'\n'}値段の割には美味しかったなあと。{'\n\n'}トイレが綺麗なのは高評価です。
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-12 mt-8">
          <button className="w-14 h-14 rounded-full bg-white border-2 border-green-x shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all">
            <X className="w-8 h-8 text-green-x" strokeWidth={2.5} />
          </button>
          
          <button className="w-14 h-14 rounded-full bg-white border-2 border-pink-heart shadow-lg flex items-center justify-center hover:bg-pink-50 transition-all">
            <Heart className="w-9 h-9 fill-[#FF8B8B] stroke-none" />
          </button>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-footer-dark text-white">
        <div className="max-w-[393px] mx-auto px-9 py-6">
          <div className="space-y-3">
            <a href="#privacy" className="block text-[12px] hover:underline" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
              プライバシーポリシー
            </a>
            <a href="#terms" className="block text-[12px] hover:underline" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
              利用規約
            </a>
          </div>
          <p className="text-[10px] text-[#BCBCBC] mt-6" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
            @2025 E-kanji
          </p>
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { Phone, ArrowRight, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Index() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = [
    "https://api.builder.io/api/v1/image/assets/TEMP/09ba864ab22b59bb02fbc226c33cab2e58297b5e?width=696",
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-app-bg font-noto-sans flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-start justify-center py-4 sm:py-8 px-4">
        <div className="w-full max-w-[393px]">
          <div className="bg-white rounded-[20px] shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="relative">
              <img
                src={images[currentImageIndex]}
                alt="Restaurant"
                className="w-full aspect-[29/17] object-cover"
              />
              
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-[0_8px_4px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-gray-50 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-[0_8px_4px_rgba(0,0,0,0.25)] flex items-center justify-center hover:bg-gray-50 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-opacity ${
                      index === currentImageIndex ? "bg-white opacity-100" : "bg-white opacity-70"
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="px-4 sm:px-9 pb-6 relative">
              <div className="absolute right-2 top-[140px] flex flex-col gap-2 z-10">
                <a
                  href="tel:"
                  className="w-[25px] h-[25px] bg-app-red rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                  aria-label="Call restaurant"
                >
                  <Phone className="w-[19px] h-[19px] text-white" strokeWidth={1} />
                </a>
                <a
                  href="#"
                  className="w-[25px] h-[25px] bg-app-red rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                  aria-label="Visit website"
                >
                  <ArrowRight className="w-[19px] h-[19px] text-white" strokeWidth={1} />
                </a>
                <a
                  href="#"
                  className="w-[25px] h-[25px] bg-app-red rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                  aria-label="View on map"
                >
                  <MapPin className="w-[19px] h-[19px] text-white" strokeWidth={1} />
                </a>
              </div>

              <h1 className="text-lg font-bold text-app-text-primary mt-6 mb-3">
                餃子の王将 TY店
              </h1>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-4 h-4"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5.89992 11.8833L7.99992 10.6167L10.0999 11.9L9.54992 9.5L11.3999 7.9L8.96659 7.68333L7.99992 5.41667L7.03325 7.66667L4.59992 7.88333L6.44992 9.5L5.89992 11.8833ZM3.88325 14.6667L4.96659 9.98333L1.33325 6.83333L6.13325 6.41667L7.99992 2L9.86659 6.41667L14.6666 6.83333L11.0333 9.98333L12.1166 14.6667L7.99992 12.1833L3.88325 14.6667Z"
                        fill={star <= 3 ? "#FDA349" : "#1D1B20"}
                      />
                    </svg>
                  ))}
                </div>
                <span className="text-[11px] text-app-text-secondary font-ibm-plex-sans-jp">
                  3.3 (645件)
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-[15px] font-ibm-plex-sans-jp">¥¥</span>
                <span className="px-3 py-1 bg-app-tag rounded-[10px] text-[10px] font-bold">
                  ramen
                </span>
                <span className="px-3 py-1 bg-app-tag rounded-[10px] text-[10px] font-bold">
                  umai
                </span>
              </div>

              <div className="flex items-start gap-2 mb-4">
                <svg className="w-3.5 h-6 mt-0.5 flex-shrink-0" viewBox="0 0 14 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.75 26.5263C4.7625 26.5263 3.14062 26.1561 1.88437 25.4155C0.628125 24.675 0 23.7189 0 22.5474C0 21.7737 0.271875 21.0995 0.815625 20.5247C1.35938 19.95 2.10938 19.4968 3.06562 19.1653L3.7125 21.6853C3.39375 21.7958 3.10312 21.9339 2.84062 22.0997C2.57812 22.2655 2.4 22.4147 2.30625 22.5474C2.55 22.9011 3.1125 23.2105 3.99375 23.4758C4.875 23.7411 5.79375 23.8737 6.75 23.8737C7.70625 23.8737 8.62969 23.7411 9.52031 23.4758C10.4109 23.2105 10.9781 22.9011 11.2219 22.5474C11.1281 22.4147 10.95 22.2655 10.6875 22.0997C10.425 21.9339 10.1344 21.7958 9.81563 21.6853L10.4625 19.1653C11.4188 19.4968 12.1641 19.95 12.6984 20.5247C13.2328 21.0995 13.5 21.7737 13.5 22.5474C13.5 23.7189 12.8719 24.675 11.6156 25.4155C10.3594 26.1561 8.7375 26.5263 6.75 26.5263ZM6.75 22.5474C6.54375 22.5474 6.35625 22.4755 6.1875 22.3318C6.01875 22.1882 5.89687 21.9947 5.82187 21.7516C5.39062 20.1821 4.84687 18.8668 4.19062 17.8058C3.53437 16.7447 2.89687 15.7279 2.27813 14.7553C1.67813 13.7826 1.15781 12.7768 0.717187 11.7379C0.276562 10.6989 0.05625 9.41684 0.05625 7.89158C0.05625 5.68105 0.703125 3.81316 1.99687 2.28789C3.29062 0.762632 4.875 0 6.75 0C8.625 0 10.2094 0.762632 11.5031 2.28789C12.7969 3.81316 13.4437 5.68105 13.4437 7.89158C13.4437 9.41684 13.2281 10.6989 12.7969 11.7379C12.3656 12.7768 11.8406 13.7826 11.2219 14.7553C10.6219 15.7279 9.98906 16.7447 9.32344 17.8058C8.65781 18.8668 8.10938 20.1821 7.67812 21.7516C7.60313 21.9947 7.48125 22.1882 7.3125 22.3318C7.14375 22.4755 6.95625 22.5474 6.75 22.5474ZM6.75 10.71C7.40625 10.71 7.96875 10.4337 8.4375 9.88105C8.90625 9.32842 9.14062 8.66526 9.14062 7.89158C9.14062 7.1179 8.90625 6.45474 8.4375 5.90211C7.96875 5.34947 7.40625 5.07316 6.75 5.07316C6.09375 5.07316 5.53125 5.34947 5.0625 5.90211C4.59375 6.45474 4.35938 7.1179 4.35938 7.89158C4.35938 8.66526 4.59375 9.32842 5.0625 9.88105C5.53125 10.4337 6.09375 10.71 6.75 10.71Z" fill="black"/>
                </svg>
                <p className="text-[11px] text-app-text-secondary font-ibm-plex-sans-jp">
                  京都府京都市左京区北白川大堂町51
                </p>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-bold font-ibm-plex-sans-jp">営業時間</span>
                <div className="bg-app-green text-black text-[11px] font-bold px-3 py-0.5 rounded-full font-ibm-plex-sans-jp">
                  営業中
                </div>
              </div>

              <a href="#" className="text-app-red text-xs underline block mb-6 font-noto-sans-jp">
                営業時間を表示
              </a>

              <div className="relative mb-6 mt-8">
                <div className="bg-app-comment-bg rounded-[20px] p-6 shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]">
                  <p className="text-xs text-black leading-relaxed font-noto-sans-jp">
                    カクテルとウィスキーが美味しいお店なんだって！<br />
                    お店の雰囲気が良くって二軒目に行くのに最適なん<br />
                    だってさ！
                  </p>
                </div>
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/961510c7f1b01cf5302d28166cc14ebf79de6127?width=96"
                  alt="User avatar"
                  className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full"
                />
              </div>

              <div className="border border-[#E8E8E8] rounded-[20px] p-3 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-app-avatar-bg border border-[#E2E2E2] flex items-center justify-center">
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 9.99967C9.08337 9.99967 8.29865 9.67329 7.64587 9.02051C6.9931 8.36773 6.66671 7.58301 6.66671 6.66634C6.66671 5.74967 6.9931 4.96495 7.64587 4.31217C8.29865 3.6594 9.08337 3.33301 10 3.33301C10.9167 3.33301 11.7014 3.6594 12.3542 4.31217C13.007 4.96495 13.3334 5.74967 13.3334 6.66634C13.3334 7.58301 13.007 8.36773 12.3542 9.02051C11.7014 9.67329 10.9167 9.99967 10 9.99967ZM3.33337 16.6663V14.333C3.33337 13.8608 3.4549 13.4268 3.69796 13.0309C3.94101 12.6351 4.26393 12.333 4.66671 12.1247C5.52782 11.6941 6.40282 11.3712 7.29171 11.1559C8.1806 10.9406 9.08337 10.833 10 10.833C10.9167 10.833 11.8195 10.9406 12.7084 11.1559C13.5973 11.3712 14.4723 11.6941 15.3334 12.1247C15.7362 12.333 16.0591 12.6351 16.3021 13.0309C16.5452 13.4268 16.6667 13.8608 16.6667 14.333V16.6663H3.33337ZM5.00004 14.9997H15V14.333C15 14.1802 14.9618 14.0413 14.8855 13.9163C14.8091 13.7913 14.7084 13.6941 14.5834 13.6247C13.8334 13.2497 13.0764 12.9684 12.3125 12.7809C11.5487 12.5934 10.7778 12.4997 10 12.4997C9.22226 12.4997 8.45143 12.5934 7.68754 12.7809C6.92365 12.9684 6.16671 13.2497 5.41671 13.6247C5.29171 13.6941 5.19101 13.7913 5.11462 13.9163C5.03824 14.0413 5.00004 14.1802 5.00004 14.333V14.9997ZM10 8.33301C10.4584 8.33301 10.8507 8.16981 11.1771 7.84342C11.5035 7.51704 11.6667 7.12467 11.6667 6.66634C11.6667 6.20801 11.5035 5.81565 11.1771 5.48926C10.8507 5.16287 10.4584 4.99967 10 4.99967C9.54171 4.99967 9.14935 5.16287 8.82296 5.48926C8.49657 5.81565 8.33337 6.20801 8.33337 6.66634C8.33337 7.12467 8.49657 7.51704 8.82296 7.84342C9.14935 8.16981 9.54171 8.33301 10 8.33301Z" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-xs font-noto-sans">タンデムライオン</span>
                </div>
                <p className="text-xs text-app-text-muted leading-relaxed font-noto-sans">
                  それなりの味でした。<br />
                  値段の割には美味しかったなあと。<br />
                  <br />
                  トイレが綺麗なのは高評価です。
                </p>
              </div>
            </div>
          </div>

          <button className="w-full max-w-[301px] mx-auto mt-6 h-[29px] rounded-full border border-app-orange bg-white text-app-orange text-[13px] font-bold hover:bg-app-orange hover:text-white transition-colors">
            戻る
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

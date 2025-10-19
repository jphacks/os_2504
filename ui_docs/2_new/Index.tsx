import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Index() {
  const [groupName, setGroupName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [members, setMembers] = useState(["りんたろう", "たてそと"]);
  const [searchRange, setSearchRange] = useState(1000);
  const [priceRange, setPriceRange] = useState([1, 3]);

  const addMember = () => {
    if (memberName.trim()) {
      setMembers([...members, memberName.trim()]);
      setMemberName("");
    }
  };

  const handleSearchRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchRange(Number(e.target.value));
  };

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceRange([Number(e.target.value), priceRange[1]]);
  };

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceRange([priceRange[0], Number(e.target.value)]);
  };

  return (
    <div className="min-h-screen bg-ekanji-bg flex flex-col">
      <Header />
      
      <main className="flex-1 w-full max-w-[393px] mx-auto px-3 md:px-4 py-8 pb-0">
        <div className="space-y-6">
          {/* Group Name Section */}
          <div className="w-full">
            <h2 className="text-black font-noto text-[15px] font-bold mb-5">
              グループ名
            </h2>
            <div className="relative">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="グループ名を入力"
                className="w-full h-[44px] px-[14px] text-[20px] font-noto font-bold bg-transparent border-none outline-none placeholder:text-[#ADADAD]"
              />
              <div className="w-full h-[1px] bg-[#D9D9D9] mt-2"></div>
            </div>
          </div>

          {/* Member Section */}
          <div className="w-full">
            <h2 className="text-black font-noto text-[12px] font-bold mb-5">
              メンバー追加
            </h2>
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="名前を入力"
                  className="w-full h-[44px] px-[14px] text-[20px] font-noto font-bold bg-transparent border-none outline-none placeholder:text-[#ADADAD]"
                />
                <div className="w-[158px] h-[1px] bg-[#D9D9D9] mt-2"></div>
              </div>
              <button
                onClick={addMember}
                className="w-[96px] h-[29px] bg-ekanji-orange rounded-[10px] text-white font-noto text-[18px] font-bold flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                追加
              </button>
            </div>
            {members.length > 0 && (
              <div className="text-black font-noto text-[13px] font-bold space-y-1">
                {members.map((member, index) => (
                  <div key={index}>・{member}</div>
                ))}
              </div>
            )}
          </div>

          {/* Location Section */}
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 24.75C11.5125 24.75 9.89062 24.4359 8.63437 23.8078C7.37812 23.1797 6.75 22.3688 6.75 21.375C6.75 20.7188 7.02188 20.1469 7.56563 19.6594C8.10938 19.1719 8.85938 18.7875 9.81562 18.5063L10.4625 20.6438C10.1438 20.7375 9.85312 20.8547 9.59062 20.9953C9.32812 21.1359 9.15 21.2625 9.05625 21.375C9.3 21.675 9.8625 21.9375 10.7437 22.1625C11.625 22.3875 12.5437 22.5 13.5 22.5C14.4563 22.5 15.3797 22.3875 16.2703 22.1625C17.1609 21.9375 17.7281 21.675 17.9719 21.375C17.8781 21.2625 17.7 21.1359 17.4375 20.9953C17.175 20.8547 16.8844 20.7375 16.5656 20.6438L17.2125 18.5063C18.1688 18.7875 18.9141 19.1719 19.4484 19.6594C19.9828 20.1469 20.25 20.7188 20.25 21.375C20.25 22.3688 19.6219 23.1797 18.3656 23.8078C17.1094 24.4359 15.4875 24.75 13.5 24.75ZM13.5 21.375C13.2937 21.375 13.1062 21.3141 12.9375 21.1922C12.7688 21.0703 12.6469 20.9062 12.5719 20.7C12.1406 19.3688 11.5969 18.2531 10.9406 17.3531C10.2844 16.4531 9.64687 15.5906 9.02813 14.7656C8.42813 13.9406 7.90781 13.0875 7.46719 12.2063C7.02656 11.325 6.80625 10.2375 6.80625 8.94375C6.80625 7.06875 7.45312 5.48438 8.74687 4.19063C10.0406 2.89688 11.625 2.25 13.5 2.25C15.375 2.25 16.9594 2.89688 18.2531 4.19063C19.5469 5.48438 20.1937 7.06875 20.1937 8.94375C20.1937 10.2375 19.9781 11.325 19.5469 12.2063C19.1156 13.0875 18.5906 13.9406 17.9719 14.7656C17.3719 15.5906 16.7391 16.4531 16.0734 17.3531C15.4078 18.2531 14.8594 19.3688 14.4281 20.7C14.3531 20.9062 14.2312 21.0703 14.0625 21.1922C13.8937 21.3141 13.7063 21.375 13.5 21.375ZM13.5 11.3344C14.1562 11.3344 14.7188 11.1 15.1875 10.6313C15.6562 10.1625 15.8906 9.6 15.8906 8.94375C15.8906 8.2875 15.6562 7.725 15.1875 7.25625C14.7188 6.7875 14.1562 6.55313 13.5 6.55313C12.8438 6.55313 12.2812 6.7875 11.8125 7.25625C11.3438 7.725 11.1094 8.2875 11.1094 8.94375C11.1094 9.6 11.3438 10.1625 11.8125 10.6313C12.2812 11.1 12.8438 11.3344 13.5 11.3344Z" fill="black"/>
              </svg>
              <span className="text-black font-ibm text-[13px]">場所</span>
            </div>
            <button className="w-full max-w-[290px] h-[39px] bg-white rounded-[14px] shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] flex items-center justify-center text-black text-[16px] hover:bg-gray-50 transition-colors mx-auto">
              現在地を取得(取得すると住所が表示)
            </button>
          </div>

          {/* Search Range Section */}
          <div className="w-full">
            <div className="flex items-center gap-2 mb-6">
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.79582 7.16712L6.98332 9.38379C7.19721 9.59768 7.30902 9.86504 7.31874 10.1859C7.32846 10.5067 7.21665 10.7838 6.98332 11.0171C6.76943 11.231 6.49721 11.338 6.16665 11.338C5.8361 11.338 5.56388 11.231 5.34999 11.0171L1.14999 6.81712C0.916654 6.58379 0.799988 6.31157 0.799988 6.00046C0.799988 5.68934 0.916654 5.41712 1.14999 5.18379L5.34999 0.983789C5.58332 0.750456 5.85554 0.63865 6.16665 0.648372C6.47777 0.658095 6.74999 0.779622 6.98332 1.01296C7.19721 1.24629 7.30902 1.51851 7.31874 1.82962C7.32846 2.14073 7.21665 2.41296 6.98332 2.64629L4.79582 4.83379H19.175L16.9875 2.64629C16.7542 2.41296 16.6375 2.13587 16.6375 1.81504C16.6375 1.49421 16.7542 1.21712 16.9875 0.983789C17.2208 0.750456 17.4979 0.633789 17.8187 0.633789C18.1396 0.633789 18.4167 0.750456 18.65 0.983789L22.85 5.18379C23.0833 5.41712 23.2 5.68934 23.2 6.00046C23.2 6.31157 23.0833 6.58379 22.85 6.81712L18.65 11.0171C18.4361 11.231 18.1687 11.3428 17.8479 11.3525C17.5271 11.3623 17.25 11.2505 17.0167 11.0171C16.7833 10.7838 16.6618 10.5067 16.6521 10.1859C16.6424 9.86504 16.7542 9.58796 16.9875 9.35462L19.175 7.16712H4.79582Z" fill="black"/>
              </svg>
              <span className="text-black font-ibm text-[13px]">検索範囲：{searchRange}m</span>
            </div>
            <div className="relative w-full h-[35px]">
              <div className="absolute left-0 right-0 top-[15px] h-[5px] bg-[#FFA9A9] rounded-[5px]" style={{ width: `${(searchRange / 5000) * 100}%` }}></div>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={searchRange}
                onChange={handleSearchRangeChange}
                className="absolute left-0 top-0 w-full h-[35px] appearance-none bg-transparent cursor-pointer [&::-webkit-slider-track]:h-[4px] [&::-webkit-slider-track]:bg-[rgba(120,120,128,0.16)] [&::-webkit-slider-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[28px] [&::-webkit-slider-thumb]:h-[28px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0.5px_4px_0_rgba(0,0,0,0.12),0_6px_13px_0_rgba(0,0,0,0.12)] [&::-moz-range-track]:h-[4px] [&::-moz-range-track]:bg-[rgba(120,120,128,0.16)] [&::-moz-range-track]:rounded-full [&::-moz-range-thumb]:w-[28px] [&::-moz-range-thumb]:h-[28px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0.5px_4px_0_rgba(0,0,0,0.12),0_6px_13px_0_rgba(0,0,0,0.12)]"
              />
            </div>
          </div>

          {/* Price Range Section */}
          <div className="w-full mb-8">
            <div className="flex items-center gap-2 mb-6">
              <img 
                src="https://api.builder.io/api/v1/image/assets/TEMP/3bbf7135dd609b78ffb541acdecc510c6d40ad2d?width=54" 
                alt="Stack of Money" 
                className="w-[27px] h-[27px]"
              />
              <span className="text-black text-[13px]">価格帯</span>
            </div>
            <div className="relative w-full h-[35px] mb-12">
              <div 
                className="absolute top-[15px] h-[5px] bg-[#FFA9A9] rounded-[5px]" 
                style={{ 
                  left: `${(priceRange[0] / 5) * 100}%`, 
                  width: `${((priceRange[1] - priceRange[0]) / 5) * 100}%` 
                }}
              ></div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={priceRange[0]}
                onChange={handlePriceMinChange}
                className="absolute left-0 top-0 w-full h-[35px] appearance-none bg-transparent cursor-pointer pointer-events-auto [&::-webkit-slider-track]:h-[4px] [&::-webkit-slider-track]:bg-[rgba(120,120,128,0.16)] [&::-webkit-slider-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[28px] [&::-webkit-slider-thumb]:h-[28px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0.5px_4px_0_rgba(0,0,0,0.12),0_6px_13px_0_rgba(0,0,0,0.12)] [&::-moz-range-track]:h-[4px] [&::-moz-range-track]:bg-[rgba(120,120,128,0.16)] [&::-moz-range-track]:rounded-full [&::-moz-range-thumb]:w-[28px] [&::-moz-range-thumb]:h-[28px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0.5px_4px_0_rgba(0,0,0,0.12),0_6px_13px_0_rgba(0,0,0,0.12)]"
              />
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={priceRange[1]}
                onChange={handlePriceMaxChange}
                className="absolute left-0 top-0 w-full h-[35px] appearance-none bg-transparent cursor-pointer pointer-events-auto [&::-webkit-slider-track]:h-[4px] [&::-webkit-slider-track]:bg-transparent [&::-webkit-slider-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[28px] [&::-webkit-slider-thumb]:h-[28px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0.5px_4px_0_rgba(0,0,0,0.12),0_6px_13px_0_rgba(0,0,0,0.12)] [&::-moz-range-track]:h-[4px] [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:rounded-full [&::-moz-range-thumb]:w-[28px] [&::-moz-range-thumb]:h-[28px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0.5px_4px_0_rgba(0,0,0,0.12),0_6px_13px_0_rgba(0,0,0,0.12)]"
              />
            </div>
            <div className="relative w-full">
              <span className="absolute left-[9px] text-black text-center font-ibm text-[10px]">¥</span>
              <span className="absolute left-[91px] text-black text-center font-ibm text-[10px]">¥¥</span>
              <span className="absolute left-[170px] text-black text-center font-ibm text-[10px]">¥¥¥</span>
              <span className="absolute left-[259px] text-black text-center font-ibm text-[10px]">¥¥¥¥</span>
              <span className="absolute left-[324px] text-black text-center font-ibm text-[10px]">¥¥¥¥¥</span>
            </div>
          </div>

          {/* Create Group Button */}
          <div className="w-full flex justify-center pb-8">
            <button className="w-full max-w-[301px] h-[29px] bg-ekanji-orange rounded-[100px] shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] text-white font-noto text-[18px] font-bold flex items-center justify-center hover:opacity-90 transition-opacity">
              グループを作成
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Index() {
  const [selectedUser, setSelectedUser] = useState('たてそと');
  const [newUsername, setNewUsername] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const users = ['たてそと', 'ユーザ2', 'ユーザ3'];

  const handleStartVoting = () => {
    console.log('Starting vote with user:', selectedUser);
  };

  const handleStartWithNewName = () => {
    if (newUsername.trim()) {
      console.log('Starting vote with new user:', newUsername);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <main className="flex-1 flex flex-col items-center px-4 pb-8">
        <div className="w-full max-w-[393px] pt-8 md:pt-12">
          <div className="text-center mb-12">
            <p className="text-[15px] leading-[28px] mb-2">グループ名</p>
            <h2 className="text-[22px] font-bold">JPHACKアフター</h2>
          </div>

          <div className="mb-16">
            <p className="text-[15px] leading-[28px] text-center mb-6">ユーザを選択</p>

            <div className="flex justify-center mb-8">
              <div className="relative w-[171px]">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full h-[35px] rounded-[10px] border border-brand-gray bg-brand-cream flex items-center justify-center relative"
                >
                  <span className="text-[15px] leading-[28px]">{selectedUser}</span>
                  <ChevronDown className="absolute right-[6px] w-6 h-6 text-[#4A4459]" strokeWidth={2} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-brand-cream border border-brand-gray rounded-[10px] shadow-lg z-10">
                    {users.map((user) => (
                      <button
                        key={user}
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-[15px] hover:bg-brand-yellow text-left"
                      >
                        {user}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleStartVoting}
                className="w-full max-w-[293px] h-[29px] rounded-[100px] bg-brand-orange shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] text-white text-[18px] font-bold hover:bg-[#d67f00] transition-colors"
              >
                この名前で投票をスタート！
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <p className="text-[15px] leading-[24px] text-center mb-8 whitespace-pre-line">
              {`または\n新しい名前で参加`}
            </p>

            <div className="w-full max-w-[301px] mb-8">
              <div className="flex justify-center mb-8">
                <input
                  type="text"
                  placeholder="ユーザ名"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-[257px] h-[44px] rounded-[10px] border border-brand-gray bg-brand-cream px-[14px] text-[16px] placeholder:text-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <button
                onClick={handleStartWithNewName}
                disabled={!newUsername.trim()}
                className="w-full h-[29px] rounded-[100px] bg-brand-orange shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] text-white text-[18px] font-bold hover:bg-[#d67f00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                新しい名前で投票をスタ���ト！
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

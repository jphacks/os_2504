const baseButton =
  'inline-flex items-center justify-center rounded-full font-noto font-bold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

export const panelClass = 'rounded-[20px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]';
export const buttonPrimary = `${baseButton} bg-[#EB8D00] text-white hover:bg-[#d67f00]`;
export const buttonSecondary = `${baseButton} border border-[#EB8D00] text-[#EB8D00] bg-white hover:bg-[#EB8D00] hover:text-white`;
export const buttonMuted = `${baseButton} bg-[#FFE7DF] text-[#EB8D00] hover:bg-[#fcd6c9]`;
export const buttonDanger = `${baseButton} bg-[#FF8B8B] text-white hover:bg-[#e67373]`;
const buttonCircleBase =
  'inline-flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 font-noto font-bold transition-colors duration-150 shadow-[0_8px_18px_rgba(0,0,0,0.14)] disabled:opacity-50 disabled:cursor-not-allowed';
export const buttonCirclePositive = `${buttonCircleBase} border-[#FF8B8B] bg-white text-[#FF8B8B] hover:bg-[#FFE0E0]`;
export const buttonCircleNegative = `${buttonCircleBase} border-[#24A19C] bg-white text-[#24A19C] hover:bg-[#D9F3F2]`;

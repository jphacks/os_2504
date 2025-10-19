import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-[48px] font-bold text-brand-orange mb-4">404</h1>
        <p className="text-[18px] mb-8">ページが見つかりません</p>
        <Link
          to="/"
          className="inline-block px-8 py-3 rounded-[100px] bg-brand-orange shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] text-white text-[18px] font-bold hover:bg-[#d67f00] transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}

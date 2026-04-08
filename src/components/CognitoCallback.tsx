import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function CognitoCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] gap-4"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <img
        src="/logo.svg"
        alt="SlothubEdu"
        className="w-16 rounded-xl bg-white mb-2 animate-pulse"
      />
      <div className="flex gap-2">
        <span className="w-3 h-3 rounded-full bg-[#FF6B4A] animate-bounce [animation-delay:0ms]" />
        <span className="w-3 h-3 rounded-full bg-[#FF6B4A] animate-bounce [animation-delay:150ms]" />
        <span className="w-3 h-3 rounded-full bg-[#FF6B4A] animate-bounce [animation-delay:300ms]" />
      </div>
      <p className="text-gray-300 text-sm font-extrabold tracking-wide">Đang chuyển hướng...</p>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const BackButton = ({ to, label = 'Back' }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  return (
    <button
      onClick={handleBack}
      className="absolute top-[90px] left-[20px] inline-flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 px-4 py-2 rounded-xl transition-all text-xs font-semibold tertiary-btn z-10"
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  );
};

export default BackButton;

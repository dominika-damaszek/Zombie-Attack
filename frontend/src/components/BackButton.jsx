import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const BackButton = ({ to, label = 'Back' }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 px-4 py-2 rounded-xl transition-all text-sm font-semibold mb-8"
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  );
};

export default BackButton;

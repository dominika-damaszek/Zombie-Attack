import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const BackButton = ({ to, label = "Back" }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  return (
    <button
      onClick={handleBack}
      className="absolute top-[12px] left-[12px] sm:top-[30px] sm:left-[20px] inline-flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all text-[10px] sm:text-xs font-semibold tertiary-btn z-10"
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  );
};

export default BackButton;

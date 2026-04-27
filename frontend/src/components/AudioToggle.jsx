import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function AudioToggle({ toggle, isEnabled }) {
  const [on, setOn] = useState(isEnabled());

  const handleToggle = () => {
    const next = toggle();
    setOn(next);
  };

  return (
    <button
      onClick={handleToggle}
      title={on ? 'Mute sounds' : 'Enable sounds'}
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      style={{
        background: 'rgba(56,44,37,0.85)',
        border: '1px solid rgba(121,88,70,0.5)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {on ? (
        <Volume2 size={18} className="text-amber-400" />
      ) : (
        <VolumeX size={18} className="text-slate-500" />
      )}
    </button>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogIn,
  LogOut,
  LayoutDashboard,
  History,
  Menu,
  X,
  BookOpen,
  Users,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const TopNav = ({
  isAuthenticated,
  hasSession,
  setIsAuthenticated,
  setHasSession,
}) => {
  const navigate = useNavigate();
  const { t, lang, cycleLanguage, LABELS } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("session_id");
    localStorage.removeItem("session_data");
    localStorage.removeItem("player_session");
    setIsAuthenticated(false);
    if (setHasSession) setHasSession(false);
    navigate("/");
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const navTo = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const menuItems = [
    {
      icon: <BookOpen size={18} className="text-[var(--neon-green-glow)]/45" />,
      label: t("nav_rules"),
      sublabel: t("nav_rules_sub"),
      path: "/rules",
      color: "hover:bg-[var(--neon-green-glow)]/10",
    },
    {
      icon: <Users size={18} className="text-[var(--neon-cyan)]/70" />,
      label: t("nav_about"),
      sublabel: t("nav_about_sub"),
      path: "/about",
      color: "hover:bg-[var(--neon-cyan-glow)]/10",
    },
    ...(isAuthenticated
      ? [
          {
            icon: (
              <UserCircle size={18} className="text-[var(--neon-pink-glow)]" />
            ),
            label: t("nav_profile"),
            sublabel: t("nav_profile_sub"),
            path: "/profile",
            color: "hover:bg-[var(--neon-pink-glow)]/10",
          },
        ]
      : []),
  ];

  return (
    <header className="w-full flex items-center justify-between px-6 py-0 bg-[var(--grid-color)]/90 backdrop-blur-xl border-b border-[var(--neon-pink-glow)]/50 z-30 relative">
      <div className="flex items-center gap-3 sm:gap-2" ref={menuRef}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl flex items-center justify-center text-xs text-slate-300 hover:text-white bg-[var(--neon-pink-glow)]/30 hover:bg-[var(--neon-pink-glow)]/60 border border-[var(--neon-pink)]/50 min-w-[42px] transition-all"
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {menuOpen && (
            <div
              className="absolute top-full left-0 mt-2 w-64 rounded-2xl shadow-2xl overflow-hidden z-50 bg-[var(--secondary-grid-color)]"
              style={{
                border: "1px solid var(--neon-cyan-glow)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="px-4 py-3 border-b border-slate-700/50">
                <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                  {t("nav_menu")}
                </p>
              </div>

              <div className="py-2 px-2">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navTo(item.path)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-all ${item.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 rounded-lg bg-slate-800">
                        {item.icon}
                      </span>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">
                          {item.label}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {item.sublabel}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-slate-600 flex-shrink-0"
                    />
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-700/50 py-2 px-2">
                {isAuthenticated && hasSession && (
                  <button
                    onClick={() => navTo("/dashboard")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-500/10 transition-all"
                  >
                    <LayoutDashboard
                      size={16}
                      className="text-orange-400 opacity-80"
                    />
                    <span className="text-sm font-semibold text-white">
                      {t("nav_dashboard")}
                    </span>
                  </button>
                )}
                {isAuthenticated && (
                  <button
                    onClick={() => navTo("/history")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700/50 transition-all"
                  >
                    <History size={16} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-300">
                      {t("nav_history")}
                    </span>
                  </button>
                )}
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 transition-all"
                  >
                    <LogOut size={16} className="text-orange" />
                    <span className="text-sm font-semibold text-rose-400">
                      {t("nav_logout")}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => navTo("/auth")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--neon-pink)]/10 transition-all"
                  >
                    <LogIn size={16} className="text-[var(--neon-pink-glow)]" />
                    <span className="text-sm font-semibold text-[var(--neon-pink-glow)]">
                      {t("nav_login")}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src="/zombie-logo-new.svg"
            alt="Logo"
            className="ml-2 sm:ml-0 w-14 h-14 m-3 my-4 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]"
          />
          <span className="hidden sm:flex text-lg font-black text-[var(--neon-light-green)] drop-shadow-[0_0_5px_var(--neon-green)] tracking-tight">
            Zombieware
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {isAuthenticated && hasSession && (
          <button
            onClick={() => navigate("/dashboard")}
            className="hidden sm:flex items-center justify-center text-slate-300 hover:text-white bg-[var(--neon-pink-glow)]/30 hover:bg-[var(--neon-pink-glow)]/60 px-2.5 py-2 rounded-xl transition-all border border-[var(--neon-pink)]/50"
            title={t("nav_dashboard")}
          >
            <LayoutDashboard size={16} />
          </button>
        )}
        {isAuthenticated && (
          <button
            onClick={() => navigate("/history")}
            className="hidden sm:flex items-center gap-1 sm:gap-2 text-sm font-semibold  text-slate-300 hover:text-white bg-[var(--neon-pink-glow)]/30 hover:bg-[var(--neon-pink-glow)]/60 px-2.5 py-2 rounded-xl transition-all border border-[var(--neon-pink)]/50"
          >
            <History size={16} />
            <span>{t("nav_history")}</span>
          </button>
        )}
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1 sm:gap-2 text-sm font-semibold  text-slate-300 hover:text-white bg-[var(--neon-pink-glow)]/30 hover:bg-[var(--neon-pink-glow)]/60 px-2.5 py-2 rounded-xl transition-all border border-[var(--neon-pink)]/50"
          >
            <LogOut size={16} />
            <span>{t("nav_logout")}</span>
          </button>
        ) : (
          <button
            onClick={() => navigate("/auth")}
            className="flex items-center gap-1 sm:gap-2 text-sm font-bold text-slate-900 bg-[var(--neon-pink-glow)]/90 hover:bg-[var(--neon-pink)] px-3 sm:px-5 py-2 rounded-xl transition-all shadow-md"
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">{t("nav_login")}</span>
          </button>
        )}
        <button
          onClick={cycleLanguage}
          className="flex items-center justify-center text-xs text-slate-300 hover:text-white bg-[var(--neon-pink-glow)]/30 hover:bg-[var(--neon-pink-glow)]/60 px-2.5 py-2 rounded-xl transition-all border border-[var(--neon-pink)]/50 min-w-[42px]"
          title="Change language"
        >
          {LABELS[lang]}
        </button>
      </div>
    </header>
  );
};

export default TopNav;

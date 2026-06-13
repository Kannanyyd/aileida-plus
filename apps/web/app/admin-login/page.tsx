"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!password) { setError("请输入管理员密码"); return; }
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") ?? "/admin";
    window.location.href = `${redirect}?auth=${encodeURIComponent(password)}`;
  };

  return (
    <div className="min-h-screen bg-main flex items-center justify-center px-4">
      <div className="glass p-8 max-w-sm w-full space-y-6 text-center">
        <Shield className="w-12 h-12 text-primary mx-auto" />
        <h1 className="text-xl font-bold text-white">后台管理登录</h1>
        <p className="text-xs text-slate-400">请输入管理员密码访问后台</p>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="管理员密码"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
        />
        {error && <p className="text-[11px] text-danger">{error}</p>}
        <button onClick={handleLogin} className="w-full brand-glow py-2.5 rounded-xl text-sm font-semibold text-white">
          登录
        </button>
      </div>
    </div>
  );
}

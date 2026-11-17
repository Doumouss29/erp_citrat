import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "linear-gradient(125deg,#061A58 0%,#0C3D85 58%,#087DA4 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <img src="/logo-citrat.svg" alt="CITRAT" className="h-20 w-auto max-w-full object-contain mx-auto mb-3 rounded-xl bg-white p-2 shadow-sm" />
          <p className="text-sm font-semibold text-white/85 mb-4">PORTAIL DIGITAL CITRAT · DAGNOKO HAMED</p>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 border border-white/25 mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-white/80 mt-2">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-white/70 p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-white/90 mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function ModuleCard({ to, icon: Icon, title, description, statLabel, statValue, ctaLabel, accentClass, iconClass, cardClass, glowClass, topBarClass, ctaButtonClass }) {
  return (
    <Link
      to={to}
      className={`group relative block overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 p-5 sm:p-6 lg:p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] ${cardClass || 'bg-white'}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 opacity-80 ${topBarClass || 'bg-gradient-to-r from-slate-900 via-blue-600 to-slate-400'}`} />
      <div className={`absolute -right-10 -top-10 h-24 w-24 sm:h-28 sm:w-28 rounded-full blur-2xl transition-all duration-300 group-hover:scale-110 ${glowClass || 'bg-slate-100'}`} />

      <div className="relative flex h-full flex-col gap-5 sm:gap-6 lg:gap-8">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className={`flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl shadow-inner ${iconClass}`}>
            <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div className={`rounded-full px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs font-bold tracking-wide shadow-sm ${accentClass}`}>
            {statLabel} : {statValue}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">{title}</h2>
          {description && (
            <p className="text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 sm:pt-5">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-slate-900">{ctaLabel}</span>
          <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full text-white transition-all duration-300 group-hover:translate-x-1 group-hover:scale-105 ${ctaButtonClass || 'bg-slate-900'}`}>

            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
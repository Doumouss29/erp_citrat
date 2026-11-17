import React from 'react';

export default function PageHeader({ title, action, actions, align = 'center' }) {
  const actionList = actions || (action ? [action] : []);

  if (actionList.length === 0) {
    return (
      <div className={`flex items-center mb-8 ${align === 'left' ? 'justify-start' : 'justify-center'}`}>
        <h1 className={`text-xl sm:text-3xl font-bold text-slate-900 ${align === 'left' ? 'text-left' : 'text-center'}`}>
          {title}
        </h1>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 mb-8">
      <h1 className="text-xl sm:text-3xl font-bold text-slate-900">
        {title}
      </h1>
      <div className="flex items-center gap-2">
        {actionList.map((a, i) => {
          const { icon: Icon, label, tooltip, onClick, className = "" } = a;
          return (
            <div
              key={i}
              title={tooltip}
              className="sm:flex-shrink-0"
            >
              <button
                onClick={onClick}
                className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-slate-900 text-white shadow hover:bg-slate-800 ${className}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
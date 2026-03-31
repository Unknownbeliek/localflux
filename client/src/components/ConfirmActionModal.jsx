import React from 'react';

export default function ConfirmActionModal({
  open,
  title,
  message,
  checkboxLabel,
  checked,
  onCheckedChange,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  variant = 'danger',
}) {
  if (!open) return null;

  const canConfirm = Boolean(checked);
  const isSuccess = variant === 'success';

  const accentLabel = isSuccess ? 'Ready' : 'Confirm Action';
  const shellBorderClass = isSuccess ? 'border-emerald-500/35' : 'border-rose-500/35';
  const shellBgClass = isSuccess ? 'bg-emerald-950/20' : 'bg-slate-950/95';
  const accentTextClass = isSuccess ? 'text-emerald-300' : 'text-rose-300';
  const checkboxTextClass = isSuccess ? 'text-emerald-100' : 'text-slate-200';
  const checkboxInputClass = isSuccess
    ? 'mt-0.5 h-4 w-4 rounded border-emerald-500/60 bg-slate-950 text-emerald-400 focus:ring-emerald-400'
    : 'mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-950 text-rose-400 focus:ring-rose-400';
  const confirmButtonClass = isSuccess
    ? 'rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-sm font-black tracking-[0.08em] text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50'
    : 'rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-2 text-sm font-black tracking-[0.08em] text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl shadow-black/60 ${shellBorderClass} ${shellBgClass}`}>
        <p className={`text-xs font-black uppercase tracking-[0.24em] ${accentTextClass}`}>{accentLabel}</p>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-white">{title}</h3>
        <p className="mt-3 text-sm text-slate-300">{message}</p>

        <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <input
            type="checkbox"
            data-haptic="light"
            checked={checked}
            onChange={(event) => onCheckedChange?.(event.target.checked)}
            className={checkboxInputClass}
          />
          <span className={`text-xs font-semibold ${checkboxTextClass}`}>{checkboxLabel}</span>
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            data-haptic="light"
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            data-haptic="success"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={confirmButtonClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

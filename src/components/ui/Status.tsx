import { CheckCircle2, Clock, AlertCircle, XCircle, RotateCcw } from 'lucide-react';
import type { EmployeeTrainingRow } from '@/lib/types';

export function StatusBadge({ row }: { row: EmployeeTrainingRow }) {
  if (row.retraining_required) {
    return (
      <span className="badge bg-amber-100 text-amber-800">
        <RotateCcw className="w-3.5 h-3.5" />
        Retrain
      </span>
    );
  }
  if (row.qualified) {
    return (
      <span className="badge bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Qualified
      </span>
    );
  }
  if (row.requires_practical && row.quiz_passed && row.acknowledged && !row.practical_signed_off) {
    return (
      <span className="badge bg-blue-100 text-blue-800">
        <Clock className="w-3.5 h-3.5" />
        Sign-off
      </span>
    );
  }
  if (row.quiz_passed && !row.acknowledged) {
    return (
      <span className="badge bg-violet-100 text-violet-800">
        <Clock className="w-3.5 h-3.5" />
        Acknowledge
      </span>
    );
  }
  if (row.quiz_passed) {
    return (
      <span className="badge bg-blue-100 text-blue-800">
        <Clock className="w-3.5 h-3.5" />
        In progress
      </span>
    );
  }
  return (
    <span className="badge bg-slate-100 text-slate-600">
      <AlertCircle className="w-3.5 h-3.5" />
      Not started
    </span>
  );
}

export function ProgressRing({ value, size = 56 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const color = value >= 100 ? '#10b981' : value >= 50 ? '#2563eb' : '#f59e0b';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-700">{Math.round(value)}%</span>
    </div>
  );
}

export function QuizResultIcon({ passed }: { passed: boolean }) {
  return passed ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
  ) : (
    <XCircle className="w-4 h-4 text-red-500" />
  );
}

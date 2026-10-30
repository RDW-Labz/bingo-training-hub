import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { EmployeeTrainingRow } from '@/lib/types';
import { StatusBadge, ProgressRing } from '@/components/ui/Status';
import { FolderOpen, ChevronRight, MapPin, Briefcase } from 'lucide-react';

interface Props {
  onOpenLesson: (lessonId: string, assignmentId: string) => void;
}

export function EmployeeTraining({ onOpenLesson }: Props) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<EmployeeTrainingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('employee_training')
        .select('*')
        .eq('employee_id', profile!.id)
        .order('category_sort', { ascending: true })
        .order('lesson_sort', { ascending: true });
      if (error) {
        console.error('employee_training load failed', error);
      }
      setRows((data as EmployeeTrainingRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, [profile]);

  const total = rows.length;
  const qualified = rows.filter((r) => r.qualified && !r.retraining_required).length;
  const pct = total ? Math.round((qualified / total) * 100) : 0;

  const byCategory = rows.reduce<Record<string, EmployeeTrainingRow[]>>((acc, r) => {
    (acc[r.category_name] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="card p-5 flex items-center gap-4">
        <ProgressRing value={pct} size={64} />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">My Training</h2>
          <p className="text-sm text-slate-500">
            {qualified} of {total} lessons qualified
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600 bg-white rounded-xl px-4 py-3 border border-slate-200">
        <Briefcase className="w-4 h-4 text-slate-400" />
        <span className="font-medium">{profile?.job_title}</span>
        <span className="text-slate-300">·</span>
        <MapPin className="w-4 h-4 text-slate-400" />
        <span className="font-medium">{profile?.location}</span>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-12">Loading your training…</p>
      ) : total === 0 ? (
        <div className="card p-8 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No training assigned to you yet.</p>
          <p className="text-sm text-slate-400 mt-1">Check with your manager.</p>
        </div>
      ) : (
        Object.entries(byCategory).map(([category, lessons]) => (
          <div key={category}>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 px-1">
              {category}
            </h3>
            <div className="space-y-2.5">
              {lessons.map((row) => (
                <button
                  key={row.assignment_id}
                  onClick={() => onOpenLesson(row.lesson_id, row.assignment_id)}
                  className="card w-full p-4 flex items-center gap-3 text-left hover:shadow-md transition-shadow active:scale-[0.99]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{row.lesson_title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StatusBadge row={row} />
                      {row.requires_practical && (
                        <span className="badge bg-slate-100 text-slate-500">Practical</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

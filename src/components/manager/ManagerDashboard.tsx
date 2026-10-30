import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { EmployeeTrainingRow, Profile, Lesson, Category, Assignment } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Hand,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  X,
  Briefcase,
  MapPin,
  Search,
} from 'lucide-react';
import { StatusBadge, ProgressRing, QuizResultIcon } from '@/components/ui/Status';

type Tab = 'overview' | 'employees' | 'lessons' | 'assignments';

export function ManagerDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [rows, setRows] = useState<EmployeeTrainingRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [{ data: etData }, { data: pData }] = await Promise.all([
      supabase.from('employee_training').select('*'),
      supabase.from('profiles').select('*').order('full_name'),
    ]);
    setRows((etData as EmployeeTrainingRow[]) ?? []);
    setProfiles((pData as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const employees = profiles.filter((p) => p.role === 'employee' && p.active);

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'assignments', label: 'Assign', icon: ClipboardList },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-12">Loading dashboard…</p>
      ) : tab === 'overview' ? (
        <Overview rows={rows} employees={employees} />
      ) : tab === 'employees' ? (
        <Employees rows={rows} employees={employees} onChanged={loadAll} />
      ) : tab === 'lessons' ? (
        <LessonsManager onChanged={loadAll} />
      ) : (
        <AssignmentsManager profiles={employees} onChanged={loadAll} />
      )}
    </div>
  );
}

// ============ OVERVIEW ============

function Overview({ rows, employees }: { rows: EmployeeTrainingRow[]; employees: Profile[] }) {
  const totalAssignments = rows.length;
  const qualifiedCount = rows.filter((r) => r.qualified && !r.retraining_required).length;
  const incompleteCount = totalAssignments - qualifiedCount;
  const retrainCount = rows.filter((r) => r.retraining_required).length;
  const pendingSignoff = rows.filter(
    (r) => r.requires_practical && r.quiz_passed && r.acknowledged && !r.practical_signed_off
  );

  const stats = [
    { label: 'Total assignments', value: totalAssignments, color: 'text-slate-900', bg: 'bg-slate-100' },
    { label: 'Qualified', value: qualifiedCount, color: 'text-emerald-700', bg: 'bg-emerald-100' },
    { label: 'Incomplete', value: incompleteCount, color: 'text-amber-700', bg: 'bg-amber-100' },
    { label: 'Needs retraining', value: retrainCount, color: 'text-orange-700', bg: 'bg-orange-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.bg} mb-2`}>
              <span className={`text-lg font-extrabold ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending sign-offs */}
      {pendingSignoff.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
            Pending practical sign-offs
          </h2>
          <div className="space-y-2.5">
            {pendingSignoff.map((r) => (
              <PendingSignoffCard key={r.assignment_id} row={r} />
            ))}
          </div>
        </div>
      )}

      {/* Per-employee progress */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
          Progress by employee
        </h2>
        <div className="space-y-3">
          {employees.map((emp) => {
            const empRows = rows.filter((r) => r.employee_id === emp.id);
            const qCount = empRows.filter((r) => r.qualified && !r.retraining_required).length;
            const pct = empRows.length ? Math.round((qCount / empRows.length) * 100) : 0;
            return (
              <div key={emp.id} className="card p-4 flex items-center gap-4">
                <ProgressRing value={pct} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{emp.full_name}</p>
                  <p className="text-sm text-slate-500">
                    {emp.job_title} · {emp.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">
                    {qCount}/{empRows.length}
                  </p>
                  <p className="text-xs text-slate-400">qualified</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PendingSignoffCard({ row }: { row: EmployeeTrainingRow }) {
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);

  async function signOff() {
    setSigning(true);
    const { data: prog } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('employee_id', row.employee_id)
      .eq('lesson_id', row.lesson_id)
      .maybeSingle();
    if (prog) {
      const { error } = await supabase.rpc('sign_off_practical', { p_progress_id: prog.id });
      if (error) {
        console.error('sign off failed', error);
        setSigning(false);
        return;
      }
      setDone(true);
    }
    setSigning(false);
  }

  if (done) {
    return (
      <div className="card p-4 bg-emerald-50/50 border-emerald-200 flex items-center gap-3">
        <Hand className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-800 text-sm truncate">
            {row.employee_name} — {row.lesson_title}
          </p>
          <p className="text-xs text-emerald-600">Signed off</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 flex items-center gap-3">
      <Hand className="w-5 h-5 text-blue-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">
          {row.employee_name} — {row.lesson_title}
        </p>
        <p className="text-xs text-slate-500">Ready for hands-on sign-off</p>
      </div>
      <button onClick={signOff} disabled={signing} className="btn-success px-4 py-2 text-sm">
        {signing ? '…' : 'Sign off'}
      </button>
    </div>
  );
}

// ============ EMPLOYEES ============

function Employees({
  rows,
  employees,
  onChanged,
}: {
  rows: EmployeeTrainingRow[];
  employees: Profile[];
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<Profile | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);

  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.job_title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    const empRows = rows.filter((r) => r.employee_id === selected.id);
    return (
      <EmployeeDetail
        employee={selected}
        rows={empRows}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          className="input pl-11"
          placeholder="Search by name, job, or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2.5">
        {filtered.map((emp) => {
          const empRows = rows.filter((r) => r.employee_id === emp.id);
          const qCount = empRows.filter((r) => r.qualified && !r.retraining_required).length;
          const incomplete = empRows.length - qCount;
          return (
            <div key={emp.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
                  {emp.full_name.charAt(0)}
                </div>
                <button
                  onClick={() => setSelected(emp)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="font-semibold text-slate-900 truncate">{emp.full_name}</p>
                  <p className="text-sm text-slate-500">
                    {emp.job_title} · {emp.location}
                  </p>
                </button>
                <button
                  onClick={() => setEditing(emp)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <span className="badge bg-emerald-100 text-emerald-700">{qCount} qualified</span>
                {incomplete > 0 && (
                  <span className="badge bg-amber-100 text-amber-700">{incomplete} incomplete</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditEmployeeModal
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function EmployeeDetail({
  employee,
  rows,
  onBack,
}: {
  employee: Profile;
  rows: EmployeeTrainingRow[];
  onBack: () => void;
}) {
  const byCategory = rows.reduce<Record<string, EmployeeTrainingRow[]>>((acc, r) => {
    (acc[r.category_name] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-secondary">
        <X className="w-5 h-5" /> Close
      </button>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
            {employee.full_name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{employee.full_name}</h2>
            <p className="text-sm text-slate-500">
              {employee.job_title} · {employee.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="badge bg-slate-100 text-slate-600">
            <Briefcase className="w-3.5 h-3.5" /> {employee.job_title}
          </span>
          <span className="badge bg-slate-100 text-slate-600">
            <MapPin className="w-3.5 h-3.5" /> {employee.location}
          </span>
        </div>
      </div>

      {Object.entries(byCategory).map(([category, lessons]) => (
        <div key={category}>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
            {category}
          </h3>
          <div className="space-y-2">
            {lessons.map((r) => (
              <div key={r.assignment_id} className="card p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-slate-800 text-sm truncate">{r.lesson_title}</p>
                  <StatusBadge row={r} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {r.quiz_total > 0 && (
                    <span className="flex items-center gap-1">
                      <QuizResultIcon passed={r.quiz_passed} />
                      Quiz {r.quiz_score}/{r.quiz_total}
                    </span>
                  )}
                  {r.acknowledged && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckIcon /> Acknowledged
                    </span>
                  )}
                  {r.requires_practical && (
                    <span className="flex items-center gap-1">
                      <Hand className="w-3 h-3" />
                      {r.practical_signed_off ? 'Signed off' : 'Pending sign-off'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditEmployeeModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(employee.full_name);
  const [role, setRole] = useState(employee.role);
  const [jobTitle, setJobTitle] = useState(employee.job_title);
  const [location, setLocation] = useState(employee.location);
  const [active, setActive] = useState(employee.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const { error } = await supabase.rpc('update_employee_profile', {
      p_employee_id: employee.id,
      p_full_name: fullName,
      p_role: role,
      p_job_title: jobTitle,
      p_location: location,
      p_active: active,
    });
    setSaving(false);
    if (error) {
      setError('Could not save changes. Please try again.');
      return;
    }
    onSaved();
  }

  return (
    <Modal onClose={onClose} title="Edit employee">
      <div className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'employee' | 'manager')}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div>
          <label className="label">Job title</label>
          <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-5 h-5 rounded accent-blue-600"
          />
          <span className="text-sm font-medium text-slate-700">Active employee</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============ LESSONS MANAGER ============

function LessonsManager({ onChanged }: { onChanged: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingCats, setManagingCats] = useState(false);

  const load = useCallback(async () => {
    const [{ data: cData }, { data: lData }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('lessons').select('*').order('sort_order'),
    ]);
    setCategories((cData as Category[]) ?? []);
    setLessons((lData as Lesson[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function retrain(lesson: Lesson) {
    if (!confirm(`Require retraining for "${lesson.title}"? All employees will need to retake it.`)) return;
    const { error } = await supabase.rpc('require_retraining', { p_lesson_id: lesson.id });
    if (error) {
      alert('Could not trigger retraining. Please try again.');
      return;
    }
    load();
    onChanged();
  }

  async function deleteLesson(lesson: Lesson) {
    if (!confirm(`Delete "${lesson.title}"? This also removes its assignments.`)) return;
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);
    if (error) {
      alert('Could not delete lesson. Please try again.');
      return;
    }
    load();
    onChanged();
  }

  if (loading) return <p className="text-center text-slate-400 py-12">Loading lessons…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setCreating(true)} className="btn-primary flex-1">
          <Plus className="w-5 h-5" /> New lesson
        </button>
        <button onClick={() => setManagingCats(true)} className="btn-secondary">
          Categories
        </button>
      </div>

      {categories.map((cat) => {
        const catLessons = lessons.filter((l) => l.category_id === cat.id);
        if (catLessons.length === 0) return null;
        return (
          <div key={cat.id}>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
              {cat.name}
            </h3>
            <div className="space-y-2">
              {catLessons.map((lesson) => (
                <div key={lesson.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{lesson.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">v{lesson.version}</p>
                    </div>
                    {lesson.requires_practical && (
                      <span className="badge bg-blue-100 text-blue-700">
                        <Hand className="w-3 h-3" /> Practical
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setEditing(lesson)} className="btn-secondary px-3 py-2 text-sm flex-1">
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => retrain(lesson)}
                      className="btn-secondary px-3 py-2 text-sm"
                      title="Require retraining"
                    >
                      <RotateCcw className="w-4 h-4 text-orange-600" />
                    </button>
                    <button
                      onClick={() => deleteLesson(lesson)}
                      className="btn-secondary px-3 py-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {(creating || editing) && (
        <LessonEditor
          lesson={editing}
          categories={categories}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {managingCats && (
        <CategoriesManager
          categories={categories}
          onClose={() => setManagingCats(false)}
          onSaved={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function LessonEditor({
  lesson,
  categories,
  onClose,
  onSaved,
}: {
  lesson: Lesson | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState(lesson?.category_id ?? categories[0]?.id ?? '');
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [summary, setSummary] = useState(lesson?.summary ?? '');
  const [instructions, setInstructions] = useState(lesson?.instructions ?? '');
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? '');
  const [screenshotUrls, setScreenshotUrls] = useState((lesson?.screenshot_urls ?? []).join('\n'));
  const [requiresPractical, setRequiresPractical] = useState(lesson?.requires_practical ?? false);
  const [practicalNotes, setPracticalNotes] = useState(lesson?.practical_notes ?? '');
  const [quizText, setQuizText] = useState(
    lesson
      ? JSON.stringify(lesson.quiz_questions, null, 2)
      : '[]'
  );
  const [passingScore, setPassingScore] = useState(lesson?.passing_score ?? 1);
  const [sortOrder, setSortOrder] = useState(lesson?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    let quiz: unknown;
    try {
      quiz = JSON.parse(quizText || '[]');
    } catch {
      setError('Quiz JSON is not valid. Use the format below.');
      setSaving(false);
      return;
    }
    const payload = {
      category_id: categoryId,
      title,
      summary,
      instructions,
      video_url: videoUrl,
      screenshot_urls: screenshotUrls
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      requires_practical: requiresPractical,
      practical_notes: practicalNotes,
      quiz_questions: quiz,
      passing_score: passingScore,
      sort_order: sortOrder,
    };
    let result;
    if (lesson) {
      result = await supabase.from('lessons').update(payload).eq('id', lesson.id);
    } else {
      result = await supabase.from('lessons').insert(payload);
    }
    setSaving(false);
    if (result.error) {
      setError('Could not save lesson. Please try again.');
      return;
    }
    onSaved();
  }

  return (
    <Modal onClose={onClose} title={lesson ? 'Edit lesson' : 'New lesson'} wide>
      <div className="space-y-4">
        <div>
          <label className="label">Category</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Summary</label>
          <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div>
          <label className="label">Written instructions</label>
          <textarea
            className="input min-h-[120px]"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Video URL (link or uploaded video)</label>
          <input className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=… or uploaded file URL" />
        </div>
        <div>
          <label className="label">Screenshot URLs (one per line)</label>
          <textarea
            className="input min-h-[80px]"
            value={screenshotUrls}
            onChange={(e) => setScreenshotUrls(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresPractical}
            onChange={(e) => setRequiresPractical(e.target.checked)}
            className="w-5 h-5 rounded accent-blue-600"
          />
          <span className="text-sm font-medium text-slate-700">
            Requires manager hands-on sign-off
          </span>
        </label>
        {requiresPractical && (
          <div>
            <label className="label">Practical notes (what the manager checks)</label>
            <input className="input" value={practicalNotes} onChange={(e) => setPracticalNotes(e.target.value)} />
          </div>
        )}
        <div>
          <label className="label">
            Quiz (JSON format: array of{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">
              {'{question, options[], answer_index}'}
            </code>
            )
          </label>
          <textarea
            className="input min-h-[160px] font-mono text-xs"
            value={quizText}
            onChange={(e) => setQuizText(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">
            Example: {`[{"question":"What is a lot?","options":["A shelf","An item group"],"answer_index":1}]`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Passing score</label>
            <input
              type="number"
              className="input"
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input
              type="number"
              className="input"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save lesson'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CategoriesManager({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState(categories);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('categories').insert({
      name: name.trim(),
      description: description.trim(),
      sort_order: items.length + 1,
    });
    setSaving(false);
    if (error) {
      alert('Could not add category. That name may already exist.');
      return;
    }
    setName('');
    setDescription('');
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setItems((data as Category[]) ?? []);
    onSaved();
  }

  async function remove(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? Lessons in it will also be deleted.`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) {
      alert('Could not delete category.');
      return;
    }
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setItems((data as Category[]) ?? []);
    onSaved();
  }

  return (
    <Modal onClose={onClose} title="Manage categories">
      <div className="space-y-4">
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
              </div>
              <button onClick={() => remove(c)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <p className="text-sm font-bold text-slate-700">Add category</p>
          <input className="input" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button onClick={add} disabled={saving || !name.trim()} className="btn-primary w-full">
            <Plus className="w-5 h-5" /> Add category
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============ ASSIGNMENTS MANAGER ============

function AssignmentsManager({
  profiles,
  onChanged,
}: {
  profiles: Profile[];
  onChanged: () => void;
}) {
  const [lessonList, setLessonList] = useState<Lesson[]>([]);
  const [assignmentList, setAssignmentList] = useState<Assignment[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [assignType, setAssignType] = useState<'job' | 'direct'>('job');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: lData }, { data: aData }] = await Promise.all([
      supabase.from('lessons').select('*').order('title'),
      supabase.from('assignments').select('*'),
    ]);
    setLessonList((lData as Lesson[]) ?? []);
    setAssignmentList((aData as Assignment[]) ?? []);
    if (!selectedLessonId && lData && lData.length > 0) {
      setSelectedLessonId((lData as Lesson[])[0].id);
    }
    setLoading(false);
  }, [selectedLessonId]);

  useEffect(() => {
    load();
  }, [load]);

  const uniqueJobs = Array.from(new Set(profiles.map((p) => p.job_title).filter(Boolean)));
  const uniqueLocations = Array.from(new Set(profiles.map((p) => p.location).filter(Boolean)));

  async function create() {
    if (!selectedLessonId) return;
    setSaving(true);
    const lesson = lessonList.find((l) => l.id === selectedLessonId);
    const payload = {
      lesson_id: selectedLessonId,
      assignee_id: assignType === 'direct' ? assigneeId : null,
      job_title: assignType === 'job' ? jobTitle : '',
      location: assignType === 'job' ? location : '',
      assigned_version: lesson?.version ?? 1,
    };
    const { error } = await supabase.from('assignments').insert(payload);
    setSaving(false);
    if (error) {
      alert('Could not create assignment. It may already exist.');
      return;
    }
    load();
    onChanged();
  }

  async function remove(a: Assignment) {
    if (!confirm('Remove this assignment?')) return;
    const { error } = await supabase.from('assignments').delete().eq('id', a.id);
    if (error) {
      alert('Could not remove assignment.');
      return;
    }
    load();
    onChanged();
  }

  if (loading) return <p className="text-center text-slate-400 py-12">Loading…</p>;

  const lessonAssignments = assignmentList.filter((a) => a.lesson_id === selectedLessonId);
  const selectedLesson = lessonList.find((l) => l.id === selectedLessonId);

  function labelFor(a: Assignment): string {
    if (a.assignee_id) {
      const p = profiles.find((pr) => pr.id === a.assignee_id);
      return p ? `${p.full_name} (direct)` : 'Direct assignment';
    }
    const parts = [];
    if (a.job_title) parts.push(`Job: ${a.job_title}`);
    if (a.location) parts.push(`Location: ${a.location}`);
    if (parts.length === 0) return 'Everyone, all locations';
    return parts.join(' · ');
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Create assignment</h3>
        <div>
          <label className="label">Lesson</label>
          <select className="input" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)}>
            {lessonList.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setAssignType('job')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              assignType === 'job' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            By job / location
          </button>
          <button
            onClick={() => setAssignType('direct')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              assignType === 'direct' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Direct to person
          </button>
        </div>

        {assignType === 'job' ? (
          <>
            <div>
              <label className="label">Job title (leave empty = all jobs)</label>
              <select className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}>
                <option value="">All jobs</option>
                {uniqueJobs.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Location (leave empty = all locations)</label>
              <select className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">All locations</option>
                {uniqueLocations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="label">Employee</label>
            <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Select employee…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} — {p.job_title}
                </option>
              ))}
            </select>
          </div>
        )}

        <button onClick={create} disabled={saving} className="btn-primary w-full">
          <Plus className="w-5 h-5" /> {saving ? 'Creating…' : 'Assign training'}
        </button>
      </div>

      {selectedLesson && (
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
            Assignments for "{selectedLesson.title}"
          </h3>
          <div className="space-y-2">
            {lessonAssignments.length === 0 ? (
              <p className="text-sm text-slate-400 px-1">No assignments yet.</p>
            ) : (
              lessonAssignments.map((a) => (
                <div key={a.id} className="card p-3.5 flex items-center gap-2">
                  <span className="flex-1 text-sm text-slate-700">{labelFor(a)}</span>
                  <button
                    onClick={() => remove(a)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ MODAL ============

function Modal({
  children,
  onClose,
  title,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`bg-white w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl animate-fade-in`}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

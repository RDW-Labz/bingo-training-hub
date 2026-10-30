import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Lesson, LessonProgress, QuizQuestion } from '@/lib/types';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Hand,
  ShieldCheck,
  PlayCircle,
  ImageOff,
} from 'lucide-react';

interface Props {
  lessonId: string;
  onBack: () => void;
}

export function LessonDetail({ lessonId, onBack }: Props) {
  const { profile } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: lData }, { data: pData }] = await Promise.all([
        supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle(),
        profile
          ? supabase
              .from('lesson_progress')
              .select('*')
              .eq('lesson_id', lessonId)
              .eq('employee_id', profile.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setLesson(lData as Lesson);
      const prog = pData as LessonProgress | null;
      setProgress(prog);
      if (prog?.quiz_passed) setQuizSubmitted(true);
      setLoading(false);
    }
    load();
  }, [lessonId, profile]);

  const quizQuestions = (lesson?.quiz_questions ?? []) as QuizQuestion[];
  const quizScore = quizQuestions.reduce(
    (acc, q, i) => acc + (answers[i] === q.answer_index ? 1 : 0),
    0
  );
  const quizPassed = quizScore >= (lesson?.passing_score ?? 1);
  const needsPractical = lesson?.requires_practical ?? false;

  async function submitQuiz() {
    if (!profile || !lesson) return;
    setError(null);
    setAcknowledging(true);
    const passed = quizScore >= lesson.passing_score;
    try {
      const upsertData = {
        employee_id: profile.id,
        lesson_id: lesson.id,
        quiz_score: quizScore,
        quiz_total: quizQuestions.length,
        quiz_passed: passed,
        completed_version: lesson.version,
        last_attempt_at: new Date().toISOString(),
      };
      if (progress) {
        const { data, error } = await supabase
          .from('lesson_progress')
          .update(upsertData)
          .eq('id', progress.id)
          .select('*')
          .single();
        if (error) throw error;
        setProgress(data as LessonProgress);
      } else {
        const { data, error } = await supabase
          .from('lesson_progress')
          .insert({ ...upsertData, acknowledged: false })
          .select('*')
          .single();
        if (error) throw error;
        setProgress(data as LessonProgress);
      }
      setQuizSubmitted(true);
    } catch {
      setError('Could not save your quiz. Please try again.');
    }
    setAcknowledging(false);
  }

  async function acknowledge() {
    if (!profile || !lesson || !progress) return;
    setError(null);
    setAcknowledging(true);
    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', progress.id)
        .select('*')
        .single();
      if (error) throw error;
      setProgress(data as LessonProgress);
    } catch {
      setError('Could not save your acknowledgment. Please try again.');
    }
    setAcknowledging(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-center text-slate-400 py-12">Loading lesson…</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={onBack} className="btn-secondary mb-4">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <p className="text-center text-slate-400 py-12">Lesson not found.</p>
      </div>
    );
  }

  const isRetrain =
    progress && lesson.version > progress.completed_version;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <button onClick={onBack} className="btn-secondary mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to training
      </button>

      {isRetrain && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 font-medium">
            This procedure has been updated. Please complete this lesson again to stay qualified.
          </p>
        </div>
      )}

      <div className="card p-5 mb-4">
        <h1 className="text-xl font-bold text-slate-900 mb-1">{lesson.title}</h1>
        <p className="text-slate-600">{lesson.summary}</p>
      </div>

      {/* Video */}
      {lesson.video_url && (
        <div className="card p-4 mb-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <PlayCircle className="w-5 h-5 text-blue-600" /> Video
          </h3>
          {isYouTubeLink(lesson.video_url) ? (
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                src={embedYouTube(lesson.video_url)}
                title="Lesson video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video src={lesson.video_url} controls className="w-full rounded-xl" />
          )}
        </div>
      )}

      {/* Screenshots */}
      {lesson.screenshot_urls.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <ImageOff className="w-5 h-5 text-slate-500" /> Screenshots
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {lesson.screenshot_urls.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightbox(url)}
                className="rounded-xl overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity"
              >
                <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-32 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Written instructions */}
      {lesson.instructions && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Instructions</h3>
          <p className="text-slate-700 whitespace-pre-line leading-relaxed">{lesson.instructions}</p>
        </div>
      )}

      {/* Practical sign-off note */}
      {needsPractical && (
        <div className="card p-5 mb-4 bg-blue-50/50 border-blue-200">
          <h3 className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-2">
            <Hand className="w-5 h-5" /> Hands-on sign-off required
          </h3>
          <p className="text-sm text-blue-700 mb-2">
            After you pass the quiz and acknowledge, a manager must observe you doing this task and sign it off.
          </p>
          {lesson.practical_notes && (
            <p className="text-xs text-blue-600 bg-blue-100 rounded-lg px-3 py-2">
              Manager checks: {lesson.practical_notes}
            </p>
          )}
        </div>
      )}

      {/* Quiz */}
      <div className="card p-5 mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-1">
          Quick Quiz ({quizQuestions.length} questions)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Need {lesson.passing_score} correct to pass.
        </p>

        <div className="space-y-5">
          {quizQuestions.map((q, qi) => (
            <div key={qi}>
              <p className="font-medium text-slate-800 mb-2">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const showResult = quizSubmitted && progress?.quiz_passed !== undefined;
                  const isCorrect = showResult && oi === q.answer_index;
                  const isWrongPick = showResult && selected && oi !== q.answer_index;
                  return (
                    <button
                      key={oi}
                      disabled={quizSubmitted && progress?.quiz_passed === true && !isRetrain}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all flex items-center justify-between ${
                        isCorrect
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                          : isWrongPick
                            ? 'border-red-400 bg-red-50 text-red-800'
                            : selected
                              ? 'border-blue-500 bg-blue-50 text-blue-800'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      } ${quizSubmitted && progress?.quiz_passed ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span>{opt}</span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {isWrongPick && <XCircle className="w-4 h-4 text-red-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        {quizSubmitted && progress?.quiz_passed ? (
          <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">
              Quiz passed! Score: {progress.quiz_score}/{progress.quiz_total}
            </p>
          </div>
        ) : quizSubmitted && progress && !progress.quiz_passed ? (
          <div className="mt-5">
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm font-semibold text-red-700">
                Did not pass ({progress.quiz_score}/{progress.quiz_total}). Review and try again.
              </p>
            </div>
            <button
              onClick={() => {
                setQuizSubmitted(false);
                setAnswers({});
              }}
              className="btn-secondary w-full"
            >
              Try quiz again
            </button>
          </div>
        ) : (
          <button
            onClick={submitQuiz}
            disabled={acknowledging || Object.keys(answers).length < quizQuestions.length}
            className="btn-primary w-full mt-5"
          >
            {acknowledging ? 'Saving…' : 'Submit quiz'}
          </button>
        )}
      </div>

      {/* Acknowledgment */}
      {progress?.quiz_passed && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Acknowledgment</h3>
          {progress.acknowledged ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">
                You acknowledged this lesson.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Confirm that you have read and understood this lesson.
              </p>
              <button onClick={acknowledge} disabled={acknowledging} className="btn-success w-full">
                {acknowledging ? 'Saving…' : 'I acknowledge this training'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Practical sign-off status */}
      {needsPractical && progress?.quiz_passed && progress?.acknowledged && (
        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <Hand className="w-5 h-5" /> Practical sign-off
          </h3>
          {progress.practical_signed_off ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">
                Manager signed off your practical.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-blue-800">
                Waiting for a manager to observe and sign off your hands-on task.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        >
          <img src={lightbox} alt="Screenshot" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

function isYouTubeLink(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

function embedYouTube(url: string): string {
  const idMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return idMatch
    ? `https://www.youtube.com/embed/${idMatch[1]}`
    : url;
}

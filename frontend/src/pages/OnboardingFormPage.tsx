import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  onboardingFormsApi,
  PublicFormContext,
  Question,
  UploadEntry,
} from '../api/onboardingForms.api';

type Status = 'loading' | 'ready' | 'submitting' | 'success' | 'notfound' | 'error';

export function OnboardingFormPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [ctx, setCtx] = useState<PublicFormContext | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus('notfound');
      return;
    }
    onboardingFormsApi
      .getPublic(token)
      .then(({ data }) => {
        setCtx(data);
        const defaults: Record<string, unknown> = {};
        walkQuestions(data.questions, (q) => {
          if (q.defaultValue !== undefined) defaults[q.id] = q.defaultValue;
        });
        setAnswers(defaults);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.response?.status === 404) setStatus('notfound');
        else setStatus('error');
      });
  }, [token]);

  const visibleQuestions = useMemo(() => {
    if (!ctx) return [];
    return ctx.questions.filter((q) => shouldShow(q, answers));
  }, [ctx, answers]);

  const total = visibleQuestions.length;
  const question = visibleQuestions[current];
  const progress = total === 0 ? 0 : Math.round(((current + 1) / total) * 100);

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const canAdvance = () => {
    if (!question) return false;
    if (!question.required) return true;
    const v = answers[question.id];
    if (v === undefined || v === null) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  };

  const goNext = () => {
    setError(null);
    if (current < total - 1) {
      setCurrent(current + 1);
      window.scrollTo(0, 0);
    } else {
      submit();
    }
  };

  const goBack = () => {
    if (current > 0) {
      setCurrent(current - 1);
      window.scrollTo(0, 0);
    }
  };

  const submit = async () => {
    if (!token) return;
    setStatus('submitting');
    try {
      await onboardingFormsApi.submit(token, { answers, uploads });
      setStatus('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao enviar formulário.');
      setStatus('ready');
    }
  };

  const handleUpload = async (questionId: string, file: File) => {
    if (!token) return;
    try {
      const { data } = await onboardingFormsApi.uploadFile(token, questionId, file);
      setUploads((prev) => [...prev.filter((u) => u.questionId !== questionId), data]);
      setAnswer(questionId, { name: data.name, url: data.url });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha no upload.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0f4c4c]" />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <MessageScreen
        title="Formulário indisponível"
        body="Este link não está mais ativo. Entre em contato com o responsável para obter um novo."
      />
    );
  }

  if (status === 'error') {
    return <MessageScreen title="Erro ao carregar" body="Tente novamente em instantes." />;
  }

  if (status === 'success') {
    return (
      <MessageScreen
        title="Enviado com sucesso!"
        body="Recebemos os dados do seu negócio. Obrigado por preencher."
      />
    );
  }

  if (!ctx || !question) return null;

  const sectionTitle = getSectionTitleAt(ctx.questions, question, current === 0 ? null : visibleQuestions[current - 1]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
            {current + 1} / {total}
          </span>
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0f4c4c] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 md:py-12 pb-28">
        <div className="max-w-lg mx-auto">
          <p className="text-xs uppercase tracking-wider text-gray-400 text-center mb-1">
            {ctx.clientName}
          </p>
          {sectionTitle && (
            <h2 className="text-center text-sm font-medium text-[#0f4c4c] mb-4">{sectionTitle}</h2>
          )}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-8">
            <QuestionView
              question={question}
              value={answers[question.id]}
              allAnswers={answers}
              uploads={uploads}
              onChange={(v) => setAnswer(question.id, v)}
              onUpload={(file) => handleUpload(question.id, file)}
            />
            {question.help && (
              <p className="mt-3 text-xs text-gray-500">{question.help}</p>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
        </div>
      </div>

      <div
        className="fixed left-0 right-0 bottom-0 bg-white border-t border-gray-200 transition-transform"
        style={{ transform: `translateY(-${keyboardOffset}px)` }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <button
            onClick={goBack}
            disabled={current === 0 || status === 'submitting'}
            className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium disabled:opacity-40"
          >
            Voltar
          </button>
          <button
            onClick={goNext}
            disabled={!canAdvance() || status === 'submitting'}
            className="flex-1 px-4 py-3 rounded-lg bg-[#0f4c4c] text-white font-medium disabled:opacity-50"
          >
            {status === 'submitting'
              ? 'Enviando...'
              : current === total - 1
              ? 'Finalizar'
              : 'Próxima'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">{title}</h1>
        <p className="text-gray-600 text-sm">{body}</p>
      </div>
    </div>
  );
}

interface QuestionViewProps {
  question: Question;
  value: unknown;
  allAnswers: Record<string, unknown>;
  uploads: UploadEntry[];
  onChange: (value: unknown) => void;
  onUpload: (file: File) => void;
}

function QuestionView({ question, value, uploads, onChange, onUpload }: QuestionViewProps) {
  const inputCls =
    'w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0f4c4c] text-base';
  const labelCls = 'block text-lg md:text-xl font-semibold text-gray-900 mb-4';

  if (question.type === 'text') {
    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          className={inputCls}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          autoFocus
        />
      </div>
    );
  }

  if (question.type === 'textarea') {
    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          className={`${inputCls} min-h-[120px]`}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          autoFocus
        />
      </div>
    );
  }

  if (question.type === 'number') {
    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="number"
          className={inputCls}
          value={(value as number | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          min={question.min}
          max={question.max}
          placeholder={question.placeholder}
          autoFocus
        />
      </div>
    );
  }

  if (question.type === 'boolean') {
    const v = value as boolean | undefined;
    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`py-4 rounded-lg border-2 font-medium transition ${
              v === true
                ? 'border-[#0f4c4c] bg-[#0f4c4c]/5 text-[#0f4c4c]'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`py-4 rounded-lg border-2 font-medium transition ${
              v === false
                ? 'border-[#0f4c4c] bg-[#0f4c4c]/5 text-[#0f4c4c]'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            Não
          </button>
        </div>
      </div>
    );
  }

  if (question.type === 'select') {
    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          {question.options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 font-medium transition ${
                value === opt.value
                  ? 'border-[#0f4c4c] bg-[#0f4c4c]/5 text-[#0f4c4c]'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === 'multiselect') {
    const selected = (value as string[]) ?? [];
    const toggle = (v: string) => {
      if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
      else onChange([...selected, v]);
    };
    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          {question.options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 font-medium transition ${
                selected.includes(opt.value)
                  ? 'border-[#0f4c4c] bg-[#0f4c4c]/5 text-[#0f4c4c]'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === 'list') {
    const items = (value as string[]) ?? [];
    const setAt = (idx: number, v: string) =>
      onChange(items.map((x, i) => (i === idx ? v : x)));
    const add = () => onChange([...items, '']);
    const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className={inputCls}
                value={item}
                onChange={(e) => setAt(idx, e.target.value)}
                placeholder={question.placeholder}
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="px-3 py-2 text-red-600 border border-gray-300 rounded-lg"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#0f4c4c] hover:text-[#0f4c4c]"
          >
            + Adicionar item
          </button>
        </div>
      </div>
    );
  }

  if (question.type === 'upload') {
    const existing = uploads.find((u) => u.questionId === question.id);
    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {existing ? (
          <div className="rounded-lg border border-gray-300 p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{existing.name}</p>
              <a
                href={existing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0f4c4c] underline"
              >
                Ver arquivo
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                const inp = document.getElementById(`upload-${question.id}`) as HTMLInputElement;
                if (inp) inp.value = '';
              }}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded"
            >
              Trocar
            </button>
          </div>
        ) : (
          <label
            htmlFor={`upload-${question.id}`}
            className="block w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-600 cursor-pointer hover:border-[#0f4c4c] hover:text-[#0f4c4c]"
          >
            Toque para escolher um arquivo
            <input
              id={`upload-${question.id}`}
              type="file"
              accept={question.accept ?? 'image/*,application/pdf'}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </label>
        )}
        {question.uploadHint && (
          <p className="text-xs text-gray-500 mt-2">{question.uploadHint}</p>
        )}
      </div>
    );
  }

  if (question.type === 'repeater') {
    const items = ((value as Record<string, unknown>[]) ?? []);
    const update = (idx: number, fieldId: string, v: unknown) => {
      const next = items.map((item, i) =>
        i === idx ? { ...item, [fieldId]: v } : item
      );
      onChange(next);
    };
    const add = () => onChange([...items, {}]);
    const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

    return (
      <div>
        <label className={labelCls}>
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-3 relative bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">Item {idx + 1}</p>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-xs text-red-600"
                >
                  Remover
                </button>
              </div>
              {question.fields?.map((field) => (
                <div key={field.id}>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0f4c4c] text-sm min-h-[80px]"
                      value={(item[field.id] as string) ?? ''}
                      onChange={(e) => update(idx, field.id, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === 'list' ? (
                    <ListSubfield
                      value={(item[field.id] as string[]) ?? []}
                      onChange={(v) => update(idx, field.id, v)}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0f4c4c] text-sm"
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={(item[field.id] as string | number | undefined) ?? ''}
                      onChange={(e) =>
                        update(
                          idx,
                          field.id,
                          field.type === 'number'
                            ? e.target.value === ''
                              ? undefined
                              : Number(e.target.value)
                            : e.target.value
                        )
                      }
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#0f4c4c] hover:text-[#0f4c4c]"
          >
            + Adicionar
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function ListSubfield({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const setAt = (idx: number, v: string) =>
    onChange(value.map((x, i) => (i === idx ? v : x)));
  const add = () => onChange([...value, '']);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  return (
    <div className="space-y-2">
      {value.map((item, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={item}
            onChange={(e) => setAt(idx, e.target.value)}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="px-2 text-red-600 border border-gray-300 rounded-lg text-sm"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-[#0f4c4c] underline"
      >
        + Adicionar
      </button>
    </div>
  );
}

function shouldShow(q: Question, answers: Record<string, unknown>): boolean {
  if (!q.dependsOn) return true;
  const { questionId, equals, in: inList, notEquals } = q.dependsOn;
  const v = answers[questionId];
  if (equals !== undefined && v !== equals) return false;
  if (notEquals !== undefined && v === notEquals) return false;
  if (inList !== undefined && !inList.includes(v)) return false;
  return true;
}

function walkQuestions(qs: Question[], fn: (q: Question) => void) {
  for (const q of qs) {
    fn(q);
    if (q.fields) walkQuestions(q.fields, fn);
  }
}

function getSectionTitleAt(
  _all: Question[],
  current: Question,
  prev: Question | null
): string | null {
  if (current.sectionTitle && (!prev || prev.section !== current.section)) {
    return current.sectionTitle;
  }
  return null;
}

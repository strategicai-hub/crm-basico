import YAML from 'yaml';
import { OnboardingNiche, OnboardingTargetPlan } from '@prisma/client';

export interface UploadEntry {
  questionId: string;
  name: string;
  driveFileId: string;
  url: string;
}

export interface GenerateInput {
  niche: OnboardingNiche;
  targetPlan: OnboardingTargetPlan;
  answers: Record<string, unknown>;
  uploads: UploadEntry[];
}

const NICHE_TO_YAML: Record<OnboardingNiche, string> = {
  ACADEMIA: 'academia',
  ESCOLA_CURSOS: 'escola_cursos',
  CONSORCIO: 'consorcio',
  GENERICO: 'generico',
};

export function generateYaml(input: GenerateInput): string {
  const { niche, targetPlan, answers, uploads } = input;
  const out: Record<string, unknown> = {};

  if (targetPlan === 'PLENO') {
    out.niche = NICHE_TO_YAML[niche];
  }

  const business = pickObject(answers, {
    name: 'business.name',
    type: 'business.type',
    address: 'business.address',
  });
  if (Object.keys(business).length) out.business = business;

  const assistant = pickObject(answers, {
    name: 'assistant.name',
    greeting: 'assistant.greeting',
  });
  if (Object.keys(assistant).length) out.assistant = assistant;

  const location = pickObject(answers, {
    parking: 'location.parking',
    structure: 'location.structure',
  });
  if (Object.keys(location).length) out.location = location;

  if (niche === 'ACADEMIA' || niche === 'ESCOLA_CURSOS') {
    const audience = pickObject(answers, {
      min_age: 'audience.min_age',
      max_age_note: 'audience.max_age_note',
      levels: 'audience.levels',
      modalities: 'audience.modalities',
    });
    if (Object.keys(audience).length) out.audience = audience;

    const schedule: Record<string, unknown> = {};
    const classDuration = answers['schedule.class_duration'];
    if (classDuration) schedule.class_duration = classDuration;
    const classNote = answers['schedule.class_note'];
    if (classNote) schedule.class_note = classNote;

    const weekdays: Record<string, unknown> = {};
    const morning = answers['schedule.weekdays.morning'];
    if (isNonEmptyArray(morning)) weekdays.morning = morning;
    const afternoon = answers['schedule.weekdays.afternoon'];
    if (isNonEmptyArray(afternoon)) weekdays.afternoon = afternoon;
    const evening = answers['schedule.weekdays.evening'];
    if (isNonEmptyArray(evening)) weekdays.evening = evening;
    if (Object.keys(weekdays).length) schedule.weekdays = weekdays;

    const sat = answers['schedule.saturday'];
    if (isNonEmptyArray(sat)) schedule.saturday = { morning: sat };
    const sun = answers['schedule.sunday'];
    if (isNonEmptyArray(sun)) schedule.sunday = { morning: sun };

    if (Object.keys(schedule).length) out.schedule = schedule;

    const teachers = answers['teachers'];
    if (isNonEmptyArray(teachers)) out.teachers = teachers;
  }

  if (niche === 'ACADEMIA') {
    const trial = pickObject(answers, {
      free: 'trial_class.free',
      requires_scheduling: 'trial_class.requires_scheduling',
      dress_code: 'trial_class.dress_code',
      equipment_note: 'trial_class.equipment_note',
    });
    if (Object.keys(trial).length) out.trial_class = trial;

    const benefits = answers['benefit_platforms'];
    if (isNonEmptyArray(benefits)) out.benefit_platforms = benefits;
  }

  if (niche === 'CONSORCIO') {
    const consorcio = pickObject(answers, {
      operator: 'consorcio.operator',
      categories: 'consorcio.categories',
      terms: 'consorcio.terms',
      entrance_conditions: 'consorcio.entrance_conditions',
    });
    if (Object.keys(consorcio).length) out.consorcio = consorcio;
  }

  if (niche === 'GENERICO') {
    const products = answers['products'];
    if (isNonEmptyArray(products)) out.products = products;
  }

  const plans = answers['plans'];
  if (isNonEmptyArray(plans)) out.plans = plans;

  const payment = pickObject(answers, {
    methods: 'payment.methods',
    enrollment_fee: 'payment.enrollment_fee',
    cancellation_fee: 'payment.cancellation_fee',
    makeup_policy: 'payment.makeup_policy',
  });
  if (Object.keys(payment).length) out.payment = payment;

  const promotions = answers['promotions'];
  if (isNonEmptyArray(promotions)) out.promotions = promotions;

  const differentials = answers['differentials'];
  if (isNonEmptyArray(differentials)) out.differentials = differentials;

  out.media = buildMedia(uploads);

  if (targetPlan === 'PLENO') {
    const appointments = buildAppointments(answers);
    if (appointments) out.appointments = appointments;

    const followups = buildFollowups(answers);
    if (followups) out.followups = followups;
  }

  return YAML.stringify(out, {
    lineWidth: 0,
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  });
}

function pickObject(
  answers: Record<string, unknown>,
  map: Record<string, string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [yamlKey, answerKey] of Object.entries(map)) {
    const value = answers[answerKey];
    if (isMeaningful(value)) out[yamlKey] = value;
  }
  return out;
}

function isMeaningful(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

function buildMedia(uploads: UploadEntry[]): Record<string, { url: string; type: string }> {
  const media: Record<string, { url: string; type: string }> = {};
  const usedTags = new Set<string>();

  for (const upload of uploads) {
    const tag = tagFromQuestion(upload.questionId, usedTags);
    usedTags.add(tag);
    media[tag] = {
      url: upload.url,
      type: inferMediaType(upload.name),
    };
  }
  return media;
}

function tagFromQuestion(questionId: string, used: Set<string>): string {
  const base = questionId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  let tag = `[${base}]`;
  let i = 2;
  while (used.has(tag)) {
    tag = `[${base}_${i}]`;
    i++;
  }
  return tag;
}

function inferMediaType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
  return 'document';
}

function buildAppointments(answers: Record<string, unknown>): Record<string, unknown> | null {
  const source = answers['appointments.source'];
  if (!source) return null;

  const out: Record<string, unknown> = { source };

  if (source === 'google_calendar') {
    const calendarId = answers['appointments.google_calendar.calendar_id'];
    out.google_calendar = { calendar_id: calendarId ?? '' };
  }
  if (source === 'external_system') {
    const type = answers['appointments.external_system.type'];
    out.external_system = { type: type ?? '' };
  }

  const slot = answers['appointments.slot_duration_minutes'];
  if (isMeaningful(slot)) out.slot_duration_minutes = Number(slot);
  const lead = answers['appointments.lead_time_minutes'];
  if (isMeaningful(lead)) out.lead_time_minutes = Number(lead);

  const monFri = answers['appointments.business_hours.mon_fri'];
  const sat = answers['appointments.business_hours.sat'];
  const sun = answers['appointments.business_hours.sun'];

  const hours: Record<string, string[]> = {
    mon_fri: isMeaningful(monFri) ? [String(monFri)] : [],
    sat: isMeaningful(sat) ? [String(sat)] : [],
    sun: isMeaningful(sun) ? [String(sun)] : [],
  };
  out.business_hours = hours;

  return out;
}

function buildFollowups(answers: Record<string, unknown>): Record<string, unknown> | null {
  const reactivationEnabled = answers['followups.reactivation.enabled'];
  const reminderEnabled = answers['followups.appointment_reminder.enabled'];

  if (reactivationEnabled === undefined && reminderEnabled === undefined) return null;

  const out: Record<string, unknown> = {};

  out.reactivation = {
    enabled: reactivationEnabled === true,
    inactive_hours: toNumber(answers['followups.reactivation.inactive_hours'], 24),
    max_stages: toNumber(answers['followups.reactivation.max_stages'], 3),
    day_of_week: 'mon-fri',
    cadence_minutes: 1,
  };

  out.appointment_reminder = {
    enabled: reminderEnabled === true,
    hours_before: toNumber(answers['followups.appointment_reminder.hours_before'], 3),
    cadence_minutes: 15,
  };

  out.templates = {
    reactivation_stage_1:
      (answers['followups.templates.reactivation_stage_1'] as string | undefined) ??
      'Oi {nome}, passando pra saber se ainda tem interesse!',
    reactivation_stage_2:
      (answers['followups.templates.reactivation_stage_2'] as string | undefined) ??
      'Oi {nome}, consegui um horário especial pra você — quer aproveitar?',
    reactivation_stage_3:
      (answers['followups.templates.reactivation_stage_3'] as string | undefined) ??
      'Oi {nome}, última chance — posso segurar sua vaga?',
    appointment_reminder:
      (answers['followups.templates.appointment_reminder'] as string | undefined) ??
      'Lembrete: sua aula é hoje às {horario}. Te esperamos!',
  };

  return out;
}

function toNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

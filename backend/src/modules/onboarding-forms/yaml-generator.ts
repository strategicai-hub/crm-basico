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
      min_age_conditions: 'audience.min_age_conditions',
      max_age_note: 'audience.max_age_note',
      levels: 'audience.levels',
      modalities: 'audience.modalities',
    });
    if (Object.keys(audience).length) out.audience = audience;

    const schedule = pickObject(answers, {
      business_hours: 'schedule.business_hours',
      class_duration: 'schedule.class_duration',
      class_note: 'schedule.class_note',
    });
    if (Object.keys(schedule).length) out.schedule = schedule;

    const teachers = answers['teachers'];
    if (isNonEmptyArray(teachers)) out.teachers = teachers;

    const plans = pickObject(answers, {
      description: 'plans.description',
    });
    if (Object.keys(plans).length) out.plans = plans;
  }

  if (niche === 'ACADEMIA') {
    const trial = pickObject(answers, {
      free: 'trial_class.free',
      schedule: 'trial_class.schedule',
      required_info: 'trial_class.required_info',
    });
    if (Object.keys(trial).length) out.trial_class = trial;

    if (answers['benefit_platforms.accepts'] === true) {
      const benefits = answers['benefit_platforms'];
      if (isNonEmptyArray(benefits)) out.benefit_platforms = benefits;
    } else if (answers['benefit_platforms.accepts'] === false) {
      out.benefit_platforms = [];
    }
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

  const payment = pickObject(answers, {
    methods: 'payment.methods',
    enrollment_fee: 'payment.enrollment_fee',
    enrollment_fee_value: 'payment.enrollment_fee_value',
    cancellation_fee: 'payment.cancellation_fee',
    cancellation_fee_details: 'payment.cancellation_fee_details',
    makeup_policy: 'payment.makeup_policy',
  });
  if (Object.keys(payment).length) out.payment = payment;

  const promotions = answers['promotions'];
  if (isNonEmptyArray(promotions)) out.promotions = promotions;

  const differentials = answers['differentials'];
  if (isNonEmptyArray(differentials)) out.differentials = differentials;

  out.media = buildMedia(uploads);

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

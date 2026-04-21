import { OnboardingNiche, OnboardingTargetPlan } from '@prisma/client';

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'list'
  | 'timeslots'
  | 'upload'
  | 'repeater';

export interface SelectOption {
  value: string;
  label: string;
}

export interface DependsOn {
  questionId: string;
  equals?: unknown;
  in?: unknown[];
  notEquals?: unknown;
}

export interface Question {
  id: string;
  section: string;
  sectionTitle?: string;
  label: string;
  help?: string;
  type: QuestionType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: SelectOption[];
  niches?: OnboardingNiche[];
  targetPlans?: OnboardingTargetPlan[];
  dependsOn?: DependsOn;
  fields?: Question[];
  uploadHint?: string;
  accept?: string;
  min?: number;
  max?: number;
}

const ACADEMIA_AND_ESCOLA: OnboardingNiche[] = ['ACADEMIA', 'ESCOLA_CURSOS'];
const PLENO_ONLY: OnboardingTargetPlan[] = ['PLENO'];

export const QUESTIONS: Question[] = [
  // ---------- BUSINESS ----------
  {
    id: 'business.name',
    section: 'business',
    sectionTitle: 'Dados do negócio',
    label: 'Qual o nome do seu negócio?',
    help: 'Nome como aparece para os clientes.',
    type: 'text',
    required: true,
    placeholder: 'Ex: AJE DE BOXE',
  },
  {
    id: 'business.type',
    section: 'business',
    label: 'Qual o tipo do negócio?',
    help: 'Ex: academia de boxe, escola de idiomas, consórcio.',
    type: 'text',
    required: true,
    placeholder: 'Ex: academia de boxe',
  },
  {
    id: 'business.address',
    section: 'business',
    label: 'Qual o endereço?',
    type: 'text',
    required: true,
    placeholder: 'Rua, número, bairro, cidade',
  },

  // ---------- ASSISTANT ----------
  {
    id: 'assistant.name',
    section: 'assistant',
    sectionTitle: 'Assistente virtual',
    label: 'Como você quer chamar a assistente virtual?',
    help: 'Nome que aparecerá nas mensagens.',
    type: 'text',
    required: true,
    placeholder: 'Ex: Vic',
    defaultValue: 'Vic',
  },
  {
    id: 'assistant.greeting',
    section: 'assistant',
    label: 'Qual a saudação inicial dela?',
    type: 'textarea',
    required: true,
    placeholder: 'Ex: Olá! Sou a Vic, tudo bem?',
  },

  // ---------- LOCATION ----------
  {
    id: 'location.parking',
    section: 'location',
    sectionTitle: 'Localização e estrutura',
    label: 'Como é o estacionamento? (opcional)',
    type: 'textarea',
    placeholder: 'Ex: Estacionamento facilitado ao lado do Empório...',
  },
  {
    id: 'location.structure',
    section: 'location',
    label: 'Descreva a estrutura do local (opcional)',
    help: 'Banheiros, salas, equipamentos, climatização, etc.',
    type: 'textarea',
  },
  {
    id: 'location.photos',
    section: 'location',
    label: 'Envie fotos do local (opcional)',
    type: 'upload',
    accept: 'image/*',
    uploadHint: 'Pode enviar uma ou mais imagens da estrutura.',
  },

  // ---------- AUDIENCE (ACADEMIA / ESCOLA) ----------
  {
    id: 'audience.min_age',
    section: 'audience',
    sectionTitle: 'Público-alvo',
    label: 'Qual a idade mínima atendida?',
    type: 'number',
    min: 0,
    max: 120,
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'audience.max_age_note',
    section: 'audience',
    label: 'Há limite de idade máxima? (opcional)',
    type: 'text',
    placeholder: 'Ex: sem limite superior (até 60+)',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'audience.levels',
    section: 'audience',
    label: 'Quais níveis você atende? (opcional)',
    type: 'text',
    placeholder: 'Ex: iniciante, intermediário e avançado',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'audience.modalities',
    section: 'audience',
    label: 'Quais modalidades/cursos oferece?',
    help: 'Um por linha.',
    type: 'list',
    niches: ACADEMIA_AND_ESCOLA,
    required: true,
  },

  // ---------- SCHEDULE (ACADEMIA / ESCOLA) ----------
  {
    id: 'schedule.class_duration',
    section: 'schedule',
    sectionTitle: 'Horários das aulas',
    label: 'Qual a duração de cada aula?',
    type: 'text',
    placeholder: 'Ex: 1 hora',
    niches: ACADEMIA_AND_ESCOLA,
    required: true,
  },
  {
    id: 'schedule.class_note',
    section: 'schedule',
    label: 'Alguma observação sobre as aulas? (opcional)',
    type: 'textarea',
    placeholder: 'Ex: por agendamento, supervisionadas por professor',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'schedule.weekdays.morning',
    section: 'schedule',
    label: 'Horários de segunda a sexta — MANHÃ',
    help: 'Liste os horários separados por vírgula. Ex: 5h, 6h, 7h',
    type: 'list',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'schedule.weekdays.afternoon',
    section: 'schedule',
    label: 'Horários de segunda a sexta — TARDE',
    type: 'list',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'schedule.weekdays.evening',
    section: 'schedule',
    label: 'Horários de segunda a sexta — NOITE',
    type: 'list',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'schedule.saturday',
    section: 'schedule',
    label: 'Horários de sábado (opcional)',
    type: 'list',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'schedule.sunday',
    section: 'schedule',
    label: 'Horários de domingo (opcional)',
    type: 'list',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'schedule.image',
    section: 'schedule',
    label: 'Envie uma imagem da tabela de horários (opcional)',
    type: 'upload',
    accept: 'image/*,application/pdf',
    niches: ACADEMIA_AND_ESCOLA,
  },

  // ---------- TEACHERS (ACADEMIA / ESCOLA) ----------
  {
    id: 'teachers',
    section: 'teachers',
    sectionTitle: 'Professores',
    label: 'Cadastre os professores',
    help: 'Adicione um por vez. Você pode incluir quantos quiser.',
    type: 'repeater',
    niches: ACADEMIA_AND_ESCOLA,
    fields: [
      {
        id: 'name',
        section: 'teachers',
        label: 'Nome',
        type: 'text',
        required: true,
      },
      {
        id: 'bio',
        section: 'teachers',
        label: 'Biografia / formação / método',
        type: 'textarea',
        required: true,
      },
    ],
  },

  // ---------- TRIAL CLASS (ACADEMIA) ----------
  {
    id: 'trial_class.free',
    section: 'trial_class',
    sectionTitle: 'Aula experimental',
    label: 'Oferece aula experimental gratuita?',
    type: 'boolean',
    niches: ['ACADEMIA'],
  },
  {
    id: 'trial_class.dress_code',
    section: 'trial_class',
    label: 'Como o aluno deve ir vestido? (opcional)',
    type: 'text',
    placeholder: 'Ex: roupa de academia, descalço ou sapatilha',
    niches: ['ACADEMIA'],
  },
  {
    id: 'trial_class.equipment_note',
    section: 'trial_class',
    label: 'Precisa trazer algum material? (opcional)',
    type: 'textarea',
    niches: ['ACADEMIA'],
  },

  // ---------- CONSORCIO ----------
  {
    id: 'consorcio.operator',
    section: 'consorcio',
    sectionTitle: 'Consórcio',
    label: 'Qual a administradora/operadora?',
    type: 'text',
    niches: ['CONSORCIO'],
    required: true,
  },
  {
    id: 'consorcio.categories',
    section: 'consorcio',
    label: 'Quais categorias de consórcio oferece?',
    help: 'Ex: Imóvel, Automóvel, Serviços, Pesados.',
    type: 'list',
    niches: ['CONSORCIO'],
    required: true,
  },
  {
    id: 'consorcio.terms',
    section: 'consorcio',
    label: 'Quais os prazos oferecidos?',
    type: 'text',
    placeholder: 'Ex: 120, 180, 200 meses',
    niches: ['CONSORCIO'],
  },
  {
    id: 'consorcio.entrance_conditions',
    section: 'consorcio',
    label: 'Quais as condições de entrada / taxa de adesão?',
    type: 'textarea',
    niches: ['CONSORCIO'],
  },

  // ---------- GENERICO ----------
  {
    id: 'products',
    section: 'products',
    sectionTitle: 'Produtos e serviços',
    label: 'Cadastre seus produtos ou serviços',
    type: 'repeater',
    niches: ['GENERICO'],
    fields: [
      {
        id: 'name',
        section: 'products',
        label: 'Nome do produto/serviço',
        type: 'text',
        required: true,
      },
      {
        id: 'description',
        section: 'products',
        label: 'Descrição',
        type: 'textarea',
      },
      {
        id: 'price',
        section: 'products',
        label: 'Preço',
        type: 'text',
        placeholder: 'Ex: R$ 150,00 por mês',
      },
    ],
  },

  // ---------- PLANS (all niches) ----------
  {
    id: 'plans',
    section: 'plans',
    sectionTitle: 'Planos e preços',
    label: 'Cadastre os planos oferecidos',
    help: 'Adicione um por vez.',
    type: 'repeater',
    fields: [
      {
        id: 'name',
        section: 'plans',
        label: 'Nome do plano',
        type: 'text',
        required: true,
      },
      {
        id: 'price',
        section: 'plans',
        label: 'Preço',
        type: 'text',
        required: true,
        placeholder: 'Ex: R$ 250,00 por mês',
      },
      {
        id: 'description',
        section: 'plans',
        label: 'Descrição',
        type: 'textarea',
      },
    ],
  },
  {
    id: 'plans.image',
    section: 'plans',
    label: 'Envie uma imagem da tabela de preços (opcional)',
    type: 'upload',
    accept: 'image/*,application/pdf',
  },

  // ---------- PAYMENT ----------
  {
    id: 'payment.methods',
    section: 'payment',
    sectionTitle: 'Formas de pagamento',
    label: 'Quais formas de pagamento aceita?',
    type: 'multiselect',
    options: [
      { value: 'PIX', label: 'PIX' },
      { value: 'debito', label: 'Cartão de débito' },
      { value: 'credito', label: 'Cartão de crédito' },
      { value: 'dinheiro', label: 'Dinheiro' },
      { value: 'boleto', label: 'Boleto' },
    ],
  },
  {
    id: 'payment.enrollment_fee',
    section: 'payment',
    label: 'Cobra taxa de matrícula/adesão?',
    type: 'boolean',
  },
  {
    id: 'payment.cancellation_fee',
    section: 'payment',
    label: 'Existe taxa de cancelamento/fidelidade?',
    type: 'boolean',
  },
  {
    id: 'payment.makeup_policy',
    section: 'payment',
    label: 'Política de reposição (opcional)',
    type: 'textarea',
    niches: ACADEMIA_AND_ESCOLA,
  },

  // ---------- BENEFIT PLATFORMS (ACADEMIA) ----------
  {
    id: 'benefit_platforms',
    section: 'benefit_platforms',
    sectionTitle: 'Plataformas de benefícios',
    label: 'Aceita plataformas de benefícios? (opcional)',
    help: 'Ex: GymPass/WellHub, TotalPass. Adicione cada uma.',
    type: 'repeater',
    niches: ['ACADEMIA'],
    fields: [
      { id: 'name', section: 'benefit_platforms', label: 'Nome', type: 'text', required: true },
      { id: 'note', section: 'benefit_platforms', label: 'Observação (opcional)', type: 'text' },
    ],
  },

  // ---------- PROMOTIONS ----------
  {
    id: 'promotions',
    section: 'promotions',
    sectionTitle: 'Promoções',
    label: 'Há alguma promoção ativa? (opcional)',
    type: 'repeater',
    fields: [
      { id: 'name', section: 'promotions', label: 'Nome da promoção', type: 'text', required: true },
      {
        id: 'details',
        section: 'promotions',
        label: 'Detalhes (um por linha)',
        type: 'list',
      },
    ],
  },

  // ---------- DIFFERENTIALS ----------
  {
    id: 'differentials',
    section: 'differentials',
    sectionTitle: 'Diferenciais',
    label: 'Quais os diferenciais do seu negócio?',
    help: 'Um por linha.',
    type: 'list',
  },

  // ---------- APPOINTMENTS (PLENO) ----------
  {
    id: 'appointments.source',
    section: 'appointments',
    sectionTitle: 'Agendamento (plano Pleno)',
    label: 'Onde os agendamentos são persistidos?',
    type: 'select',
    targetPlans: PLENO_ONLY,
    options: [
      { value: 'google_calendar', label: 'Google Calendar' },
      { value: 'external_system', label: 'Sistema externo (CloudGym, etc)' },
    ],
    defaultValue: 'google_calendar',
  },
  {
    id: 'appointments.google_calendar.calendar_id',
    section: 'appointments',
    label: 'ID do Google Calendar (compartilhado com a Service Account)',
    type: 'text',
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'appointments.source', equals: 'google_calendar' },
  },
  {
    id: 'appointments.external_system.type',
    section: 'appointments',
    label: 'Qual o driver do sistema externo?',
    type: 'text',
    placeholder: 'Ex: cloudgym',
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'appointments.source', equals: 'external_system' },
  },
  {
    id: 'appointments.slot_duration_minutes',
    section: 'appointments',
    label: 'Duração padrão de um slot (minutos)',
    type: 'number',
    defaultValue: 60,
    targetPlans: PLENO_ONLY,
  },
  {
    id: 'appointments.lead_time_minutes',
    section: 'appointments',
    label: 'Antecedência mínima entre agendamento e aula (minutos)',
    type: 'number',
    defaultValue: 60,
    targetPlans: PLENO_ONLY,
  },
  {
    id: 'appointments.business_hours.mon_fri',
    section: 'appointments',
    label: 'Janela de funcionamento — segunda a sexta',
    help: 'Formato HH:MM-HH:MM. Ex: 06:00-22:00',
    type: 'text',
    defaultValue: '06:00-22:00',
    targetPlans: PLENO_ONLY,
  },
  {
    id: 'appointments.business_hours.sat',
    section: 'appointments',
    label: 'Janela de funcionamento — sábado (vazio se não abre)',
    type: 'text',
    placeholder: 'Ex: 09:00-13:00',
    targetPlans: PLENO_ONLY,
  },
  {
    id: 'appointments.business_hours.sun',
    section: 'appointments',
    label: 'Janela de funcionamento — domingo (vazio se não abre)',
    type: 'text',
    targetPlans: PLENO_ONLY,
  },

  // ---------- FOLLOWUPS (PLENO) ----------
  {
    id: 'followups.reactivation.enabled',
    section: 'followups',
    sectionTitle: 'Follow-ups automáticos (plano Pleno)',
    label: 'Ativar reativação automática de leads inativos?',
    type: 'boolean',
    defaultValue: true,
    targetPlans: PLENO_ONLY,
  },
  {
    id: 'followups.reactivation.inactive_hours',
    section: 'followups',
    label: 'Após quantas horas sem resposta a reativação dispara?',
    type: 'number',
    defaultValue: 24,
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'followups.reactivation.enabled', equals: true },
  },
  {
    id: 'followups.reactivation.max_stages',
    section: 'followups',
    label: 'Quantas tentativas de reativação no máximo?',
    type: 'number',
    defaultValue: 3,
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'followups.reactivation.enabled', equals: true },
  },
  {
    id: 'followups.appointment_reminder.enabled',
    section: 'followups',
    label: 'Enviar lembrete de agendamento?',
    type: 'boolean',
    defaultValue: true,
    targetPlans: PLENO_ONLY,
  },
  {
    id: 'followups.appointment_reminder.hours_before',
    section: 'followups',
    label: 'Quantas horas antes o lembrete dispara?',
    type: 'number',
    defaultValue: 3,
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'followups.appointment_reminder.enabled', equals: true },
  },
  {
    id: 'followups.templates.reactivation_stage_1',
    section: 'followups',
    label: 'Template: reativação #1',
    type: 'textarea',
    defaultValue: 'Oi {nome}, passando pra saber se ainda tem interesse!',
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'followups.reactivation.enabled', equals: true },
  },
  {
    id: 'followups.templates.reactivation_stage_2',
    section: 'followups',
    label: 'Template: reativação #2',
    type: 'textarea',
    defaultValue: 'Oi {nome}, consegui um horário especial pra você — quer aproveitar?',
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'followups.reactivation.enabled', equals: true },
  },
  {
    id: 'followups.templates.reactivation_stage_3',
    section: 'followups',
    label: 'Template: reativação #3',
    type: 'textarea',
    defaultValue: 'Oi {nome}, última chance — posso segurar sua vaga?',
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'followups.reactivation.enabled', equals: true },
  },
  {
    id: 'followups.templates.appointment_reminder',
    section: 'followups',
    label: 'Template: lembrete de agendamento',
    type: 'textarea',
    defaultValue: 'Lembrete: sua aula é hoje às {horario}. Te esperamos!',
    targetPlans: PLENO_ONLY,
    dependsOn: { questionId: 'followups.appointment_reminder.enabled', equals: true },
  },
];

export function filterQuestionsForForm(
  niche: OnboardingNiche,
  targetPlan: OnboardingTargetPlan
): Question[] {
  return QUESTIONS.filter((q) => {
    if (q.niches && !q.niches.includes(niche)) return false;
    if (q.targetPlans && !q.targetPlans.includes(targetPlan)) return false;
    return true;
  });
}

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
  labelByNiche?: Partial<Record<OnboardingNiche, string>>;
  help?: string;
  helpByNiche?: Partial<Record<OnboardingNiche, string>>;
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

export const QUESTIONS: Question[] = [
  // ---------- BUSINESS ----------
  {
    id: 'business.niche',
    section: 'business',
    sectionTitle: 'Dados do negócio',
    label: 'Qual a área do seu negócio?',
    type: 'select',
    required: true,
    options: [
      { value: 'ACADEMIA', label: 'Academia / estúdio fitness' },
      { value: 'ESCOLA_CURSOS', label: 'Escola / cursos' },
      { value: 'CONSORCIO', label: 'Consórcio' },
      { value: 'GENERICO', label: 'Outro' },
    ],
  },
  {
    id: 'business.name',
    section: 'business',
    label: 'Qual o nome do seu negócio?',
    help: 'Nome como aparece para os clientes.',
    type: 'text',
    required: true,
  },
  {
    id: 'business.type',
    section: 'business',
    label: 'Qual o tipo do negócio?',
    help: 'Ex: academia de boxe, escola de idiomas, consórcio, etc.',
    type: 'text',
    required: true,
    niches: ['GENERICO'],
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

  // ---------- AUDIENCE (ESCOLA_CURSOS) ----------
  {
    id: 'audience.min_age',
    section: 'audience',
    sectionTitle: 'Público-alvo',
    label: 'Qual a idade mínima atendida?',
    type: 'number',
    min: 0,
    max: 120,
    niches: ['ESCOLA_CURSOS'],
  },
  {
    id: 'audience.max_age_note',
    section: 'audience',
    label: 'Há limite de idade máxima? (opcional)',
    type: 'text',
    placeholder: 'Ex: sem limite superior (até 60+)',
    niches: ['ESCOLA_CURSOS'],
  },
  {
    id: 'audience.levels',
    section: 'audience',
    label: 'Quais níveis você atende? (opcional)',
    type: 'text',
    placeholder: 'Ex: iniciante, intermediário e avançado',
    niches: ['ESCOLA_CURSOS'],
  },
  {
    id: 'audience.modalities',
    section: 'audience',
    label: 'Quais modalidades oferece?',
    labelByNiche: {
      ACADEMIA: 'Quais modalidades oferece?',
      ESCOLA_CURSOS: 'Quais modalidades/cursos oferece?',
    },
    help: 'Um por linha.',
    type: 'list',
    niches: ACADEMIA_AND_ESCOLA,
    required: true,
  },

  // ---------- SCHEDULE (ESCOLA_CURSOS only tem duração) ----------
  {
    id: 'schedule.class_duration',
    section: 'schedule',
    sectionTitle: 'Horários das aulas',
    label: 'Qual a duração de cada aula?',
    type: 'text',
    placeholder: 'Ex: 1 hora',
    niches: ['ESCOLA_CURSOS'],
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
    id: 'schedule.image',
    section: 'schedule',
    label: 'Envie uma imagem com a tabela de horários',
    help: 'Anexe uma foto ou PDF com os horários das aulas (segunda a domingo).',
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

  // ---------- PLANS (ACADEMIA / ESCOLA) ----------
  {
    id: 'plans.image',
    section: 'plans',
    sectionTitle: 'Planos e preços',
    label: 'Envie uma imagem com a tabela de planos',
    labelByNiche: {
      ACADEMIA: 'Envie uma imagem com a tabela de planos',
      ESCOLA_CURSOS: 'Envie uma imagem da tabela de preços (opcional)',
    },
    helpByNiche: {
      ACADEMIA:
        'Anexe uma foto ou PDF com nome, preço e descrição dos planos. Se enviar a imagem, não precisa preencher em texto.',
    },
    type: 'upload',
    accept: 'image/*,application/pdf',
    niches: ACADEMIA_AND_ESCOLA,
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
    niches: ['ACADEMIA', 'ESCOLA_CURSOS', 'GENERICO'],
  },
  {
    id: 'payment.cancellation_fee',
    section: 'payment',
    label: 'Existe taxa de cancelamento/fidelidade?',
    type: 'boolean',
    niches: ['ACADEMIA', 'ESCOLA_CURSOS', 'GENERICO'],
  },
  {
    id: 'payment.makeup_policy',
    section: 'payment',
    label: 'Política de reposição (opcional)',
    type: 'textarea',
    niches: ['ESCOLA_CURSOS'],
  },

  // ---------- BENEFIT PLATFORMS (ACADEMIA) ----------
  {
    id: 'benefit_platforms',
    section: 'benefit_platforms',
    sectionTitle: 'Plataformas de benefícios',
    label: 'Aceita plataformas de benefícios (Gympass, Wellhub, ...)? (opcional)',
    help: 'Adicione cada plataforma aceita.',
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
    niches: ['ACADEMIA', 'ESCOLA_CURSOS', 'GENERICO'],
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
    helpByNiche: {
      ACADEMIA:
        'Um por linha. Ex: estrutura moderna e climatizada, professores qualificados, turmas reduzidas, horários flexíveis, banheira de imersão, estacionamento facilitado.',
      ESCOLA_CURSOS:
        'Um por linha. Ex: método próprio, professores certificados, turmas reduzidas, material incluso, plataforma online, certificado reconhecido.',
      CONSORCIO:
        'Um por linha. Ex: contemplações comprovadas, sem juros, parcelas que cabem no bolso, atendimento humanizado, lances facilitados, parcela reduzida no início.',
      GENERICO:
        'Um por linha. Ex: atendimento personalizado, qualidade garantida, preço competitivo, entrega rápida, suporte pós-venda.',
    },
    type: 'list',
  },
];

export function filterQuestionsForForm(
  _niche: OnboardingNiche,
  targetPlan: OnboardingTargetPlan
): Question[] {
  return QUESTIONS.filter((q) => {
    if (q.targetPlans && !q.targetPlans.includes(targetPlan)) return false;
    return true;
  });
}

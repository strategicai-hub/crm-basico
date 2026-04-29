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
    id: 'business.type',
    section: 'business',
    label: 'Qual é a área do seu negócio?',
    help: 'Ex: pet shop, clínica odontológica, loja de roupas, etc.',
    type: 'text',
    required: true,
    niches: ['GENERICO'],
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
  },
  {
    id: 'assistant.greeting',
    section: 'assistant',
    label: 'Qual a saudação inicial dela?',
    type: 'textarea',
    required: true,
    placeholder: 'Ex: Olá! Tudo bem?',
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

  // ---------- AUDIENCE ----------
  {
    id: 'audience.min_age',
    section: 'audience',
    sectionTitle: 'Público-alvo',
    label: 'Qual a idade mínima atendida?',
    labelByNiche: {
      ACADEMIA: 'A partir de qual idade aceita crianças/adolescentes?',
      ESCOLA_CURSOS: 'Qual a idade mínima atendida?',
    },
    type: 'number',
    min: 0,
    max: 120,
    niches: ACADEMIA_AND_ESCOLA,
    required: true,
  },
  {
    id: 'audience.min_age_conditions',
    section: 'audience',
    label: 'Condições para crianças/adolescentes (opcional)',
    help: 'Ex: necessita autorização dos pais, acompanhamento de responsável, modalidade restrita.',
    type: 'textarea',
    niches: ['ACADEMIA'],
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

  // ---------- SCHEDULE ----------
  {
    id: 'schedule.business_hours',
    section: 'schedule',
    sectionTitle: 'Horários',
    label: 'Qual o horário de funcionamento?',
    help: 'Inclua dias da semana e horários (ex: seg–sex 6h–22h, sáb 8h–14h).',
    type: 'textarea',
    niches: ['ACADEMIA'],
    required: true,
  },
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

  // ---------- TRIAL CLASS / VISITA (ACADEMIA) ----------
  {
    id: 'trial_class.free',
    section: 'trial_class',
    sectionTitle: 'Aula experimental / visita',
    label: 'Oferece aula experimental gratuita?',
    type: 'boolean',
    niches: ['ACADEMIA'],
    required: true,
  },
  {
    id: 'trial_class.schedule',
    section: 'trial_class',
    label: 'Horários disponíveis para agendamento de visita / aula experimental',
    help: 'Inclua dias da semana e horários disponíveis. Mencione também regras (ex: somente com agendamento prévio, mediante apresentação de documento).',
    type: 'textarea',
    niches: ['ACADEMIA'],
    required: true,
  },
  {
    id: 'trial_class.required_info',
    section: 'trial_class',
    label: 'Informações necessárias para agendar a aula experimental',
    help: 'Quais dados você precisa coletar do interessado? Um por linha (ex: nome, telefone, modalidade, dia, horário).',
    type: 'list',
    niches: ['ACADEMIA'],
    required: true,
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
    label: 'Envie uma imagem com a tabela de planos (opcional)',
    helpByNiche: {
      ACADEMIA:
        'Anexe uma foto ou PDF com nome, preço e descrição dos planos. Se já descrever os planos por escrito na próxima pergunta, este envio é opcional.',
      ESCOLA_CURSOS:
        'Anexe uma foto ou PDF com a tabela de preços. Opcional caso descreva por escrito.',
    },
    type: 'upload',
    accept: 'image/*,application/pdf',
    niches: ACADEMIA_AND_ESCOLA,
  },
  {
    id: 'plans.description',
    section: 'plans',
    label: 'Descreva os planos disponíveis (nome, valores, fidelidade)',
    help: 'Liste todos os planos: mensal, trimestral, semestral, anual, créditos, etc. Inclua valores, formas de pagamento e condições de fidelidade. Se já enviou a imagem da tabela acima, pode escrever apenas observações adicionais.',
    type: 'textarea',
    niches: ACADEMIA_AND_ESCOLA,
    required: true,
  },

  // ---------- PAYMENT ----------
  {
    id: 'payment.methods',
    section: 'payment',
    sectionTitle: 'Formas de pagamento',
    label: 'Quais formas de pagamento aceita?',
    type: 'multiselect',
    required: true,
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
    required: true,
    niches: ['ACADEMIA', 'ESCOLA_CURSOS', 'GENERICO'],
  },
  {
    id: 'payment.enrollment_fee_value',
    section: 'payment',
    label: 'Qual o valor da taxa de matrícula/adesão?',
    type: 'text',
    placeholder: 'Ex: R$ 100,00',
    dependsOn: { questionId: 'payment.enrollment_fee', equals: true },
    niches: ['ACADEMIA', 'ESCOLA_CURSOS', 'GENERICO'],
    required: true,
  },
  {
    id: 'payment.cancellation_fee',
    section: 'payment',
    label: 'Existe taxa de cancelamento/fidelidade?',
    type: 'boolean',
    required: true,
    niches: ['ACADEMIA', 'ESCOLA_CURSOS', 'GENERICO'],
  },
  {
    id: 'payment.cancellation_fee_details',
    section: 'payment',
    label: 'Detalhe a fidelidade / multa por cancelamento',
    help: 'Ex: 12 meses de fidelidade, multa de 30% das mensalidades restantes.',
    type: 'textarea',
    dependsOn: { questionId: 'payment.cancellation_fee', equals: true },
    niches: ['ACADEMIA', 'ESCOLA_CURSOS', 'GENERICO'],
    required: true,
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
    id: 'benefit_platforms.accepts',
    section: 'benefit_platforms',
    sectionTitle: 'Plataformas de benefícios',
    label: 'Aceita plataformas de benefícios (Gympass, Wellhub, TotalPass, etc.)?',
    type: 'boolean',
    niches: ['ACADEMIA'],
    required: true,
  },
  {
    id: 'benefit_platforms',
    section: 'benefit_platforms',
    label: 'Cadastre as plataformas aceitas',
    help: 'Para cada plataforma informe a partir de qual plano ela libera, quantos check-ins mensais e quaisquer exigências.',
    type: 'repeater',
    niches: ['ACADEMIA'],
    dependsOn: { questionId: 'benefit_platforms.accepts', equals: true },
    required: true,
    fields: [
      { id: 'name', section: 'benefit_platforms', label: 'Nome da plataforma', type: 'text', required: true, placeholder: 'Ex: Gympass' },
      {
        id: 'from_plan',
        section: 'benefit_platforms',
        label: 'A partir de qual plano libera?',
        type: 'text',
        required: true,
        placeholder: 'Ex: Silver, Gold...',
      },
      {
        id: 'monthly_checkins',
        section: 'benefit_platforms',
        label: 'Check-ins mensais permitidos',
        type: 'text',
        placeholder: 'Ex: 8 por mês',
      },
      {
        id: 'requirements',
        section: 'benefit_platforms',
        label: 'Exigências específicas (opcional)',
        type: 'textarea',
      },
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

import { Rule } from '@/lib/supabase';

export interface RuleTranslation {
  title: string;
  content: string;
}

// Portuguese translations mapped by canonical rule ID or normalized title
export const STUDENT_RULES_TRANSLATIONS: Record<string, RuleTranslation> = {
  // 1. Class Cancellation
  'classcancellation': {
    title: 'Cancelamento de Aulas',
    content:
      "Se o aluno não puder comparecer a uma aula, deverá avisar com pelo menos 24 horas de antecedência. Sem esse aviso prévio, a aula será considerada ministrada e não poderá ser reagendada nem reembolsada. Essa política é importante para permitir que o horário seja disponibilizado para outro aluno.",
  },
  'e6f04ed5-8ff1-4370-9143-13d922332efd': {
    title: 'Cancelamento de Aulas',
    content:
      "Se o aluno não puder comparecer a uma aula, deverá avisar com pelo menos 24 horas de antecedência. Sem esse aviso prévio, a aula será considerada ministrada e não poderá ser reagendada nem reembolsada. Essa política é importante para permitir que o horário seja disponibilizado para outro aluno.",
  },

  // 2. Schedule Commitment
  'schedulecommitment': {
    title: 'Compromisso de Horário',
    content:
      'A escola busca manter dias e horários fixos sempre que possível para se adequar à sua rotina. Se uma aula coincidir com um feriado, você pode nos enviar uma mensagem e ela será remarcada para outro horário.',
  },
  '31ed665c-ae8a-4060-8103-a014755b52c7': {
    title: 'Compromisso de Horário',
    content:
      'A escola busca manter dias e horários fixos sempre que possível para se adequar à sua rotina. Se uma aula coincidir com um feriado, você pode nos enviar uma mensagem e ela será remarcada para outro horário.',
  },

  // 3. Payment
  'payment': {
    title: 'Pagamento',
    content:
      'O pagamento da mensalidade deve ser realizado até o dia 10 do mês subsequente às aulas realizadas.',
  },
  '0c057038-01bb-4ddf-8c7e-d07abd79633e': {
    title: 'Pagamento',
    content:
      'O pagamento da mensalidade deve ser realizado até o dia 10 do mês subsequente às aulas realizadas.',
  },

  // 4. December Break
  'decemberbreak': {
    title: 'Recesso de Dezembro',
    content:
      'Entre os dias 23 de dezembro e 2 de janeiro, a escola estará em recesso de final de ano por cinco dias úteis. As aulas que coincidirem com esse período poderão ser repostas em janeiro, sem custo adicional.',
  },
  '2cc131ab-87a6-4df9-9822-f3f8b82ff5a2': {
    title: 'Recesso de Dezembro',
    content:
      'Entre os dias 23 de dezembro e 2 de janeiro, a escola estará em recesso de final de ano por cinco dias úteis. As aulas que coincidirem com esse período poderão ser repostas em janeiro, sem custo adicional.',
  },

  // 5. Class Frequency
  'classfrequency': {
    title: 'Frequência das Aulas',
    content:
      'A escola agendará o dia e o horário das aulas com base nas preferências gerais de horário do aluno.\n\nA programação da semana seguinte será publicada na plataforma do aluno toda sexta-feira à noite. É de responsabilidade do aluno acessar a plataforma para confirmar sua próxima aula.\n\nCaso o horário agendado não seja adequado, o aluno deverá entrar em contato com a escola imediatamente para que a aula possa ser ajustada, havendo disponibilidade.',
  },
  '970cd2e1-3872-4cd8-b273-3801c64b5612': {
    title: 'Frequência das Aulas',
    content:
      'A escola agendará o dia e o horário das aulas com base nas preferências gerais de horário do aluno.\n\nA programação da semana seguinte será publicada na plataforma do aluno toda sexta-feira à noite. É de responsabilidade do aluno acessar a plataforma para confirmar sua próxima aula.\n\nCaso o horário agendado não seja adequado, o aluno deverá entrar em contato com a escola imediatamente para que a aula possa ser ajustada, havendo disponibilidade.',
  },

  // 6. Schedule Confirmation
  'scheduleconfirmation': {
    title: 'Confirmação de Horário',
    content:
      'A escola publicará a programação da semana seguinte neste painel até as 20h de toda sexta-feira. Os alunos devem verificar o painel regularmente para se manterem informados sobre quaisquer atualizações.',
  },
  'b9f21059-6d60-4fb6-aa29-cb8ad522a77a': {
    title: 'Confirmação de Horário',
    content:
      'A escola publicará a programação da semana seguinte neste painel até as 20h de toda sexta-feira. Os alunos devem verificar o painel regularmente para se manterem informados sobre quaisquer atualizações.',
  },

  // 7. Class Structure
  'classstructure': {
    title: 'Estrutura das Aulas',
    content:
      'Embora muitas aulas sejam individuais (particulares) com o professor, elas não são garantidas como estritamente individuais. Ocasionalmente, o aluno poderá ser alocado em uma aula com mais um aluno do mesmo nível.\n\nIsso não afeta a qualidade da aula, pois cada aluno mantém interação direta com o professor. Além disso, estudar com outro aluno de nível semelhante pode enriquecer o aprendizado por meio de prática compartilhada, colaboração e oportunidades de networking.',
  },
  'e2ec813e-4a6e-4a34-9197-f59a4731f686': {
    title: 'Estrutura das Aulas',
    content:
      'Embora muitas aulas sejam individuais (particulares) com o professor, elas não são garantidas como estritamente individuais. Ocasionalmente, o aluno poderá ser alocado em uma aula com mais um aluno do mesmo nível.\n\nIsso não afeta a qualidade da aula, pois cada aluno mantém interação direta com o professor. Além disso, estudar com outro aluno de nível semelhante pode enriquecer o aprendizado por meio de prática compartilhada, colaboração e oportunidades de networking.',
  },

  // 8. 10-Minute Attendance Policy
  '10minuteattendancepolicy': {
    title: 'Tolerância de 10 Minutos',
    content:
      'Os alunos têm um período de tolerância de 10 minutos após o horário agendado para o início da aula.\n\nSe o aluno não entrar na aula dentro de 10 minutos do horário previsto, a aula será considerada ministrada e concluída. Nesse caso, não haverá reembolso, crédito ou possibilidade de reagendamento da aula.\n\nRecomendamos entrar pontualmente na aula para aproveitar ao máximo o seu tempo de aprendizado.',
  },
  'e884a225-e466-47a2-9721-2f65fd09ca04': {
    title: 'Tolerância de 10 Minutos',
    content:
      'Os alunos têm um período de tolerância de 10 minutos após o horário agendado para o início da aula.\n\nSe o aluno não entrar na aula dentro de 10 minutos do horário previsto, a aula será considerada ministrada e concluída. Nesse caso, não haverá reembolso, crédito ou possibilidade de reagendamento da aula.\n\nRecomendamos entrar pontualmente na aula para aproveitar ao máximo o seu tempo de aprendizado.',
  },

  // 9. Make-Up Class Policy
  'makeupclasspolicy': {
    title: 'Política de Reposição de Aulas',
    content:
      'Aulas canceladas com pelo menos 24 horas de antecedência poderão ser repostas como aulas extras ao longo das semanas seguintes.\n\nAs aulas de reposição não são inseridas na grade regular e devem ser agendadas de acordo com a disponibilidade do aluno e do professor.\n\nAs reposições só podem ser realizadas enquanto o aluno possuir matrícula ativa. Em caso de cancelamento ou encerramento da assinatura, as reposições pendentes expirarão.',
  },
  'cb3ae68b-11a2-48ce-9541-c1a05abce20a': {
    title: 'Política de Reposição de Aulas',
    content:
      'Aulas canceladas com pelo menos 24 horas de antecedência poderão ser repostas como aulas extras ao longo das semanas seguintes.\n\nAs aulas de reposição não são inseridas na grade regular e devem ser agendadas de acordo com a disponibilidade do aluno e do professor.\n\nAs reposições só podem ser realizadas enquanto o aluno possuir matrícula ativa. Em caso de cancelamento ou encerramento da assinatura, as reposições pendentes expirarão.',
  },

  // 10. Early Course Cancellation
  'earlycoursecancellation': {
    title: 'Cancelamento Antecipado do Curso',
    content:
      'O aluno poderá cancelar o curso a qualquer momento após concluir seis meses de aulas sem taxa de cancelamento.\n\nCaso o aluno cancele o curso antes de completar seis meses, não haverá devolução dos valores já pagos. Além disso, será cobrada uma taxa rescisória correspondente a 25% das mensalidades restantes para completar o período mínimo de seis meses.',
  },
  'fc3ad1e7-2fb0-4054-8925-92de023c5864': {
    title: 'Cancelamento Antecipado do Curso',
    content:
      'O aluno poderá cancelar o curso a qualquer momento após concluir seis meses de aulas sem taxa de cancelamento.\n\nCaso o aluno cancele o curso antes de completar seis meses, não haverá devolução dos valores já pagos. Além disso, será cobrada uma taxa rescisória correspondente a 25% das mensalidades restantes para completar o período mínimo de seis meses.',
  },
};

type RuleWithTranslations = Rule & {
  title_pt?: string;
  content_pt?: string;
};

const normalizeTitle = (title: string): string => {
  return (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const getPortugueseRuleTitle = (rule: Rule): string => {
  const extendedRule = rule as RuleWithTranslations;
  if (extendedRule.title_pt) return extendedRule.title_pt;
  if (rule.id && STUDENT_RULES_TRANSLATIONS[rule.id]) {
    return STUDENT_RULES_TRANSLATIONS[rule.id].title;
  }
  const key = normalizeTitle(rule.title);
  if (STUDENT_RULES_TRANSLATIONS[key]) {
    return STUDENT_RULES_TRANSLATIONS[key].title;
  }
  return rule.title;
};

export const getPortugueseRuleContent = (rule: Rule): string => {
  const extendedRule = rule as RuleWithTranslations;
  if (extendedRule.content_pt) return extendedRule.content_pt;
  if (rule.id && STUDENT_RULES_TRANSLATIONS[rule.id]) {
    return STUDENT_RULES_TRANSLATIONS[rule.id].content;
  }
  const key = normalizeTitle(rule.title);
  if (STUDENT_RULES_TRANSLATIONS[key]) {
    return STUDENT_RULES_TRANSLATIONS[key].content;
  }
  return rule.content;
};

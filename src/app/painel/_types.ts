export type Row = Record<string, any>;

export type PageSet = {
  rows: Row[];
  total: number;
  pagina?: number;
  limite?: number;
  hasVisibilidade?: boolean;
  hasLista?: boolean;
};

export type DashboardIdades = {
  adulto: number;
  c0_5: number;
  c6_10: number;
};

export type DashboardConvidados = Row & {
  total_grupos?: number;
  total_pessoas?: number;
  total_confirmados?: number;
};

export type DashboardPresentes = Row & {
  total_geral?: number;
  total_vendido?: number;
  total_pendente?: number;
  qtd_vendidos?: number;
  qtd_vendido?: number;
  qtd_pendente?: number;
  taxa_atual?: number;
  cartao_valor?: number;
  total_presentes?: number;
  presentes_disponiveis?: number;
  esgotados?: number;
  ocultos?: number;
};

export type ConviteControle = {
  nome: string;
  status: string;
  total: number;
  vao: string[];
  naoVao: string[];
  pendentes: string[];
};

export type DashboardPessoas = { total: number; vao: number; naoVao: number; pendentes: number };
export type DashboardGrupos = { total: number; respondidos: number; pendentes: number };

export type Dashboard = {
  convidados?: DashboardConvidados;
  idades?: DashboardIdades;
  idadesConfirmados?: DashboardIdades;
  convites?: ConviteControle[];
  pessoas?: DashboardPessoas;
  grupos?: DashboardGrupos;
  presentes?: DashboardPresentes;
  categoriasPresentes?: string[];
};

export type PainelData = {
  session: { id: number; usuario: string; role: string; permissoes: string[] };
  dashboard: Dashboard;
  convidados: PageSet;
  presentes: Row[];
  vendas: PageSet;
  recados: Row[];
  logs: PageSet;
  rsvpDeadline: string | null;
};

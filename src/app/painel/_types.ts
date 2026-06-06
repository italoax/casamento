export type Row = Record<string, any>;

export type PageSet = {
  rows: Row[];
  total: number;
  pagina?: number;
  limite?: number;
  hasVisibilidade?: boolean;
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
};

export type Dashboard = {
  convidados?: DashboardConvidados;
  idades?: DashboardIdades;
  presentes?: DashboardPresentes;
};

export type PainelData = {
  session: { usuario: string };
  dashboard: Dashboard;
  convidados: PageSet;
  presentes: Row[];
  vendas: PageSet;
  recados: Row[];
  logs: PageSet;
  rsvpDeadline: string | null;
};

export const normalizarNome = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

export function dataOcorrencia(valor: string, padrao: string): string | null {
  const v = valor.trim();
  if (!v) return padrao;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(v);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!br && !iso) return null;
  const ano = br ? Number(br[3]) + (br[3]?.length === 2 ? 2000 : 0) : Number(iso?.[1]);
  const mes = Number(br ? br[2] : iso?.[2]);
  const dia = Number(br ? br[1] : iso?.[3]);
  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  if (dt.getUTCFullYear() !== ano || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== dia) return null;
  return dt.toISOString().slice(0, 10);
}

export function identificarFuncionario<T extends { id: string; nome: string }>(nome: string, funcionarios: T[]) {
  const encontrados = funcionarios.filter((f) => normalizarNome(f.nome) === normalizarNome(nome));
  return encontrados.length === 1 ? encontrados[0] : undefined;
}
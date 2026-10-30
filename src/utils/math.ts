import { CaseMission, Project, ScenarioInfo, EvaluationResult, AllocRow, DesignData } from '../types';
import { caseById } from '../data/cases';

export const fmt = (n: number): string =>
  new Intl.NumberFormat('id-ID').format(Math.round(n));

export const pc = (need: number, p: number): number =>
  Math.ceil((need * p) / 100);

export const ek = (a: string, b: string): string =>
  [a, b].sort().join('|');

export const clamp = (v: number, a: number, b: number): number =>
  Math.min(b, Math.max(a, v));

export const caseOf = (p?: { caseId?: string } | null): CaseMission =>
  caseById(p?.caseId);

export const demandOf = (c: CaseMission): number =>
  c.fac.reduce((s, f) => s + f.need, 0);

export const nameOf = (c: CaseMission, id: string): string =>
  id === 'tank' ? c.tank : c.fac.find((f) => f.id === id)?.nama || id;

export const glyphOf = (c: CaseMission, id: string): string =>
  id === 'tank' ? 'tank' : c.fac.find((f) => f.id === id)?.glyph || 'taman';

export const scenOf = (c: CaseMission): Record<string, ScenarioInfo> => ({
  normal: {
    nama: 'Normal',
    supply: c.supply,
    cut: [],
    teks: `Persediaan air ${fmt(c.supply)} liter dan semua pipa berfungsi.`,
  },
  kurang: {
    nama: 'Air berkurang',
    supply: c.kurang,
    cut: [],
    teks: `Persediaan air berkurang menjadi ${fmt(c.kurang)} liter. Hitung ulang alokasi kalian.`,
  },
  gangguan: {
    nama: 'Pipa rusak',
    supply: c.supply,
    cut: [ek('tank', c.gangguan)],
    teks: `Terjadi gangguan pada jalur distribusi air menuju ${nameOf(c, c.gangguan).toLowerCase()}: pipa langsung dari tangki ke ${nameOf(c, c.gangguan).toLowerCase()} rusak.`,
  },
});

export const getAlloc = (
  p: Pick<Project, 'alloc'>,
  sc: string
): Record<string, number> => p.alloc[sc] || p.alloc.normal || {};

export function reachable(design: DesignData, cut: string[]): Set<string> {
  const seen = new Set<string>();
  const placed = design?.placed || { tank: true };
  if (!placed.tank) return seen;
  const adj: Record<string, string[]> = {};
  (design?.edges || []).forEach((k) => {
    if (typeof k !== 'string' || cut.includes(k)) return;
    const [a, b] = k.split('|');
    if (!placed[a] || !placed[b]) return;
    (adj[a] = adj[a] || []).push(b);
    (adj[b] = adj[b] || []).push(a);
  });
  const q = ['tank'];
  seen.add('tank');
  while (q.length) {
    const n = q.shift()!;
    (adj[n] || []).forEach((m) => {
      if (!seen.has(m)) {
        seen.add(m);
        q.push(m);
      }
    });
  }
  return seen;
}

export function evaluate(
  p: Project,
  sc: string,
  useRoute: boolean
): EvaluationResult {
  const c = caseOf(p);
  const S = scenOf(c)[sc] || scenOf(c).normal;
  const al = getAlloc(p, sc);
  const reach = useRoute ? reachable(p.design, S.cut) : null;
  const demand = demandOf(c);
  const goalMin = demand > S.supply;
  let cum = 0;

  const rows: AllocRow[] = c.fac.map((f) => {
    const a = Math.max(0, +al[f.id] || 0);
    cum += a;
    const placed = !!p.design?.placed?.[f.id];
    const conn = useRoute && reach ? reach.has(f.id) : true;
    const got = conn ? a : 0;
    const min = pc(f.need, f.min);
    const max = c.maxPct ? Math.floor((f.need * c.maxPct) / 100) : null;
    const boros = max !== null && a > max;

    const status: 'ok' | 'warn' | 'bad' = boros
      ? 'bad'
      : got >= f.need
      ? 'ok'
      : got >= min
      ? 'warn'
      : 'bad';

    return {
      ...f,
      alloc: a,
      got,
      min,
      max,
      over: boros,
      placed,
      conn,
      remain: S.supply - cum,
      status,
    };
  });

  const total = cum;
  const overSupply = total > S.supply;
  const left = S.supply - total;

  const overall: 'ok' | 'warn' | 'bad' =
    overSupply || rows.some((r) => r.status === 'bad')
      ? 'bad'
      : !goalMin && rows.some((r) => r.status === 'warn')
      ? 'warn'
      : 'ok';

  const names = (fn: (r: AllocRow) => boolean) =>
    rows
      .filter(fn)
      .map((r) => r.nama)
      .join(', ');

  const checks = [
    {
      ok: !overSupply,
      text: `Total alokasi ${fmt(total)} L tidak lebih dari persediaan ${fmt(S.supply)} L.`,
    },
    {
      ok: left >= 0,
      text: `Sisa air = ${fmt(S.supply)} − ${fmt(total)} = ${fmt(left)} L (tidak boleh negatif).`,
    },
    {
      ok: rows.every((r) => r.got >= r.min),
      text: 'Setiap fasilitas menerima air minimal sebesar batas minimumnya.',
    },
  ];

  if (c.maxPct) {
    checks.push({
      ok: rows.every((r) => !r.over),
      text: `Tidak ada alokasi yang melebihi ${c.maxPct}% kebutuhan.`,
    });
  }

  if (useRoute) {
    checks.push({
      ok: rows.every((r) => r.conn),
      text: 'Semua fasilitas terhubung ke tangki lewat pipa yang berfungsi.',
    });
  }

  if (!goalMin) {
    checks.push({
      ok: rows.every((r) => r.got >= r.need),
      text: 'Setiap fasilitas menerima sebesar kebutuhannya.',
    });
  }

  let text: string;
  if (overSupply) {
    text = `Total alokasi ${fmt(total)} L melebihi persediaan ${fmt(S.supply)} L. Kurangi ${fmt(total - S.supply)} L.`;
  } else if (rows.some((r) => r.over)) {
    text = `${names((r) => r.over)} melebihi batas ${c.maxPct}% kebutuhan. Kurangi agar tidak boros.`;
  } else if (useRoute && rows.some((r) => !r.conn && r.alloc > 0)) {
    text = `${names((r) => !r.conn && r.alloc > 0)} tidak terhubung ke tangki, jadi air tidak sampai.`;
  } else if (overall === 'bad') {
    text = `${names((r) => r.status === 'bad')} masih di bawah batas minimum.`;
  } else if (overall === 'warn') {
    text = `${names((r) => r.status === 'warn')} belum terpenuhi penuh, padahal air cukup untuk semua. Tambahkan alokasinya.`;
  } else {
    text = goalMin
      ? `Semua fasilitas mencapai batas minimum dan total tidak melebihi persediaan. Kekurangan air ${fmt(demand - S.supply)} L dibagi dengan adil.`
      : 'Semua kebutuhan terpenuhi dan total tidak melebihi persediaan.';
  }

  return {
    S,
    rows,
    total,
    over: overSupply,
    left,
    overall,
    text,
    diff: S.supply - demand,
    demand,
    goalMin,
    checks,
  };
}

export function successLines(c: CaseMission): string[] {
  const d = demandOf(c);
  const L = [`Total alokasi tidak lebih dari persediaan (${fmt(c.supply)} L).`];
  if (d <= c.supply) {
    L.push('Setiap fasilitas menerima sebesar kebutuhannya.');
  } else {
    L.push(`Air tidak cukup untuk semua (kurang ${fmt(d - c.supply)} L). Setiap fasilitas minimal mencapai batas minimumnya.`);
  }
  L.push(
    'Batas minimum: ' +
      c.fac.map((f) => `${f.nama} ${f.min}% = ${fmt(pc(f.need, f.min))} L`).join(', ') +
      '.'
  );
  if (c.maxPct) {
    L.push(`Tidak boleh boros: alokasi tiap fasilitas paling banyak ${c.maxPct}% dari kebutuhannya.`);
  }
  L.push('Semua fasilitas tersambung ke tangki lewat pipa pada desain.');
  L.push('Sisa air = persediaan − total alokasi, dan tidak boleh negatif.');
  return L;
}

export function practiceOf(c: CaseMission) {
  const f0 = c.fac[0];
  const d = demandOf(c);
  return [
    {
      k: 'add',
      op: 'Penjumlahan',
      q: `Berapa jumlah kebutuhan air semua fasilitas? (${c.fac.map((f) => fmt(f.need)).join(' + ')})`,
      a: d,
    },
    {
      k: 'sub',
      op: 'Pengurangan',
      q: `Persediaan ${fmt(c.supply)} L. Jika ${f0.nama} mengambil ${fmt(f0.need)} L, berapa liter sisanya?`,
      a: c.supply - f0.need,
    },
    {
      k: 'mul',
      op: 'Perkalian',
      q: c.mul.q,
      a: c.mul.a * c.mul.b,
    },
    {
      k: 'div',
      op: 'Pembagian',
      q: c.div.q,
      a: c.div.total / c.div.parts,
    },
  ];
}

export function scenesOf(c: CaseMission): [string, string, number][] {
  const d = demandOf(c);
  return [
    ['Masalah di ' + c.nama, c.desc, 1],
    [
      'Hitung kebutuhan',
      `${c.fac.map((f) => fmt(f.need)).join(' + ')} = ${fmt(d)} liter. Jumlahkan dulu semua kebutuhan.`,
      2,
    ],
    [
      'Bagi dengan adil',
      d > c.supply
        ? `Air hanya ${fmt(c.supply)} liter, kurang ${fmt(d - c.supply)} liter. Pastikan tiap fasilitas mencapai batas minimum.`
        : `Total alokasi tidak boleh lebih dari persediaan. ${fmt(c.supply)} − ${fmt(d)} = ${fmt(c.supply - d)} liter sisa.`,
      3,
    ],
    ['Rancang pipa', 'Air hanya sampai ke bangunan yang tersambung ke tangki lewat pipa.', 3],
    [
      'Uji dan perbaiki',
      `Persediaan turun jadi ${fmt(c.kurang)} liter. Hitung ulang dan jaga batas minimum tiap fasilitas.`,
      4,
    ],
  ];
}


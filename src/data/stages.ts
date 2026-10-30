import { Stage } from '../types';

export const STAGES: Stage[] = [
  { n: 1, k: 'EXPLORE', t: 'Pahami Masalah', d: 'Kenali masalah air bersih pada misimu.', c: '#20B8F2' },
  { n: 2, k: 'PLAN', t: 'Lakukan Perhitungan', d: 'Hitung dan bagi air dengan empat operasi hitung.', c: '#FFD84D' },
  { n: 3, k: 'DESIGN', t: 'Rancang Aqua City', d: 'Susun peta kota dan jalur pipa digital.', c: '#8CE6B2' },
  { n: 4, k: 'SIMULATE', t: 'Uji Solusi', d: 'Uji desain pada beberapa keadaan air.', c: '#BFA8FF' },
  { n: 5, k: 'CREATE', t: 'Buat Artefak Nyata', d: 'Wujudkan desain jadi Aqua City Smart Board.', c: '#FF8BA7' },
  { n: 6, k: 'TEST & IMPROVE', t: 'Perbaiki Solusi', d: 'Uji gangguan baru, lalu perbaiki.', c: '#40D9D0' },
  { n: 7, k: 'PRESENT', t: 'Tampilkan Hasil', d: 'Presentasikan karya dan refleksi kalian.', c: '#FF9BD2' },
];

export const GOALS: [string, string, number[]][] = [
  ['Memahami masalah distribusi air', 'Membaca data pasokan dan kebutuhan, lalu menyimpulkan apakah air cukup.', [1]],
  ['Menggunakan operasi hitung dalam menyelesaikan masalah', 'Memakai tambah, kurang, kali, dan bagi untuk membagi air.', [2]],
  ['Merancang solusi distribusi air secara digital', 'Menyusun peta kota, pipa, dan alokasi air di layar.', [3]],
  ['Membuat artefak nyata berdasarkan desain', 'Membangun Aqua City Smart Board dari bahan sederhana.', [5]],
  ['Menguji dan memperbaiki solusi', 'Menguji pada keadaan baru dan memperbaiki rancangan.', [4, 6]],
  ['Mengomunikasikan hasil pembelajaran', 'Mempresentasikan karya dan merefleksikan pembelajaran.', [7]],
];

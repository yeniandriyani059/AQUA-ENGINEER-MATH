import React from 'react';
import { useApp } from '../../context/AppContext';
import { Aqua, Logo } from '../common/Mascot';
import { Icon } from '../icons/Icon';

export function Tentang() {
  const { saveInfo } = useApp();

  return (
    <div className="main">
      <h1>Tentang Aplikasi</h1>
      <div className="card">
        <div className="row" style={{ gap: 18, alignItems: 'center' }}>
          <Logo width={180} style={{ flex: '0 0 auto', margin: '0 auto' }} />
          <div className="grow" style={{ minWidth: 'min(260px, 100%)' }}>
            <h2>Aqua Engineer Math</h2>
            <p className="slogan" style={{ marginTop: 4 }}>
              Hitung • Rancang • Bangun • Selamatkan Kota!
            </p>
            <p style={{ marginTop: 8 }}>
              Media pembelajaran numerasi interaktif berbasis proyek STEM untuk siswa kelas 5 SD. Siswa berperan sebagai tim insinyur cilik yang menggunakan operasi hitung matematika (penjumlahan, pengurangan, perkalian, pembagian, dan perbandingan) untuk merancang sistem distribusi air bersih yang adil dan tangguh.
            </p>
          </div>
        </div>
      </div>

      <div className="dgrid">
        <div className="card soft">
          <h3 style={{ marginBottom: 10 }}>7 Tahap Pembelajaran Insinyur Cilik</h3>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700 }}>
            <li><b>Explore (Pahami Masalah)</b>: Mengamati peta kota dan membaca data pasokan air.</li>
            <li><b>Plan (Lakukan Perhitungan)</b>: Menghitung kebutuhan dan membagi jatah air secara adil.</li>
            <li><b>Design (Rancang Kota)</b>: Menyusun tata letak bangunan dan jaringan pipa distribusi.</li>
            <li><b>Simulate (Uji Solusi)</b>: Menguji aliran air saat kondisi normal maupun saat air berkurang.</li>
            <li><b>Create (Buat Artefak Nyata)</b>: Membangun maket fisik <i>Aqua City Smart Board</i>.</li>
            <li><b>Test & Improve (Perbaiki Solusi)</b>: Mengatasi gangguan pipa rusak dengan jalur pipa cadangan.</li>
            <li><b>Present (Tampilkan Hasil)</b>: Mempresentasikan karya kelompok di depan kelas.</li>
          </ol>
        </div>

        <div className="main" style={{ gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Informasi Penyimpanan Pekerjaan</h3>
            <div className={'banner ' + (saveInfo.ok ? 'ok' : 'bad')}>
              <Icon n={saveInfo.ok ? 'check' : 'alert'} size={24} sw={3} />
              <span>
                {saveInfo.ok
                  ? 'Pekerjaan kelompok tersimpan secara otomatis pada peramban di perangkat yang sedang digunakan.'
                  : 'Peramban pada perangkat ini membatasi penyimpanan otomatis.'}
              </span>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              Catatan: Data hasil kerja kelompok disimpan langsung di perangkat masing-masing agar aplikasi dapat digunakan dengan lancar kapan saja. Jika berpindah perangkat, gunakan tombol <b>Salin Ringkasan Proyek</b> pada halaman Proyek Saya.
            </p>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #E8FAFF, #fff)' }}>
            <div className="row">
              <Aqua size={56} />
              <div className="grow">
                <h4>Pengembang Media Pembelajaran</h4>
                <p style={{ fontWeight: 800, color: 'var(--ocean)', fontSize: '1.1rem', marginTop: 2 }}>
                  Powered by Bu Guru Yennia
                </p>
                <p className="hint" style={{ marginTop: 2 }}>
                  Seluruh angka kebutuhan dan kapasitas air dalam misi adalah skenario edukatif untuk latihan numerasi SD.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

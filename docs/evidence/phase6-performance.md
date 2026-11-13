# Uji performa statistik Fase 6

Fixture PostgreSQL 16 lokal memakai 100.000 `ScanLog` sintetis pada satu halaman,
terdistribusi selama 90 hari. Semua 100.000 baris masuk rentang. Pengukuran pertama
service `getPageStats(..., { range: "90d" })` menjalankan empat agregasi SQL paralel
(hari, perangkat, jam Jakarta, referrer), lalu mengisi data chart di aplikasi.

- Waktu service terukur: **65 ms** (warm run, termasuk empat query paralel).
- Hasil: 100.000 total; 90 bucket hari; 25.000 per kategori perangkat; 24 bucket
  jam; 9 grup referrer termasuk scan langsung.
- Pada fixture yang sama, total dashboard 30 hari, hasil chart 30 hari, dan
  `COUNT(*)` database identik: 32.593.
- Smoke test unduhan CSV 30 hari menghasilkan tepat 32.593 baris, dengan timestamp
  ber-offset `+07:00`, tanpa kolom IP hash atau user-agent.
- Pengujian retensi dengan `SCAN_RETENTION_DAYS=365` menghapus tepat satu row
  berusia 401 hari; row lain yang masih baru tidak terhapus.

Ini baseline satu run pada database lokal, bukan jaminan latensi produksi. Hasil
bergantung ukuran instance, cache PostgreSQL, beban, dan distribusi data.

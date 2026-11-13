# Bukti uji Fase 5

Uji dilakukan pada production build lokal dan database PostgreSQL sementara.
Screenshot dialog QR tersedia di [phase5-qr-dialog.png](./phase5-qr-dialog.png).
QR pada screenshot mengarah ke `http://localhost:3305/r/halaman-contoh`.

Untuk uji ketahanan QR, halaman diubah dari slug `halaman-contoh` ke
`halaman-baru` dan slug lama disimpan sebagai riwayat. Request ke URL QR lama
menghasilkan:

| User-Agent uji | Status | Tujuan | Log |
| --- | ---: | --- | --- |
| Android 14 | 307 | `/p/halaman-baru` | dicatat, device `android` |
| Android 14 kedua, IP sama dalam 30 detik | 307 | `/p/halaman-baru` | dideduplikasi |
| iPhone iOS 17 | 307 | `/p/halaman-baru` | dicatat, device `ios` |

Database berisi dua log: satu Android dan satu iOS. Kedua baris memiliki `ipHash`;
IP mentah tidak disimpan. Tombol unduh menghasilkan PNG 1024px, SVG, dan PDF.

User-Agent dan request di atas disimulasikan dengan Chrome/HTTP pada mesin lokal;
ini bukan pemindaian dengan perangkat Android atau iPhone fisik. Uji fisik perlu
dilakukan pada jaringan/domain yang dapat dijangkau ponsel. QR screenshot localhost
memang hanya berlaku pada mesin pengujian.

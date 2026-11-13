# QR Card Page — Fase 1 dan 2

Fondasi Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS 3,
shadcn/ui, Prisma 6, PostgreSQL, Zod 4, dan NextAuth credentials.
Semua teks antarmuka menggunakan Bahasa Indonesia.

## Menjalankan lokal

Prasyarat: Node.js 20.19+ dan PostgreSQL 16 (atau Docker Compose).

```sh
npm ci
cp .env.example .env
openssl rand -base64 32
```

Isi `NEXTAUTH_SECRET` dengan hasil perintah terakhir dan
`SEED_ADMIN_PASSWORD` dengan kata sandi minimal 12 karakter, maksimal 72 byte.
Sesuaikan `DATABASE_URL` untuk PostgreSQL Anda. Akun seed default:
`admin@example.com`; kata sandi tidak disimpan di repositori.

Jika menggunakan Docker, konfigurasi lokal sudah tersedia:

```sh
docker compose up -d --wait db
```

Terapkan migrasi awal yang sudah disertakan, jalankan seed, lalu aplikasi:

```sh
npm run db:deploy
npm run db:seed
npm run dev
```

Buka http://localhost:3000 dan masuk melalui `/login` atau `/admin`.
`NEXTAUTH_URL` harus sesuai alamat aplikasi. PostgreSQL perlu aktif untuk login
dan akses area pengelola; halaman awal dan login dapat dirender tanpa koneksi DB.

Untuk perubahan skema selanjutnya saat pengembangan:

```sh
npm run db:migrate -- --name nama_perubahan
npm run db:generate
```

`migrate dev` memerlukan hak membuat shadow database. Untuk deployment, gunakan
`npm run db:deploy`, bukan `migrate dev`. Seed dijalankan secara eksplisit dan
memerlukan variabel `SEED_ADMIN_*`; jangan gunakan kredensial contoh di produksi.

## Data dan autentikasi

- `User`: ADMIN atau EDITOR, email unik dan kata sandi bcrypt.
- `Page`: pemilik, slug unik, tema JSON, status publikasi, sampul dan logo opsional.
- `Card`: 10 tipe, urutan, visibilitas, content dan style JSON.
- `ScanLog`: waktu, user-agent, tipe perangkat, referrer, serta HMAC IP opsional; IP mentah tidak disimpan.
- Penghapusan halaman menghapus kartu dan log terkait. Penghapusan pemilik yang
  masih memiliki halaman ditolak. Urutan kartu diindeks bersama `pageId`.

Seed membuat satu admin dan satu draft `halaman-contoh` dengan kartu TEXT,
LINK_BUTTON, CONTACT, dan DIVIDER. Seed transaksional dan idempoten: dijalankan
ulang tidak menggandakan kartu, mengganti kata sandi, atau menimpa halaman lama.
Mengubah variabel seed tidak mengubah akun yang sudah ada.

`lib/schemas/card.ts` mengekspor `cardSchema`, discriminated union berdasarkan
`type`, serta tipe `CardInput` dan `ValidatedCard`. Setiap cabang memvalidasi
content dan style, menolak properti asing, dan mengisi default style. Style umum:
`backgroundColor`, `textColor`, `radius`, `shadow`, `padding`, `alignment`, `icon`.
Ada tambahan per tipe, misalnya `columns`/`gap` untuk GALLERY dan
`lineStyle`/`thickness` untuk DIVIDER. TEXT berisi teks biasa, bukan HTML.
Tema divalidasi dengan `pageThemeSchema` di `lib/schemas/page.ts`.
Prisma JSON tidak memvalidasi struktur sendiri: setiap penulisan kartu pada fase
berikutnya wajib melalui `cardSchema.parse(input)` di server.

`middleware.ts` melindungi `/admin` dan seluruh turunannya dengan JWT NextAuth.
ADMIN dan EDITOR boleh memasuki area pengelola. Layout dan halaman admin juga
memanggil `requireUser()` untuk memastikan akun masih ada di database.
Gunakan helper ini pada setiap server action/route handler terlindungi yang
ditambahkan nanti, ditambah pemeriksaan kepemilikan/role sesuai operasi.
JWT berlaku delapan jam. Endpoint autentikasi berada di `/api/auth/[...nextauth]`.
Implementasi mengikuti [dokumentasi middleware NextAuth](https://next-auth.js.org/configuration/nextjs)
dan [credentials provider](https://next-auth.js.org/providers/credentials).

## Struktur

```text
app/                  Halaman awal, login, admin, dan endpoint autentikasi
components/           Form login, tombol keluar, komponen Button shadcn/ui
lib/                  Prisma singleton, utilitas, skema Zod
server/               Konfigurasi autentikasi dan pemeriksaan sesi server
prisma/               Skema, migrasi SQL awal, seed
types/                Augmentasi tipe NextAuth
tests/                Pengujian validasi kartu dan kredensial
public/uploads/       Direktori persiapan unggahan (diabaikan Git)
```

## Verifikasi

```sh
npm test
npm run typecheck
npx prisma validate
npm run build
```

Manajemen halaman tersedia pada Fase 2; editor kartu dan halaman publik dijelaskan
pada fase berikutnya di bawah.

## Fase 2 — Manajemen halaman

### Instalasi / migrasi dari Fase 1

```sh
npm ci
npm run db:deploy
npm run db:generate
npm run dev
```

Migrasi baru: `prisma/migrations/20261111010000_page_management/migration.sql`.
Migrasi menambah `PageSlugHistory` dengan slug unik dan cascade dari Page,
serta `UploadedImage` untuk kepemilikan dan registri file unggahan. Data lama
tidak dihapus. Seed tidak berubah dan tetap idempoten; tidak perlu diulang
untuk mengaktifkan Fase 2.

Env baru (opsional; nilai default sama):

```dotenv
STORAGE_PROVIDER="local"
```

`DATABASE_URL`, `NEXTAUTH_URL`, dan `NEXTAUTH_SECRET` tetap seperti Fase 1.
`NEXTAUTH_URL` harus memakai origin yang sama dengan browser (termasuk port),
karena mutasi route handler memeriksa header `Origin` untuk mencegah CSRF.
Provider selain `local` ditolak secara eksplisit sampai implementasinya tersedia.

### Fitur dan pola server

- `/admin`: tabel desktop/kartu mobile, pencarian judul/slug, filter publikasi,
  paginasi server 10 halaman per halaman daftar, jumlah scan dari `ScanLog`, dan
  waktu perubahan dalam WIB. Tersedia empty state, skeleton, dan toast aksi.
- `/admin/pages/new` dan `/admin/pages/[id]/edit`: judul, slug otomatis/manual,
  deskripsi, logo, sampul, dan publikasi. Slug diperiksa setelah debounce 400 ms.
  Publikasi tanpa kartu diizinkan dengan peringatan.
- Duplikasi menyalin tema dan seluruh kartu secara transaksional, memberi judul
  `"<judul> (salinan)"`, slug unik, pemilik akun yang menduplikasi, dan status draft.
- Hapus membutuhkan konfirmasi judul yang sama persis; kartu, scan, dan riwayat
  slug terhapus lewat cascade.

**Pola tunggal: route handler.** Semua permintaan mutasi, cek slug, dan upload
melewati endpoint HTTP; tidak ada server action. Pola ini memudahkan upload dengan
progres XHR, respons error terkontrol, dan uji HTTP. Server Component hanya membaca
data melalui service yang sama agar daftar awal dapat dirender di server.

| Endpoint | Operasi |
| --- | --- |
| `GET /api/pages?q=&status=all&page=1` | Daftar terfilter dan terpaginasikan |
| `POST /api/pages` | Buat halaman |
| `GET /api/pages/[id]` | Detail halaman yang berhak dikelola |
| `PATCH /api/pages/[id]` | Simpan perubahan |
| `DELETE /api/pages/[id]` | Hapus, JSON `{ "title": "judul persis" }` |
| `POST /api/pages/[id]/duplicate` | Duplikat halaman dan kartu |
| `GET /api/pages/slug?slug=...&pageId=...` | Cek slug; `pageId` hanya untuk edit |
| `POST /api/uploads` | Multipart `file`, opsional `pageId` |
| `DELETE /api/uploads` | Hapus upload belum terpakai milik pengguna |

Setiap endpoint terlindungi memanggil `requireUser()`; mutasi juga memakai
`assertCanManagePage`. ADMIN dapat mengelola semua halaman; EDITOR hanya miliknya.
Untuk pembuatan halaman/upload baru, helper menerima `null` secara eksplisit.
Upload yang sudah terdaftar hanya dapat dipasang oleh pemilik, ADMIN, atau editor
yang memiliki halaman yang memang sudah memakai gambar itu. Input JSON, query,
ID, file, dan konfirmasi divalidasi di server dengan Zod.

Autentikasi (`server/auth.ts`, middleware, konfigurasi NextAuth), `cardSchema`,
dan seed tidak diubah. Tes kartu lama hanya dipindahkan ke runner Vitest.

### Slug dan URL lama

Generator menghapus aksen, mengubah huruf menjadi kecil, dan memakai tanda hubung.
Slug harus sepanjang 3–60 karakter, hanya `a-z0-9-`, tanpa tanda hubung di kedua
ujung. Daftar reserved berada di `lib/slug.ts`, termasuk admin/api/login/p/r/
_next/uploads. Slug aktif maupun historis halaman lain tidak boleh dipakai.

Perubahan slug dan penambahan riwayat berlangsung dalam satu transaksi. Seluruh
mutasi halaman memakai PostgreSQL advisory transaction lock yang sama agar
namespace dua tabel tidak mengalami race antarproses. Slug lama milik halaman
yang sama boleh dipakai kembali; riwayat yang kini menjadi slug aktif dihapus.

`/p/[slug]` memeriksa publikasi dan mengarahkan alias lama langsung ke slug terbaru
dengan 307 (tidak permanen agar pemakaian ulang slug tidak menyebabkan loop cache).
Halaman draft, alias draft, atau halaman terhapus menghasilkan 404. Untuk Fase 2,
alamat publik hanya menampilkan judul/deskripsi; renderer kartu belum dibuat.

### Upload dan daur hidup file

`lib/storage.ts` menyediakan interface `StorageProvider` (`save`, `delete`,
`getUrl`) dan `LocalStorageProvider`. File disimpan di `public/uploads/` memakai
nama UUID dan ekstensi hasil deteksi isi. JPEG/PNG/WebP maksimal 5 MB diterima;
SVG, signature tidak dikenal, dan file terlalu besar ditolak. MIME atau ekstensi
dari browser tidak dipercaya. Ukuran body multipart juga dibatasi saat streaming.

`ImageUploader` menyediakan preview, progres, hapus, dan pesan error. Gambar lama
baru dilepas saat perubahan halaman disimpan. Upload baru yang dibatalkan dicoba
dibersihkan saat form ditutup. `/uploads/[key]` melayani file yang dibuat setelah
build sehingga unggahan baru tetap bekerja pada `next start`.

Duplikasi berbagi URL gambar. Cleanup memeriksa seluruh referensi Page, tema,
serta content/style Card sebelum menghapus file. Menghapus satu halaman atau
mengganti gambarnya tidak merusak duplikat yang masih memakai file tersebut.
Cleanup file dijalankan setelah transaksi halaman sukses; kegagalan filesystem
dicatat di server, tanpa membatalkan perubahan halaman yang sudah tersimpan.
Registri `UploadedImage` dipertahankan bila cleanup gagal. Tab yang ditutup saat
koneksi terputus dapat meninggalkan upload belum terpakai untuk pemeliharaan
berikutnya; jangan menghapus file hanya berdasarkan umur tanpa cek referensi.

Provider lokal memerlukan filesystem persisten yang dapat ditulis. Untuk lebih
dari satu instance aplikasi, mount direktori upload bersama atau implementasikan
provider objek seperti S3. Mengubah env saja belum menambahkan dukungan S3.

### Pengujian otomatis

```sh
npm test
npm run typecheck
npm run build
```

Vitest mencakup generator/format/reserved slug, akses ADMIN vs EDITOR, input
halaman, magic bytes dan ukuran upload, penyimpanan UUID/path traversal, serta
tes kartu dari Fase 1. Build dan dev menggunakan `.next` yang sama: hindari
menjalankannya bersamaan di checkout yang sama saat memverifikasi produksi.

### Uji manual dengan ADMIN dan EDITOR

1. Jalankan migrasi dan aplikasi. Masuk dengan admin dari seed. Siapkan akun
   EDITOR di database lokal melalui `npm run db:studio`: buat User baru dengan
   nama/email berbeda, `role = EDITOR`, dan `passwordHash` bcrypt. Untuk pengujian
   lokal saja, hash dapat dibuat dengan:

   ```sh
   node -e 'require("bcryptjs").hash("KataSandiUjiEditor123!", 12).then(console.log)'
   ```

2. Gunakan dua profil browser (atau satu jendela privat). Sebagai ADMIN buat
   halaman A; sebagai EDITOR buat halaman B. ADMIN melihat keduanya, EDITOR hanya
   melihat B. Buka URL edit A sebagai EDITOR: akses ditolak/404. Permintaan mutasi
   API terhadap A juga harus ditolak 403.
3. Buat judul `Café Senja`; pastikan slug otomatis `cafe-senja`. Coba slug `admin`,
   slug dengan spasi, serta slug A. Simpan harus ditolak. Ubah slug B, publish,
   lalu buka URL lama: harus menuju slug baru. Coba pakai slug lama B pada halaman
   lain: harus ditolak. Kembalikan B ke slug lamanya: tetap diperbolehkan.
4. Unggah PNG/JPEG/WebP; periksa preview dan progres. Coba SVG yang dinamai `.png`
   serta gambar lebih dari 5 MB: harus ditolak. Ganti/hapus gambar lalu simpan.
   Batalkan perubahan lain: gambar yang sudah tersimpan sebelumnya tetap ada.
5. Duplikat B: judul berakhiran `(salinan)`, slug berbeda, status draft, kartu dan
   tema sama. Sebagai ADMIN duplikat halaman milik EDITOR: salinan dimiliki ADMIN.
   Ganti/hapus gambar pada B: gambar pada salinan harus tetap dapat dibuka.
6. Cari berdasarkan judul/slug, ubah filter draft/published. Buat lebih dari 10
   halaman untuk mencoba paginasi. Halaman tanpa log menampilkan nol scan; tambah
   ScanLog melalui Prisma Studio untuk memeriksa penghitung.
7. Publish halaman tanpa kartu: ada peringatan tetapi penyimpanan berhasil. Ubah
   ke draft: URL aktif dan URL historis harus 404.
8. Klik hapus: tombol konfirmasi tidak aktif sampai judul cocok. Setelah hapus,
   halaman/kartu/scan/riwayat hilang; file yang dipakai salinan tetap tersedia,
   sedangkan file tanpa referensi dibersihkan. Ulangi pada viewport ponsel.

### File Fase 2

- Database: `prisma/schema.prisma`, migrasi `20261111010000_page_management`.
- Service server: `server/pages.ts`, `page-access.ts`, `page-transactions.ts`,
  `images.ts`, `http.ts`, `errors.ts`.
- Validasi/storage: `lib/schemas/page.ts`, `lib/slug.ts`, `lib/upload.ts`,
  `lib/storage.ts`, `lib/api-client.ts`.
- HTTP: `app/api/pages/**/route.ts`, `app/api/uploads/route.ts`,
  `app/uploads/[key]/route.ts`.
- UI: `app/admin/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`,
  `app/admin/pages/new/page.tsx`, `app/admin/pages/[id]/edit/page.tsx`,
  `app/p/[slug]/page.tsx`, `app/not-found.tsx`.
- Komponen: `components/page-editor.tsx`, `page-actions.tsx`,
  `image-uploader.tsx`, `toast-provider.tsx`.
- Tes/config: `tests/slug.test.ts`, `page-access.test.ts`, `upload.test.ts`,
  `card.test.ts`, `vitest.config.ts`, `package.json`, `package-lock.json`,
  `.env.example`, dan `README.md`.

## Fase 3 — Card Builder dan live preview

Buka `/admin/pages/[id]/edit` dari daftar halaman. Desktop menampilkan editor dan
preview HP dengan area konten 375 px; layar kecil memakai tombol Editor/Pratinjau.
Pengaturan judul, slug, deskripsi, logo, dan sampul tetap tersedia melalui tombol
**Pengaturan halaman** di `/admin/pages/[id]/settings`.

### Cara kerja

- Tambah 10 tipe kartu melalui pemilih berikon. Edit melalui tab Isi/Tampilan,
  sembunyikan, duplikat, atau hapus dengan konfirmasi. Maksimal 100 kartu per halaman.
- Geser pegangan kartu menggunakan mouse/sentuhan. Keyboard: fokuskan pegangan,
  tekan Spasi, pindahkan dengan panah, lalu Spasi untuk meletakkan atau Escape
  untuk membatalkan. Pengumuman pembaca layar tersedia dalam Bahasa Indonesia.
- Autosave menunggu 700 ms setelah perubahan. Permintaan diserialkan: edit yang
  terjadi ketika penyimpanan sedang berjalan dikirim pada penyimpanan berikutnya.
  Upload ditunggu sampai selesai; kartu belum valid menghalangi penyimpanan seluruh
  snapshot, ditandai pada daftar/form, dan tidak dirender dalam preview.
- Status menampilkan Menyimpan/Tersimpan/Gagal menyimpan dan tombol Coba lagi.
  Browser memperingatkan saat tab ditutup dengan perubahan belum tersimpan.
- Tema menyediakan empat preset, reset, enam Google Font melalui `next/font`
  (Inter, Lora, Roboto Mono, Poppins, Nunito, Playfair Display), lebar konten,
  jarak kartu, warna solid/gradasi/titik, serta radius default kartu baru.
  Tombol terpisah menerapkan radius ke seluruh kartu yang sudah ada.
- Color picker menunjukkan rasio kontras dan peringatan di bawah 4,5:1; untuk
  gradasi, rasio terendah dari sampel sepanjang gradasi dipakai.
- Publish/Unpublish disimpan bersama snapshot. Lihat halaman aktif setelah versi
  published tersimpan. Halaman kosong tetap boleh dipublikasikan dengan peringatan.

### Penyimpanan, akses, dan konflik versi

Pola route handler tetap digunakan: `GET/PUT /api/pages/[id]/builder` memanggil
`requireUser()` dan `assertCanManagePage()`. PUT memvalidasi snapshot dengan Zod
serta memanggil `cardSchema.parse(input)` sebelum **setiap upsert kartu**.
Duplikasi halaman pada service Fase 2 juga kini memvalidasi salinan kartu dengan
schema yang sama. Seed sudah menggunakan schema tersebut dan tidak diubah.

Klien mengirim `updatedAt` yang terakhir dilihat. Server memeriksanya di bawah
advisory transaction lock, kemudian menyimpan kartu/urutan/tema/publikasi secara
atomik dan menaikkan timestamp secara monoton. `(pageId, order)` adalah index
non-unique, sehingga swap tidak memerlukan offset sementara. ID kartu dari
halaman lain dan ID duplikat dalam snapshot ditolak.

Versi kedaluwarsa menerima HTTP 409 `VERSION_CONFLICT` tanpa penulisan. Dialog
menawarkan Muat ulang (membuang perubahan lokal) atau Timpa. Timpa tetap memakai
compare-and-swap terhadap versi yang ditampilkan dalam dialog; bila ada penulis
ketiga, konflik muncul kembali. Tombol ini tidak melakukan overwrite tanpa syarat.
Pembaruan metadata dari halaman Pengaturan juga menaikkan versi, sehingga builder
mendeteksi perubahan dari tab tersebut.

### Perubahan skema yang disengaja

Tidak ada migrasi database baru: seluruh perluasan berada pada JSON tervalidasi.
Data lama dengan bentuk yang masih valid memperoleh default saat dibaca.

| Skema | Perubahan Fase 3 |
| --- | --- |
| TEXT.content | `title` opsional; `text` tetap teks biasa |
| IMAGE.style | `aspectRatio`: auto/16:9/4:3/1:1, default auto |
| CONTACT.content | `whatsapp` opsional; 08… dinormalisasi menjadi 628… saat membuat tautan |
| MAP.content | `embedUrl` Google Maps opsional; koordinat boleh kosong hanya bila embed tersedia, atau harus diisi berpasangan |
| GALLERY.style | `layout`: grid/carousel, default grid; columns/gap tetap dipakai |
| DIVIDER.style | `lineStyle` menerima none untuk ruang kosong; tinggi diatur lewat padding |
| LINK_BUTTON.content.url | http/https/tel/mailto yang valid; skema lain ditolak |
| SOCIAL / VIDEO_EMBED | Validasi diperketat: host sesuai platform dan ID/path video yang dapat dikonversi ke embed aman |
| pageThemeSchema | `gradientColor`, `contentWidth`, `cardGap`, dan enam pilihan font tambahan; sans/serif/mono lama tetap diterima |
| Upload | Key/URL dokumen diperluas, sedangkan logo/sampul tetap khusus gambar |

Kartu lama yang berisi URL video tidak valid atau host sosial yang tidak sesuai
akan ditolak schema baru. Perbaiki data tersebut sebelum membuka builder; data
invalid tidak dihapus otomatis. Halaman publik melewati kartu invalid.

### Upload dokumen dan renderer bersama

`POST /api/uploads/documents` menerima PDF/DOC/DOCX/XLS/XLSX maksimal 10 MB.
Signature PDF dan penutup EOF diperiksa; DOC/XLS harus berupa container CFB dengan
stream WordDocument/Workbook/Book. DOCX/XLSX harus berupa ZIP OOXML dengan metadata
content-type dan entry dokumen yang sesuai. Batas metadata/uncompressed size
membatasi pemrosesan arsip; OOXML bermakro ditolak. Nama UUID dan ekstensi berasal
dari deteksi isi, bukan MIME/ekstensi yang diberikan browser.

`StorageProvider` tetap menjadi abstraksi penyimpanan. Registry `UploadedImage`
dipakai juga untuk dokumen demi kompatibilitas database; nama tabel dipertahankan.
Route file melayani MIME sesuai tipe dan Content-Disposition attachment untuk
unduhan dokumen. File yang dipakai bersama diperiksa referensinya sebelum cleanup.
Upload yang belum tersimpan dipertahankan ketika berpindah tab/panel agar tidak
merusak draft atau duplikat lokal. Membatalkan seluruh draft dapat meninggalkan
file belum terpakai untuk pemeliharaan, seperti batasan upload Fase 2.

`components/cards/CardRenderer.tsx` berisi dispatcher dan renderer presentasional
per tipe, tanpa akses DB dan tanpa `dangerouslySetInnerHTML`. `PagePreview` dipakai
oleh preview admin dan halaman publik `/p/[slug]`. Tautan eksternal menggunakan
`noopener noreferrer`; iframe hanya dibentuk untuk YouTube-nocookie, Vimeo player,
atau Google Maps yang diizinkan. Carousel memakai scroll-snap native dengan area
scroll yang dapat difokuskan keyboard.

### Fase 4: halaman publik

`/p/[slug]` merender halaman terbit di server. Slug lama yang tercatat pada
`PageSlugHistory` dialihkan permanen ke slug terbaru; slug draft dan slug yang
tidak ada sama-sama menghasilkan 404. Hanya kartu terlihat yang dibaca untuk
halaman publik. Tema/kartu diperiksa ulang saat dirender; kartu rusak dilewati dan
dicatat di log tanpa mencatat isi pengguna.

Cache publik memakai ISR 60 detik dengan tag per slug. Mutasi halaman dan builder
memvalidasi ulang slug aktif beserta alias riwayatnya setelah transaksi berhasil,
termasuk jalur 404 saat halaman baru dibuat. Metadata menyediakan canonical,
Open Graph, Twitter, dan robots dari opsi tema. Preview tersimpan untuk draft
tersedia di `/admin/pages/[id]/preview` dan memerlukan hak akses pengelola.

Tema mengatur latar/gradasi/gambar, font, lebar konten, jarak kartu, radius,
visibilitas footer, dan noindex. Perluasan `pageThemeSchema` bersifat kompatibel
ke belakang melalui default Zod, sehingga tidak memerlukan migrasi SQL. Gambar
halaman dan kartu memakai `next/image`; gambar eksternal tetap tanpa optimasi Next
agar URL publik lama tidak memerlukan konfigurasi host baru. Tata letak responsif,
focus state terlihat, dan animasi menghormati `prefers-reduced-motion`.

Pengukuran Lighthouse mobile pada `http://localhost:3303/p/halaman-contoh`
(Next production build, halaman contoh terbit, dua run lokal 13 November 2026):
Performance **99**, Accessibility **100** pada kedua run. Skor bergantung pada
lingkungan/perangkat; gunakan hasil ini sebagai baseline lokal, bukan jaminan
untuk semua perangkat atau jaringan.

`SITE_URL` opsional menetapkan origin canonical/metadata. Jika kosong, aplikasi
menggunakan origin dari `NEXTAUTH_URL`.

## Fase 5 — QR code dan pencatatan scan

QR selalu menunjuk ke `{NEXT_PUBLIC_APP_URL}/r/{slug}`. Route publik `/r/[slug]`
mencari slug aktif atau riwayat, lalu mengirim redirect 307 ke slug terbaru. Slug
draft dan yang tidak ada menuju halaman 404 ramah. Slug lama tetap berlaku selama
halaman masih terbit; halaman yang dihapus atau dijadikan draft tidak dapat dibuka.

Dialog QR tersedia di daftar halaman dan editor. Atur warna, ukuran, margin,
koreksi error, modul bulat, dan logo opsional, lalu unduh PNG 1024px, SVG, atau
PDF siap cetak. Logo memaksa koreksi minimal Q dan dibatasi maksimum 20% lebar QR.
Warna berkontras rendah atau foreground lebih terang dari latar memunculkan
peringatan. Pengaturan QR hanya disimpan selama dialog terbuka; QR dan opsi tidak
disimpan ke database karena dapat dibuat kembali dari slug dan konfigurasi dialog.

Scan dicatat sesudah respons redirect melalui `after()` agar penulisan tidak
menambah waktu tunggu pengunjung. Bot/crawler, prefetch, dan HEAD tidak dicatat.
Scan dengan hash IP yang sama untuk halaman yang sama dideduplikasi selama 30 detik;
advisory lock PostgreSQL mencegah dua request serentak lolos bersama. IP diambil
dari `x-forwarded-for` paling depan (atau `x-real-ip`), divalidasi, langsung
di-HMAC-SHA256, dan hanya hash disimpan. Pastikan proxy tepercaya mengatur header
tersebut. Jika IP atau secret tidak tersedia, metadata scan tetap dapat dicatat,
tetapi deduplikasi IP tidak berlaku.

Env Fase 5:

- `NEXT_PUBLIC_APP_URL`: URL dasar publik yang ditanam ke QR. Wajib diatur ke
  domain publik saat deployment; aplikasi memberi peringatan bila production
  memakai localhost. Untuk dev, gunakan `http://localhost:3000`.
- `IP_HASH_SECRET`: secret acak minimal 32 karakter, khusus untuk HMAC IP. Buat
  misalnya dengan `openssl rand -hex 32`; jangan pakai `NEXTAUTH_SECRET` ulang.

Migrasi Fase 5 menambah indeks `ScanLog(pageId, ipHash, scannedAt)` untuk dedup;
jalankan `npm run db:deploy`.

Uji manual: terbitkan halaman, buka QR dari daftar/editor, unduh PNG dan pindai
dengan Android serta iPhone. Ubah slug dan pindai QR yang sama: harus berakhir di
slug baru. Pindai ulang dalam 30 detik dari jaringan/IP sama: penghitung tidak
bertambah. Pastikan draft dan halaman terhapus mengarah ke 404. Tes perangkat nyata
memerlukan URL yang dapat diakses ponsel; `localhost` hanya dapat dipakai dari
perangkat yang menjalankan aplikasi. Bukti lokal yang sudah dijalankan ada di
[`docs/evidence/phase5-scan-results.md`](docs/evidence/phase5-scan-results.md) dan
[`docs/evidence/phase5-qr-dialog.png`](docs/evidence/phase5-qr-dialog.png). Uji di
file tersebut memakai User-Agent Android/iPhone ter-simulasi, bukan ponsel fisik.

### Menjalankan dan menguji

```sh
npm ci
npm run db:generate
npm test
npm run typecheck
npm run build
npm run dev
```

Env baru opsional: `SITE_URL=https://domain-anda`. Pastikan migrasi Fase 2 sudah
diterapkan (`npm run db:deploy`).
`next/font/google` memerlukan akses Google Fonts saat build pertama. Jalankan
build terpisah dari server dev yang aktif karena keduanya memakai `.next`.

Uji manual:

1. Login sebagai ADMIN atau EDITOR pemilik halaman, buka Edit. Coba akses sebagai
   EDITOR lain: tetap ditolak. Periksa layout desktop dan tab pada layar ponsel.
2. Tambah setiap tipe kartu; lengkapi field wajib. IMAGE/GALLERY memerlukan upload
   dan alt; VIDEO memerlukan URL YouTube/Vimeo valid; FILE memerlukan dokumen.
   Masukkan SVG/ZIP biasa/dokumen lebih dari 10 MB untuk memeriksa penolakan.
3. Ubah isi, warna, radius, ikon, dan opsi khusus tipe. Preview langsung berubah.
   Teks HTML seperti `<script>` harus tampil literal. Coba URL javascript atau
   host `youtube.com.evil.example`: harus ditolak.
4. Reorder lewat pegangan mouse/sentuhan, lalu keyboard. Tunggu Tersimpan dan
   refresh: urutan tetap. Uji toggle visibilitas, duplikasi, dan konfirmasi hapus.
5. Coba empat preset, enam font, gradasi, lebar/jarak, radius, dan reset. Pilih
   warna teks/latar sama untuk memunculkan peringatan kontras.
6. Ketik cepat ketika autosave berlangsung; hasil akhir setelah refresh harus
   sesuai edit terakhir. Putus jaringan, edit, periksa Gagal menyimpan, sambungkan
   jaringan dan tekan Coba lagi. Tutup/reload tab dengan perubahan lokal untuk
   memeriksa peringatan browser.
7. Buka halaman yang sama pada dua tab. Simpan di A, lalu edit B: B menampilkan
   konflik. Uji Muat ulang, lalu ulangi dan pilih Timpa. Uji juga perubahan dari
   halaman Pengaturan ketika builder masih terbuka.
8. Publish dan buka Lihat halaman: renderer publik harus sesuai preview. Unpublish
   membuat URL publik kembali 404. Uji tel/mailto/WhatsApp, embed, download, serta
   galeri dan file yang masih dipakai kartu duplikat setelah sumber dihapus.
9. Ganti slug halaman terbit. Buka slug lama dan pastikan dialihkan ke URL baru;
   draft harus tetap 404. Periksa `rel=canonical`, metadata sosial, dan robots
   ketika opsi noindex diaktifkan. Preview draft harus menampilkan kartu tersembunyi
   dengan penanda, sementara versi publik tidak menampilkannya.

Undo/redo opsional belum ditambahkan.

### File Fase 3

- Baru: `components/builder/{card-builder,card-list,content-form,style-form,theme-form,fields,document-uploader,use-builder}.tsx` (hook `use-builder.ts`).
- Baru: `components/cards/{CardRenderer,PagePreview}.tsx`.
- Baru: `lib/{card-defaults,card-links,fonts,themes}.ts`, `lib/schemas/builder.ts`.
- Baru: `server/{builder,document-upload}.ts`, `app/api/pages/[id]/builder/route.ts`,
  `app/api/uploads/documents/route.ts`, `app/admin/pages/[id]/settings/page.tsx`.
- Diubah: editor halaman, halaman publik, root layout, ImageUploader, skema kartu
  dan tema, storage, service halaman/gambar/HTTP, serta route penyajian upload.
- Tes: `tests/{builder,builder-service,document-upload}.test.ts`; fixture video
  pada `tests/card.test.ts` disesuaikan ke ID video valid. Dependensi/lockfile dan
  README diperbarui. Autentikasi dan seed tidak berubah.

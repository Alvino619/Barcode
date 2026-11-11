# QR Card Page — Fase 1

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
- `ScanLog`: metadata scan, termasuk `ipHash` opsional; pencatatan scan belum diimplementasikan.
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

Halaman admin saat ini hanya penanda sesi berhasil. Editor kartu, rendering
halaman publik, generator QR, upload, dan analitik menunggu fase berikutnya.

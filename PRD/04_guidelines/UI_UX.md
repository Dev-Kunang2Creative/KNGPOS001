# UI/UX & Design System — Karcisqu POS

## Design Vision

Karcisqu POS mengusung gaya visual yang **bersih, profesional, cepat, dan fungsional**. Prioritas utama adalah kemudahan penggunaan di lingkungan restoran yang sibuk — kasir dan waiter harus bisa mengoperasikan sistem dengan minimal klik, bahkan saat ramai pengunjung.

---

## UX Priorities

1. **Speed of Operation**: Dari pilih meja → tambah item → checkout harus bisa diselesaikan dalam < 60 detik. Tidak ada loading panjang, tidak ada konfirmasi berlebihan.
2. **Touch-Friendly**: Tombol dan elemen interaktif minimal 48×48px (touch target). Navigasi ramah jari untuk tablet dan smartphone.
3. **High Readability**: Font besar pada angka harga dan total. Kontras tinggi antara teks dan background — terbaca di pencahayaan restoran yang bervariasi.
4. **Role-Appropriate Interface**: Setiap role melihat hanya apa yang mereka butuhkan. Kasir melihat cart + menu. Kitchen melihat board order. Manager melihat dashboard. Super Admin melihat platform overview.
5. **Realtime Feedback**: Perubahan status meja, order baru di kitchen/bar, konfirmasi pembayaran — semua langsung tampil tanpa perlu refresh.

---

## Color Palette ("Karcisqu Professional")

### Prinsip Proporsi
- **70% Base & Surface**: latar utama, card, input, panel
- **20% Primary Action**: CTA utama, status aktif, elemen navigasi aktif
- **10% Accent & Status**: badge, indikator status, warna meja

### Palet Warna

#### Base & Surface
- **Background Utama**: `#F8F9FA` — putih keabu-abuan, lega dan bersih
- **Surface Card**: `#FFFFFF` — card, modal, panel
- **Surface Hover**: `#F1F3F5` — hover state pada list item atau card
- **Border**: `#DEE2E6` — border tipis untuk card, input, divider
- **Border Strong**: `#CED4DA` — border input aktif, outline tombol

#### Primary Action (Warna Brand Karcisqu)
- **Primary**: `#2563EB` — tombol CTA utama, elemen aktif, progress
- **Primary Hover**: `#1D4ED8` — hover state tombol primary
- **Primary Light**: `#EFF6FF` — background badge primary ringan

#### Status Colors
- **Success / Tersedia**: `#16A34A` (hijau) — meja tersedia, pembayaran berhasil, status done
- **Warning / Open Bill**: `#D97706` (kuning-oranye) — meja open bill, pending
- **Danger / Terisi**: `#DC2626` (merah) — meja terisi, error, aksi destruktif
- **Info**: `#0891B2` (teal) — in-progress di kitchen/bar
- **Neutral**: `#6B7280` (abu) — meja blocked, item nonaktif, teks sekunder

#### Typography
- **Text Primary**: `#111827` — heading, angka penting, label utama
- **Text Secondary**: `#6B7280` — keterangan, placeholder, label sekunder
- **Text Inverse**: `#FFFFFF` — teks di atas background gelap/tombol

---

## Typography

- **Font Family**: Inter (Google Fonts) atau sistem font: `font-family: 'Inter', -apple-system, sans-serif`
- **Font Sizes**:
  - Total amount / angka besar: 28–36px, font-weight 700
  - Heading section: 18–20px, font-weight 600
  - Body / label: 14–16px, font-weight 400–500
  - Keterangan kecil: 12px, font-weight 400

---

## Layout Patterns per Context

### Pattern 1 — "The Speed Desk" (Kasir POS)
- 2 kolom: Cart (kiri 40%) + Menu Browser (kanan 60%)
- Tablet landscape, fullscreen
- Tombol "Bayar" besar, sticky di bawah cart
- Kategori menu: horizontal tab scroll
- Item menu: grid 3–4 kolom dengan gambar kecil

### Pattern 2 — "The Floor View" (Denah Meja)
- Kanvas visual posisi meja sesuai layout restoran sesungguhnya
- Warna meja sesuai status (hijau/merah/kuning/abu)
- Tap meja → side panel aksi
- Tablet landscape atau desktop

### Pattern 3 — "The Kitchen Board" (Kitchen/Bar Display)
- Fullscreen, landscape, font sangat besar
- Layout kolom per status: Menunggu | Diproses | Selesai
- Card order: border warna tebal sesuai status
- Timer per order terlihat jelas
- Tidak ada sidebar atau navigasi lain

### Pattern 4 — "The Guest Menu" (Self-Order Pelanggan)
- Mobile portrait, fullscreen
- Tab kategori horizontal di atas
- Grid item menu dengan foto dominan
- Cart sticky di bawah layar
- Alur linear: Browse → Cart → Bayar → Konfirmasi

### Pattern 5 — "The Control Room" (Dashboard Manager / Platform Super Admin)
- Desktop-first, bisa dibuka di tablet
- Bento grid: card metric di atas, grafik tengah, tabel bawah
- Navigasi sidebar (desktop) atau top navigation (tablet)
- Data-dense tapi terstruktur dengan spacing yang cukup

### Pattern 6 — "The Backoffice" (Menu, User, Settings)
- Layout standar admin: sidebar kiri + content kanan
- Tabel dengan filter, search, pagination
- Form: side panel atau modal (tidak full page)
- Desktop-first

---

## Component Standards

### Tombol
- **Primary**: Background `#2563EB`, teks putih, border-radius 8px
- **Secondary / Outline**: Border `#2563EB`, teks `#2563EB`, background transparan
- **Danger**: Background `#DC2626`, teks putih
- **Ukuran touch target**: minimum 48px tinggi untuk interface tablet/mobile
- **Loading state**: tombol disable + spinner kecil di dalam tombol saat proses berlangsung

### Status Badge
- Pill/chip kecil dengan warna background pastel sesuai status
- Contoh: "Tersedia" → `bg-green-100 text-green-700`
- Contoh: "Terisi" → `bg-red-100 text-red-700`

### Card
- Background `#FFFFFF`, border `1px solid #DEE2E6`, border-radius 12px
- Shadow ringan: `shadow-sm`
- Padding: 16–20px

### Input
- Border `#CED4DA`, border-radius 8px, padding 12px
- Focus: border `#2563EB` + ring shadow biru ringan
- Error: border `#DC2626` + pesan error di bawah input (merah)

### Toast Notification
- Gunakan `react-hot-toast`
- Success: ikon centang hijau
- Error: ikon X merah
- Posisi: top-right di desktop, top-center di mobile

---

## Aturan Absolut

1. Jangan gunakan warna selain dari palet di atas kecuali ada alasan kuat dan dikonfirmasi
2. Semua halaman harus bisa digunakan tanpa mouse (touch-only) untuk interface kasir, waiter, kitchen, bar
3. Halaman self-order pelanggan harus diuji di layar 375px (iPhone SE) — tidak boleh ada konten yang terpotong
4. Loading state wajib ada untuk semua aksi yang membutuhkan waktu > 300ms
5. Error dari server selalu ditampilkan ke user via toast atau form error (tidak boleh diam-diam gagal)

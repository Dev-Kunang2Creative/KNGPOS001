# Panduan Arsitektur Layout — Karcisqu POS

Agar developer tidak merancang ulang layout dari nol untuk setiap halaman, Karcisqu POS menggunakan sistem **Layout Templates**. Semua halaman dikelompokkan ke dalam 6 kerangka layout dasar.

---

## 1. The Speed Desk (Kasir POS Interface)

**Digunakan oleh:** `K2_POS_Interface_Kasir.md`

**Karakteristik:**
- 2 kolom: Cart (kiri 40%) dan Menu Browser (kanan 60%)
- Fullscreen, tanpa sidebar
- Tablet landscape sebagai primary device
- Tidak ada navigasi keluar selama sesi order (minimalism)

**Elemen Utama:**
- **Header bar**: nama kasir, nama meja aktif, tombol aksi cepat (buka shift, history)
- **Panel Kiri (Cart)**: daftar item terpilih, qty, subtotal per item, total besar, tombol "Bayar"
- **Panel Kanan (Menu)**: search bar, tab kategori horizontal, grid item menu (gambar + nama + harga)
- **Footer Kiri**: total amount (font besar), tombol "Bayar" (primary, full-width)

**Fitur yang menggunakan:**
- Halaman POS Kasir (`/pos`)
- Halaman Order Waiter (`/pos` mode waiter)

---

## 2. The Floor View (Denah Meja)

**Digunakan oleh:** `K7_Table_Management.md`

**Karakteristik:**
- Kanvas visual posisi meja sesuai layout lantai restoran
- Status meja ditampilkan dengan warna (hijau/merah/kuning/abu)
- Side panel muncul saat meja diklik
- Tablet landscape atau desktop

**Elemen Utama:**
- **Top bar**: filter area/zona, tombol "Tambah Meja" (admin), legenda warna
- **Kanvas Meja**: representasi visual posisi dan status setiap meja
- **Side Panel** (muncul saat klik meja): info meja, ringkasan order aktif, tombol aksi (Pindah, Gabung, Split, Close Bill)

**Fitur yang menggunakan:**
- Denah meja kasir/waiter (`/tables`)
- Mini-map denah di dashboard Manager/Super Admin

---

## 3. The Kitchen/Bar Board (Kitchen & Bar Display)

**Digunakan oleh:** `K4_Kitchen_Display.md`, `K5_Bar_Display.md`

**Karakteristik:**
- Fullscreen, landscape, tanpa navigasi lain
- Font besar — terbaca dari jarak 1–2 meter
- Touch-optimized, tidak butuh keyboard/mouse
- Warna card per status (kuning/biru/hijau)

**Elemen Utama:**
- **Header**: nama "Kitchen" atau "Bar", jumlah order per status (badge counter)
- **Tab Filter**: Semua | Menunggu | Diproses | Selesai
- **Order Cards** (layout Kanban atau scroll vertical):
  - Nama meja, timer tunggu
  - Daftar item + qty + catatan
  - Tombol status: "Mulai Proses" / "Selesai"
- **Alert visual**: flash / pulse animasi saat order baru masuk

**Fitur yang menggunakan:**
- Kitchen Display (`/kitchen`)
- Bar Display (`/bar`)

---

## 4. The Guest Menu (Self-Order Pelanggan)

**Digunakan oleh:** `K6_Self_Order_QR.md`

**Karakteristik:**
- Mobile portrait, fullscreen (customer-facing)
- Foto menu dominan, tampilan menarik
- Tidak ada elemen sistem/admin yang terlihat
- Alur linear 4 langkah

**Elemen Utama:**
- **Top bar**: logo tenant, nama meja
- **Tab Kategori**: horizontal scroll, sticky
- **Grid Menu**: foto besar, nama, harga, tombol "+"
- **Cart Button**: sticky di bawah, tampilkan total + badge jumlah item
- **Halaman Cart**: review pesanan, tombol "Pesan & Bayar"
- **Halaman Bayar**: pilih metode (Xendit), countdown timer
- **Halaman Konfirmasi**: "Pesanan Diterima!" + ringkasan

**Fitur yang menggunakan:**
- Self-order pelanggan (`/s/{tenant_slug}/{qr_token}`)

---

## 5. The Control Room (Dashboard Manager / Super Admin Platform)

**Digunakan oleh:** `A4_Dashboard_Monitoring.md`

**Karakteristik:**
- Desktop-first, tapi bisa dibuka di tablet
- Data-dense dengan spacing yang cukup
- Sidebar navigasi (desktop) atau top nav (tablet/mobile)
- Realtime update via WebSocket

**Elemen Utama:**
- **Sidebar Kiri**: link navigasi (Dashboard, Laporan, Menu, User, Settings)
- **Header**: nama tenant, tombol notifikasi, profil Manager (atau "Super Admin" jika platform dashboard)
- **Bento Grid Metrics**: card-card KPI (total penjualan, jumlah meja terisi, dll)
- **Grafik**: line/bar chart penjualan per jam
- **Mini Denah Meja**: grid kecil status meja realtime
- **Tabel Transaksi Terkini**: 10 transaksi terakhir

**Fitur yang menggunakan:**
- Dashboard (`/dashboard`)

---

## 6. The Backoffice (Manajemen & Settings)

**Digunakan oleh:** `A2_Menu_Management.md`, `A3_User_Role_Management.md`, `A5_Reports.md`, `A6_Table_QR_Config.md`, `A7_System_Settings.md`

**Karakteristik:**
- Desktop-first
- Sidebar kiri + content area kanan
- Tabel dengan filter, search, pagination
- Form add/edit sebagai side panel atau modal (tidak full page)

**Elemen Utama:**
- **Sidebar**: navigasi antar modul (Menu, Pengguna, Laporan, Meja, Settings)
- **Content Area**:
  - Filter bar (dropdown, search, date picker)
  - Tabel data (sortable, paginated)
  - Tombol aksi per baris (edit, hapus, toggle)
  - Tombol "Tambah" di kanan atas tabel
- **Side Panel / Modal**: form add/edit yang muncul tanpa meninggalkan halaman

**Fitur yang menggunakan:**
- Menu management (`/menu`)
- User management (`/users`)
- Reports (`/reports/*`)
- Table & QR config (`/settings/tables`)
- System settings (`/settings/*`)
- Audit log (`/audit-logs`)

---

## Panduan Memilih Layout

| Siapa yang menggunakannya? | Context | Layout |
|---------------------------|---------|--------|
| Kasir / Waiter saat order | Transaksi aktif | The Speed Desk |
| Kasir / Waiter lihat meja | Navigasi meja | The Floor View |
| Kitchen staff | Proses order dapur | The Kitchen/Bar Board |
| Bar staff | Proses order minuman | The Kitchen/Bar Board |
| Pelanggan di meja | Self-order QR | The Guest Menu |
| Manager monitoring tenant | Operasional realtime | The Control Room |
| Super Admin monitoring platform | Platform overview | The Control Room |
| Manager kelola data | CRUD + laporan | The Backoffice |

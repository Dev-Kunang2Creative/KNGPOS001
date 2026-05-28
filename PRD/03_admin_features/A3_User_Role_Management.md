# FEATURE A3 - User & Role Management

## Objective

Memungkinkan Manager dan Super Admin mengelola akun staf restoran beserta hak aksesnya. Super Admin bisa mengelola semua akun termasuk Manager. Manager bisa mengelola Kasir, Waiter, Dapur, dan Bar.

## Scope

CRUD pengguna staf, assign role, reset password, aktif/nonaktifkan akun.

---

## Functional Requirements

### Daftar Pengguna
- Tabel semua pengguna staf aktif dan nonaktif
- Kolom: nama, email, role, status, tanggal dibuat, last login
- Filter by: role, status (aktif/nonaktif)
- Pencarian by nama atau email

### Tambah Pengguna Baru
- Form: nama lengkap, email, role, password sementara
- Email harus unik (platform-wide, satu restoran)
- Password sementara: tampil sekali di layar setelah simpan
- Flag `must_change_password = true` otomatis aktif
- Role yang bisa dibuat oleh **Manager**: kasir, waiter, dapur, bar
- Role yang bisa dibuat oleh **Super Admin**: manager + semua role di atas

### Edit Pengguna
- Ubah nama, email, role
- Super Admin bisa edit semua pengguna
- Manager hanya bisa edit kasir, waiter, dapur, bar (tidak bisa edit super_admin atau manager lain)

### Reset Password
- Super Admin / Manager bisa reset password staf → generate password baru sementara
- Password baru tampil sekali di layar (catat dan berikan ke staf)
- Flag `must_change_password = true` otomatis aktif setelah reset

### Aktifkan / Nonaktifkan Akun
- Toggle status aktif/nonaktif
- Akun nonaktif tidak bisa login
- Data transaksi staf nonaktif tetap tersimpan
- Tidak ada hard delete di V1 — gunakan nonaktif

### Informasi Tambahan per Role

Saat membuat akun **Dapur** atau **Bar**, sistem menampilkan opsi tambahan:
- Untuk Dapur: pilih default kitchen station (opsional — bisa diatur nanti oleh Manager di Zone Management)
- Untuk Bar: pilih default bar station (opsional)
- Untuk Waiter: pilih default zona (opsional — bisa diatur di Zone Management)

### RBAC

| Role | Dibuat oleh | Bisa edit |
|------|------------|-----------|
| super_admin | Seeder / diri sendiri | Super Admin |
| manager | Super Admin | Super Admin |
| kasir | Manager, Super Admin | Manager, Super Admin |
| waiter | Manager, Super Admin | Manager, Super Admin |
| dapur | Manager, Super Admin | Manager, Super Admin |
| bar | Manager, Super Admin | Manager, Super Admin |

---

## UI/UX Layout

**Konsep: "The Staff Directory"**
- Tabel staf dengan role badge dan status badge
- Filter: semua role | kasir | waiter | dapur | bar
- Tombol aksi per baris: Edit, Reset Password, Toggle Aktif/Nonaktif
- Form tambah/edit: side panel atau modal
- Konfirmasi sebelum nonaktifkan akun

---

## Data Model

Entity: `users`, `roles` (Spatie)

```
users.role: ENUM('super_admin', 'manager', 'kasir', 'waiter', 'dapur', 'bar')
users.is_active: boolean
users.must_change_password: boolean
```

---

## Acceptance Criteria

- [ ] Super Admin bisa buat dan edit semua role termasuk Manager
- [ ] Manager bisa buat dan edit kasir, waiter, dapur, bar
- [ ] Manager tidak bisa edit Super Admin atau sesama Manager
- [ ] Reset password generate password baru dan set `must_change_password = true`
- [ ] Akun nonaktif tidak bisa login
- [ ] Semua aksi (buat, edit, nonaktifkan, reset) tercatat di `audit_logs`
- [ ] Role yang di-assign langsung berlaku (Spatie permission cache refresh)
- [ ] Password sementara tampil sekali setelah buat/reset akun

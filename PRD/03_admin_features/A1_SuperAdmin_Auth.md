# FEATURE A1 - Authentication (Semua Role)

## Objective

Menyediakan akses aman bagi semua staf Karcisqu POS — dari Super Admin hingga Bar staff — menggunakan satu sistem login dengan redirect berbeda per role.

## Scope

Login semua role via satu endpoint `/login`, session management, password reset via Resend, role-based redirect, akun nonaktif handling.

---

## Functional Requirements

### Login
- Route: `GET/POST /login`
- Form: email dan password
- Validasi: format email valid, password minimum 8 karakter
- Rate limit: max 5 percobaan gagal dalam 15 menit → lock sementara
- Remember me: session bertahan 30 hari (tidak tersedia untuk Super Admin)
- Error handling: kredensial salah, akun nonaktif

### Redirect Setelah Login (Berdasarkan Role)

| Role | Redirect |
|------|----------|
| super_admin | `/dashboard` |
| manager | `/dashboard` |
| kasir | `/pos` (cek shift aktif) |
| waiter | `/orders` |
| dapur | `/kitchen` |
| bar | `/bar` |

### Logout
- Route: `POST /logout`
- Hapus session
- Redirect ke `/login`

### Password Reset
- Request reset via email (form di halaman login)
- Kirim link reset via **Resend** ke email staf
- Token reset berlaku 1 jam, sekali pakai
- Password baru minimum 8 karakter
- Setelah reset: redirect ke login

### Account Status
- **Active**: bisa login normal
- **Inactive**: tidak bisa login, tampilkan pesan "Akun Anda dinonaktifkan. Hubungi Manager."
- `must_change_password = true`: setelah login, wajib ganti password sebelum lanjut

---

## UI/UX Layout

**Konsep: "The Operational Gate"**
- Card login di tengah layar (centered)
- Logo Karcisqu di atas card
- Form: email, password, tombol "Masuk"
- Link "Lupa Password?" di bawah form
- Background: gelap solid

**Error messages:**
- Salah kredensial: "Email atau password salah. Coba lagi."
- Akun nonaktif: "Akun Anda dinonaktifkan. Hubungi Manager."
- Rate limit: "Terlalu banyak percobaan. Coba lagi dalam 15 menit."

---

## Data Model

Entity: `users`, `password_reset_tokens`

```
users.is_active          — false = tidak bisa login
users.must_change_password — true = wajib ganti password setelah login
users.last_login_at      — diupdate setiap login berhasil
```

---

## Acceptance Criteria

- [ ] Semua 6 role bisa login dan diredirect ke halaman yang benar
- [ ] Akun nonaktif tidak bisa login (pesan yang jelas)
- [ ] `must_change_password = true` → redirect ke halaman ganti password, tidak bisa akses halaman lain
- [ ] Rate limit aktif setelah 5 percobaan gagal
- [ ] Password reset berhasil via email (Resend)
- [ ] Token reset expired setelah 1 jam atau setelah dipakai
- [ ] Logout menghapus session dan redirect ke `/login`
- [ ] Login tercatat: `users.last_login_at` diupdate

# FEATURE K1 - Authentication

## Objective

Menyediakan akses aman bagi semua staf Karcisqu POS — Super Admin, Manager, Kasir, Waiter, Dapur, Bar — untuk login, logout, dan reset password via satu endpoint.

## Scope

Email/password login, session management, password reset via Resend, role-based redirect setelah login.

---

## Functional Requirements

### Login
- Route: `GET/POST /login`
- Form: email dan password
- Rate limit: max 5 percobaan gagal dalam 15 menit
- Remember me: session 30 hari

### Redirect Setelah Login

| Role | Redirect |
|------|----------|
| super_admin | `/dashboard` |
| manager | `/dashboard` |
| kasir | `/pos` |
| waiter | `/orders` |
| dapur | `/kitchen` |
| bar | `/bar` |

Kasir yang redirect ke `/pos` langsung dicek shift aktif-nya. Jika belum ada shift → modal "Buka Shift".

### Logout
- Route: `POST /logout`
- Hapus session, redirect ke `/login`

### Password Reset
- Kirim link reset via Resend ke email
- Token berlaku 1 jam, sekali pakai
- Password baru minimum 8 karakter

### Account Status
- **Inactive**: tidak bisa login — "Akun Anda dinonaktifkan. Hubungi Manager."
- **must_change_password**: wajib ganti password sebelum akses halaman manapun

---

## Acceptance Criteria

- [ ] Semua 6 role bisa login dan diredirect ke halaman yang benar
- [ ] Akun nonaktif tidak bisa login
- [ ] Rate limit aktif setelah 5 percobaan gagal
- [ ] Password reset berhasil via email
- [ ] `must_change_password = true` → redirect ke halaman ganti password
- [ ] Logout menghapus session dan redirect ke login

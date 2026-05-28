# Keamanan Aplikasi — Karcisqu POS

## Tujuan

Mendefinisikan standar keamanan untuk Karcisqu POS V1 — sistem POS single restaurant dengan multi-station dan zone-based routing.

---

## 1. Keamanan Development

- **No Hardcoded Secrets**: Xendit key disimpan di `system_settings` (encrypted), bukan di `.env` atau kode.
- **.gitignore**: Pastikan `.env` ada di `.gitignore` sejak commit pertama.
- **Local DB Sandboxing**: Jangan terhubung ke database production saat development.
- **Xendit Sandbox**: Gunakan Xendit sandbox saat development dan staging.

---

## 2. Zone Routing Security

- **Validasi zone assignment**: Sebelum submit order, validasi bahwa zona meja sudah punya `zone_station_assignments`. Jika belum → tolak order (jangan biarkan order tanpa routing).
- **Kitchen redirect only by Manager**: Endpoint `/kitchen/orders/{id}/redirect` dilindungi permission `kitchen.manage` — hanya Manager.
- **Station isolation**: Kitchen staff A tidak boleh bisa akses data atau channel kitchen station B. Channel `kitchen.station.{id}` diauthorize berdasarkan assignment staf.
- **Redirect log immutable**: `kitchen_order_reassignments` tidak boleh dihapus atau diubah.

---

## 3. Authentication & Session

- **Single guard `web`**: Semua role (super_admin hingga bar) menggunakan satu guard. Diferensiasi via role/permission Spatie.
- **Password hashing**: `bcrypt` cost factor ≥ 10.
- **Password policy**: Minimum 8 karakter untuk semua role.
- **Rate limiting**: 5 percobaan login gagal per 15 menit per IP.
- **Session**: Cookie httpOnly, secure di production HTTPS.
- **CSRF**: Inertia form otomatis sertakan CSRF token.

---

## 4. Authorization & RBAC

- **Spatie Laravel Permission**: Setiap route dashboard dilindungi `permission:` middleware.
- **Role hierarchy**: Super Admin > Manager > Kasir/Waiter > Dapur/Bar.
- **EnsureActiveShift**: Kasir tanpa shift aktif diblokir dari semua aksi transaksi.
- **Frontend RBAC**: Elemen yang tidak boleh diakses disembunyikan di frontend, tapi backend tetap source of truth.
- **Waiter zone isolation**: Waiter hanya bisa lihat order dari zona yang di-assign. Divalidasi di query level, bukan hanya UI.

---

## 5. Payment Security (Xendit)

- **Webhook validation**: `POST /api/xendit/callback` validasi `X-CALLBACK-TOKEN` dari `system_settings.xendit_webhook_token`.
- **Idempotent processing**: Cek `xendit_payments.external_id` sebelum proses. Duplikat webhook tidak boleh buat transaksi ganda.
- **Server-side total**: Frontend tidak boleh kirim `total_amount`. Backend hitung dari `order_items` di database.
- **Log semua webhook**: Semua payload Xendit dicatat di `xendit_webhook_logs` sebelum diproses.
- **External ID**: Format `karcisqu-{transaction_id}-{timestamp}` — unique per transaksi.

---

## 6. API & Input Validation

- **Form Request**: Semua input via Laravel Form Request. Gunakan `$request->validated()`.
- **XSS Prevention**: Output user-generated content di-escape via Blade/React. Hindari `{!! !!}`.
- **SQL Injection**: Gunakan Eloquent ORM — tidak ada raw query dengan string concatenation dari input user.
- **File Upload**: Validasi tipe (JPG, PNG, WebP) dan ukuran (max 2MB). Simpan di `storage/app/public/`.

---

## 7. Realtime Security (Reverb)

- **Private channels**: Semua channel (`kitchen.station.{id}`, `bar.station.{id}`, `waiter.zone.{id}`, dll) adalah private channel.
- **Channel authorization di `routes/channels.php`**: Validasi role dan assignment sebelum izinkan subscribe.
- **Tidak ada client broadcast**: Hanya backend yang broadcast event.

---

## 8. Audit Trail

- **Audit log wajib** untuk: cancel order, void transaksi, ubah role, reset password, kitchen redirect, ubah zone assignment, ubah konfigurasi Xendit/pajak.
- **Log isi lengkap**: `user_id`, `role`, `action`, `resource_type`, `resource_id`, `old_value`, `new_value`, `ip_address`.
- **Tidak ada PII di log**: Jangan log data pribadi pelanggan di application log.

---

## 9. Checklist Sebelum Production

- [ ] `.env` tidak ter-commit ke git
- [ ] `APP_ENV=production` dan `APP_DEBUG=false`
- [ ] `APP_URL` adalah URL publik
- [ ] Xendit credential dikonfigurasi di `system_settings`, bukan `.env`
- [ ] HTTPS aktif
- [ ] `php artisan storage:link` sudah dijalankan
- [ ] Semua route dilindungi permission — test manual semua 6 role
- [ ] Reverb channel authorization dikonfigurasi di `routes/channels.php`
- [ ] Supervisor menjalankan `queue:work` dan `reverb:start`
- [ ] Zone routing test lulus: `php artisan test --filter=ZoneRoutingTest`

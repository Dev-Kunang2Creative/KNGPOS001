# 00 - Nonfunctional Requirements

## Purpose

Menetapkan syarat non-fungsional untuk keandalan, keamanan, dan operasional Karcisqu POS.

---

## CRITICAL: Zone Routing Integrity

- Order yang sudah di-submit **tidak boleh kehilangan routing** ke kitchen/bar station
- Jika `zone_station_assignments` belum dikonfigurasi untuk sebuah zona, sistem WAJIB menolak order dengan pesan error yang jelas: "Zona meja belum dikonfigurasi. Hubungi Manager."
- Kitchen redirect harus **atomic** — tidak boleh ada state di mana order tidak ada di station manapun
- Setiap redirect dicatat di `kitchen_order_reassignments` untuk audit trail

---

## Performance

| Metric | Target |
|--------|--------|
| Waktu load halaman POS | < 2 detik |
| Waktu submit order → muncul di kitchen display | < 1 detik (WebSocket) |
| Waktu konfirmasi Xendit webhook → update status POS | < 3 detik |
| Export laporan (background) | < 30 detik |
| Concurrent kasir aktif | Minimal 5 kasir sekaligus tanpa degradasi |

---

## Reliability

- **Pending Transaction**: Jika koneksi kasir putus setelah pembayaran Xendit dikonfirmasi tapi sebelum order tersimpan, sistem harus bisa recover via `pending_transactions`
- **Idempotent Webhook**: Webhook duplikat dari Xendit tidak boleh membuat transaksi ganda
- **Queue Retry**: Print jobs dan sync jobs di-retry maksimal 3 kali jika gagal
- **WebSocket Reconnect**: Frontend harus auto-reconnect ke Reverb jika koneksi WebSocket putus

---

## Security

- Semua route (kecuali login dan self-order) wajib middleware `auth`
- Setiap route dilindungi permission string Spatie
- Kasir tanpa shift aktif diblokir dari semua aksi transaksi (`EnsureActiveShift`)
- Xendit webhook divalidasi via `X-CALLBACK-TOKEN` header
- Xendit credentials disimpan encrypted di `system_settings`
- Semua aksi sensitif dicatat di `audit_logs`
- Tidak ada kalkulasi harga/diskon/pajak di frontend — wajib di backend

---

## Data Integrity

- Total order selalu dihitung ulang di backend saat checkout (tidak percaya nilai dari frontend)
- Soft delete untuk: `orders`, `menu_items`, `users`, `tables`
- `cashier_shifts`: tidak bisa hapus shift yang sudah closed
- `kitchen_order_reassignments`: immutable log, tidak bisa dihapus

---

## Usability

- Kasir: dari pilih meja → order → bayar tunai harus bisa selesai dalam < 60 detik
- Kitchen display: terbaca dari jarak 2 meter, font besar
- Self-order: bisa digunakan tanpa instruksi, mobile-first
- Semua error state ditampilkan dengan pesan yang actionable (bukan generic "Error")

---

## Testing

- Setiap endpoint yang menulis data wajib punya feature test
- Routing test: verifikasi order meja zona A masuk ke kitchen/bar station yang benar
- Redirect test: verifikasi order berpindah station dengan benar dan log tercatat
- Idempotency test: kirim webhook duplikat, pastikan hanya satu transaksi yang dibuat
- SQLite in-memory untuk semua test (bukan MySQL live)

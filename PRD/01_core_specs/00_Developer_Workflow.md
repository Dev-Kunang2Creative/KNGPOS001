# 00 - Developer Workflow

## Purpose

Struktur kerja tim Karcisqu POS agar fitur bisa dikembangkan per modul dengan cepat dan konsisten.

## Canonical Docs Order

Jika ada konflik antar dokumen:
1. `00_PRD_Main_Overview.md` — scope, goals, zone routing architecture, release phases
2. `00_Data_Model.md` — entity, field, enum, relationship, routing logic
3. `00_API_Spec.md` — route Inertia, REST webhook, permission strings
4. `00_Technical_Architecture.md` — deployment, OrderRoutingService, KitchenRedirectService
5. `00_Nonfunctional_Requirements.md` — zone routing integrity, performance, security
6. Feature docs `K*.md` / `A*.md` — detail UX, requirements, acceptance criteria per fitur
7. `00_Test_Plan.md` — regression scope, critical scenarios, release checklist

## Setup Awal

```bash
cp .env.example .env
composer install
npm install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

## Dev Servers (Jalankan Semua Bersamaan)

```bash
npm run dev                  # Vite HMR
php artisan serve            # Laravel server
php artisan reverb:start     # WebSocket server
php artisan queue:work       # Background job worker
```

## Commands Penting

```bash
# Database
php artisan migrate
php artisan migrate:fresh --seed
php artisan db:seed --class=RestaurantSeeder   # Data restoran (zones, stations, menu)
php artisan db:seed --class=StaffSeeder        # Akun staf semua role

# Permission cache (wajib setelah seed)
php artisan permission:cache-reset

# Testing
php artisan test
php artisan test --filter=ZoneRoutingTest      # Test routing order ke station
php artisan test --filter=KitchenRedirectTest  # Test redirect antar station
php artisan test --filter=OrderTest

# Formatting
vendor/bin/pint

# Queue
php artisan queue:work --tries=3
php artisan queue:failed
php artisan queue:retry all
```

## Zone Routing Development Rules

1. **Routing di Service, bukan di Controller** — `OrderRoutingService::routeOrder()` adalah satu-satunya tempat logika routing. Controller hanya panggil service ini.

2. **Selalu validasi zone assignment** sebelum submit order — jika zona meja belum punya assignment, tolak order dengan pesan jelas.

3. **Kitchen redirect atomic** — selalu gunakan `DB::transaction()` di `KitchenRedirectService`. Tidak boleh ada state di mana order tidak ada di station manapun.

4. **WebSocket broadcast per station** — jangan broadcast ke channel global. Gunakan `kitchen.station.{id}` dan `bar.station.{id}`.

5. **Waiter channel per zona** — broadcast ready-for-delivery ke `waiter.zone.{zone_id}`, bukan ke semua waiter.

6. **Log semua reassignment** — setiap perpindahan order antar kitchen station wajib tercatat di `kitchen_order_reassignments`.

## Feature Template

```
Title: [K/A][nomor] Nama Fitur
Objective: Tujuan fitur
Scope: Termasuk / tidak termasuk
Zone/Station Awareness: Apakah fitur ini zone-aware?
Functional Requirements: Daftar requirement
API Routes: Route + permission
Data Model Impact: Tabel/kolom baru
UI Components: Halaman dan komponen
Acceptance Criteria: Given/When/Then (termasuk routing test)
Testing Checklist: Skenario test
```

## Branching

- `feature/<K-atau-A><nomor>-nama-singkat`
- `fix/<kode-issue>`
- Contoh: `feature/A8-zone-management`, `fix/K4-kitchen-redirect-broadcast`

## Definition of Done

- [ ] Fitur berfungsi sesuai acceptance criteria
- [ ] Zone routing test lulus (jika fitur melibatkan order atau station)
- [ ] Feature test lulus, termasuk edge case
- [ ] Permission guard aktif di route
- [ ] Manual test semua role yang relevan di staging
- [ ] `vendor/bin/pint` bersih
- [ ] Docs diperbarui jika ada perubahan schema atau API

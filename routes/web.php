<?php

use App\Http\Controllers\Bar\BarDisplayController;
use App\Http\Controllers\Cashier\ShiftController;
use App\Http\Controllers\Kitchen\KitchenDisplayController;
use App\Http\Controllers\Manager\AuditLogController;
use App\Http\Controllers\Manager\DashboardController;
use App\Http\Controllers\Manager\MenuController;
use App\Http\Controllers\Manager\ReportController;
use App\Http\Controllers\Manager\TableQrController;
use App\Http\Controllers\Manager\ZoneStationController;
use App\Http\Controllers\Pos\OrderController;
use App\Http\Controllers\Pos\PaymentController;
use App\Http\Controllers\Restaurant\RestaurantController;
use App\Http\Controllers\Restaurant\RestaurantStaffController;
use App\Http\Controllers\SelfOrderController;
use App\Http\Controllers\Settings\SystemSettingsController;
use App\Http\Controllers\Waiter\WaiterOrderController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

// ─── Self-Order (Public, no auth) ────────────────────────────
Route::get('s/{qr_token}', [SelfOrderController::class, 'show'])->name('self-order.show');
Route::get('s/{qr_token}/menu', [SelfOrderController::class, 'menu'])->name('self-order.menu');
Route::post('s/{qr_token}/orders', [SelfOrderController::class, 'checkout'])->name('self-order.checkout');
Route::get('s/{qr_token}/status/{selfOrder}', [SelfOrderController::class, 'status'])->name('self-order.status');
Route::post('s/{qr_token}/status/{selfOrder}/payments/{payment}/simulate', [SelfOrderController::class, 'simulatePayment'])->name('self-order.payment.simulate');
Route::post('s/{qr_token}/status/{selfOrder}/refresh', [SelfOrderController::class, 'refreshPayment'])->name('self-order.payment.refresh');

// ─── Restaurant Selection (auth but no restaurant required) ──
Route::middleware(['auth'])->group(function () {
    Route::get('restaurants/select', [RestaurantController::class, 'select'])->name('restaurants.select');
    Route::post('restaurants/{restaurant}/switch', [RestaurantController::class, 'switchTo'])->name('restaurants.switch');
    Route::delete('restaurants/{restaurant}', [RestaurantController::class, 'destroy'])->name('restaurants.destroy');
});

// ─── All Restaurant-Scoped Routes ────────────────────────────
Route::middleware(['auth', 'restaurant'])->group(function () {

    // Restaurant CRUD (inside dashboard)
    Route::get('restaurants/create', [RestaurantController::class, 'create'])->name('restaurants.create');
    Route::post('restaurants', [RestaurantController::class, 'store'])->name('restaurants.store');
    Route::get('restaurant/edit', [RestaurantController::class, 'edit'])->name('restaurants.edit');
    Route::put('restaurant', [RestaurantController::class, 'update'])->name('restaurants.update');

    // Dashboard
    Route::middleware(['permission:dashboard.view'])->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
    });

    // POS
    Route::middleware(['permission:pos.view', 'active.shift'])->group(function () {
        Route::get('pos', [OrderController::class, 'index'])->name('pos.index');
    });

    Route::middleware(['permission:pos.create', 'active.shift'])->group(function () {
        Route::post('pos/orders', [OrderController::class, 'store'])->name('pos.orders.store');
        Route::post('pos/orders/{order}/items', [OrderController::class, 'addItems'])->name('pos.orders.items.store');
        Route::post('pos/orders/{order}/items/submit', [OrderController::class, 'addItemsAndSubmit'])->name('pos.orders.items.submit');
        Route::post('pos/orders/{order}/submit', [OrderController::class, 'submit'])->name('pos.orders.submit');
        Route::get('pos/orders/{order}/station-ticket', [OrderController::class, 'stationTicket'])->name('pos.orders.station-ticket');
        Route::post('pos/self-orders/{selfOrder}/approve', [OrderController::class, 'approveSelfOrder'])->name('pos.self-orders.approve');
        Route::post('pos/self-orders/{selfOrder}/reject', [OrderController::class, 'rejectSelfOrder'])->name('pos.self-orders.reject');
        Route::post('pos/self-orders/{selfOrder}/receipt-printed', [OrderController::class, 'markSelfOrderReceiptPrinted'])->name('pos.self-orders.receipt-printed');
    });

    Route::middleware(['permission:pos.create', 'permission:pos.checkout', 'active.shift'])->group(function () {
        Route::post('pos/orders/close-bill', [OrderController::class, 'closeBill'])->name('pos.orders.close-bill');
    });

    Route::middleware(['permission:pos.checkout', 'active.shift'])->group(function () {
        Route::post('pos/orders/{order}/pay', [PaymentController::class, 'cash'])->name('pos.orders.pay');
        Route::post('pos/orders/{order}/xendit', [PaymentController::class, 'xendit'])->name('pos.orders.xendit');
        Route::post('pos/orders/{order}/xendit/{payment}/simulate', [PaymentController::class, 'simulateXendit'])->name('pos.orders.xendit.simulate');
        Route::get('pos/xendit/{payment}', [PaymentController::class, 'show'])->name('pos.xendit.show');
        Route::get('pos/xendit/{payment}/success', [PaymentController::class, 'success'])->name('pos.xendit.success');
        Route::get('pos/transactions/{transaction}/receipt', [OrderController::class, 'receipt'])->name('pos.transactions.receipt');
    });

    // Kitchen / Bar / Waiter
    Route::middleware(['permission:kitchen.view'])->group(function () {
        Route::get('kitchen', [KitchenDisplayController::class, 'index'])->name('kitchen.index');
    });

    Route::middleware(['permission:bar.view'])->group(function () {
        Route::get('bar', [BarDisplayController::class, 'index'])->name('bar.index');
    });

    Route::middleware(['permission:waiter.view'])->group(function () {
        Route::get('orders', [WaiterOrderController::class, 'index'])->name('waiter.orders.index');
    });

    Route::middleware(['permission:waiter.update'])->group(function () {
        Route::post('waiter/orders/{order}/deliver', [WaiterOrderController::class, 'deliverOrder'])->name('waiter.orders.deliver');
        Route::patch('waiter/tables/{table}/status', [WaiterOrderController::class, 'toggleTableStatus'])->name('waiter.tables.status');
    });

    // Zone & Station Management
    Route::middleware(['permission:zones.manage'])->group(function () {
        Route::get('zones', [ZoneStationController::class, 'index'])->name('zones.index');
        Route::patch('zones/layout', [ZoneStationController::class, 'saveLayout'])->name('zones.layout.save');
        Route::post('table-types', [ZoneStationController::class, 'storeTableType'])->name('table-types.store');
        Route::put('table-types/{tableType}', [ZoneStationController::class, 'updateTableType'])->name('table-types.update');
        Route::delete('table-types/{tableType}', [ZoneStationController::class, 'destroyTableType'])->name('table-types.destroy');
        Route::get('zones/create', [ZoneStationController::class, 'create'])->name('zones.create');
        Route::get('zones/{zone}/edit', [ZoneStationController::class, 'edit'])->name('zones.edit');
        Route::post('zones', [ZoneStationController::class, 'storeZone'])->name('zones.store');
        Route::put('zones/{zone}', [ZoneStationController::class, 'updateZone'])->name('zones.update');
        Route::delete('zones/{zone}', [ZoneStationController::class, 'destroyZone'])->name('zones.destroy');
        Route::put('zones/{zone}/assignment', [ZoneStationController::class, 'updateAssignment'])->name('zones.assignment.update');
        Route::post('zones/{zone}/waiters', [ZoneStationController::class, 'assignWaiter'])->name('zones.waiters.store');
        Route::delete('zones/{zone}/waiters/{user}', [ZoneStationController::class, 'unassignWaiter'])->name('zones.waiters.destroy');

        Route::get('stations/kitchen/create', [ZoneStationController::class, 'createKitchenStation'])->name('stations.kitchen.create');
        Route::post('stations/kitchen', [ZoneStationController::class, 'storeKitchenStation'])->name('stations.kitchen.store');
        Route::get('stations/kitchen/{station}/edit', [ZoneStationController::class, 'editKitchenStation'])->name('stations.kitchen.edit');
        Route::put('stations/kitchen/{station}', [ZoneStationController::class, 'updateKitchenStation'])->name('stations.kitchen.update');
        Route::delete('stations/kitchen/{station}', [ZoneStationController::class, 'destroyKitchenStation'])->name('stations.kitchen.destroy');
        Route::get('stations/bar/create', [ZoneStationController::class, 'createBarStation'])->name('stations.bar.create');
        Route::post('stations/bar', [ZoneStationController::class, 'storeBarStation'])->name('stations.bar.store');
        Route::get('stations/bar/{station}/edit', [ZoneStationController::class, 'editBarStation'])->name('stations.bar.edit');
        Route::put('stations/bar/{station}', [ZoneStationController::class, 'updateBarStation'])->name('stations.bar.update');
        Route::delete('stations/bar/{station}', [ZoneStationController::class, 'destroyBarStation'])->name('stations.bar.destroy');
    });

    // Reports
    Route::middleware(['permission:reports.view'])->group(function () {
        Route::get('reports/kasir', [ReportController::class, 'cashier'])->name('reports.cashier');
    });

    Route::middleware(['permission:reports.export'])->group(function () {
        Route::post('reports/kasir/export', [ReportController::class, 'exportCashier'])->name('reports.cashier.export');
    });

    // Staff Management (replaces old Users routes)
    Route::middleware(['permission:users.view'])->group(function () {
        Route::get('users', [RestaurantStaffController::class, 'index'])->name('users.index');
    });

    Route::middleware(['permission:users.manage'])->group(function () {
        Route::post('users', [RestaurantStaffController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [RestaurantStaffController::class, 'update'])->name('users.update');
        Route::post('users/{user}/reset-password', [RestaurantStaffController::class, 'resetPassword'])->name('users.reset-password');
        Route::patch('users/{user}/status', [RestaurantStaffController::class, 'updateStatus'])->name('users.status');
        Route::delete('users/{user}', [RestaurantStaffController::class, 'destroy'])->name('users.destroy');
    });

    // Menu Management
    Route::middleware(['permission:menu.view'])->group(function () {
        Route::get('menu', [MenuController::class, 'index'])->name('menu.index');
    });

    Route::middleware(['permission:menu.manage'])->group(function () {
        Route::post('menu/categories', [MenuController::class, 'storeCategory'])->name('menu.categories.store');
        Route::put('menu/categories/{category}', [MenuController::class, 'updateCategory'])->name('menu.categories.update');
        Route::delete('menu/categories/{category}', [MenuController::class, 'destroyCategory'])->name('menu.categories.destroy');
        Route::post('menu/items', [MenuController::class, 'storeItem'])->name('menu.items.store');
        Route::put('menu/items/{item}', [MenuController::class, 'updateItem'])->name('menu.items.update');
        Route::delete('menu/items/{item}', [MenuController::class, 'destroyItem'])->name('menu.items.destroy');
        Route::patch('menu/items/{item}/availability', [MenuController::class, 'updateAvailability'])->name('menu.items.availability');
        Route::post('menu/promotions', [MenuController::class, 'storePromotion'])->name('menu.promotions.store');
        Route::put('menu/promotions/{promotion}', [MenuController::class, 'updatePromotion'])->name('menu.promotions.update');
    });

    // Settings
    Route::middleware(['permission:settings.view'])->group(function () {
        Route::get('settings/system', [SystemSettingsController::class, 'index'])->name('settings.system.index');
    });

    Route::middleware(['permission:settings.manage'])->group(function () {
        Route::get('settings/tables/create', [TableQrController::class, 'create'])->name('settings.tables.create');
        Route::post('settings/tables', [TableQrController::class, 'store'])->name('settings.tables.store');
        Route::get('settings/tables/{table}/edit', [TableQrController::class, 'edit'])->name('settings.tables.edit');
        Route::put('settings/tables/{table}', [TableQrController::class, 'update'])->name('settings.tables.update');
        Route::delete('settings/tables/{table}', [TableQrController::class, 'destroy'])->name('settings.tables.destroy');
        Route::post('settings/tables/{table}/qr', [TableQrController::class, 'regenerateQr'])->name('settings.tables.qr');
        Route::post('settings/tables/generate-all-qr', [TableQrController::class, 'generateAllQr'])->name('settings.tables.qr.generate-all');
        Route::put('settings/system', [SystemSettingsController::class, 'update'])->name('settings.system.update');
        Route::post('settings/printers', [SystemSettingsController::class, 'storePrinter'])->name('settings.printers.store');
        Route::put('settings/printers/{printer}', [SystemSettingsController::class, 'updatePrinter'])->name('settings.printers.update');
    });

    // Audit Logs
    Route::middleware(['permission:audit.view'])->group(function () {
        Route::get('audit-logs', AuditLogController::class)->name('audit-logs.index');
    });

    // Shifts
    Route::middleware(['permission:shift.view'])->group(function () {
        Route::get('shifts', [ShiftController::class, 'index'])->name('shifts.index');
    });

    Route::middleware(['permission:shift.open'])->group(function () {
        Route::post('shifts', [ShiftController::class, 'store'])->name('shifts.store');
    });

    Route::middleware(['permission:shift.close'])->group(function () {
        Route::post('shifts/{shift}/close', [ShiftController::class, 'close'])->name('shifts.close');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

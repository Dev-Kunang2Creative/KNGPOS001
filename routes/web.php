<?php

use App\Http\Controllers\Cashier\ShiftController;
use App\Http\Controllers\Manager\AuditLogController;
use App\Http\Controllers\Manager\DashboardController;
use App\Http\Controllers\Manager\MenuController;
use App\Http\Controllers\Manager\ReportController;
use App\Http\Controllers\Manager\TableQrController;
use App\Http\Controllers\Manager\UserManagementController;
use App\Http\Controllers\Manager\ZoneStationController;
use App\Http\Controllers\Pos\OrderController;
use App\Http\Controllers\Pos\PaymentController;
use App\Http\Controllers\SelfOrderController;
use App\Http\Controllers\Settings\SystemSettingsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::get('s/{qr_token}', [SelfOrderController::class, 'show'])->name('self-order.show');
Route::get('s/{qr_token}/menu', [SelfOrderController::class, 'menu'])->name('self-order.menu');
Route::post('s/{qr_token}/orders', [SelfOrderController::class, 'checkout'])->name('self-order.checkout');
Route::get('s/{qr_token}/status/{order}', [SelfOrderController::class, 'status'])->name('self-order.status');

Route::middleware(['auth', 'permission:dashboard.view'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
});

Route::middleware(['auth', 'permission:pos.view', 'active.shift'])->group(function () {
    Route::get('pos', [OrderController::class, 'index'])->name('pos.index');
});

Route::middleware(['auth', 'permission:pos.create', 'active.shift'])->group(function () {
    Route::post('pos/orders', [OrderController::class, 'store'])->name('pos.orders.store');
    Route::post('pos/orders/{order}/items', [OrderController::class, 'addItems'])->name('pos.orders.items.store');
    Route::post('pos/orders/{order}/items/submit', [OrderController::class, 'addItemsAndSubmit'])->name('pos.orders.items.submit');
    Route::post('pos/orders/{order}/submit', [OrderController::class, 'submit'])->name('pos.orders.submit');
    Route::get('pos/orders/{order}/station-ticket', [OrderController::class, 'stationTicket'])->name('pos.orders.station-ticket');
});

Route::middleware(['auth', 'permission:pos.create', 'permission:pos.checkout', 'active.shift'])->group(function () {
    Route::post('pos/orders/close-bill', [OrderController::class, 'closeBill'])->name('pos.orders.close-bill');
});

Route::middleware(['auth', 'permission:pos.checkout', 'active.shift'])->group(function () {
    Route::post('pos/orders/{order}/pay', [PaymentController::class, 'cash'])->name('pos.orders.pay');
    Route::post('pos/orders/{order}/xendit', [PaymentController::class, 'xendit'])->name('pos.orders.xendit');
    Route::get('pos/transactions/{transaction}/receipt', [OrderController::class, 'receipt'])->name('pos.transactions.receipt');
});

Route::middleware(['auth', 'permission:kitchen.view'])->group(function () {
    Route::get('kitchen', fn () => Inertia::render('dashboard'))->name('kitchen.index');
});

Route::middleware(['auth', 'permission:bar.view'])->group(function () {
    Route::get('bar', fn () => Inertia::render('dashboard'))->name('bar.index');
});

Route::middleware(['auth', 'permission:waiter.view'])->group(function () {
    Route::get('orders', fn () => Inertia::render('dashboard'))->name('waiter.orders.index');
});

Route::middleware(['auth', 'permission:zones.manage'])->group(function () {
    Route::get('zones', [ZoneStationController::class, 'index'])->name('zones.index');
    Route::post('zones', [ZoneStationController::class, 'storeZone'])->name('zones.store');
    Route::put('zones/{zone}', [ZoneStationController::class, 'updateZone'])->name('zones.update');
    Route::delete('zones/{zone}', [ZoneStationController::class, 'destroyZone'])->name('zones.destroy');
    Route::put('zones/{zone}/assignment', [ZoneStationController::class, 'updateAssignment'])->name('zones.assignment.update');
    Route::post('zones/{zone}/waiters', [ZoneStationController::class, 'assignWaiter'])->name('zones.waiters.store');
    Route::delete('zones/{zone}/waiters/{user}', [ZoneStationController::class, 'unassignWaiter'])->name('zones.waiters.destroy');

    Route::post('stations/kitchen', [ZoneStationController::class, 'storeKitchenStation'])->name('stations.kitchen.store');
    Route::put('stations/kitchen/{station}', [ZoneStationController::class, 'updateKitchenStation'])->name('stations.kitchen.update');
    Route::delete('stations/kitchen/{station}', [ZoneStationController::class, 'destroyKitchenStation'])->name('stations.kitchen.destroy');
    Route::post('stations/bar', [ZoneStationController::class, 'storeBarStation'])->name('stations.bar.store');
    Route::put('stations/bar/{station}', [ZoneStationController::class, 'updateBarStation'])->name('stations.bar.update');
    Route::delete('stations/bar/{station}', [ZoneStationController::class, 'destroyBarStation'])->name('stations.bar.destroy');
});

Route::middleware(['auth', 'permission:reports.view'])->group(function () {
    Route::get('reports/kasir', [ReportController::class, 'cashier'])->name('reports.cashier');
});

Route::middleware(['auth', 'permission:reports.export'])->group(function () {
    Route::post('reports/kasir/export', [ReportController::class, 'exportCashier'])->name('reports.cashier.export');
});

Route::middleware(['auth', 'permission:users.view'])->group(function () {
    Route::get('users', [UserManagementController::class, 'index'])->name('users.index');
});

Route::middleware(['auth', 'permission:users.manage'])->group(function () {
    Route::post('users', [UserManagementController::class, 'store'])->name('users.store');
    Route::put('users/{user}', [UserManagementController::class, 'update'])->name('users.update');
    Route::post('users/{user}/reset-password', [UserManagementController::class, 'resetPassword'])->name('users.reset-password');
    Route::patch('users/{user}/status', [UserManagementController::class, 'updateStatus'])->name('users.status');
});

Route::middleware(['auth', 'permission:menu.view'])->group(function () {
    Route::get('menu', [MenuController::class, 'index'])->name('menu.index');
});

Route::middleware(['auth', 'permission:menu.manage'])->group(function () {
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

Route::middleware(['auth', 'permission:settings.view'])->group(function () {
    Route::get('settings/tables', [TableQrController::class, 'index'])->name('settings.tables.index');
    Route::get('settings/system', [SystemSettingsController::class, 'index'])->name('settings.system.index');
});

Route::middleware(['auth', 'permission:settings.manage'])->group(function () {
    Route::post('settings/tables', [TableQrController::class, 'store'])->name('settings.tables.store');
    Route::put('settings/tables/{table}', [TableQrController::class, 'update'])->name('settings.tables.update');
    Route::delete('settings/tables/{table}', [TableQrController::class, 'destroy'])->name('settings.tables.destroy');
    Route::post('settings/tables/{table}/qr', [TableQrController::class, 'regenerateQr'])->name('settings.tables.qr');
    Route::put('settings/system', [SystemSettingsController::class, 'update'])->name('settings.system.update');
    Route::post('settings/printers', [SystemSettingsController::class, 'storePrinter'])->name('settings.printers.store');
    Route::put('settings/printers/{printer}', [SystemSettingsController::class, 'updatePrinter'])->name('settings.printers.update');
});

Route::middleware(['auth', 'permission:audit.view'])->group(function () {
    Route::get('audit-logs', AuditLogController::class)->name('audit-logs.index');
});

Route::middleware(['auth', 'permission:shift.view'])->group(function () {
    Route::get('shifts', [ShiftController::class, 'index'])->name('shifts.index');
});

Route::middleware(['auth', 'permission:shift.open'])->group(function () {
    Route::post('shifts', [ShiftController::class, 'store'])->name('shifts.store');
});

Route::middleware(['auth', 'permission:shift.close'])->group(function () {
    Route::post('shifts/{shift}/close', [ShiftController::class, 'close'])->name('shifts.close');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

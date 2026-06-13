<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manager\TableRequest;
use App\Models\Order;
use App\Models\Table;
use App\Models\TableQrcode;
use App\Models\Zone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TableQrController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('settings/Tables/Create', [
            'zones' => Zone::query()->where('is_active', true)->orderBy('sort_order')->get(),
        ]);
    }

    public function edit(Table $table): Response
    {
        $table->load('activeQrCode');

        return Inertia::render('settings/Tables/Edit', [
            'table' => $table,
            'zones' => Zone::query()->where('is_active', true)->orderBy('sort_order')->get(),
        ]);
    }

    public function store(TableRequest $request): RedirectResponse
    {
        $table = Table::query()->create($request->validated());
        $this->generateQrCode($table);

        return redirect()->route('zones.index')->with('success', 'Meja berhasil dibuat.');
    }

    public function update(TableRequest $request, Table $table): RedirectResponse
    {
        $table->update($request->validated());

        return redirect()->route('zones.index')->with('success', 'Meja berhasil diperbarui.');
    }

    public function destroy(Table $table): RedirectResponse
    {
        if (Order::query()->where('table_id', $table->id)->whereIn('status', ['open', 'submitted'])->exists()) {
            return back()->with('error', 'Meja tidak bisa dihapus karena masih memiliki order aktif.');
        }

        $table->delete();

        return back()->with('success', 'Meja berhasil dihapus.');
    }

    public function generateAllQr(): RedirectResponse
    {
        $tables = Table::query()->whereDoesntHave('activeQrCode')->get();

        foreach ($tables as $table) {
            $this->generateQrCode($table);
        }

        return back()->with('success', $tables->isEmpty()
            ? 'Semua meja sudah punya QR.'
            : $tables->count().' QR meja berhasil dibuat.');
    }

    public function regenerateQr(Table $table): RedirectResponse
    {
        TableQrcode::query()
            ->where('table_id', $table->id)
            ->where('is_active', true)
            ->update(['is_active' => false, 'regenerated_at' => now()]);

        $this->generateQrCode($table, true);

        return back()->with('success', 'QR meja berhasil dibuat ulang.');
    }

    private function generateQrCode(Table $table, bool $regenerated = false): void
    {
        TableQrcode::query()->create([
            'table_id' => $table->id,
            'qr_token' => Str::random(48),
            'is_active' => true,
            'generated_at' => now(),
            'regenerated_at' => $regenerated ? now() : null,
        ]);
    }
}

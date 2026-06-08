<?php

namespace App\Http\Middleware;

use App\Models\Shift;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveShift
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Only enforce shift check for kasir role
        $activeRole = $user->roleInRestaurant(session('active_restaurant_id'));

        if ($activeRole !== 'kasir') {
            return $next($request);
        }

        $hasActiveShift = Shift::query()
            ->where('kasir_id', $user->id)
            ->where('status', 'open')
            ->exists();

        if (! $hasActiveShift) {
            if ($request->expectsJson()) {
                abort(403, 'Kasir wajib membuka shift aktif sebelum melakukan transaksi.');
            }

            return redirect()->route('shifts.index')->with('error', 'Buka shift aktif sebelum mengakses POS.');
        }

        return $next($request);
    }
}

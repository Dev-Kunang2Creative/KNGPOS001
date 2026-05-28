<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use App\Models\Shift;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $request->user()->forceFill(['last_login_at' => now()])->save();

        return redirect()->intended($this->redirectPathForRole($request->user()->role));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    private function redirectPathForRole(string $role): string
    {
        return match ($role) {
            'super_admin', 'manager' => route('dashboard', absolute: false),
            'kasir' => Shift::query()->where('kasir_id', auth()->id())->where('status', 'open')->exists()
                ? route('pos.index', absolute: false)
                : route('shifts.index', absolute: false),
            'waiter' => route('waiter.orders.index', absolute: false),
            'dapur' => route('kitchen.index', absolute: false),
            'bar' => route('bar.index', absolute: false),
            default => route('dashboard', absolute: false),
        };
    }
}

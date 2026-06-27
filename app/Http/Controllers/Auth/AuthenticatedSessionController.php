<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\RestaurantUser;
use App\Models\Shift;
use App\Services\RestaurantContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
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

        $user = $request->user();

        // Super admin → go to restaurant selection or dashboard
        if ($user->isSuperAdmin()) {
            return redirect()->intended(route('restaurants.select', absolute: false));
        }

        // Get user's restaurants
        $restaurantUsers = RestaurantUser::query()
            ->where('user_id', $user->id)
            ->get();

        if ($restaurantUsers->isEmpty()) {
            // User has no restaurant assignments → show error
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('status', 'Akun Anda belum ditugaskan ke restoran manapun.');
        }

        if ($restaurantUsers->count() === 1) {
            // Auto-select the only restaurant
            $ru = $restaurantUsers->first();
            app(RestaurantContext::class)->persist($ru->restaurant_id);

            return redirect()->intended($this->redirectPathForRole($ru->role));
        }

        // Multiple restaurants → go to restaurant selector
        return redirect()->intended(route('restaurants.select', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        app(RestaurantContext::class)->clear();

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    private function redirectPathForRole(string $role): string
    {
        return match ($role) {
            'super_admin', 'manager' => route('dashboard', absolute: false),
            'kasir' => Shift::query()
                ->where('kasir_id', auth()->id())
                ->where('status', 'open')
                ->exists()
                ? route('pos.index', absolute: false)
                : route('shifts.index', absolute: false),
            'waiter' => route('waiter.orders.index', absolute: false),
            'dapur' => route('kitchen.index', absolute: false),
            'bar' => route('bar.index', absolute: false),
            default => route('dashboard', absolute: false),
        };
    }
}

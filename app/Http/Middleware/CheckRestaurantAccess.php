<?php

namespace App\Http\Middleware;

use App\Models\Restaurant;
use App\Models\RestaurantUser;
use App\Services\RestaurantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRestaurantAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        // Allow restaurant creation routes without active restaurant context
        $isRestaurantCreation = $request->is('restaurants/create', 'restaurants');

        // Super Admin bypasses restaurant check — they can access all
        if ($user->isSuperAdmin()) {
            $activeId = session('active_restaurant_id');

            if ($activeId) {
                app(RestaurantContext::class)->set($activeId);
            } elseif (! $isRestaurantCreation) {
                // Super admin without restaurant — redirect to select/create
                return redirect()->route('restaurants.select');
            }

            return $next($request);
        }

        $activeRestaurantId = session('active_restaurant_id');

        // If no active restaurant selected → redirect to restaurant selector
        if (! $activeRestaurantId) {
            // Auto-select if user only has access to one restaurant
            $restaurantIds = RestaurantUser::query()
                ->where('user_id', $user->id)
                ->pluck('restaurant_id');

            if ($restaurantIds->count() === 1) {
                $activeRestaurantId = $restaurantIds->first();
                session(['active_restaurant_id' => $activeRestaurantId]);
            } else {
                return redirect()->route('restaurants.select');
            }
        }

        // Validate user has access to this restaurant
        $hasAccess = RestaurantUser::query()
            ->where('restaurant_id', $activeRestaurantId)
            ->where('user_id', $user->id)
            ->exists();

        if (! $hasAccess) {
            session()->forget('active_restaurant_id');

            return redirect()->route('restaurants.select')
                ->with('error', 'Anda tidak memiliki akses ke restoran tersebut.');
        }

        // Validate restaurant exists and is active
        $restaurant = Restaurant::query()
            ->where('id', $activeRestaurantId)
            ->where('status', 'active')
            ->first();

        if (! $restaurant) {
            session()->forget('active_restaurant_id');

            return redirect()->route('restaurants.select')
                ->with('error', 'Restoran tidak ditemukan atau tidak aktif.');
        }

        // Set the restaurant context for this request
        app(RestaurantContext::class)->set($activeRestaurantId);

        return $next($request);
    }
}

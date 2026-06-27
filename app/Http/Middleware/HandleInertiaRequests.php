<?php

namespace App\Http\Middleware;

use App\Models\Restaurant;
use App\Models\Shift;
use App\Services\RestaurantContext;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();
        $activeRestaurantId = session('active_restaurant_id');
        $activeRestaurant = $activeRestaurantId
            ? Restaurant::withoutGlobalScopes()->find($activeRestaurantId)
            : null;

        return array_merge(parent::share($request), [
            ...parent::share($request),
            'name' => config('app.name'),
            'appUrl' => config('app.url'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user?->only(['id', 'name', 'email']),
                'permissions' => $user?->getAllPermissions()->pluck('name')->values() ?? [],
                'activeRole' => $user?->roleInRestaurant($activeRestaurantId),
                'isSuperAdmin' => $user?->isSuperAdmin() ?? false,
            ],
            'restaurant' => $activeRestaurant ? [
                'id' => $activeRestaurant->id,
                'name' => $activeRestaurant->name,
                'slug' => $activeRestaurant->slug,
                'logo_url' => $activeRestaurant->logo_url,
                'receipt_header' => $activeRestaurant->receipt_header,
                'receipt_footer' => $activeRestaurant->receipt_footer,
                'tax_percentage' => $activeRestaurant->tax_percentage,
                'tax_is_active' => $activeRestaurant->tax_is_active,
                'service_charge_percentage' => $activeRestaurant->service_charge_percentage,
                'service_charge_is_active' => $activeRestaurant->service_charge_is_active,
                'currency' => $activeRestaurant->currency,
            ] : null,
            'restaurants' => $user ? $this->userRestaurants($user) : [],
            'activeShift' => $user
                ? Shift::query()
                    ->withoutGlobalScope('restaurant')
                    ->where('kasir_id', $user->id)
                    ->where('status', 'open')
                    ->latest('opened_at')
                    ->first()?->only(['id', 'opened_at', 'opening_cash'])
                : null,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'info' => $request->session()->get('info'),
            ],
        ]);
    }

    /**
     * Get the list of restaurants accessible by the user (for the switcher).
     */
    private function userRestaurants($user): array
    {
        if ($user->isSuperAdmin()) {
            return Restaurant::withoutGlobalScopes()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'logo_path'])
                ->toArray();
        }

        return $user->restaurants()
            ->where('restaurants.status', 'active')
            ->orderBy('restaurants.name')
            ->get(['restaurants.id', 'restaurants.name', 'restaurants.slug', 'restaurants.logo_path'])
            ->toArray();
    }
}

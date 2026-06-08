<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\RestaurantUser;
use App\Services\RestaurantContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RestaurantController extends Controller
{
    /**
     * Restaurant selector page.
     */
    public function select(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        // Get restaurants accessible by the user
        if ($user->isSuperAdmin()) {
            $restaurants = Restaurant::withoutGlobalScopes()
                ->where('status', 'active')
                ->orderBy('name')
                ->get();
        } else {
            $restaurants = $user->restaurants()
                ->where('restaurants.status', 'active')
                ->orderBy('restaurants.name')
                ->get();
        }

        // Auto-select if only one restaurant
        if ($restaurants->count() === 1) {
            return $this->performSwitch($restaurants->first()->id);
        }

        // No restaurants → show create page for managers, error for others
        if ($restaurants->isEmpty()) {
            if ($user->isSuperAdmin() || $user->hasRole('manager')) {
                return redirect()->route('restaurants.create')
                    ->with('info', 'Belum ada restoran. Buat restoran pertama Anda.');
            }

            abort(403, 'Anda belum ditugaskan ke restoran manapun. Hubungi manager Anda.');
        }

        return Inertia::render('Restaurants/Select', [
            'restaurants' => $restaurants,
        ]);
    }

    /**
     * Switch to a specific restaurant.
     */
    public function switchTo(Request $request, int $restaurant): RedirectResponse
    {
        $user = $request->user();

        // Validate access
        if (! $user->isSuperAdmin()) {
            $hasAccess = RestaurantUser::query()
                ->where('restaurant_id', $restaurant)
                ->where('user_id', $user->id)
                ->exists();

            if (! $hasAccess) {
                return redirect()->route('restaurants.select')
                    ->with('error', 'Anda tidak memiliki akses ke restoran tersebut.');
            }
        }

        return $this->performSwitch($restaurant);
    }

    /**
     * Create restaurant form.
     */
    public function create(): Response
    {
        return Inertia::render('Restaurants/Create');
    }

    /**
     * Store a new restaurant.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'tax_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_is_active' => ['nullable', 'boolean'],
            'service_charge_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'service_charge_is_active' => ['nullable', 'boolean'],
            'currency' => ['nullable', 'string', 'max:10'],
            'receipt_header' => ['nullable', 'string', 'max:1000'],
            'receipt_footer' => ['nullable', 'string', 'max:1000'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        $slug = Str::slug($validated['name']);
        $originalSlug = $slug;
        $counter = 1;
        while (Restaurant::withoutGlobalScopes()->where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter++;
        }

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('restaurants', 'public');
        }

        $restaurant = Restaurant::withoutGlobalScopes()->create([
            ...$validated,
            'slug' => $slug,
            'logo_path' => $logoPath,
            'status' => 'active',
            'owner_id' => $request->user()->id,
        ]);

        // Assign the creator as manager
        RestaurantUser::query()->create([
            'restaurant_id' => $restaurant->id,
            'user_id' => $request->user()->id,
            'role' => 'manager',
            'is_primary' => true,
        ]);

        // Auto-switch to the new restaurant
        return $this->performSwitch($restaurant->id)
            ->with('success', 'Restoran berhasil dibuat.');
    }

    /**
     * Edit restaurant settings.
     */
    public function edit(Request $request): Response
    {
        $restaurantId = session('active_restaurant_id');
        $restaurant = Restaurant::withoutGlobalScopes()->findOrFail($restaurantId);

        return Inertia::render('Restaurants/Edit', [
            'restaurantData' => $restaurant,
        ]);
    }

    /**
     * Update restaurant settings.
     */
    public function update(Request $request): RedirectResponse
    {
        $restaurantId = session('active_restaurant_id');
        $restaurant = Restaurant::withoutGlobalScopes()->findOrFail($restaurantId);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'tax_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_is_active' => ['required', 'boolean'],
            'service_charge_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'service_charge_is_active' => ['required', 'boolean'],
            'currency' => ['nullable', 'string', 'max:10'],
            'receipt_header' => ['nullable', 'string', 'max:1000'],
            'receipt_footer' => ['nullable', 'string', 'max:1000'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('logo')) {
            if ($restaurant->logo_path) {
                Storage::disk('public')->delete($restaurant->logo_path);
            }
            $validated['logo_path'] = $request->file('logo')->store('restaurants', 'public');
        }

        unset($validated['logo']);
        $restaurant->update($validated);

        return back()->with('success', 'Pengaturan restoran berhasil diperbarui.');
    }

    /**
     * Perform the actual switch and redirect.
     */
    private function performSwitch(int $restaurantId): RedirectResponse
    {
        app(RestaurantContext::class)->persist($restaurantId);

        return redirect()->route('dashboard');
    }
}

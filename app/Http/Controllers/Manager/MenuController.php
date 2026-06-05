<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manager\MenuCategoryRequest;
use App\Http\Requests\Manager\MenuItemRequest;
use App\Http\Requests\Manager\MenuPromotionRequest;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuPromotion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Menu/Index', [
            'categories' => MenuCategory::query()->withCount('activeItems')->orderBy('sort_order')->get(),
            'items' => MenuItem::query()->with('category:id,name')->orderBy('sort_order')->get(),
            'promotions' => MenuPromotion::query()->latest('valid_from')->get(),
        ]);
    }

    public function storeCategory(MenuCategoryRequest $request): RedirectResponse
    {
        MenuCategory::query()->create($this->categoryData($request));

        return back()->with('success', 'Kategori menu berhasil dibuat.');
    }

    public function updateCategory(MenuCategoryRequest $request, MenuCategory $category): RedirectResponse
    {
        $category->update($this->categoryData($request, $category));

        return back()->with('success', 'Kategori menu berhasil diperbarui.');
    }

    public function destroyCategory(MenuCategory $category): RedirectResponse
    {
        if ($category->activeItems()->exists()) {
            return back()->with('error', 'Kategori tidak bisa dihapus karena masih memiliki menu aktif.');
        }

        $category->delete();

        return back()->with('success', 'Kategori menu berhasil dihapus.');
    }

    public function storeItem(MenuItemRequest $request): RedirectResponse
    {
        MenuItem::query()->create($this->itemData($request));

        return back()->with('success', 'Menu item berhasil dibuat.');
    }

    public function updateItem(MenuItemRequest $request, MenuItem $item): RedirectResponse
    {
        $item->update($this->itemData($request, $item));

        return back()->with('success', 'Menu item berhasil diperbarui.');
    }

    public function destroyItem(MenuItem $item): RedirectResponse
    {
        $item->delete();

        return back()->with('success', 'Menu item berhasil dihapus.');
    }

    public function updateAvailability(Request $request, MenuItem $item): RedirectResponse
    {
        $validated = $request->validate(['is_available' => ['required', 'boolean']]);
        $item->update($validated);

        return back()->with('success', 'Ketersediaan menu diperbarui.');
    }

    public function storePromotion(MenuPromotionRequest $request): RedirectResponse
    {
        MenuPromotion::query()->create($request->validated());

        return back()->with('success', 'Promo berhasil dibuat.');
    }

    public function updatePromotion(MenuPromotionRequest $request, MenuPromotion $promotion): RedirectResponse
    {
        $promotion->update($request->validated());

        return back()->with('success', 'Promo berhasil diperbarui.');
    }

    private function categoryData(MenuCategoryRequest $request, ?MenuCategory $category = null): array
    {
        return $request->validated();
    }

    private function itemData(MenuItemRequest $request, ?MenuItem $item = null): array
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            if ($item?->image_path) {
                Storage::disk('public')->delete($item->image_path);
            }

            $data['image_path'] = $request->file('image')->store('menu', 'public');
        } elseif ($item) {
            $data['image_path'] = $item->image_path;
        }

        unset($data['image']);

        return $data;
    }
}

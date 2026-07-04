<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manager\MenuCategoryRequest;
use App\Http\Requests\Manager\MenuItemRequest;
use App\Http\Requests\Manager\MenuPromotionRequest;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuPromotion;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function index(): Response
    {
        return Inertia::render('Menu/Index', [
            'categories' => MenuCategory::query()->with('parent:id,name')->withCount('activeItems')->orderBy('sort_order')->get(),
            'items' => MenuItem::query()->with(['category:id,name', 'addons'])->orderBy('sort_order')->get(),
            'promotions' => MenuPromotion::query()->latest('valid_from')->get(),
        ]);
    }

    public function storeCategory(MenuCategoryRequest $request): RedirectResponse
    {
        $category = MenuCategory::query()->create($this->categoryData($request));

        $this->auditLogger->log('menu.category.create', 'MenuCategory', $category->id, null, $category->only(['name', 'parent_id', 'is_active']));

        return back()->with('success', 'Kategori menu berhasil dibuat.');
    }

    public function updateCategory(MenuCategoryRequest $request, MenuCategory $category): RedirectResponse
    {
        $before = $category->only(['name', 'parent_id', 'is_active']);
        $category->update($this->categoryData($request, $category));

        $this->auditLogger->log('menu.category.update', 'MenuCategory', $category->id, $before, $category->only(['name', 'parent_id', 'is_active']));

        return back()->with('success', 'Kategori menu berhasil diperbarui.');
    }

    public function destroyCategory(MenuCategory $category): RedirectResponse
    {
        if ($category->activeItems()->exists()) {
            return back()->with('error', 'Kategori tidak bisa dihapus karena masih memiliki menu aktif.');
        }

        $snapshot = $category->only(['name', 'parent_id']);
        $categoryId = $category->id;
        $category->delete();

        $this->auditLogger->log('menu.category.delete', 'MenuCategory', $categoryId, $snapshot, null);

        return back()->with('success', 'Kategori menu berhasil dihapus.');
    }

    public function storeItem(MenuItemRequest $request): RedirectResponse
    {
        $item = MenuItem::query()->create($this->itemData($request));

        if ($request->has('addons')) {
            $this->syncAddons($item, $request->input('addons'));
        }

        $this->auditLogger->log('menu.item.create', 'MenuItem', $item->id, null, $item->only(['name', 'price', 'category_id', 'is_available']));

        return back()->with('success', 'Menu item berhasil dibuat.');
    }

    public function updateItem(MenuItemRequest $request, MenuItem $item): RedirectResponse
    {
        $before = $item->only(['name', 'price', 'category_id', 'is_available']);
        $item->update($this->itemData($request, $item));

        if ($request->has('addons')) {
            $this->syncAddons($item, $request->input('addons'));
        }

        $this->auditLogger->log('menu.item.update', 'MenuItem', $item->id, $before, $item->only(['name', 'price', 'category_id', 'is_available']));

        return back()->with('success', 'Menu item berhasil diperbarui.');
    }

    public function destroyItem(MenuItem $item): RedirectResponse
    {
        $snapshot = $item->only(['name', 'price', 'category_id']);
        $itemId = $item->id;
        $item->delete();

        $this->auditLogger->log('menu.item.delete', 'MenuItem', $itemId, $snapshot, null);

        return back()->with('success', 'Menu item berhasil dihapus.');
    }

    public function updateAvailability(Request $request, MenuItem $item): RedirectResponse
    {
        $validated = $request->validate(['is_available' => ['required', 'boolean']]);
        $before = ['is_available' => $item->is_available];
        $item->update($validated);

        $this->auditLogger->log('menu.item.availability', 'MenuItem', $item->id, $before, ['is_available' => $item->is_available]);

        return back()->with('success', 'Ketersediaan menu diperbarui.');
    }

    public function storePromotion(MenuPromotionRequest $request): RedirectResponse
    {
        $promotion = MenuPromotion::query()->create($request->validated());

        $this->auditLogger->log('menu.promotion.create', 'MenuPromotion', $promotion->id, null, $promotion->only(['name', 'type', 'value', 'is_active']));

        return back()->with('success', 'Promo berhasil dibuat.');
    }

    public function updatePromotion(MenuPromotionRequest $request, MenuPromotion $promotion): RedirectResponse
    {
        $before = $promotion->only(['name', 'type', 'value', 'is_active']);
        $promotion->update($request->validated());

        $this->auditLogger->log('menu.promotion.update', 'MenuPromotion', $promotion->id, $before, $promotion->only(['name', 'type', 'value', 'is_active']));

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

        unset($data['image'], $data['addons']);

        return $data;
    }

    private function syncAddons(MenuItem $item, array $addons): void
    {
        $addonIds = collect($addons)->pluck('id')->filter()->toArray();
        $item->addons()->whereNotIn('id', $addonIds)->delete();

        foreach ($addons as $addonData) {
            if (isset($addonData['id']) && $addonData['id']) {
                $item->addons()->where('id', $addonData['id'])->update([
                    'name' => $addonData['name'],
                    'price' => $addonData['price'],
                    'is_active' => $addonData['is_active'] ?? true,
                ]);
            } else {
                $item->addons()->create([
                    'name' => $addonData['name'],
                    'price' => $addonData['price'],
                    'is_active' => $addonData['is_active'] ?? true,
                ]);
            }
        }
    }
}

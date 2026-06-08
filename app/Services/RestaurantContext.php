<?php

namespace App\Services;

use App\Models\Restaurant;

class RestaurantContext
{
    protected ?int $restaurantId = null;

    /**
     * Get the active restaurant ID.
     * Prioritizes explicitly set value, then falls back to session.
     */
    public function id(): ?int
    {
        return $this->restaurantId ?? session('active_restaurant_id');
    }

    /**
     * Set the active restaurant ID (for the current request lifecycle).
     */
    public function set(int $id): void
    {
        $this->restaurantId = $id;
    }

    /**
     * Persist the active restaurant to session.
     */
    public function persist(int $id): void
    {
        $this->restaurantId = $id;
        session(['active_restaurant_id' => $id]);
    }

    /**
     * Get the active Restaurant model.
     */
    public function restaurant(): ?Restaurant
    {
        $id = $this->id();

        return $id ? Restaurant::find($id) : null;
    }

    /**
     * Clear the active restaurant context.
     */
    public function clear(): void
    {
        $this->restaurantId = null;
        session()->forget('active_restaurant_id');
    }
}

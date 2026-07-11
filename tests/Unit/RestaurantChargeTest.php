<?php

namespace Tests\Unit;

use App\Models\Restaurant;
use PHPUnit\Framework\TestCase;

class RestaurantChargeTest extends TestCase
{
    public function test_percentage_charges_apply_to_subtotal(): void
    {
        $restaurant = new Restaurant([
            'service_charge_is_active' => true,
            'service_charge_type' => 'percentage',
            'service_charge_percentage' => 10,
            'tax_is_active' => true,
            'tax_type' => 'percentage',
            'tax_percentage' => 11,
        ]);

        $charges = $restaurant->chargesFor(100000);

        // service = 10% of 100000; tax = 11% of (100000 + 10000)
        $this->assertSame(10000.0, $charges['service_charge']);
        $this->assertSame(12100.0, $charges['tax']);
        $this->assertSame(122100.0, $charges['total']);
    }

    public function test_nominal_charges_are_flat_amounts(): void
    {
        $restaurant = new Restaurant([
            'service_charge_is_active' => true,
            'service_charge_type' => 'nominal',
            'service_charge_percentage' => 5000,
            'tax_is_active' => true,
            'tax_type' => 'nominal',
            'tax_percentage' => 3000,
        ]);

        $charges = $restaurant->chargesFor(100000);

        $this->assertSame(5000.0, $charges['service_charge']);
        $this->assertSame(3000.0, $charges['tax']);
        $this->assertSame(108000.0, $charges['total']);
    }

    public function test_inactive_charges_are_zero(): void
    {
        $restaurant = new Restaurant([
            'service_charge_is_active' => false,
            'service_charge_type' => 'percentage',
            'service_charge_percentage' => 10,
            'tax_is_active' => false,
            'tax_type' => 'nominal',
            'tax_percentage' => 3000,
        ]);

        $charges = $restaurant->chargesFor(100000);

        $this->assertSame(0.0, $charges['service_charge']);
        $this->assertSame(0.0, $charges['tax']);
        $this->assertSame(100000.0, $charges['total']);
    }
}

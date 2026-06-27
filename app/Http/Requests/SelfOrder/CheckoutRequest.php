<?php

namespace App\Http\Requests\SelfOrder;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:100'],
            'customer_email' => ['required', 'email', 'max:255'],
            'payment_preference' => ['required', 'in:qris,cashier,online'],
            'bill_type' => ['required', 'in:open,close'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
            'items.*.addons' => ['nullable', 'array'],
            'items.*.addons.*' => ['integer', 'exists:menu_item_addons,id'],
        ];
    }
}

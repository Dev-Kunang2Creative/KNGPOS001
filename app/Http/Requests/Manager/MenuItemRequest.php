<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'exists:menu_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'print_to' => ['required', Rule::in(['kasir', 'kitchen', 'bar', 'kitchen_bar'])],
            'is_available' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'addons' => ['nullable', 'array'],
            'addons.*.id' => ['nullable', 'integer', 'exists:menu_item_addons,id'],
            'addons.*.name' => ['required', 'string', 'max:255'],
            'addons.*.price' => ['required', 'numeric', 'min:0'],
            'addons.*.is_active' => ['required', 'boolean'],
        ];
    }
}

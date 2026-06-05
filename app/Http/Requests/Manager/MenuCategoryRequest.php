<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;

class MenuCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}

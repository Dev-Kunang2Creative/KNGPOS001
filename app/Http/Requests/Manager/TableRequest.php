<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'capacity' => ['required', 'integer', 'min:1'],
            'zone_id' => ['required', 'exists:zones,id'],
            'position_x' => ['required', 'integer', 'min:0'],
            'position_y' => ['required', 'integer', 'min:0'],
            'status' => ['required', Rule::in(['available', 'occupied', 'open_bill', 'reserved', 'blocked'])],
            'self_order_enabled' => ['required', 'boolean'],
        ];
    }
}

<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveTableLayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'tables' => ['required', 'array', 'min:1'],
            'tables.*.id' => ['required', 'integer', 'exists:tables,id'],
            'tables.*.position_x' => ['required', 'integer', 'min:0', 'max:5000'],
            'tables.*.position_y' => ['required', 'integer', 'min:0', 'max:5000'],
            'tables.*.width' => ['required', 'integer', 'min:40', 'max:600'],
            'tables.*.height' => ['required', 'integer', 'min:40', 'max:600'],
            'tables.*.shape' => ['required', Rule::in(['square', 'round'])],
        ];
    }
}

<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;

class ZoneAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kitchen_station_id' => ['required', 'exists:kitchen_stations,id'],
            'bar_station_id' => ['required', 'exists:bar_stations,id'],
        ];
    }
}

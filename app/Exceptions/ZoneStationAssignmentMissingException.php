<?php

namespace App\Exceptions;

use RuntimeException;

class ZoneStationAssignmentMissingException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Zona meja belum dikonfigurasi.');
    }
}

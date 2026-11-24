<?php
if ( ! defined('ABSPATH') ) { exit; }

/**
 * Repositório de configurações.
 * Preparado para centralizar o acesso às opções do plugin.
 */
final class EXE_PRO_Settings_Repository {
    public static function get($key = 'exe_pro_connector_settings') {
        return get_option($key, array());
    }
}

<?php
if ( ! defined('ABSPATH') ) { exit; }

/**
 * Camada de manutenção frontend.
 * A migração é progressiva para manter compatibilidade.
 */
final class EXE_PRO_Maintenance {
    public static function boot() {
        if ( class_exists('EXE_PRO_Connector') ) {
            add_action('template_redirect', array('EXE_PRO_Connector','maybe_suspend_frontend'), 0);
        }
    }
}

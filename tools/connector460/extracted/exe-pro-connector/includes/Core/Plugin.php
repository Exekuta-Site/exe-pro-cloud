<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Ponto central para futuras inicializações por serviços.
 * Mantém compatibilidade com a classe existente nesta fase.
 */
final class EXE_PRO_Plugin {
    public static function boot() {
        if ( class_exists( 'EXE_PRO_Connector' ) ) {
            EXE_PRO_Connector::init();
        }
    }
}

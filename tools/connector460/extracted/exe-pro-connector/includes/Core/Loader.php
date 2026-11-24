<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Bootstrap inicial da arquitetura modular do EXE PRO Connector.
 */
final class EXE_PRO_Loader {
    public static function load() {
        $files = array(
            __DIR__ . '/Plugin.php',
        );
        foreach ( $files as $file ) {
            if ( file_exists( $file ) ) {
                require_once $file;
            }
        }
    }
}
EXE_PRO_Loader::load();

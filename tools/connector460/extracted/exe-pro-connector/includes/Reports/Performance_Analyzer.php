<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_Performance_Analyzer {

    public static function analyze() {
        global $wpdb;

        return array(
            'memory_usage' => size_format(memory_get_usage(true)),
            'queries' => isset($wpdb->num_queries) ? $wpdb->num_queries : 0,
            'wp_version' => get_bloginfo('version'),
        );
    }
}

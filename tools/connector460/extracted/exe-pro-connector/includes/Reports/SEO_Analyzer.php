<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_SEO_Analyzer {

    public static function analyze() {
        $robots = home_url('/robots.txt');
        $response = wp_remote_get($robots);

        $robots_status = ! is_wp_error($response) ? wp_remote_retrieve_response_code($response) : 0;

        $pages = get_posts(array(
            'post_type' => 'page',
            'post_status' => 'publish',
            'numberposts' => -1,
        ));

        $blocked = 0;

        foreach ($pages as $page) {
            $robots_meta = get_post_meta($page->ID, '_yoast_wpseo_meta-robots-noindex', true);
            if ($robots_meta === '1') {
                $blocked++;
            }
        }

        return array(
            'pages_analyzed' => count($pages),
            'blocked_pages' => $blocked,
            'robots_status' => $robots_status,
            'sitemap' => home_url('/sitemap.xml'),
        );
    }
}

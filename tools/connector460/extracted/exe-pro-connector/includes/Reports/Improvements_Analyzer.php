<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_Improvements_Analyzer {

    public static function analyze($data = array()) {

        $items = array();

        if (empty($data['seo']['robots_status']) || $data['seo']['robots_status'] !== 200) {
            $items[] = array(
                'priority' => 'Alta',
                'message' => 'Verificar disponibilidade do robots.txt'
            );
        }

        if (!empty($data['seo']['blocked_pages'])) {
            $items[] = array(
                'priority' => 'Média',
                'message' => 'Existem páginas bloqueadas para indexação'
            );
        }

        return $items;
    }
}

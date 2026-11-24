<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_Reports_Dashboard {

    public static function render($data = array()) {

        $score = self::score($data);

        echo '<div class="wrap">';
        echo '<h1>Relatório de Auditoria EXE PRO</h1>';
        echo '<div class="card">';
        echo '<h2>Pontuação geral</h2>';
        echo '<p style="font-size:30px;">' . esc_html($score) . '/100</p>';
        echo '</div>';

        echo '<h2>Indexação das páginas</h2>';
        if (!empty($data['seo'])) {
            echo '<p>Páginas analisadas: ' . esc_html($data['seo']['pages_analyzed'] ?? 0) . '</p>';
            echo '<p>Páginas bloqueadas: ' . esc_html($data['seo']['blocked_pages'] ?? 0) . '</p>';
        }

        echo '<h2>Desempenho</h2>';
        if (!empty($data['performance'])) {
            echo '<pre>' . esc_html(wp_json_encode($data['performance'], JSON_PRETTY_PRINT)) . '</pre>';
        }

        echo '<h2>Experiência</h2>';
        if (!empty($data['experience'])) {
            echo '<pre>' . esc_html(wp_json_encode($data['experience'], JSON_PRETTY_PRINT)) . '</pre>';
        }

        echo '<h2>Melhorias recomendadas</h2>';
        if (!empty($data['improvements'])) {
            foreach ($data['improvements'] as $item) {
                echo '<p><strong>' . esc_html($item['priority']) . ':</strong> ' . esc_html($item['message']) . '</p>';
            }
        }

        echo '<h2>Insights</h2>';
        echo '<p>' . esc_html($data['insights'] ?? '') . '</p>';

        echo '</div>';
    }

    private static function score($data) {
        $score = 100;
        if (!empty($data['improvements'])) {
            $score -= min(40, count($data['improvements']) * 10);
        }
        return max(0, $score);
    }
}

<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_PDF_Exporter {

    public static function export($report = array()) {

        if ( ! current_user_can('manage_options') ) {
            return false;
        }

        $site = get_bloginfo('name');
        $date = current_time('d/m/Y H:i');

        $html  = '<html><body>';
        $html .= '<h1>EXE PRO Connector</h1>';
        $html .= '<h2>Relatório de Auditoria</h2>';
        $html .= '<p>Site: ' . esc_html($site) . '</p>';
        $html .= '<p>Data: ' . esc_html($date) . '</p>';

        foreach ($report as $section => $data) {
            $html .= '<h3>' . esc_html(ucfirst($section)) . '</h3>';
            $html .= '<pre>' . esc_html(print_r($data, true)) . '</pre>';
        }

        $html .= '</body></html>';

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="relatorio-exe-pro.pdf"');

        // Estrutura preparada para biblioteca PDF compatível futura.
        echo $html;
        exit;
    }
}

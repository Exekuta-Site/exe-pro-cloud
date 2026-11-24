<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_Reports_Manager {

    public static function register() {
        add_action('admin_menu', array(__CLASS__, 'menu'));
    }

    public static function menu() {
        add_submenu_page(
            'options-general.php',
            'Relatório de Auditoria',
            'Relatórios',
            'manage_options',
            'exe-pro-reports',
            array(__CLASS__, 'page')
        );
    }

    public static function page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        if (isset($_POST['exe_pro_export_pdf'])) { EXE_PRO_PDF_Exporter::export(array()); }

        if (isset($_POST['exe_pro_report_nonce']) &&
            wp_verify_nonce($_POST['exe_pro_report_nonce'], 'exe_pro_generate_report')) {

            $data = array(
                'seo' => EXE_PRO_SEO_Analyzer::analyze(),
                'performance' => EXE_PRO_Performance_Analyzer::analyze(),
                'experience' => EXE_PRO_Experience_Analyzer::analyze(),
            );

            $data['improvements'] = EXE_PRO_Improvements_Analyzer::analyze($data);

            echo '<div class="notice notice-success"><p>Relatório gerado.</p></div>';
            $data['insights'] = EXE_PRO_Insights_Generator::generate($data);
            EXE_PRO_Reports_Dashboard::render($data);
        }

        echo '<div class="wrap">';
        echo '<h1>Relatório de Auditoria EXE PRO</h1>';
        echo '<form method="post">';
        wp_nonce_field('exe_pro_generate_report', 'exe_pro_report_nonce');
        echo '<button class="button button-primary">Gerar Relatório</button>';
        echo '<button type="submit" name="exe_pro_export_pdf" class="button">Exportar PDF</button>'; echo '</form>';
        echo '</div>';
    }
}

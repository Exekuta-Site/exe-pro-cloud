<?php
/**
 * Plugin Name: EXE PRO Connector
 * Description: Conecta o WordPress ao EXE PRO para monitoramento, suspensão temporária e reativação segura do site.
 * Version: 1.4.0
 * Author: Alessandro Pimentel
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// FASE 2 - Bootstrap arquitetural
$exe_pro_loader = __DIR__ . '/includes/Core/Loader.php';
if ( file_exists( $exe_pro_loader ) ) {
    require_once $exe_pro_loader;
}

// FASE 2.2 - Módulos arquiteturais
$exe_pro_modules = array(
    __DIR__ . '/includes/REST/Controller.php',
    __DIR__ . '/includes/Security/Authentication.php',
    __DIR__ . '/includes/Admin/Admin.php',
    __DIR__ . '/includes/Frontend/Maintenance.php',
    __DIR__ . '/includes/Settings/Repository.php',
    __DIR__ . '/includes/Popup/Popup.php',
    __DIR__ . '/includes/Reports/Reports_Manager.php',
    __DIR__ . '/includes/Reports/SEO_Analyzer.php',
    __DIR__ . '/includes/Reports/Performance_Analyzer.php',
    __DIR__ . '/includes/Reports/Experience_Analyzer.php',
    __DIR__ . '/includes/Reports/Improvements_Analyzer.php',
    __DIR__ . '/includes/Reports/Insights_Generator.php',
    __DIR__ . '/includes/Reports/PDF_Exporter.php',
    __DIR__ . '/includes/Reports/Dashboard.php',
);

foreach ( $exe_pro_modules as $exe_pro_module ) {
    if ( file_exists( $exe_pro_module ) ) {
        require_once $exe_pro_module;
    }
}


final class EXE_PRO_Connector {
    const VERSION = '1.4.0';
    const OPTION_KEY = 'exe_pro_connector_settings';
    const NOTICE_KEY = 'exe_pro_connector_admin_notice';
    const REST_NS = 'exe-pro/v1';

    public static function init() {
        register_activation_hook( __FILE__, array( __CLASS__, 'activate' ) );
        add_action( 'rest_api_init', array( 'EXE_PRO_REST_Controller', 'register' ) );
        add_action( 'template_redirect', array( __CLASS__, 'maybe_suspend_frontend' ), 0 );
        add_action( 'plugins_loaded', array( 'EXE_PRO_Admin', 'register' ), 20 );
        add_action( 'plugins_loaded', array( 'EXE_PRO_Authentication', 'boot' ), 20 );
        if ( class_exists( 'EXE_PRO_Maintenance' ) ) { EXE_PRO_Maintenance::boot(); }
        if ( class_exists( 'EXE_PRO_Popup' ) ) { EXE_PRO_Popup::boot(); }
    }

    public static function activate() {
        $settings = get_option( self::OPTION_KEY, array() );
        if ( empty( $settings['secret'] ) ) {
            $settings['secret'] = self::generate_secret();
        }
        $settings = wp_parse_args( $settings, self::defaults() );
        update_option( self::OPTION_KEY, $settings, false );
    }

    private static function defaults() {
        return array(
            'secret'               => '',
            'allow_remote_control' => 1,
            'suspended'            => 0,
            'suspend_mode'         => '',
            'suspended_at'         => '',
            'suspension_reason'    => '',
            'suspension_user'      => '',
            'suspension_type'      => '',
            'message_title'        => 'Site temporariamente indisponível',
            'message_body'         => 'Este site está temporariamente indisponível. Tente novamente mais tarde.',
            'message_subtitle'     => 'Estamos trabalhando para normalizar o acesso.',
            'design_template'      => 'institutional',
            'design_eyebrow'       => 'Acesso temporariamente indisponível',
            'progress_label'       => 'Regularização em andamento',
            'progress_percent'     => 65,
            'show_progress'        => 1,
            'accent_color'         => '#18b7a4',
            'background_color'     => '#0d0f12',
            'card_color'           => '#15181d',
            'text_color'           => '#ffffff',
            'button_label'         => 'Falar com suporte',
            'button_url'           => '',
            'retry_after'          => 3600,
            'last_remote_action'   => '',
            'last_remote_at'       => '',
        );
    }

    private static function settings() {
        return wp_parse_args( get_option( self::OPTION_KEY, array() ), self::defaults() );
    }

    private static function save_settings( $settings ) {
        update_option( self::OPTION_KEY, wp_parse_args( $settings, self::defaults() ), false );
    }

    private static function generate_secret() {
        try {
            return bin2hex( random_bytes( 32 ) );
        } catch ( Exception $e ) {
            return wp_generate_password( 64, false, false );
        }
    }

    private static function sanitize_color( $value, $fallback ) {
        $value = sanitize_hex_color( $value );
        return $value ? $value : $fallback;
    }

    private static function template_name( $key ) {
        $map = array(
            'institutional' => 'Institucional',
            'financial'     => 'Financeiro discreto',
            'premium'       => 'Manutenção premium',
        );
        return isset( $map[ $key ] ) ? $map[ $key ] : $map['institutional'];
    }

    public static function register_routes() {
        register_rest_route(
            self::REST_NS,
            '/status',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( __CLASS__, 'rest_status' ),
                'permission_callback' => array( __CLASS__, 'verify_request' ),
            )
        );

        register_rest_route(
            self::REST_NS,
            '/suspend',
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'rest_suspend' ),
                'permission_callback' => array( __CLASS__, 'verify_request' ),
            )
        );

        register_rest_route(
            self::REST_NS,
            '/resume',
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'rest_resume' ),
                'permission_callback' => array( __CLASS__, 'verify_request' ),
            )
        );
    }

    public static function verify_request( WP_REST_Request $request ) {
        $settings = self::settings();
        $secret   = (string) $settings['secret'];

        if ( '' === $secret ) {
            return new WP_Error( 'exe_pro_no_key', 'Chave de conexão não configurada.', array( 'status' => 503 ) );
        }

        $timestamp = (string) $request->get_header( 'x-exe-timestamp' );
        $nonce     = (string) $request->get_header( 'x-exe-nonce' );
        $signature = strtolower( (string) $request->get_header( 'x-exe-signature' ) );

        if ( ! ctype_digit( $timestamp ) || abs( time() - (int) $timestamp ) > 300 ) {
            return new WP_Error( 'exe_pro_timestamp', 'Assinatura expirada.', array( 'status' => 401 ) );
        }

        if ( ! preg_match( '/^[a-zA-Z0-9_-]{16,100}$/', $nonce ) ) {
            return new WP_Error( 'exe_pro_nonce', 'Nonce inválido.', array( 'status' => 401 ) );
        }

        $transient = 'exe_pro_nonce_' . substr( hash( 'sha256', $nonce ), 0, 40 );
        if ( get_transient( $transient ) ) {
            return new WP_Error( 'exe_pro_replay', 'Requisição repetida.', array( 'status' => 409 ) );
        }

        $body       = (string) $request->get_body();
        $body_hash  = hash( 'sha256', $body );
        $canonical  = $timestamp . "\n" . $nonce . "\n" . strtoupper( $request->get_method() ) . "\n" . $request->get_route() . "\n" . $body_hash;
        $expected   = hash_hmac( 'sha256', $canonical, $secret );

        if ( ! hash_equals( $expected, $signature ) ) {
            return new WP_Error( 'exe_pro_signature', 'Assinatura inválida.', array( 'status' => 401 ) );
        }

        set_transient( $transient, 1, 10 * MINUTE_IN_SECONDS );
        return true;
    }

    public static function rest_status() {
        $settings = self::settings();
        return rest_ensure_response(
            array(
                'ok'                   => true,
                'plugin'               => 'EXE PRO Connector',
                'version'              => self::VERSION,
                'wordpress_version'    => get_bloginfo( 'version' ),
                'site_url'             => site_url(),
                'home_url'             => home_url(),
                'suspended'            => (bool) $settings['suspended'],
                'suspend_mode'         => (string) $settings['suspend_mode'],
                'suspended_at'         => (string) $settings['suspended_at'],
                'design_template'      => (string) $settings['design_template'],
                'progress_percent'     => (int) $settings['progress_percent'],
                'allow_remote_control' => (bool) $settings['allow_remote_control'],
                'last_remote_action'   => (string) $settings['last_remote_action'],
                'last_remote_at'       => (string) $settings['last_remote_at'],
            )
        );
    }


    /**
     * Limpa caches conhecidos após alterações remotas.
     * Não depende de plugins externos.
     */
    private static function clear_cache() {
        $methods = array();

        if ( function_exists( 'wp_cache_flush' ) ) {
            wp_cache_flush();
            $methods[] = 'wordpress-object-cache';
        }

        if ( function_exists( 'rocket_clean_domain' ) ) {
            rocket_clean_domain();
            $methods[] = 'wp-rocket';
        }

        if ( function_exists( 'w3tc_flush_all' ) ) {
            w3tc_flush_all();
            $methods[] = 'w3-total-cache';
        }

        if ( function_exists( 'wp_cache_clear_cache' ) ) {
            wp_cache_clear_cache();
            $methods[] = 'wp-super-cache';
        }

        do_action( 'exe_pro_connector_cache_cleared' );
        $methods[] = 'plugin-hook';

        return $methods;
    }

    /** Reutiliza a limpeza de cache existente após alterações do módulo de pop-up. */
    public static function clear_cache_for_extensions() {
        return self::clear_cache();
    }

    public static function rest_suspend( WP_REST_Request $request ) {
        $settings = self::settings();
        if ( empty( $settings['allow_remote_control'] ) ) {
            return new WP_Error( 'exe_pro_remote_disabled', 'Controle remoto desativado no WordPress.', array( 'status' => 403 ) );
        }

        $data = $request->get_json_params();
        if ( ! is_array( $data ) ) {
            $data = array();
        }

        $settings['suspended']          = 1;
        $settings['suspend_mode']       = sanitize_key( isset( $data['mode'] ) ? $data['mode'] : 'remote' );
        $settings['suspension_type']    = 'remote';
        $settings['suspension_reason']  = sanitize_text_field( isset( $data['reason'] ) ? $data['reason'] : 'Manutenção remota' );
        $settings['suspension_user']    = 'EXE PRO Cloud';
        $settings['suspended_at']       = gmdate( 'c' );
        $settings['message_title']      = sanitize_text_field( isset( $data['title'] ) ? $data['title'] : $settings['message_title'] );
        $settings['message_body']       = sanitize_textarea_field( isset( $data['message'] ) ? $data['message'] : $settings['message_body'] );

        $design = ( isset( $data['design'] ) && is_array( $data['design'] ) ) ? $data['design'] : array();
        $template = isset( $design['template'] ) ? sanitize_key( $design['template'] ) : 'institutional';
        if ( ! in_array( $template, array( 'institutional', 'financial', 'premium' ), true ) ) {
            $template = 'institutional';
        }
        $settings['design_template']  = $template;
        $settings['design_eyebrow']   = sanitize_text_field( isset( $design['eyebrow'] ) ? $design['eyebrow'] : $settings['design_eyebrow'] );
        $settings['message_title']    = sanitize_text_field( isset( $design['title'] ) ? $design['title'] : $settings['message_title'] );
        $settings['message_subtitle'] = sanitize_text_field( isset( $design['subtitle'] ) ? $design['subtitle'] : $settings['message_subtitle'] );
        $settings['message_body']     = sanitize_textarea_field( isset( $design['message'] ) ? $design['message'] : $settings['message_body'] );
        $settings['progress_label']   = sanitize_text_field( isset( $design['progressLabel'] ) ? $design['progressLabel'] : $settings['progress_label'] );
        $settings['progress_percent'] = max( 0, min( 100, absint( isset( $design['progressPercent'] ) ? $design['progressPercent'] : $settings['progress_percent'] ) ) );
        $settings['show_progress']    = isset( $design['showProgress'] ) ? ( $design['showProgress'] ? 1 : 0 ) : 1;
        $settings['accent_color']     = self::sanitize_color( isset( $design['accent'] ) ? $design['accent'] : '', $settings['accent_color'] );
        $settings['background_color'] = self::sanitize_color( isset( $design['background'] ) ? $design['background'] : '', $settings['background_color'] );
        $settings['card_color']       = self::sanitize_color( isset( $design['card'] ) ? $design['card'] : '', $settings['card_color'] );
        $settings['text_color']       = self::sanitize_color( isset( $design['text'] ) ? $design['text'] : '', $settings['text_color'] );
        $settings['button_label']     = sanitize_text_field( isset( $design['buttonLabel'] ) ? $design['buttonLabel'] : $settings['button_label'] );
        $settings['button_url']       = isset( $design['buttonUrl'] ) ? esc_url_raw( $design['buttonUrl'] ) : $settings['button_url'];
        $settings['retry_after']      = max( 60, min( 86400, absint( isset( $data['retry_after'] ) ? $data['retry_after'] : 3600 ) ) );
        $settings['last_remote_action'] = 'suspend';
        $settings['last_remote_at']     = gmdate( 'c' );
        self::save_settings( $settings );
        $settings['cache_cleared'] = self::clear_cache();

        return self::rest_status();
    }

    public static function rest_resume() {
        $settings = self::settings();
        if ( empty( $settings['allow_remote_control'] ) ) {
            return new WP_Error( 'exe_pro_remote_disabled', 'Controle remoto desativado no WordPress.', array( 'status' => 403 ) );
        }

        $settings['suspended']          = 0;
        $settings['suspend_mode']       = '';
        $settings['suspended_at']       = '';
        $settings['last_remote_action'] = 'resume';
        $settings['last_remote_at']     = gmdate( 'c' );
        self::save_settings( $settings );
        $settings['cache_cleared'] = self::clear_cache();

        return self::rest_status();
    }

    public static function maybe_suspend_frontend() {
        if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || ( defined( 'DOING_CRON' ) && DOING_CRON ) ) {
            return;
        }

        if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {
            return;
        }

        $settings = self::settings();
        if ( empty( $settings['suspended'] ) ) {
            return;
        }

        status_header( 503 );
        nocache_headers();
        header( 'Retry-After: ' . max( 60, absint( $settings['retry_after'] ) ) );
        header( 'Content-Type: text/html; charset=' . get_bloginfo( 'charset' ) );

        $title       = esc_html( $settings['message_title'] );
        $subtitle    = esc_html( $settings['message_subtitle'] );
        $message     = nl2br( esc_html( $settings['message_body'] ) );
        $eyebrow     = esc_html( $settings['design_eyebrow'] );
        $progress    = max( 0, min( 100, absint( $settings['progress_percent'] ) ) );
        $progress_l  = esc_html( $settings['progress_label'] );
        $template    = in_array( $settings['design_template'], array( 'institutional', 'financial', 'premium' ), true ) ? $settings['design_template'] : 'institutional';
        $accent      = self::sanitize_color( $settings['accent_color'], '#18b7a4' );
        $background  = self::sanitize_color( $settings['background_color'], '#0d0f12' );
        $card        = self::sanitize_color( $settings['card_color'], '#15181d' );
        $text_color  = self::sanitize_color( $settings['text_color'], '#ffffff' );
        $button_url  = esc_url( $settings['button_url'] );
        $button_text = esc_html( $settings['button_label'] );
        ?>
        <!doctype html>
        <html <?php language_attributes(); ?>>
        <head>
            <meta charset="<?php bloginfo( 'charset' ); ?>">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="robots" content="noindex,nofollow">
            <title><?php echo $title; ?></title>
            <style>
                :root{--accent:<?php echo esc_attr( $accent ); ?>;--bg:<?php echo esc_attr( $background ); ?>;--card:<?php echo esc_attr( $card ); ?>;--text:<?php echo esc_attr( $text_color ); ?>;--pct:<?php echo (int) $progress; ?>%}
                *{box-sizing:border-box}html,body{min-height:100%;margin:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif;background:var(--bg);color:var(--text);display:grid;place-items:center;padding:24px;overflow:hidden}
                body:before{content:"";position:fixed;inset:-30%;background:radial-gradient(circle at 20% 15%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 28%),radial-gradient(circle at 80% 85%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 30%);pointer-events:none}
                .exe-wrap{position:relative;width:min(820px,100%);z-index:1}.exe-card{background:color-mix(in srgb,var(--card) 94%,transparent);border:1px solid color-mix(in srgb,var(--accent) 22%,#2f343b);border-radius:26px;padding:44px;box-shadow:0 30px 100px rgba(0,0,0,.38);backdrop-filter:blur(10px)}
                .exe-mark{display:inline-flex;align-items:center;gap:9px;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}.exe-dot{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 14%,transparent)}
                h1{font-size:clamp(34px,6vw,64px);line-height:1.02;margin:18px 0 10px;letter-spacing:-.035em}.exe-sub{font-size:clamp(16px,2.2vw,21px);font-weight:700;opacity:.86;margin:0 0 14px}.exe-msg{font-size:16px;line-height:1.7;color:color-mix(in srgb,var(--text) 74%,transparent);margin:0;max-width:680px}
                .exe-progress{margin-top:28px}.exe-progress-head{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:12px;font-weight:800}.exe-progress-head span:last-child{color:var(--accent)}.exe-track{height:10px;border-radius:999px;background:color-mix(in srgb,var(--text) 9%,transparent);overflow:hidden;margin-top:10px}.exe-fill{width:var(--pct);height:100%;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 68%,#fff));border-radius:999px;box-shadow:0 0 20px color-mix(in srgb,var(--accent) 30%,transparent);animation:exePulse 2.6s ease-in-out infinite}
                .exe-actions{display:flex;gap:10px;align-items:center;margin-top:28px;flex-wrap:wrap}.exe-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:12px;background:var(--accent);color:#08100f;text-decoration:none;font-weight:900}.exe-note{font-size:11px;opacity:.48}.exe-template-financial .exe-card{border-top:4px solid var(--accent);border-radius:16px}.exe-template-financial h1{font-size:clamp(30px,5vw,52px)}.exe-template-financial .exe-mark{background:color-mix(in srgb,var(--accent) 12%,transparent);padding:7px 10px;border-radius:999px}
                .exe-template-premium .exe-card{background:linear-gradient(145deg,color-mix(in srgb,var(--card) 96%,transparent),color-mix(in srgb,var(--accent) 10%,var(--card)));border-radius:34px;padding:54px}.exe-template-premium .exe-card:after{content:"";position:absolute;right:-80px;top:-90px;width:240px;height:240px;border-radius:50%;background:color-mix(in srgb,var(--accent) 16%,transparent);filter:blur(10px);pointer-events:none}.exe-template-premium .exe-card{position:relative;overflow:hidden}
                @keyframes exePulse{0%,100%{filter:brightness(.95)}50%{filter:brightness(1.18)}}
                @media(max-width:640px){body{padding:14px}.exe-card,.exe-template-premium .exe-card{padding:28px 22px;border-radius:20px}.exe-progress-head{font-size:11px}}
            </style>
        </head>
        <body class="exe-template-<?php echo esc_attr( $template ); ?>">
            <main class="exe-wrap">
                <section class="exe-card">
                    <div class="exe-mark"><span class="exe-dot"></span><?php echo $eyebrow; ?></div>
                    <h1><?php echo $title; ?></h1>
                    <?php if ( '' !== trim( wp_strip_all_tags( $subtitle ) ) ) : ?><p class="exe-sub"><?php echo $subtitle; ?></p><?php endif; ?>
                    <p class="exe-msg"><?php echo $message; ?></p>
                    <?php if ( ! empty( $settings['show_progress'] ) ) : ?>
                        <div class="exe-progress"><div class="exe-progress-head"><span><?php echo $progress_l; ?></span><span><?php echo (int) $progress; ?>%</span></div><div class="exe-track"><div class="exe-fill"></div></div></div>
                    <?php endif; ?>
                    <div class="exe-actions">
                        <?php if ( $button_url && $button_text ) : ?><a class="exe-btn" href="<?php echo $button_url; ?>" rel="nofollow noopener"><?php echo $button_text; ?></a><?php endif; ?>
                        <span class="exe-note">HTTP 503 · indisponibilidade temporária</span>
                    </div>
                </section>
            </main>
        </body>
        </html>
        <?php
        exit;
    }

    public static function admin_menu() {
        add_options_page(
            'EXE PRO Connector',
            'EXE PRO Connector',
            'manage_options',
            'exe-pro-connector',
            array( __CLASS__, 'admin_page' )
        );
    }

    public static function admin_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        $s = self::settings();
        ?>
        <div class="wrap">
            <h1>EXE PRO Connector</h1>
            <p>Conecte este WordPress ao EXE PRO sem compartilhar usuário ou senha administrativa.</p>

            <table class="widefat striped" style="max-width:900px;margin:18px 0">
                <tbody>
                    <tr><th style="width:240px">Status do site</th><td><strong><?php echo ! empty( $s['suspended'] ) ? 'Temporariamente suspenso' : 'Ativo'; ?></strong></td></tr>
                    <tr><th>Endpoint</th><td><code><?php echo esc_html( rest_url( self::REST_NS . '/status' ) ); ?></code></td></tr>
                    <tr><th>Chave de conexão</th><td><input type="text" readonly onclick="this.select()" value="<?php echo esc_attr( $s['secret'] ); ?>" style="width:100%;font-family:monospace"></td></tr>
                    <tr><th>Modelo atual</th><td><strong><?php echo esc_html( self::template_name( $s['design_template'] ) ); ?></strong> · <?php echo absint( $s['progress_percent'] ); ?>%</td></tr>
                    <tr><th>Versão</th><td><?php echo esc_html( self::VERSION ); ?></td></tr>
                </tbody>
            </table>

            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="max-width:900px">
                <?php wp_nonce_field( 'exe_pro_connector_save' ); ?>
                <input type="hidden" name="action" value="exe_pro_connector_save">
                <h2>Controle remoto</h2>
                <div style="max-width:900px;background:#0f1418;color:#fff;border-radius:16px;padding:20px;margin:14px 0;border:1px solid #26323a"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:<?php echo esc_attr( self::sanitize_color( $s['accent_color'], '#18b7a4' ) ); ?>">Prévia do último modelo recebido</div><div style="font-size:24px;font-weight:800;margin-top:8px"><?php echo esc_html( $s['message_title'] ); ?></div><div style="opacity:.7;margin-top:5px"><?php echo esc_html( $s['message_subtitle'] ); ?></div><div style="height:8px;background:#253039;border-radius:999px;margin-top:16px;overflow:hidden"><div style="height:100%;width:<?php echo absint( $s['progress_percent'] ); ?>%;background:<?php echo esc_attr( self::sanitize_color( $s['accent_color'], '#18b7a4' ) ); ?>"></div></div></div>
                <p><label><input type="checkbox" name="allow_remote_control" value="1" <?php checked( ! empty( $s['allow_remote_control'] ) ); ?>> Permitir que o EXE PRO suspenda e reative este site.</label></p>
                <table class="form-table">
                    <tr><th><label for="message_title">Título padrão</label></th><td><input class="regular-text" id="message_title" name="message_title" value="<?php echo esc_attr( $s['message_title'] ); ?>"></td></tr>
                    <tr><th><label for="message_body">Mensagem padrão</label></th><td><textarea class="large-text" rows="4" id="message_body" name="message_body"><?php echo esc_textarea( $s['message_body'] ); ?></textarea></td></tr>
                </table>
                <?php submit_button( 'Salvar configurações' ); ?>
            </form>

            <hr style="max-width:900px;margin:30px 0">
            <h2>Emergência / manutenção</h2>
            <p>Estas ações funcionam localmente mesmo que o EXE PRO Cloud esteja indisponível.</p>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <?php wp_nonce_field( 'exe_pro_connector_manual_suspend' ); ?>
                <input type="hidden" name="action" value="exe_pro_connector_manual_suspend">
                <p>
                    <label for="suspension_reason"><strong>Motivo da manutenção</strong></label><br>
                    <select id="suspension_reason" name="suspension_reason">
                        <?php foreach ( array( 'Emergência técnica', 'Atualização do sistema', 'Manutenção programada', 'Problema de segurança', 'Personalizado' ) as $reason ) : ?>
                            <option value="<?php echo esc_attr( $reason ); ?>" <?php selected( $s['suspension_reason'], $reason ); ?>><?php echo esc_html( $reason ); ?></option>
                        <?php endforeach; ?>
                    </select>
                </p>
                <p>
                    <button type="submit" class="button button-primary" onclick="return confirm('Tem certeza que deseja desativar o site agora?');">DESATIVAR SITE AGORA</button>
                    <a class="button" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=exe_pro_connector_resume' ), 'exe_pro_connector_resume' ) ); ?>">REATIVAR SITE</a>
                    <a class="button" onclick="return confirm('Gerar uma nova chave desconecta a chave cadastrada atualmente no EXE PRO. Continuar?')" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=exe_pro_connector_regenerate' ), 'exe_pro_connector_regenerate' ) ); ?>">Gerar nova chave</a>
                </p>
            </form>
        </div>
        <?php
    }

    public static function admin_save() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Sem permissão.' );
        }
        check_admin_referer( 'exe_pro_connector_save' );
        $s = self::settings();
        $s['allow_remote_control'] = isset( $_POST['allow_remote_control'] ) ? 1 : 0;
        $s['message_title'] = sanitize_text_field( wp_unslash( isset( $_POST['message_title'] ) ? $_POST['message_title'] : '' ) );
        $s['message_body'] = sanitize_textarea_field( wp_unslash( isset( $_POST['message_body'] ) ? $_POST['message_body'] : '' ) );
        self::save_settings( $s );
        self::set_notice( 'Configurações salvas.' );
        wp_safe_redirect( admin_url( 'options-general.php?page=exe-pro-connector' ) );
        exit;
    }

    public static function admin_manual_suspend() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Sem permissão.' );
        }

        check_admin_referer( 'exe_pro_connector_manual_suspend' );

        $s = self::settings();
        $reason = sanitize_text_field( wp_unslash( isset( $_POST['suspension_reason'] ) ? $_POST['suspension_reason'] : 'Emergência técnica' ) );

        $allowed = array(
            'Emergência técnica',
            'Atualização do sistema',
            'Manutenção programada',
            'Problema de segurança',
            'Personalizado',
        );

        if ( ! in_array( $reason, $allowed, true ) ) {
            $reason = 'Emergência técnica';
        }

        $user = wp_get_current_user();

        $s['suspended']         = 1;
        $s['suspend_mode']      = 'manual';
        $s['suspension_type']   = 'manual';
        $s['suspension_reason'] = $reason;
        $s['suspension_user']   = $user->display_name;
        $s['suspended_at']      = current_time( 'c' );

        self::save_settings( $s );
        self::set_notice( 'Site colocado em manutenção manual.' );

        wp_safe_redirect( admin_url( 'options-general.php?page=exe-pro-connector' ) );
        exit;
    }

    public static function admin_resume() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Sem permissão.' );
        }
        check_admin_referer( 'exe_pro_connector_resume' );
        $s = self::settings();
        $s['suspended'] = 0;
        $s['suspend_mode'] = '';
        $s['suspended_at'] = '';
        self::save_settings( $s );
        self::set_notice( 'Site reativado localmente.' );
        wp_safe_redirect( admin_url( 'options-general.php?page=exe-pro-connector' ) );
        exit;
    }

    public static function admin_regenerate_key() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Sem permissão.' );
        }
        check_admin_referer( 'exe_pro_connector_regenerate' );
        $s = self::settings();
        $s['secret'] = self::generate_secret();
        self::save_settings( $s );
        self::set_notice( 'Nova chave gerada. Atualize a conexão no EXE PRO.' );
        wp_safe_redirect( admin_url( 'options-general.php?page=exe-pro-connector' ) );
        exit;
    }

    private static function set_notice( $message ) {
        set_transient( self::NOTICE_KEY, sanitize_text_field( $message ), 60 );
    }

    public static function admin_notice() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        $notice = get_transient( self::NOTICE_KEY );
        if ( $notice ) {
            delete_transient( self::NOTICE_KEY );
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( $notice ) . '</p></div>';
        }
    }
}

EXE_PRO_Connector::init();

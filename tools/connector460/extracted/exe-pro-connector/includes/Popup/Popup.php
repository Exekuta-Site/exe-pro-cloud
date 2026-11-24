<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Pop-up de comunicação: isolado da opção e do fluxo de suspensão.
 * Desativado por padrão. Controle remoto utiliza a autenticação HMAC existente.
 */
final class EXE_PRO_Popup {
    const OPTION_KEY = 'exe_pro_connector_popup';
    const NOTICE_KEY = 'exe_pro_popup_admin_notice';

    public static function boot() {
        add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
        // Exibe o HTML antes de wp_print_footer_scripts (prioridade 20).
        add_action( 'wp_footer', array( __CLASS__, 'render' ), 5 );
        add_action( 'admin_menu', array( __CLASS__, 'admin_menu' ) );
        add_action( 'admin_post_exe_pro_popup_save', array( __CLASS__, 'admin_save' ) );
        add_action( 'admin_notices', array( __CLASS__, 'admin_notice' ) );
    }

    public static function defaults() {
        return array(
            'enabled'       => 0,
            'title'         => 'Aviso importante',
            'message'       => 'Confira nossa novidade!',
            'button_label'  => 'Saiba mais',
            'button_url'    => '',
            'accent_color'  => '#18b7a4',
            'show_on'       => 'all',
            'frequency'     => 'session',
            'delay_seconds' => 2,
            'revision'      => 'default',
            'updated_at'    => '',
        );
    }

    public static function settings() {
        $value = get_option( self::OPTION_KEY, array() );
        return wp_parse_args( is_array( $value ) ? $value : array(), self::defaults() );
    }

    public static function rest_get() {
        return rest_ensure_response( array( 'ok' => true, 'popup' => self::settings() ) );
    }

    public static function rest_save( WP_REST_Request $request ) {
        $connector = get_option( EXE_PRO_Connector::OPTION_KEY, array() );
        if ( empty( $connector['allow_remote_control'] ) ) {
            return new WP_Error( 'exe_pro_remote_disabled', 'Controle remoto desativado no WordPress.', array( 'status' => 403 ) );
        }

        $changes = $request->get_json_params();
        if ( ! is_array( $changes ) || array_values( $changes ) === $changes ) {
            return new WP_Error( 'exe_pro_popup_payload', 'Envie um objeto JSON com as configurações.', array( 'status' => 400 ) );
        }

        $new = self::sanitize_changes( $changes, self::settings() );
        if ( is_wp_error( $new ) ) {
            return $new;
        }

        $new['revision']   = wp_generate_uuid4();
        $new['updated_at'] = gmdate( 'c' );
        update_option( self::OPTION_KEY, $new, false );
        $purged = EXE_PRO_Connector::clear_cache_for_extensions();
        return rest_ensure_response( array( 'ok' => true, 'popup' => $new, 'cache_cleared' => $purged ) );
    }

    /** Recusa tipos inesperados e evita entrada HTML/JS em conteúdo e URLs. */
    public static function sanitize_changes( $changes, $current ) {
        $allowed = array( 'enabled', 'title', 'message', 'button_label', 'button_url', 'accent_color', 'show_on', 'frequency', 'delay_seconds' );
        foreach ( $changes as $key => $value ) {
            if ( ! in_array( $key, $allowed, true ) ) {
                return new WP_Error( 'exe_pro_popup_unknown', 'Campo de pop-up não reconhecido: ' . sanitize_text_field( (string) $key ), array( 'status' => 400 ) );
            }
            if ( is_array( $value ) || is_object( $value ) || null === $value ) {
                return new WP_Error( 'exe_pro_popup_type', 'Tipo inválido para: ' . $key, array( 'status' => 400 ) );
            }
            if ( 'enabled' === $key ) {
                if ( ! is_bool( $value ) && ! in_array( $value, array( 0, 1 ), true ) ) {
                    return new WP_Error( 'exe_pro_popup_boolean', 'enabled deve ser booleano.', array( 'status' => 400 ) );
                }
                $current['enabled'] = $value ? 1 : 0;
            } elseif ( in_array( $key, array( 'title', 'message', 'button_label' ), true ) ) {
                if ( ! is_string( $value ) ) {
                    return new WP_Error( 'exe_pro_popup_type', 'O campo deve ser texto: ' . $key, array( 'status' => 400 ) );
                }
                $limit = ( 'message' === $key ) ? 2000 : ( 'title' === $key ? 180 : 80 );
                if ( strlen( $value ) > $limit * 4 ) {
                    return new WP_Error( 'exe_pro_popup_length', 'Texto muito longo: ' . $key, array( 'status' => 400 ) );
                }
                $clean = ( 'message' === $key ) ? sanitize_textarea_field( $value ) : sanitize_text_field( $value );
                if ( function_exists( 'mb_substr' ) ) {
                    $clean = mb_substr( $clean, 0, $limit, 'UTF-8' );
                } else {
                    $clean = substr( $clean, 0, $limit );
                }
                $current[ $key ] = $clean;
            } elseif ( 'button_url' === $key ) {
                if ( ! is_string( $value ) || strlen( $value ) > 2048 ) {
                    return new WP_Error( 'exe_pro_popup_url', 'URL inválida.', array( 'status' => 400 ) );
                }
                $value = trim( $value );
                if ( '' !== $value ) {
                    $scheme = strtolower( (string) wp_parse_url( $value, PHP_URL_SCHEME ) );
                    $host   = wp_parse_url( $value, PHP_URL_HOST );
                    if ( ! in_array( $scheme, array( 'http', 'https' ), true ) || empty( $host ) ) {
                        return new WP_Error( 'exe_pro_popup_url', 'A URL precisa começar com https:// ou http://.', array( 'status' => 400 ) );
                    }
                }
                $current['button_url'] = esc_url_raw( $value, array( 'http', 'https' ) );
            } elseif ( 'accent_color' === $key ) {
                if ( ! is_string( $value ) || ! sanitize_hex_color( $value ) ) {
                    return new WP_Error( 'exe_pro_popup_color', 'Cor inválida.', array( 'status' => 400 ) );
                }
                $current['accent_color'] = sanitize_hex_color( $value );
            } elseif ( 'show_on' === $key ) {
                if ( ! in_array( $value, array( 'all', 'home' ), true ) ) {
                    return new WP_Error( 'exe_pro_popup_show_on', 'show_on deve ser all ou home.', array( 'status' => 400 ) );
                }
                $current['show_on'] = $value;
            } elseif ( 'frequency' === $key ) {
                if ( ! in_array( $value, array( 'session', 'daily', 'always' ), true ) ) {
                    return new WP_Error( 'exe_pro_popup_frequency', 'frequency deve ser session, daily ou always.', array( 'status' => 400 ) );
                }
                $current['frequency'] = $value;
            } elseif ( 'delay_seconds' === $key ) {
                if ( ! is_int( $value ) || $value < 0 || $value > 30 ) {
                    return new WP_Error( 'exe_pro_popup_delay', 'delay_seconds deve ser um inteiro entre 0 e 30.', array( 'status' => 400 ) );
                }
                $current['delay_seconds'] = $value;
            }
        }
        return $current;
    }

    private static function should_render() {
        if ( is_admin() || wp_doing_ajax() || is_feed() || is_preview() ) {
            return false;
        }
        $s = self::settings();
        if ( empty( $s['enabled'] ) ) {
            return false;
        }
        if ( 'home' === $s['show_on'] && ! ( is_front_page() || is_home() ) ) {
            return false;
        }
        return true;
    }

    public static function enqueue_assets() {
        if ( ! self::should_render() ) {
            return;
        }
        $plugin_file = dirname( __DIR__, 2 ) . '/exe-pro-connector.php';
        wp_enqueue_style( 'exe-pro-popup', plugins_url( 'assets/css/popup.css', $plugin_file ), array(), EXE_PRO_Connector::VERSION );
        wp_enqueue_script( 'exe-pro-popup', plugins_url( 'assets/js/popup.js', $plugin_file ), array(), EXE_PRO_Connector::VERSION, true );
    }

    public static function render() {
        if ( ! self::should_render() ) {
            return;
        }
        $s = self::settings();
        ?>
        <div id="exe-pro-popup-root" class="exe-pro-popup-root" hidden
             data-revision="<?php echo esc_attr( $s['revision'] ); ?>"
             data-frequency="<?php echo esc_attr( $s['frequency'] ); ?>"
             data-delay="<?php echo absint( $s['delay_seconds'] ); ?>">
            <div class="exe-pro-popup-overlay" data-exe-popup-close="1"></div>
            <section class="exe-pro-popup-dialog" role="dialog" aria-modal="true"
                     aria-labelledby="exe-pro-popup-heading" aria-describedby="exe-pro-popup-description"
                     tabindex="-1" style="--exe-pro-popup-accent:<?php echo esc_attr( $s['accent_color'] ); ?>">
                <button class="exe-pro-popup-close" type="button" data-exe-popup-close="1" aria-label="Fechar aviso">&times;</button>
                <div class="exe-pro-popup-kicker">Comunicado</div>
                <h2 id="exe-pro-popup-heading"><?php echo esc_html( $s['title'] ); ?></h2>
                <p id="exe-pro-popup-description"><?php echo nl2br( esc_html( $s['message'] ) ); ?></p>
                <?php if ( '' !== $s['button_url'] && '' !== $s['button_label'] ) : ?>
                    <a class="exe-pro-popup-action" href="<?php echo esc_url( $s['button_url'] ); ?>"
                       target="_blank" rel="noopener noreferrer nofollow"><?php echo esc_html( $s['button_label'] ); ?></a>
                <?php endif; ?>
            </section>
        </div>
        <?php
    }

    public static function admin_menu() {
        add_submenu_page( 'options-general.php', 'EXE PRO Pop-up', 'EXE PRO Pop-up', 'manage_options', 'exe-pro-popup', array( __CLASS__, 'admin_page' ) );
    }

    public static function admin_page() {
        if ( ! current_user_can( 'manage_options' ) ) { return; }
        $s = self::settings();
        ?>
        <div class="wrap">
            <h1>EXE PRO — Pop-up</h1>
            <p>Controle local de emergência. O EXEKUTA também pode gerenciar este pop-up via API autenticada.</p>
            <p><strong>Status atual:</strong> <?php echo $s['enabled'] ? 'Ativo' : 'Desativado'; ?></p>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="max-width:800px">
                <?php wp_nonce_field( 'exe_pro_popup_save' ); ?>
                <input type="hidden" name="action" value="exe_pro_popup_save">
                <table class="form-table" role="presentation">
                    <tr><th scope="row">Exibir pop-up</th><td><label><input type="checkbox" name="enabled" value="1" <?php checked( $s['enabled'] ); ?>> Ativar no site</label></td></tr>
                    <tr><th><label for="exe-popup-title">Título</label></th><td><input id="exe-popup-title" class="regular-text" maxlength="180" name="title" value="<?php echo esc_attr( $s['title'] ); ?>"></td></tr>
                    <tr><th><label for="exe-popup-message">Mensagem</label></th><td><textarea id="exe-popup-message" class="large-text" rows="5" maxlength="2000" name="message"><?php echo esc_textarea( $s['message'] ); ?></textarea></td></tr>
                    <tr><th><label for="exe-popup-button-label">Texto do botão</label></th><td><input id="exe-popup-button-label" class="regular-text" name="button_label" maxlength="80" value="<?php echo esc_attr( $s['button_label'] ); ?>"></td></tr>
                    <tr><th><label for="exe-popup-button-url">Link do botão</label></th><td><input id="exe-popup-button-url" class="regular-text" type="url" maxlength="2048" name="button_url" value="<?php echo esc_attr( $s['button_url'] ); ?>" placeholder="https://exemplo.com"></td></tr>
                    <tr><th><label for="exe-popup-accent">Cor de destaque</label></th><td><input id="exe-popup-accent" type="color" name="accent_color" value="<?php echo esc_attr( $s['accent_color'] ); ?>"></td></tr>
                    <tr><th><label for="exe-popup-show">Onde exibir</label></th><td><select id="exe-popup-show" name="show_on"><option value="all" <?php selected( $s['show_on'], 'all' ); ?>>Em todas as páginas</option><option value="home" <?php selected( $s['show_on'], 'home' ); ?>>Somente na página inicial</option></select></td></tr>
                    <tr><th><label for="exe-popup-frequency">Frequência</label></th><td><select id="exe-popup-frequency" name="frequency"><option value="session" <?php selected( $s['frequency'], 'session' ); ?>>Uma vez por sessão</option><option value="daily" <?php selected( $s['frequency'], 'daily' ); ?>>Uma vez a cada 24 horas</option><option value="always" <?php selected( $s['frequency'], 'always' ); ?>>Em cada carregamento de página</option></select></td></tr>
                    <tr><th><label for="exe-popup-delay">Atraso</label></th><td><input id="exe-popup-delay" type="number" name="delay_seconds" min="0" max="30" step="1" value="<?php echo absint( $s['delay_seconds'] ); ?>"> segundos (0 a 30)</td></tr>
                </table>
                <?php submit_button( 'Salvar pop-up' ); ?>
            </form>
            <p><em>O pop-up fica desativado até ser ativado pelo WordPress ou pelo EXEKUTA.</em></p>
        </div>
        <?php
    }

    public static function admin_save() {
        if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Sem permissão.' ); }
        check_admin_referer( 'exe_pro_popup_save' );
        $fields = array( 'title', 'message', 'button_label', 'button_url', 'accent_color', 'show_on', 'frequency', 'delay_seconds' );
        $input = array( 'enabled' => isset( $_POST['enabled'] ) );
        foreach ( $fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                $input[ $field ] = wp_unslash( $_POST[ $field ] );
            }
        }
        // O formulário HTML transmite números como strings; a API JSON exige inteiro.
        if ( isset( $input['delay_seconds'] ) && is_scalar( $input['delay_seconds'] ) && preg_match( '/^\d+$/', (string) $input['delay_seconds'] ) ) {
            $input['delay_seconds'] = (int) $input['delay_seconds'];
        }
        $new = self::sanitize_changes( $input, self::settings() );
        if ( is_wp_error( $new ) ) {
            set_transient( self::NOTICE_KEY, array( 'error', $new->get_error_message() ), 60 );
        } else {
            $new['revision'] = wp_generate_uuid4();
            $new['updated_at'] = gmdate( 'c' );
            update_option( self::OPTION_KEY, $new, false );
            EXE_PRO_Connector::clear_cache_for_extensions();
            set_transient( self::NOTICE_KEY, array( 'success', 'Pop-up atualizado.' ), 60 );
        }
        wp_safe_redirect( admin_url( 'options-general.php?page=exe-pro-popup' ) );
        exit;
    }

    public static function admin_notice() {
        if ( ! current_user_can( 'manage_options' ) || ! isset( $_GET['page'] ) || 'exe-pro-popup' !== $_GET['page'] ) {
            return;
        }
        $notice = get_transient( self::NOTICE_KEY );
        if ( is_array( $notice ) ) {
            delete_transient( self::NOTICE_KEY );
            $kind = ( 'error' === $notice[0] ) ? 'notice-error' : 'notice-success';
            echo '<div class="notice ' . esc_attr( $kind ) . ' is-dismissible"><p>' . esc_html( $notice[1] ) . '</p></div>';
        }
    }
}

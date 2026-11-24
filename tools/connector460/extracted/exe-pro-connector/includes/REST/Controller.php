<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_REST_Controller {

    public static function register() {
        register_rest_route('exe-pro/v1', '/status', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'status'),
            'permission_callback' => array(__CLASS__, 'verify_request'),
        ));
        register_rest_route('exe-pro/v1', '/suspend', array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => array(__CLASS__, 'suspend'),
            'permission_callback' => array(__CLASS__, 'verify_request'),
        ));
        register_rest_route('exe-pro/v1', '/resume', array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => array(__CLASS__, 'resume'),
            'permission_callback' => array(__CLASS__, 'verify_request'),
        ));

        // Novos endpoints; os três endpoints legados acima continuam intactos.
        register_rest_route('exe-pro/v1', '/popup', array(
            array(
                'methods' => WP_REST_Server::READABLE,
                'callback' => array('EXE_PRO_Popup', 'rest_get'),
                'permission_callback' => array(__CLASS__, 'verify_request'),
            ),
            array(
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => array('EXE_PRO_Popup', 'rest_save'),
                'permission_callback' => array(__CLASS__, 'verify_request'),
            ),
        ));
    }

    public static function verify_request( $request ) {
        return EXE_PRO_Connector::verify_request($request);
    }

    public static function status() {
        return EXE_PRO_Connector::rest_status();
    }

    public static function suspend( $request ) {
        return EXE_PRO_Connector::rest_suspend($request);
    }

    public static function resume() {
        return EXE_PRO_Connector::rest_resume();
    }
}

<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_Authentication {
    public static function boot() {}

    public static function generate_secret() {
        try { return bin2hex(random_bytes(32)); }
        catch ( Exception $e ) { return wp_generate_password(64, false, false); }
    }

    public static function verify_request( $request, $secret ) {
        $timestamp = $request->get_header('X-EXE-Timestamp');
        $signature = $request->get_header('X-EXE-Signature');
        if ( empty($timestamp) || empty($signature) ) { return false; }
        if ( abs(time() - intval($timestamp)) > 300 ) { return false; }
        $body = $request->get_body();
        $payload = $timestamp . $request->get_method() . $request->get_route() . hash('sha256',$body);
        $expected = hash_hmac('sha256',$payload,$secret);
        return hash_equals($expected,$signature);
    }
}

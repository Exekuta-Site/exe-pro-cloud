<?php
/**
 * Plugin Name: EXEKUTA - EXE PRO Leads Bridge
 * Description: Encaminha leads aceitos pelo formulario REST do site para o EXE PRO Cloud.
 * Version: 1.0.0
 * Author: EXEKUTA
 */

defined('ABSPATH') || exit;

function exekuta_exe_pro_lead_bridge_forward($response, $handler, $request) {
    if ($request->get_route() !== '/exekuta/v1/lead') {
        return $response;
    }
    if (is_wp_error($response) || !($response instanceof WP_REST_Response)) {
        return $response;
    }
    $status = (int) $response->get_status();
    if ($status < 200 || $status >= 300) {
        return $response;
    }
    $result = $response->get_data();
    if (is_array($result)) {
        if (array_key_exists('success', $result) && !$result['success']) {
            return $response;
        }
        if (array_key_exists('ok', $result) && !$result['ok']) {
            return $response;
        }
    }

    $payload = $request->get_json_params();
    if (!is_array($payload) || !empty($payload['honeypot'])) {
        return $response;
    }
    $consent = !empty($payload['consent']) && in_array($payload['consent'], array(true, 1, '1', 'true'), true);
    if (!$consent) {
        return $response;
    }

    $endpoint = defined('EXEKUTA_EXE_PRO_LEAD_ENDPOINT') ? trim((string) EXEKUTA_EXE_PRO_LEAD_ENDPOINT) : '';
    $secret = defined('EXEKUTA_EXE_PRO_LEAD_SECRET') ? trim((string) EXEKUTA_EXE_PRO_LEAD_SECRET) : '';
    if ($endpoint === '' || $secret === '') {
        error_log('EXE PRO Leads Bridge: endpoint ou segredo nao configurado.');
        return $response;
    }

    $payload['eventId'] = !empty($payload['eventId']) ? (string) $payload['eventId'] : wp_generate_uuid4();
    $payload['source'] = 'site-exekuta';
    if (empty($payload['source_page'])) {
        $payload['source_page'] = (string) ($request->get_header('referer') ?: '/');
    }
    $body = wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($body)) {
        error_log('EXE PRO Leads Bridge: nao foi possivel serializar o lead.');
        return $response;
    }

    $timestamp = (string) time();
    $signature = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret);
    $remote = wp_remote_post($endpoint, array(
        'timeout' => 5,
        'redirection' => 0,
        'blocking' => true,
        'headers' => array(
            'Content-Type' => 'application/json; charset=utf-8',
            'X-EXEKUTA-Timestamp' => $timestamp,
            'X-EXEKUTA-Signature' => $signature,
            'X-EXEKUTA-Event-ID' => $payload['eventId'],
        ),
        'body' => $body,
        'data_format' => 'body',
    ));
    if (is_wp_error($remote)) {
        error_log('EXE PRO Leads Bridge: falha ao enviar lead - ' . $remote->get_error_message());
    } else {
        $remote_status = (int) wp_remote_retrieve_response_code($remote);
        if ($remote_status < 200 || $remote_status >= 300) {
            error_log('EXE PRO Leads Bridge: EXE PRO respondeu HTTP ' . $remote_status . '.');
        }
    }
    return $response;
}

add_filter('rest_request_after_callbacks', 'exekuta_exe_pro_lead_bridge_forward', 10, 3);

<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_Insights_Generator {

    public static function generate($data=array()) {

        if (!empty($data['improvements'])) {
            return 'O site possui pontos técnicos que precisam de atenção em indexação e otimização.';
        }

        return 'O site apresenta uma estrutura técnica inicial sem alertas críticos identificados.';
    }
}

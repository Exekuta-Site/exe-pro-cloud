<?php
if ( ! defined('ABSPATH') ) { exit; }

final class EXE_PRO_Admin {
    public static function register() {
        add_action('admin_menu', array(__CLASS__, 'admin_menu'));
        if ( class_exists('EXE_PRO_Reports_Manager') ) { EXE_PRO_Reports_Manager::register(); }
        add_action('admin_post_exe_pro_connector_save', array(__CLASS__, 'admin_save'));
        add_action('admin_post_exe_pro_connector_resume', array(__CLASS__, 'admin_resume'));
        add_action('admin_post_exe_pro_connector_manual_suspend', array(__CLASS__, 'admin_manual_suspend'));
        add_action('admin_post_exe_pro_connector_regenerate', array(__CLASS__, 'admin_regenerate_key'));
        add_action('admin_notices', array(__CLASS__, 'admin_notice'));
    }

    // Migração iniciada: os hooks administrativos agora pertencem ao módulo Admin.
    // As chamadas abaixo preservam compatibilidade durante a transição.
    public static function admin_menu(){ if(class_exists('EXE_PRO_Connector')) EXE_PRO_Connector::admin_menu(); }
    public static function admin_save(){ if(class_exists('EXE_PRO_Connector')) EXE_PRO_Connector::admin_save(); }
    public static function admin_resume(){ if(class_exists('EXE_PRO_Connector')) EXE_PRO_Connector::admin_resume(); }
    public static function admin_manual_suspend(){ if(class_exists('EXE_PRO_Connector')) EXE_PRO_Connector::admin_manual_suspend(); }
    public static function admin_regenerate_key(){ if(class_exists('EXE_PRO_Connector')) EXE_PRO_Connector::admin_regenerate_key(); }
    public static function admin_notice(){ if(class_exists('EXE_PRO_Connector')) EXE_PRO_Connector::admin_notice(); }
}

<?php
/**
 * Plugin Name: Urban Top 40
 * Plugin URI: https://urbantop40.com
 * Description: A modular WordPress plugin for Urban Top 40 website functionality
 * Version: 1.0.0
 * Author: Urban Top 40
 * License: GPL v2 or later
 * Text Domain: urban-top-40
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('URBAN_TOP_40_VERSION', '1.0.0');
define('URBAN_TOP_40_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('URBAN_TOP_40_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Urban Top 40 Plugin Class
 */
class UrbanTop40 {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('plugins_loaded', array($this, 'load_modules'));
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Load text domain for internationalization
        load_plugin_textdomain('urban-top-40', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Enqueue global CSS
        add_action('wp_enqueue_scripts', array($this, 'enqueue_global_css'));
        
        // Add inline CSS as backup
        add_action('wp_head', array($this, 'add_inline_css'));
    }
    
    /**
     * Enqueue global CSS for site-wide styling
     */
    public function enqueue_global_css() {
        // Debug: Check if the CSS file exists
        $css_file_path = URBAN_TOP_40_PLUGIN_DIR . 'assets/css/global.css';
        if (file_exists($css_file_path)) {
            wp_enqueue_style(
                'urban-top-40-global',
                URBAN_TOP_40_PLUGIN_URL . 'assets/css/global.css',
                array(),
                URBAN_TOP_40_VERSION
            );
        } else {
            // Debug: Log error if file doesn't exist
            error_log('Urban Top 40: CSS file not found at: ' . $css_file_path);
        }
    }
    
    /**
     * Add inline CSS as backup for video styling
     */
    public function add_inline_css() {
        ?>
        <style>
        /* Urban Top 40 Video Styling */
        .is-type-video {
            border-radius: 5px !important;
            overflow: hidden !important;
        }
        
        .is-type-video iframe,
        .is-type-video video,
        .is-type-video embed,
        .is-type-video object {
            border-radius: 5px !important;
        }
        
        .wp-block-embed.is-type-video iframe {
            border-radius: 5px !important;
        }
        
        .elementor-widget-video .is-type-video iframe {
            border-radius: 5px !important;
        }
        </style>
        <?php
    }
    
    /**
     * Load all plugin modules
     */
    public function load_modules() {
        // Load Spotify Playlists module
        require_once URBAN_TOP_40_PLUGIN_DIR . 'modules/spotify-playlists/spotify-playlists.php';
        
        // Load Social Links module
        require_once URBAN_TOP_40_PLUGIN_DIR . 'modules/social-links/social-links.php';
        
        // Load Admin Sidebar module
        require_once URBAN_TOP_40_PLUGIN_DIR . 'modules/admin-sidebar/admin-sidebar.php';
        
        // Load Artist Charts module
        require_once URBAN_TOP_40_PLUGIN_DIR . 'modules/artist-charts/artist-charts.php';
        
        // Initialize modules
        new UrbanTop40_Spotify_Playlists();
        new UrbanTop40_Social_Links();
        new UrbanTop40_Admin_Sidebar();
        new UrbanTop40_Artist_Charts();
    }
    
    /**
     * Plugin activation hook
     */
    public static function activate() {
        // Add any activation tasks here
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation hook
     */
    public static function deactivate() {
        // Add any cleanup tasks here
        flush_rewrite_rules();
    }
}

// Initialize the plugin
new UrbanTop40();

// Register activation and deactivation hooks
register_activation_hook(__FILE__, array('UrbanTop40', 'activate'));
register_deactivation_hook(__FILE__, array('UrbanTop40', 'deactivate'));

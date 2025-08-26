<?php
/**
 * Artist Charts Module for Urban Top 40
 * 
 * This module provides functionality to display artist chart history
 * using TypeScript data files and creates horizontally-scrollable charts
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Artist Charts Module Class
 */
class UrbanTop40_Artist_Charts {
    
    /**
     * Constructor
     */
    public function __construct() {
        // Register shortcode
        add_shortcode('artist_chart', array($this, 'artist_chart_shortcode'));
        
        // Enqueue frontend assets
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        
        // Add admin menu for chart management
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // AJAX handlers
        add_action('wp_ajax_get_artist_chart_data', array($this, 'get_artist_chart_data'));
        add_action('wp_ajax_nopriv_get_artist_chart_data', array($this, 'get_artist_chart_data'));
    }
    
    /**
     * Artist Chart Shortcode
     * 
     * Usage: [artist_chart artist="the_beatles" height="400" width="100%"]
     */
    public function artist_chart_shortcode($atts) {
        $atts = shortcode_atts(array(
            'artist' => '',
            'height' => '400',
            'width' => '100%',
            'show_legend' => 'true',
            'chart_type' => 'line' // line, area, bar
        ), $atts);
        
        if (empty($atts['artist'])) {
            return '<p>Error: Artist parameter is required. Usage: [artist_chart artist="the_beatles"]</p>';
        }
        
        // Generate unique ID for this chart
        $chart_id = 'artist-chart-' . sanitize_title($atts['artist']) . '-' . uniqid();
        
        // Build the chart container
        $output = '<div class="urban-top-40-artist-chart" id="' . esc_attr($chart_id) . '" ';
        $output .= 'data-artist="' . esc_attr($atts['artist']) . '" ';
        $output .= 'data-height="' . esc_attr($atts['height']) . '" ';
        $output .= 'data-width="' . esc_attr($atts['width']) . '" ';
        $output .= 'data-show-legend="' . esc_attr($atts['show_legend']) . '" ';
        $output .= 'data-chart-type="' . esc_attr($atts['chart_type']) . '">';
        
        $output .= '<div class="chart-loading">Loading chart data...</div>';
        $output .= '<div class="chart-container" style="display: none;">';
        $output .= '<div class="chart-header">';
        $output .= '<h3 class="artist-name"></h3>';
        $output .= '<div class="chart-stats"></div>';
        $output .= '</div>';
        $output .= '<div class="chart-wrapper">';
        $output .= '<div class="chart-scroll-container">';
        $output .= '<div class="chart-content"></div>';
        $output .= '</div>';
        $output .= '</div>';
        $output .= '</div>';
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Enqueue frontend assets
     */
    public function enqueue_frontend_assets() {
        // Only load if shortcode is present on the page
        global $post;
        if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'artist_chart')) {
            wp_enqueue_script(
                'urban-top-40-artist-charts',
                URBAN_TOP_40_PLUGIN_URL . 'modules/artist-charts/artist-charts.js',
                array('jquery'),
                URBAN_TOP_40_VERSION,
                true
            );
            
            wp_enqueue_style(
                'urban-top-40-artist-charts',
                URBAN_TOP_40_PLUGIN_URL . 'modules/artist-charts/artist-charts.css',
                array(),
                URBAN_TOP_40_VERSION
            );
            
            // Localize script
            wp_localize_script('urban-top-40-artist-charts', 'urbanTop40Charts', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('urban_top_40_charts_nonce'),
                'plugin_url' => URBAN_TOP_40_PLUGIN_URL
            ));
        }
    }
    
    /**
     * Add admin menu for chart management
     */
    public function add_admin_menu() {
        add_submenu_page(
            'urban-top-40', // Parent slug
            'Artist Charts', // Page title
            'Artist Charts', // Menu title
            'manage_options', // Capability
            'urban-top-40-artist-charts', // Menu slug
            array($this, 'admin_page') // Callback function
        );
    }
    
    /**
     * Admin page for chart management
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Artist Charts Management</h1>
            
            <div class="urban-top-40-admin-grid">
                <div class="urban-top-40-admin-card">
                    <h2>Available Artists</h2>
                    <p>Manage artist chart data and view available TypeScript files.</p>
                    
                    <div class="artist-files-list">
                        <?php $this->display_available_artists(); ?>
                    </div>
                </div>
                
                <div class="urban-top-40-admin-card">
                    <h2>Shortcode Usage</h2>
                    <p>Use these shortcodes to display artist charts on your pages and posts:</p>
                    
                    <div class="shortcode-examples">
                        <h3>Basic Usage:</h3>
                        <code>[artist_chart artist="the_beatles"]</code>
                        
                        <h3>With Custom Options:</h3>
                        <code>[artist_chart artist="the_beatles" height="500" width="100%" show_legend="true" chart_type="line"]</code>
                        
                        <h3>Parameters:</h3>
                        <ul>
                            <li><strong>artist</strong> - The artist identifier (required)</li>
                            <li><strong>height</strong> - Chart height in pixels (default: 400)</li>
                            <li><strong>width</strong> - Chart width (default: 100%)</li>
                            <li><strong>show_legend</strong> - Show/hide legend (default: true)</li>
                            <li><strong>chart_type</strong> - Chart type: line, area, or bar (default: line)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Display available artists from TypeScript files
     */
    private function display_available_artists() {
        $artist_charts_dir = URBAN_TOP_40_PLUGIN_DIR . 'assets/artistcharts/';
        
        if (!is_dir($artist_charts_dir)) {
            echo '<p>No artist charts directory found.</p>';
            return;
        }
        
        $ts_files = glob($artist_charts_dir . '*.ts');
        
        if (empty($ts_files)) {
            echo '<p>No TypeScript files found in artist charts directory.</p>';
            return;
        }
        
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>Artist</th><th>File</th><th>Shortcode</th></tr></thead>';
        echo '<tbody>';
        
        foreach ($ts_files as $file) {
            $filename = basename($file, '.ts');
            $artist_name = str_replace('_', ' ', $filename);
            $shortcode = '[artist_chart artist="' . $filename . '"]';
            
            echo '<tr>';
            echo '<td>' . esc_html(ucwords($artist_name)) . '</td>';
            echo '<td>' . esc_html(basename($file)) . '</td>';
            echo '<td><code>' . esc_html($shortcode) . '</code></td>';
            echo '</tr>';
        }
        
        echo '</tbody></table>';
    }
    
    /**
     * AJAX handler for getting artist chart data
     */
    public function get_artist_chart_data() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'urban_top_40_charts_nonce')) {
            wp_die('Security check failed');
        }
        
        $artist = sanitize_text_field($_POST['artist']);
        
        if (empty($artist)) {
            wp_send_json_error('Artist parameter is required');
        }
        
        // Get the TypeScript file path
        $ts_file_path = URBAN_TOP_40_PLUGIN_DIR . 'assets/artistcharts/' . $artist . '.ts';
        
        if (!file_exists($ts_file_path)) {
            wp_send_json_error('Artist data file not found');
        }
        
        // Read and parse the TypeScript file
        $ts_content = file_get_contents($ts_file_path);
        
        if ($ts_content === false) {
            wp_send_json_error('Unable to read artist data file');
        }
        
        // Extract the data object from the TypeScript file
        // This is a simple approach - in production you might want to use a proper TS parser
        $data_pattern = '/export const ' . preg_quote($artist) . 'Data\s*=\s*({.*?});/s';
        if (preg_match($data_pattern, $ts_content, $matches)) {
            // Convert the JavaScript object to PHP array
            $json_data = $matches[1];
            
            // Clean up the data to make it valid JSON
            $json_data = preg_replace('/,\s*}/', '}', $json_data); // Remove trailing commas
            $json_data = preg_replace('/,\s*]/', ']', $json_data); // Remove trailing commas in arrays
            
            // Try to decode as JSON
            $artist_data = json_decode($json_data, true);
            
            if ($artist_data === null) {
                wp_send_json_error('Unable to parse artist data');
            }
            
            wp_send_json_success($artist_data);
        } else {
            wp_send_json_error('Unable to extract artist data from file');
        }
    }
}

// Initialize the module
new UrbanTop40_Artist_Charts();

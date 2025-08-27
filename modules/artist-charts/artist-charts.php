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
        
        // Add debug action for development
        if (defined('WP_DEBUG') && WP_DEBUG) {
            add_action('wp_ajax_debug_artist_charts_paths', array($this, 'debug_artist_charts_paths'));
            add_action('wp_ajax_nopriv_debug_artist_charts_paths', array($this, 'debug_artist_charts_paths'));
        }
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
             return '<p>Error: Artist parameter is required. Usage: [artist_chart artist="the_beatles_data"]</p>';
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
                     <p><strong>Important:</strong> Use the exact filename (without .ts extension) as the artist parameter.</p>
                     <p>Use these shortcodes to display artist charts on your pages and posts:</p>
                    
                    <div class="shortcode-examples">
                                                 <h3>Basic Usage:</h3>
                         <code>[artist_chart artist="the_beatles_data"]</code>
                         
                         <h3>With Custom Options:</h3>
                         <code>[artist_chart artist="the_beatles_data" height="500" width="100%" show_legend="true" chart_type="line"]</code>
                        
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
                
                <div class="urban-top-40-admin-card">
                    <h2>Debug & Testing</h2>
                    <p>Use these tools to troubleshoot any issues:</p>
                    
                    <div class="debug-tools">
                        <h3>Test Chart Data Loading:</h3>
                        <button type="button" class="button button-secondary" onclick="testArtistChartData()">Test Data Loading</button>
                        <div id="test-results" style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px; display: none;"></div>
                        
                        <h3>Debug Paths (WP_DEBUG only):</h3>
                        <?php if (defined('WP_DEBUG') && WP_DEBUG): ?>
                            <button type="button" class="button button-secondary" onclick="debugArtistChartPaths()">Debug Paths</button>
                            <div id="debug-results" style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px; display: none;"></div>
                        <?php else: ?>
                            <p><em>Enable WP_DEBUG in wp-config.php to access debug tools</em></p>
                        <?php endif; ?>
                    </div>
                    
                    <script>
                    function testArtistChartData() {
                        const resultsDiv = document.getElementById('test-results');
                        resultsDiv.style.display = 'block';
                        resultsDiv.innerHTML = 'Testing...';
                        
                                                 jQuery.post(ajaxurl, {
                             action: 'get_artist_chart_data',
                             artist: 'the_beatles_data',
                             nonce: '<?php echo wp_create_nonce('urban_top_40_charts_nonce'); ?>'
                         })
                        .done(function(response) {
                            if (response.success) {
                                resultsDiv.innerHTML = '<div style="color: green;"><strong>✓ Success!</strong> Data loaded successfully.<br>Artist: ' + response.data.name + '<br>Songs: ' + response.data.totalSongs + '</div>';
                            } else {
                                resultsDiv.innerHTML = '<div style="color: red;"><strong>✗ Error:</strong> ' + response.data + '</div>';
                            }
                        })
                        .fail(function(xhr, status, error) {
                            resultsDiv.innerHTML = '<div style="color: red;"><strong>✗ AJAX Error:</strong> ' + error + '</div>';
                        });
                    }
                    
                    function debugArtistChartPaths() {
                        const resultsDiv = document.getElementById('debug-results');
                        resultsDiv.style.display = 'block';
                        resultsDiv.innerHTML = 'Debugging...';
                        
                        jQuery.post(ajaxurl, {
                            action: 'debug_artist_charts_paths',
                            nonce: '<?php echo wp_create_nonce('urban_top_40_charts_nonce'); ?>'
                        })
                        .done(function(response) {
                            if (response.success) {
                                let debugHtml = '<div style="color: blue;"><strong>Debug Information:</strong></div>';
                                debugHtml += '<pre style="background: #fff; padding: 10px; border: 1px solid #ddd; overflow: auto; max-height: 400px;">';
                                debugHtml += JSON.stringify(response.data, null, 2);
                                debugHtml += '</pre>';
                                resultsDiv.innerHTML = debugHtml;
                            } else {
                                resultsDiv.innerHTML = '<div style="color: red;"><strong>✗ Debug Error:</strong> ' + response.data + '</div>';
                            }
                        })
                        .fail(function(xhr, status, error) {
                            resultsDiv.innerHTML = '<div style="color: red;"><strong>✗ AJAX Error:</strong> ' + error + '</div>';
                        });
                    }
                    </script>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Display available artists from TypeScript files
     */
    private function display_available_artists() {
        $artist_charts_dir = $this->get_artist_charts_directory();
        
        if (!$artist_charts_dir) {
            echo '<p>No artist charts directory found. Debug info:</p>';
            echo '<ul>';
            echo '<li>URBAN_TOP_40_PLUGIN_DIR: ' . (defined('URBAN_TOP_40_PLUGIN_DIR') ? URBAN_TOP_40_PLUGIN_DIR : 'Not defined') . '</li>';
            echo '<li>plugin_dir_path: ' . plugin_dir_path(dirname(dirname(__FILE__))) . '</li>';
            echo '<li>Current file: ' . __FILE__ . '</li>';
            echo '<li>WP_CONTENT_DIR: ' . (defined('WP_CONTENT_DIR') ? WP_CONTENT_DIR : 'Not defined') . '</li>';
            echo '</ul>';
            return;
        }
        
        $ts_files = glob($artist_charts_dir . '*.ts');
        
        if (empty($ts_files)) {
            echo '<p>No TypeScript files found in artist charts directory: ' . esc_html($artist_charts_dir) . '</p>';
            return;
        }
        
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>Artist</th><th>File</th><th>Shortcode</th><th>Status</th></tr></thead>';
        echo '<tbody>';
        
        foreach ($ts_files as $file) {
            $filename = basename($file, '.ts');
            $artist_name = str_replace('_', ' ', $filename);
            $shortcode = '[artist_chart artist="' . $filename . '"]';
            $status = is_readable($file) ? '<span style="color: green;">✓ Readable</span>' : '<span style="color: red;">✗ Not readable</span>';
            
            echo '<tr>';
            echo '<td>' . esc_html(ucwords($artist_name)) . '</td>';
            echo '<td>' . esc_html(basename($file)) . '</td>';
            echo '<td><code>' . esc_html($shortcode) . '</code></td>';
            echo '<td>' . $status . '</td>';
            echo '</tr>';
        }
        
        echo '</tbody></table>';
        
        // Add debug information
        echo '<div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #0073aa;">';
        echo '<h4>Debug Information:</h4>';
        echo '<p><strong>Artist Charts Directory:</strong> ' . esc_html($artist_charts_dir) . '</p>';
        echo '<p><strong>Directory exists:</strong> ' . (is_dir($artist_charts_dir) ? 'Yes' : 'No') . '</p>';
        echo '<p><strong>Directory readable:</strong> ' . (is_readable($artist_charts_dir) ? 'Yes' : 'No') . '</p>';
        echo '<p><strong>Files found:</strong> ' . count($ts_files) . '</p>';
        
                 // Check specific file existence
         $test_file = $artist_charts_dir . 'the_beatles_data.ts';
         echo '<p><strong>Test file (the_beatles_data.ts):</strong> ' . esc_html($test_file) . '</p>';
         echo '<p><strong>File exists:</strong> ' . (file_exists($test_file) ? 'Yes' : 'No') . '</p>';
         echo '<p><strong>File readable:</strong> ' . (is_readable($test_file) ? 'Yes' : 'No') . '</p>';
         if (file_exists($test_file)) {
             echo '<p><strong>File size:</strong> ' . number_format(filesize($test_file)) . ' bytes</p>';
             echo '<p><strong>File permissions:</strong> ' . substr(sprintf('%o', fileperms($test_file)), -4) . '</p>';
         }
        echo '</div>';
    }
    
    /**
     * Get the artist charts directory with multiple fallback methods
     */
    private function get_artist_charts_directory() {
        // Method 1: Use plugin directory constant
        if (defined('URBAN_TOP_40_PLUGIN_DIR')) {
            $path = URBAN_TOP_40_PLUGIN_DIR . 'assets/artistcharts/';
            if (is_dir($path)) {
                return $path;
            }
        }
        
        // Method 2: Use WordPress plugin directory functions
        $plugin_dir = plugin_dir_path(dirname(dirname(__FILE__)));
        $path = $plugin_dir . 'assets/artistcharts/';
        if (is_dir($path)) {
            return $path;
        }
        
        // Method 3: Use relative path from current file
        $current_dir = dirname(__FILE__);
        $path = $current_dir . '/../../assets/artistcharts/';
        if (is_dir($path)) {
            return $path;
        }
        
        // Method 4: Use WordPress content directory
        if (defined('WP_CONTENT_DIR')) {
            // Try multiple possible plugin directory names (case sensitivity issue)
            $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
            foreach ($possible_plugin_dirs as $plugin_dir) {
                $path = WP_CONTENT_DIR . '/plugins/' . $plugin_dir . '/assets/artistcharts/';
                if (is_dir($path)) {
                    return $path;
                }
            }
        }
        
        // Method 5: Use ABSPATH
        if (defined('ABSPATH')) {
            // Try multiple possible plugin directory names (case sensitivity issue)
            $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
            foreach ($possible_plugin_dirs as $plugin_dir) {
                $path = ABSPATH . 'wp-content/plugins/' . $plugin_dir . '/assets/artistcharts/';
                if (is_dir($path)) {
                    return $path;
                }
            }
        }
        
        return false;
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
        
        // Get the TypeScript file path using multiple fallback methods
        $ts_file_path = $this->get_artist_file_path($artist);
        
        if (!$ts_file_path) {
            // Add more detailed debugging
            $debug_info = array(
                'artist' => $artist,
                'checked_paths' => $this->get_debug_paths($artist),
                'file_exists_checks' => array()
            );
            
            // Check if the file actually exists at each path
            $all_paths = array();
            if (defined('URBAN_TOP_40_PLUGIN_DIR')) {
                $all_paths[] = URBAN_TOP_40_PLUGIN_DIR . 'assets/artistcharts/' . $artist . '.ts';
            }
            $all_paths[] = plugin_dir_path(dirname(dirname(__FILE__))) . 'assets/artistcharts/' . $artist . '.ts';
            $all_paths[] = dirname(__FILE__) . '/../../assets/artistcharts/' . $artist . '.ts';
            
            if (defined('WP_CONTENT_DIR')) {
                $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
                foreach ($possible_plugin_dirs as $plugin_dir) {
                    $all_paths[] = WP_CONTENT_DIR . '/plugins/' . $plugin_dir . '/assets/artistcharts/' . $artist . '.ts';
                }
            }
            
            if (defined('ABSPATH')) {
                $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
                foreach ($possible_plugin_dirs as $plugin_dir) {
                    $all_paths[] = ABSPATH . 'wp-content/plugins/' . $plugin_dir . '/assets/artistcharts/' . $artist . '.ts';
                }
            }
            
            foreach ($all_paths as $path) {
                $debug_info['file_exists_checks'][$path] = array(
                    'exists' => file_exists($path),
                    'is_readable' => is_readable($path),
                    'size' => file_exists($path) ? filesize($path) : 'N/A',
                    'permissions' => file_exists($path) ? substr(sprintf('%o', fileperms($path)), -4) : 'N/A'
                );
            }
            
            wp_send_json_error('Artist data file not found. Debug info: ' . json_encode($debug_info));
        }
        
        // Read and parse the TypeScript file
        $ts_content = file_get_contents($ts_file_path);
        
        if ($ts_content === false) {
            wp_send_json_error('Unable to read artist data file: ' . $ts_file_path);
        }
        
        // Add some debugging information
        $file_size = strlen($ts_content);
        $first_100_chars = substr($ts_content, 0, 100);
        $last_100_chars = substr($ts_content, -100);
        
        // Extract the data object from the TypeScript file
        // This is a simple approach - in production you might want to use a proper TS parser
        
        // First, try to find any export const that ends with 'Data' (with optional type annotation)
        $data_pattern = '/export const ([a-zA-Z_]+Data)(?:\s*:\s*\w+)?\s*=\s*({.*?});/s';
        
        // Debug: Check what we're looking for
        $debug_info = array(
            'pattern' => $data_pattern,
            'file_size' => $file_size,
            'first_100' => $first_100_chars,
            'last_100' => $last_100_chars,
            'regex_result' => preg_match($data_pattern, $ts_content, $matches),
            'matches' => $matches
        );
        
        if (preg_match($data_pattern, $ts_content, $matches)) {
            $export_name = $matches[1];
            $json_data = $matches[2];
            
            // Clean up the data to make it valid JSON
            $json_data = preg_replace('/,\s*}/', '}', $json_data); // Remove trailing commas
            $json_data = preg_replace('/,\s*]/', ']', $json_data); // Remove trailing commas in arrays
            
            // Try to decode as JSON
            $artist_data = json_decode($json_data, true);
            
            if ($artist_data === null) {
                wp_send_json_error('Unable to parse artist data. JSON decode failed. Export name found: ' . $export_name . '. JSON data: ' . substr($json_data, 0, 200));
            }
            
            wp_send_json_success($artist_data);
        } else {
            // Try to find export default with the data - simpler approach (with optional type annotation)
            $default_pattern = '/export const ([a-zA-Z_]+Data)(?:\s*:\s*\w+)?\s*=\s*({.*?});/s';
            if (preg_match($default_pattern, $ts_content, $matches)) {
                $export_name = $matches[1];
                $json_data = $matches[2];
                
                // Clean up the data to make it valid JSON
                $json_data = preg_replace('/,\s*}/', '}', $json_data); // Remove trailing commas
                $json_data = preg_replace('/,\s*]/', ']', $json_data); // Remove trailing commas in arrays
                
                // Try to decode as JSON
                $artist_data = json_decode($json_data, true);
                
                if ($artist_data === null) {
                    wp_send_json_error('Unable to parse artist data with default export. JSON decode failed. Export name found: ' . $export_name);
                }
                
                wp_send_json_success($artist_data);
            } else {
                // If the first patterns fail, try a more flexible approach
                // Look for any object assignment that might contain the artist data
                $flexible_pattern = '/export const \w+\s*=\s*({[^}]+"name"\s*:\s*"[^"]*' . preg_quote(str_replace('_', ' ', $artist)) . '[^"]*"[^}]*});/s';
                if (preg_match($flexible_pattern, $ts_content, $matches)) {
                    $json_data = $matches[1];
                    
                    // Clean up the data to make it valid JSON
                    $json_data = preg_replace('/,\s*}/', '}', $json_data); // Remove trailing commas
                    $json_data = preg_replace('/,\s*]/', ']', $json_data); // Remove trailing commas in arrays
                    
                    // Try to decode as JSON
                    $artist_data = json_decode($json_data, true);
                    
                    if ($artist_data === null) {
                        wp_send_json_error('Unable to parse artist data with flexible pattern. JSON decode failed.');
                    }
                    
                    wp_send_json_success($artist_data);
                } else {
                    wp_send_json_error('Unable to extract artist data from file. No matching export pattern found. Debug info: ' . json_encode($debug_info));
                }
            }
        }
    }
    
    /**
     * Get the artist file path with multiple fallback methods
     */
    private function get_artist_file_path($artist) {
        // Method 1: Use plugin directory constant
        if (defined('URBAN_TOP_40_PLUGIN_DIR')) {
            $path = URBAN_TOP_40_PLUGIN_DIR . 'assets/artistcharts/' . $artist . '.ts';
            if (file_exists($path)) {
                return $path;
            }
        }
        
        // Method 2: Use WordPress plugin directory functions
        $plugin_dir = plugin_dir_path(dirname(dirname(__FILE__)));
        $path = $plugin_dir . 'assets/artistcharts/' . $artist . '.ts';
        if (file_exists($path)) {
            return $path;
        }
        
        // Method 3: Use relative path from current file
        $current_dir = dirname(__FILE__);
        $path = $current_dir . '/../../assets/artistcharts/' . $artist . '.ts';
        if (file_exists($path)) {
            return $path;
        }
        
        // Method 4: Use WordPress content directory
        if (defined('WP_CONTENT_DIR')) {
            // Try multiple possible plugin directory names (case sensitivity issue)
            $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
            foreach ($possible_plugin_dirs as $plugin_dir) {
                $path = WP_CONTENT_DIR . '/plugins/' . $plugin_dir . '/assets/artistcharts/' . $artist . '.ts';
                if (file_exists($path)) {
                    return $path;
                }
            }
        }
        
        // Method 5: Use ABSPATH
        if (defined('ABSPATH')) {
            // Try multiple possible plugin directory names (case sensitivity issue)
            $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
            foreach ($possible_plugin_dirs as $plugin_dir) {
                $path = ABSPATH . 'wp-content/plugins/' . $plugin_dir . '/assets/artistcharts/' . $artist . '.ts';
                if (file_exists($path)) {
                    return $path;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Get debug information about paths that were checked
     */
    private function get_debug_paths($artist) {
        $paths = array();
        
        if (defined('URBAN_TOP_40_PLUGIN_DIR')) {
            $paths[] = 'URBAN_TOP_40_PLUGIN_DIR: ' . URBAN_TOP_40_PLUGIN_DIR . 'assets/artistcharts/' . $artist . '.ts';
        }
        
        $plugin_dir = plugin_dir_path(dirname(dirname(__FILE__)));
        $paths[] = 'plugin_dir_path: ' . $plugin_dir . 'assets/artistcharts/' . $artist . '.ts';
        
        $current_dir = dirname(__FILE__);
        $paths[] = 'relative path: ' . $current_dir . '/../../assets/artistcharts/' . $artist . '.ts';
        
        if (defined('WP_CONTENT_DIR')) {
            // Show multiple possible plugin directory names
            $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
            foreach ($possible_plugin_dirs as $plugin_dir) {
                $paths[] = 'WP_CONTENT_DIR/' . $plugin_dir . ': ' . WP_CONTENT_DIR . '/plugins/' . $plugin_dir . '/assets/artistcharts/' . $artist . '.ts';
            }
        }
        
        if (defined('ABSPATH')) {
            // Show multiple possible plugin directory names
            $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
            foreach ($possible_plugin_dirs as $plugin_dir) {
                $paths[] = 'ABSPATH/' . $plugin_dir . ': ' . ABSPATH . 'wp-content/plugins/' . $plugin_dir . '/assets/artistcharts/' . $artist . '.ts';
            }
        }
        
        return implode(', ', $paths);
    }
    
    /**
     * Debug method to help troubleshoot path issues
     */
    public function debug_artist_charts_paths() {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $debug_info = array(
            'plugin_file' => __FILE__,
            'current_dir' => dirname(__FILE__),
            'parent_dir' => dirname(dirname(__FILE__)),
            'grandparent_dir' => dirname(dirname(dirname(__FILE__))),
            'constants' => array(
                'URBAN_TOP_40_PLUGIN_DIR' => defined('URBAN_TOP_40_PLUGIN_DIR') ? URBAN_TOP_40_PLUGIN_DIR : 'Not defined',
                'URBAN_TOP_40_PLUGIN_URL' => defined('URBAN_TOP_40_PLUGIN_URL') ? URBAN_TOP_40_PLUGIN_URL : 'Not defined',
                'WP_CONTENT_DIR' => defined('WP_CONTENT_DIR') ? WP_CONTENT_DIR : 'Not defined',
                'ABSPATH' => defined('ABSPATH') ? ABSPATH : 'Not defined',
                'WP_PLUGIN_DIR' => defined('WP_PLUGIN_DIR') ? WP_PLUGIN_DIR : 'Not defined'
            ),
            'functions' => array(
                'plugin_dir_path' => plugin_dir_path(dirname(dirname(__FILE__))),
                'plugin_dir_url' => plugin_dir_url(dirname(dirname(__FILE__))),
                'get_template_directory' => get_template_directory(),
                'get_stylesheet_directory' => get_stylesheet_directory()
            ),
            'test_paths' => array()
        );
        
        // Test various paths
        $test_paths = array(
            'URBAN_TOP_40_PLUGIN_DIR/assets/artistcharts/' => defined('URBAN_TOP_40_PLUGIN_DIR') ? URBAN_TOP_40_PLUGIN_DIR . 'assets/artistcharts/' : null,
            'plugin_dir_path/assets/artistcharts/' => plugin_dir_path(dirname(dirname(__FILE__))) . 'assets/artistcharts/',
            'relative_path/../../assets/artistcharts/' => dirname(__FILE__) . '/../../assets/artistcharts/'
        );
        
        // Test multiple possible plugin directory names for case sensitivity
        if (defined('WP_CONTENT_DIR')) {
            $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
            foreach ($possible_plugin_dirs as $plugin_dir) {
                $test_paths['WP_CONTENT_DIR/plugins/' . $plugin_dir . '/assets/artistcharts/'] = WP_CONTENT_DIR . '/plugins/' . $plugin_dir . '/assets/artistcharts/';
            }
        }
        
        if (defined('ABSPATH')) {
            $possible_plugin_dirs = array('urban-top-40', 'urbantop40', 'UrbanTop40');
            foreach ($possible_plugin_dirs as $plugin_dir) {
                $test_paths['ABSPATH/wp-content/plugins/' . $plugin_dir . '/assets/artistcharts/'] = ABSPATH . 'wp-content/plugins/' . $plugin_dir . '/assets/artistcharts/';
            }
        }
        
        foreach ($test_paths as $label => $path) {
            if ($path) {
                $debug_info['test_paths'][$label] = array(
                    'path' => $path,
                    'exists' => file_exists($path),
                    'is_dir' => is_dir($path),
                    'is_readable' => is_readable($path),
                    'contents' => is_dir($path) ? scandir($path) : 'Not a directory'
                );
            }
        }
        
        wp_send_json_success($debug_info);
    }
}

// Initialize the module
new UrbanTop40_Artist_Charts();

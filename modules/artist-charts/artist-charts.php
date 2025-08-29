<?php
/**
 * Artist Charts Module
 * 
 * Displays Billboard chart history for specific artists
 * Currently supports The Beatles with their chart data
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class UrbanTop40_ArtistCharts {
    
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('artist_charts', array($this, 'render_artist_charts'));
        add_shortcode('artist_songs', array($this, 'render_artist_songs'));
        add_action('wp_ajax_get_artist_charts', array($this, 'ajax_get_artist_charts'));
        add_action('wp_ajax_nopriv_get_artist_charts', array($this, 'ajax_get_artist_charts'));
    }
    
    /**
     * Enqueue necessary scripts and styles
     */
    public function enqueue_scripts() {
        // Option 1: Load Chart.js from CDN (recommended for development)
        wp_enqueue_script(
            'chartjs',
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
            array(),
            '4.4.0',
            false
        );
        
        // Enqueue Chart.js Date Adapter for proper date handling
        wp_enqueue_script(
            'chartjs-adapter-date-fns',
            'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js',
            array('chartjs'),
            '3.0.0',
            false
        );
        
        // Alternative: Load Chart.js locally if CDN fails
        // Uncomment the lines below and comment out the CDN version above if needed
        /*
        wp_enqueue_script(
            'chartjs',
            plugin_dir_url(__FILE__) . 'lib/chart.umd.js',
            array(),
            '4.4.0',
            false
        );
        
        wp_enqueue_script(
            'chartjs-adapter-date-fns',
            plugin_dir_url(__FILE__) . 'lib/chartjs-adapter-date-fns.bundle.min.js',
            array('chartjs'),
            '3.0.0',
            false
        );
        */
        
        // Enqueue all modular JavaScript files
        wp_enqueue_script(
            'chart-data-processor',
            plugin_dir_url(__FILE__) . 'data-processor.js',
            array('jquery'),
            '1.0.0',
            true
        );
        
        wp_enqueue_script(
            'chart-scrollbar',
            plugin_dir_url(__FILE__) . 'scrollbar.js',
            array('jquery'),
            '1.0.0',
            true
        );
        
        wp_enqueue_script(
            'chart-core',
            plugin_dir_url(__FILE__) . 'chart-core.js',
            array('jquery', 'chart-data-processor'),
            '1.0.0',
            true
        );
        
        wp_enqueue_script(
            'artist-charts-main',
            plugin_dir_url(__FILE__) . 'artist-charts-main.js',
            array('jquery', 'chart-data-processor', 'chart-scrollbar', 'chart-core'),
            '1.0.0',
            true
        );
        
        wp_enqueue_script(
            'artist-charts-js',
            plugin_dir_url(__FILE__) . 'artist-charts.js',
            array('jquery', 'chartjs', 'chartjs-adapter-date-fns', 'chart-data-processor', 'chart-scrollbar', 'chart-core', 'artist-charts-main'),
            '1.0.0',
            true
        );
        
        // Ensure jQuery is loaded in footer
        wp_enqueue_script('jquery');
        
        wp_enqueue_style(
            'artist-charts-css',
            plugin_dir_url(__FILE__) . 'artist-charts.css',
            array(),
            '1.0.0'
        );
        
        // Localize script with AJAX URL and nonce
        wp_localize_script('artist-charts-main', 'artistChartsAjax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('artist_charts_nonce')
        ));
        
        // Also localize to the main artist-charts-js script
        wp_localize_script('artist-charts-js', 'artistChartsAjax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('artist_charts_nonce')
        ));
    }
    
    /**
     * Shortcode to render artist charts
     */
    public function render_artist_charts($atts) {
        $atts = shortcode_atts(array(
            'artist' => 'the beatles',
            'width' => '100%',
            'height' => '600px'
        ), $atts);
        
        $artist = sanitize_text_field($atts['artist']);
        $width = sanitize_text_field($atts['width']);
        $height = sanitize_text_field($atts['height']);
        
        ob_start();
        ?>
        <div class="artist-charts-container" 
             data-artist="<?php echo esc_attr($artist); ?>"
             style="width: <?php echo esc_attr($width); ?>; height: <?php echo esc_attr($height); ?>;">
            
            <div class="artist-charts-header">
                <div class="artist-charts-title-section">
                    <h2 class="artist-charts-title"><?php echo esc_html(strtoupper($artist)); ?></h2>
                    <div class="artist-charts-subtitle">Billboard Hot 100 Chart History</div>
                </div>
                <div class="artist-charts-controls">
                    <div class="chart-control-button" id="song-count">Loading...</div>
                    <div class="chart-control-button" id="week-count">Loading...</div>
                </div>
            </div>
            
            <div class="artist-charts-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading chart data...</div>
            </div>
            
            <div class="artist-charts-error" style="display: none;">
                <div class="error-message"></div>
                <button class="error-retry">Retry</button>
            </div>
            
            <div class="artist-charts-content" style="display: none;">
                <div class="chart-area" id="chart-area">
                    <div class="chart-container" id="chart-container"></div>
                    <div class="zoom-hint-subtle">Scroll to zoom • Shift+Scroll to pan</div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Shortcode to render artist songs list
     */
    public function render_artist_songs($atts) {
        $atts = shortcode_atts(array(
            'artist' => 'the beatles',
            'width' => '100%'
        ), $atts);
        
        $artist = sanitize_text_field($atts['artist']);
        $width = sanitize_text_field($atts['width']);
        
        ob_start();
        ?>
        <div class="artist-songs-container" 
             data-artist="<?php echo esc_attr($artist); ?>"
             style="width: <?php echo esc_attr($width); ?>;">
            
            <div class="artist-songs-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading songs...</div>
            </div>
            
            <div class="artist-songs-error" style="display: none;">
                <div class="error-message"></div>
                <button class="error-retry">Retry</button>
            </div>
            
            <div class="artist-songs-content" style="display: none;">
                <div class="song-legend">
                    <div class="song-legend-title">Songs</div>
                    <div class="song-legend-scroll" id="song-legend"></div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * AJAX handler to get artist chart data
     */
    public function ajax_get_artist_charts() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'artist_charts_nonce')) {
            wp_die('Security check failed');
        }
        
        $artist = sanitize_text_field($_POST['artist']);
        
        // Normalize artist name for comparison
        $normalized_artist = strtolower(trim($artist));
        $supported_artists = array('the beatles', 'beatles', 'beatle');
        
        // Check if the artist is supported (currently only The Beatles)
        $is_supported = false;
        foreach ($supported_artists as $supported) {
            if (strpos($normalized_artist, $supported) !== false) {
                $is_supported = true;
                $artist = 'The Beatles'; // Normalize to official name
                break;
            }
        }
        
        if (!$is_supported) {
            wp_send_json_error('Artist not supported yet. Currently only "The Beatles" is available. You requested: "' . $artist . '"');
        }
        
        // Get the Beatles data from the assets file
        $beatles_data_path = plugin_dir_path(__FILE__) . '../../assets/artistcharts/the_beatles_data.ts';
        
        if (!file_exists($beatles_data_path)) {
            wp_send_json_error('Artist data file not found at: ' . $beatles_data_path);
        }
        
        // Read and parse the TypeScript file to extract the data
        $file_content = file_get_contents($beatles_data_path);
        
        if ($file_content === false) {
            wp_send_json_error('Failed to read artist data file');
        }
        
        // Debug: Log file content length
        error_log('Beatles data file size: ' . strlen($file_content) . ' bytes');
        
        // Extract the JSON data from the TypeScript export
        if (preg_match('/export const the_beatlesData: ExportedArtistData = ({.*});/s', $file_content, $matches)) {
            $json_data = $matches[1];
            
            // Clean up the JSON data (remove comments, fix quotes, etc.)
            $json_data = $this->clean_typescript_json($json_data);
            
            // Debug: Log the cleaned JSON for troubleshooting
            error_log('Cleaned JSON data length: ' . strlen($json_data) . ' bytes');
            error_log('Cleaned JSON data preview: ' . substr($json_data, 0, 500) . '...');
            
            // Decode the JSON
            $artist_data = json_decode($json_data, true);
            
            if ($artist_data) {
                // Update the artist name in the data to match what was requested
                $artist_data['artist'] = $artist;
                error_log('Successfully parsed artist data with ' . count($artist_data['songs']) . ' songs');
                wp_send_json_success($artist_data);
            } else {
                // Get JSON error details
                $json_error = json_last_error_msg();
                $json_error_code = json_last_error();
                error_log('JSON decode error code: ' . $json_error_code);
                error_log('JSON decode error: ' . $json_error);
                error_log('JSON data that failed to parse: ' . substr($json_data, 0, 1000));
                wp_send_json_error('Failed to parse artist data: ' . $json_error . ' (Code: ' . $json_error_code . ')');
            }
        } else {
            error_log('Failed to extract data from TypeScript file - regex did not match');
            error_log('File content preview: ' . substr($file_content, 0, 500) . '...');
            wp_send_json_error('Could not extract data from TypeScript file - pattern not found');
        }
    }
    
    /**
     * Clean TypeScript JSON data for PHP parsing
     */
    private function clean_typescript_json($json_string) {
        // Remove single-line comments
        $json_string = preg_replace('/\/\/.*$/m', '', $json_string);
        
        // Remove multi-line comments
        $json_string = preg_replace('/\/\*.*?\*\//s', '', $json_string);
        
        // Remove export statement and type annotation
        $json_string = preg_replace('/export const the_beatlesData: ExportedArtistData = /', '', $json_string);
        
        // Remove trailing semicolon
        $json_string = rtrim($json_string, ';');
        
        // Fix trailing commas before closing brackets/braces
        $json_string = preg_replace('/,(\s*[}\]])/m', '$1', $json_string);
        
        // Handle any remaining TypeScript-specific syntax
        $json_string = preg_replace('/:\s*ExportedArtistData\s*=\s*/', '', $json_string);
        
        // Clean up any extra whitespace
        $json_string = trim($json_string);
        
        return $json_string;
    }
}

// Initialize the module
$urban_top40_artist_charts = new UrbanTop40_ArtistCharts();

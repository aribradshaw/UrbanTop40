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
    
    public function __init__() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('artist_charts', array($this, 'render_artist_charts'));
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
        
        // Enqueue our custom script (depends on Chart.js and jQuery)
        wp_enqueue_script(
            'artist-charts-js',
            plugin_dir_url(__FILE__) . 'artist-charts.js',
            array('jquery', 'chartjs', 'chartjs-adapter-date-fns'),
            '1.0.0',
            true
        );
        
        wp_enqueue_style(
            'artist-charts-css',
            plugin_dir_url(__FILE__) . 'artist-charts.css',
            array(),
            '1.0.0'
        );
        
        // Localize script with AJAX URL and nonce
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
                <h2 class="artist-charts-title"><?php echo esc_html(ucwords($artist)); ?> - Billboard Chart History</h2>
                <div class="artist-charts-controls">
                    <div class="chart-control-button" id="song-count">Loading...</div>
                    <div class="chart-control-button" id="week-count">Loading...</div>
                    <div class="chart-control-button" id="zoom-level">Zoom: 100%</div>
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
                    <div class="zoom-hint">Scroll wheel to zoom in/out</div>
                    <div class="chart-container" id="chart-container"></div>
                </div>
                
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
        
        // Currently only support The Beatles
        if (strtolower($artist) !== 'the beatles') {
            wp_send_json_error('Artist not supported yet. Currently only "The Beatles" is available.');
        }
        
        // Get the Beatles data from the assets file
        $beatles_data_path = plugin_dir_path(__FILE__) . '../../assets/artistcharts/the_beatles_data.ts';
        
        if (!file_exists($beatles_data_path)) {
            wp_send_json_error('Artist data file not found');
        }
        
        // Read and parse the TypeScript file to extract the data
        $file_content = file_get_contents($beatles_data_path);
        
        // Extract the JSON data from the TypeScript export
        if (preg_match('/export const the_beatlesData: ExportedArtistData = ({.*});/s', $file_content, $matches)) {
            $json_data = $matches[1];
            
            // Clean up the JSON data (remove comments, fix quotes, etc.)
            $json_data = $this->clean_typescript_json($json_data);
            
            // Decode the JSON
            $artist_data = json_decode($json_data, true);
            
            if ($artist_data) {
                wp_send_json_success($artist_data);
            } else {
                wp_send_json_error('Failed to parse artist data');
            }
        } else {
            wp_send_json_error('Could not extract data from TypeScript file');
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
        
        // Fix trailing commas
        $json_string = preg_replace('/,(\s*[}\]])/m', '$1', $json_string);
        
        // Ensure proper quote escaping
        $json_string = str_replace('\\"', '"', $json_string);
        $json_string = str_replace('"', '\\"', $json_string);
        $json_string = str_replace('\\\\"', '\\"', $json_string);
        
        return $json_string;
    }
}

// Initialize the module
$urban_top40_artist_charts = new UrbanTop40_ArtistCharts();
$urban_top40_artist_charts->__init__();

<?php
/**
 * Spotify Playlists Module for Urban Top 40
 * 
 * This module provides a shortcode to display Spotify playlists
 * from the Urban Top 40 Spotify account
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Spotify Playlists Module Class
 */
class UrbanTop40_Spotify_Playlists {
    
    /**
     * Spotify API credentials and settings
     */
    private $spotify_client_id;
    private $spotify_client_secret;
    private $spotify_user_id = '31xcpdh4uk3l4gx6ftapsawoq4re';
    private $spotify_api_url = 'https://api.spotify.com/v1';
    
    /**
     * Constructor
     */
    public function __construct() {
        // Initialize the module
        add_action('init', array($this, 'init'));
        
        // Add admin menu for Spotify settings
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register settings
        add_action('admin_init', array($this, 'register_settings'));
        
        // Register shortcode
        add_shortcode('spotify_playlists', array($this, 'spotify_playlists_shortcode'));
        
        // Add AJAX handlers for admin
        add_action('wp_ajax_test_spotify_connection', array($this, 'test_spotify_connection'));
    }
    
    /**
     * Initialize the module
     */
    public function init() {
        $this->spotify_client_id = get_option('urban_top_40_spotify_client_id', '');
        $this->spotify_client_secret = get_option('urban_top_40_spotify_client_secret', '');
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_submenu_page(
            'options-general.php',
            'Urban Top 40 Spotify Settings',
            'Urban Top 40 Spotify',
            'manage_options',
            'urban-top-40-spotify',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('urban_top_40_spotify_options', 'urban_top_40_spotify_client_id');
        register_setting('urban_top_40_spotify_options', 'urban_top_40_spotify_client_secret');
    }
    
    /**
     * Admin page content
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Urban Top 40 Spotify Settings</h1>
            <p>Configure your Spotify API credentials to display playlists on your website.</p>
            
            <form method="post" action="options.php">
                <?php settings_fields('urban_top_40_spotify_options'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Spotify Client ID</th>
                        <td>
                            <input type="text" name="urban_top_40_spotify_client_id" 
                                   value="<?php echo esc_attr(get_option('urban_top_40_spotify_client_id')); ?>" 
                                   class="regular-text" />
                            <p class="description">Your Spotify App Client ID</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Spotify Client Secret</th>
                        <td>
                            <input type="password" name="urban_top_40_spotify_client_secret" 
                                   value="<?php echo esc_attr(get_option('urban_top_40_spotify_client_secret')); ?>" 
                                   class="regular-text" />
                            <p class="description">Your Spotify App Client Secret</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            
            <hr>
            
            <h2>Test Connection</h2>
            <p>Test your Spotify API connection to ensure playlists can be fetched.</p>
            <button type="button" id="test-spotify-connection" class="button button-secondary">Test Connection</button>
            <div id="test-results"></div>
            
            <hr>
            
            <h2>Usage</h2>
            <p>Use the shortcode <code>[spotify_playlists]</code> in any post or page to display your Spotify playlists.</p>
            <p>You can also use <code>[spotify_playlists limit="5"]</code> to limit the number of playlists displayed.</p>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#test-spotify-connection').on('click', function() {
                var button = $(this);
                var results = $('#test-results');
                
                button.prop('disabled', true).text('Testing...');
                results.html('<p>Testing connection...</p>');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'test_spotify_connection',
                        nonce: '<?php echo wp_create_nonce('test_spotify_connection'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            results.html('<div class="notice notice-success"><p>' + response.data + '</p></div>');
                        } else {
                            results.html('<div class="notice notice-error"><p>' + response.data + '</p></div>');
                        }
                    },
                    error: function() {
                        results.html('<div class="notice notice-error"><p>Connection test failed.</p></div>');
                    },
                    complete: function() {
                        button.prop('disabled', false).text('Test Connection');
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    /**
     * Test Spotify connection AJAX handler
     */
    public function test_spotify_connection() {
        check_ajax_referer('test_spotify_connection', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $playlists = $this->get_spotify_playlists(5);
        
        if (is_wp_error($playlists)) {
            wp_send_json_error($playlists->get_error_message());
        } else {
            wp_send_json_success('Connection successful! Found ' . count($playlists) . ' playlists.');
        }
    }
    
    /**
     * Get access token from Spotify
     */
    private function get_spotify_access_token() {
        if (empty($this->spotify_client_id) || empty($this->spotify_client_secret)) {
            return new WP_Error('missing_credentials', 'Spotify API credentials are not configured.');
        }
        
        $token_url = 'https://accounts.spotify.com/api/token';
        $credentials = base64_encode($this->spotify_client_id . ':' . $this->spotify_client_secret);
        
        $response = wp_remote_post($token_url, array(
            'headers' => array(
                'Authorization' => 'Basic ' . $credentials,
                'Content-Type' => 'application/x-www-form-urlencoded'
            ),
            'body' => array(
                'grant_type' => 'client_credentials'
            )
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['access_token'])) {
            return $data['access_token'];
        } else {
            return new WP_Error('token_error', 'Failed to get access token from Spotify.');
        }
    }
    
    /**
     * Get playlists from Spotify
     */
    private function get_spotify_playlists($limit = 20) {
        $access_token = $this->get_spotify_access_token();
        
        if (is_wp_error($access_token)) {
            return $access_token;
        }
        
        $playlists_url = $this->spotify_api_url . '/users/' . $this->spotify_user_id . '/playlists?limit=' . $limit;
        
        $response = wp_remote_get($playlists_url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $access_token
            )
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['items'])) {
            return $data['items'];
        } else {
            return new WP_Error('playlists_error', 'Failed to fetch playlists from Spotify.');
        }
    }
    
    /**
     * Spotify playlists shortcode
     */
    public function spotify_playlists_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 20,
            'show_images' => 'true',
            'show_description' => 'true'
        ), $atts, 'spotify_playlists');
        
        // Check if credentials are configured
        if (empty($this->spotify_client_id) || empty($this->spotify_client_secret)) {
            return '<p class="spotify-error">Spotify API credentials are not configured. Please contact an administrator.</p>';
        }
        
        $playlists = $this->get_spotify_playlists($atts['limit']);
        
        if (is_wp_error($playlists)) {
            return '<p class="spotify-error">Error loading playlists: ' . esc_html($playlists->get_error_message()) . '</p>';
        }
        
        if (empty($playlists)) {
            return '<p>No playlists found.</p>';
        }
        
        ob_start();
        ?>
        <div class="spotify-playlists-container">
            <div class="spotify-playlists-grid">
                <?php foreach ($playlists as $playlist): ?>
                    <a href="<?php echo esc_url($playlist['external_urls']['spotify']); ?>" 
                       target="_blank" rel="noopener noreferrer"
                       class="spotify-playlist-item">
                        <?php if ($atts['show_images'] === 'true' && !empty($playlist['images'])): ?>
                            <div class="playlist-image">
                                <img src="<?php echo esc_url($playlist['images'][0]['url']); ?>" 
                                     alt="<?php echo esc_attr($playlist['name']); ?>"
                                     width="300" height="300">
                            </div>
                        <?php endif; ?>
                        
                        <div class="playlist-info">
                            <h3 class="playlist-name">
                                <?php echo esc_html($playlist['name']); ?>
                            </h3>
                            
                            <?php if ($atts['show_description'] === 'true' && !empty($playlist['description'])): ?>
                                <p class="playlist-description">
                                    <?php echo esc_html($playlist['description']); ?>
                                </p>
                            <?php endif; ?>
                            
                            <p class="playlist-tracks">
                                <?php echo esc_html($playlist['tracks']['total']); ?> tracks
                            </p>
                            
                            <div class="spotify-button">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 0.5em;">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.371-.721.49-1.101.25-3.02-1.86-6.834-2.28-11.289-1.25-.44.1-.881-.19-.981-.63-.1-.44.19-.881.63-.981 4.915-1.13 9.134-.63 12.531 1.44.38.24.49.721.21 1.101v.07zm1.5-3.461c-.301.471-.931.621-1.401.321-3.459-2.13-8.73-2.75-12.811-1.5-.56.17-1.151-.151-1.32-.711-.17-.56.15-1.15.71-1.32 4.68-1.42 10.48-.73 14.45 1.71.47.3.62.93.32 1.4v.1zm.14-3.601c-4.151-2.47-10.99-2.7-14.951-1.5-.67.21-1.38-.181-1.59-.851-.21-.67.181-1.38.85-1.59 4.561-1.38 12.14-1.11 16.931 1.73.57.34.76 1.08.42 1.65-.34.57-1.08.76-1.65.42l-.01.14z"/>
                                </svg>
                                Open in Spotify
                            </div>
                        </div>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>
        
        <style>
        .spotify-playlists-container {
            margin: 2em 0;
            font-family: 'Montserrat', sans-serif;
        }
        
        .spotify-playlists-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 2em;
        }
        
        a.spotify-playlist-item {
            display: block;
            background: #FFFFFF;
            border: 1px solid #E3E3E3;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            text-decoration: none !important;
            color: inherit;
        }
        
        a.spotify-playlist-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            border-color: #E8BE3F;
            text-decoration: none !important;
        }
        
        .playlist-image {
            position: relative;
            overflow: hidden;
            background: #111111;
        }
        
        .playlist-image img {
            width: 100%;
            height: auto;
            display: block;
            transition: transform 0.3s ease;
        }
        
        a.spotify-playlist-item:hover .playlist-image img {
            transform: scale(1.05);
        }
        
        .playlist-info {
            padding: 1.75em;
            background: #FFFFFF;
        }
        
        .playlist-name {
            margin: 0 0 0.75em 0;
            font-size: 1.25em;
            font-weight: 700;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: -0.02em;
            color: #111111;
            text-decoration: none;
            transition: text-decoration 0.2s ease;
        }
        
        a.spotify-playlist-item:hover .playlist-name {
            color: #111111;
            text-decoration: underline;
            text-decoration-thickness: 2px;
            text-underline-offset: 3px;
        }
        
        .playlist-description {
            color: #555555;
            margin: 0.75em 0;
            line-height: 1.6;
            font-size: 0.95em;
            font-family: 'Montserrat', sans-serif;
        }
        
        .playlist-tracks {
            color: #555555;
            margin: 1em 0;
            font-size: 0.85em;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-family: 'Montserrat', sans-serif;
        }
        
        .spotify-button {
            display: inline-flex;
            align-items: center;
            background: #E8BE3F;
            color: #111111 !important;
            padding: 0.75em 1.5em;
            text-decoration: none !important;
            border-radius: 0;
            font-weight: 700;
            font-size: 0.9em;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            transition: all 0.3s ease;
            font-family: 'Montserrat', sans-serif;
            border: 2px solid #E8BE3F;
        }
        
        a.spotify-playlist-item:hover .spotify-button {
            background: #111111;
            color: #E8BE3F !important;
            border-color: #111111;
        }
        
        .spotify-button svg {
            fill: currentColor;
        }
        
        .spotify-error {
            color: #FC5656;
            padding: 1.5em;
            border: 2px solid #FC5656;
            border-radius: 8px;
            background: rgba(252, 86, 86, 0.05);
            font-family: 'Montserrat', sans-serif;
            font-weight: 500;
        }
        
        @media (max-width: 768px) {
            .spotify-playlists-grid {
                grid-template-columns: 1fr;
                gap: 1.5em;
            }
            
            .playlist-info {
                padding: 1.25em;
            }
            
            .playlist-name {
                font-size: 1.1em;
            }
        }
        </style>
        <?php
        
        return ob_get_clean();
    }
}

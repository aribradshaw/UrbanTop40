<?php
/**
 * Admin Sidebar Module for Urban Top 40
 * 
 * This module provides admin sidebar functionality including Social Cards generation
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin Sidebar Module Class
 */
class UrbanTop40_Admin_Sidebar {
    
    /**
     * Constructor
     */
    public function __construct() {
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Enqueue admin scripts and styles
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
    }
    
    /**
     * Add admin menu to WordPress sidebar
     */
    public function add_admin_menu() {
        add_menu_page(
            'Urban Top 40', // Page title
            'Urban Top 40', // Menu title
            'manage_options', // Capability
            'urban-top-40', // Menu slug
            array($this, 'admin_page'), // Callback function
            'dashicons-megaphone', // Icon
            30 // Position
        );
        
        add_submenu_page(
            'urban-top-40', // Parent slug
            'Social Cards', // Page title
            'Social Cards', // Menu title
            'manage_options', // Capability
            'urban-top-40-social-cards', // Menu slug
            array($this, 'social_cards_page') // Callback function
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_assets($hook) {
        // Only load on our plugin pages
        if (strpos($hook, 'urban-top-40') === false) {
            return;
        }
        
        // Enqueue Select2 for better dropdown functionality
        wp_enqueue_script('select2', 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js', array('jquery'), '4.1.0', true);
        wp_enqueue_style('select2', 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css', array(), '4.1.0');
        
        wp_enqueue_script(
            'urban-top-40-admin',
            URBAN_TOP_40_PLUGIN_URL . 'modules/admin-sidebar/admin.js',
            array('jquery', 'select2'),
            URBAN_TOP_40_VERSION,
            true
        );
        
        wp_enqueue_style(
            'urban-top-40-admin',
            URBAN_TOP_40_PLUGIN_URL . 'modules/admin-sidebar/admin.css',
            array('select2'),
            URBAN_TOP_40_VERSION
        );
        
        // Localize script for AJAX
        wp_localize_script('urban-top-40-admin', 'urbanTop40Ajax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('urban_top_40_nonce'),
            'plugin_url' => URBAN_TOP_40_PLUGIN_URL
        ));
    }
    
    /**
     * Main admin page
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Urban Top 40</h1>
            <p>Welcome to the Urban Top 40 plugin administration panel.</p>
            
            <div class="urban-top-40-admin-grid">
                <div class="urban-top-40-admin-card">
                    <h2>Social Cards</h2>
                    <p>Generate social media cards for your blog posts with custom branding.</p>
                    <a href="<?php echo admin_url('admin.php?page=urban-top-40-social-cards'); ?>" class="button button-primary">
                        Manage Social Cards
                    </a>
                </div>
                
                <div class="urban-top-40-admin-card">
                    <h2>Spotify Playlists</h2>
                    <p>Manage your Spotify playlist integrations and settings.</p>
                    <a href="#" class="button button-secondary">Coming Soon</a>
                </div>
                
                <div class="urban-top-40-admin-card">
                    <h2>Social Links</h2>
                    <p>Configure your social media links and verification settings.</p>
                    <a href="#" class="button button-secondary">Coming Soon</a>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Social Cards page
     */
    public function social_cards_page() {
        // Get all published posts
        $posts = get_posts(array(
            'post_type' => 'post',
            'post_status' => 'publish',
            'numberposts' => -1,
            'orderby' => 'date',
            'order' => 'DESC'
        ));
        
        ?>
        <div class="wrap">
            <h1>Social Cards Generator</h1>
            <p>Generate custom social media cards for your blog posts with Urban Top 40 branding.</p>
            
            <div class="urban-top-40-social-cards-container">
                <div class="urban-top-40-form-section">
                    <h2>Select Post</h2>
                    <select id="post-selector" class="urban-top-40-post-select">
                        <option value="">Choose a post...</option>
                        <?php foreach ($posts as $post): ?>
                            <option value="<?php echo $post->ID; ?>" 
                                    data-title="<?php echo esc_attr($post->post_title); ?>"
                                    data-author="<?php echo esc_attr(get_the_author_meta('display_name', $post->post_author)); ?>"
                                    data-date="<?php echo get_the_date('F j, Y', $post->ID); ?>"
                                    data-featured-image="<?php echo get_the_post_thumbnail_url($post->ID, 'full'); ?>">
                                <?php echo esc_html($post->post_title); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    
                    <h3>Customization</h3>
                    <div class="urban-top-40-slider-controls">
                        <div class="urban-top-40-slider-group">
                            <label for="font-size-slider">Font Size: <span id="font-size-value">64</span>px</label>
                            <input type="range" id="font-size-slider" min="32" max="128" value="64" class="urban-top-40-slider">
                        </div>
                        
                        <div class="urban-top-40-slider-group">
                            <label for="y-position-slider">Y Position: <span id="y-position-value">950</span>px</label>
                            <input type="range" id="y-position-slider" min="500" max="1200" value="950" class="urban-top-40-slider">
                        </div>
                        
                        <div class="urban-top-40-slider-group">
                            <label for="image-scale-slider">Image Scale: <span id="image-scale-value">100</span>%</label>
                            <input type="range" id="image-scale-slider" min="50" max="150" value="100" class="urban-top-40-slider">
                        </div>
                        
                        <div class="urban-top-40-slider-group">
                            <label for="image-y-position-slider">Image Y Position: <span id="image-y-position-value">0</span>px</label>
                            <input type="range" id="image-y-position-slider" min="-500" max="200" value="0" class="urban-top-40-slider">
                        </div>
                    </div>
                </div>
                
                <div class="urban-top-40-preview-section">
                    <h2>Preview</h2>
                    <div id="social-card-preview" class="urban-top-40-card-preview">
                        <div class="urban-top-40-card-placeholder">
                            <p>Select a post to see preview</p>
                        </div>
                    </div>
                    
                    <div class="urban-top-40-card-controls">
                        <button id="generate-card" class="button button-primary" disabled>
                            Download Social Card
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="generation-status" class="urban-top-40-status" style="display: none;">
                <div class="urban-top-40-spinner"></div>
                <span>Generating your social card...</span>
            </div>
        </div>
        <?php
    }
    

    

    

    

}

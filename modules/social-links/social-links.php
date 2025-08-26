<?php
/**
 * Social Media Links Module for Urban Top 40
 * 
 * This module provides social media links including Mastodon verification
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Social Links Module Class
 */
class UrbanTop40_Social_Links {
    
    /**
     * Constructor
     */
    public function __construct() {
        // Add Mastodon verification link to footer
        add_action('wp_footer', array($this, 'add_mastodon_verification'));
        
        // Also add to header for better verification compatibility
        add_action('wp_head', array($this, 'add_mastodon_link_tag'));
        
        // Add Fediverse creator meta tag for article attribution
        add_action('wp_head', array($this, 'add_fediverse_creator_meta'));
    }
    
    /**
     * Add Mastodon verification link to footer
     */
    public function add_mastodon_verification() {
        ?>
        <!-- Urban Top 40 Social Links -->
        <div class="urban-top-40-social-links" style="display: none;">
            <a rel="me" href="https://mastodon.social/@urbantop40">Mastodon</a>
        </div>
        <?php
    }
    
    /**
     * Add Mastodon link tag to header for verification
     */
    public function add_mastodon_link_tag() {
        ?>
        <!-- Mastodon Verification for Urban Top 40 -->
        <link href="https://mastodon.social/@urbantop40" rel="me">
        <?php
    }
    
    /**
     * Add Fediverse creator meta tag for article attribution
     */
    public function add_fediverse_creator_meta() {
        // Only add on single posts and pages
        if (is_singular()) {
            ?>
            <!-- Fediverse Author Attribution for Urban Top 40 -->
            <meta name="fediverse:creator" content="@urbantop40@mastodon.social">
            <?php
        }
    }
}

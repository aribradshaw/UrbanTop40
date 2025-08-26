# Urban Top 40 WordPress Plugin

A modular WordPress plugin for Urban Top 40 website functionality, featuring social media card generation, Spotify playlist integration, and social media links.

## Features

### 🎨 Social Cards Generator
- Generate custom social media cards for blog posts
- 1080x1350px Instagram Story format
- Custom branding with Urban Top 40 colors (#E8BE3F)
- Automatic inclusion of featured image, title, author, and date
- Logo placement in corner
- Download as PNG format

### 🎵 Spotify Playlists
- Integration with Spotify playlists
- Display playlists on your website
- Customizable styling

### 🔗 Social Links
- Mastodon verification links
- Fediverse creator meta tags
- Social media integration

## Installation

1. Upload the plugin files to `/wp-content/plugins/urban-top-40/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Navigate to "Urban Top 40" in the admin sidebar

## Usage

### Social Cards Generator

1. Go to **Urban Top 40 > Social Cards** in the WordPress admin
2. Select a blog post from the dropdown
3. Preview the card layout
4. Click "Generate Card" to create the image
5. Download the generated PNG file

### Requirements

- PHP GD extension enabled
- WordPress 5.0 or higher
- Posts with featured images (recommended)

### Customization

#### Logo
Place your logo file at `assets/images/logo.png` for automatic inclusion in social cards.

#### Fonts
Add custom fonts to `assets/fonts/` directory:
- Recommended: OpenSans-Bold.ttf
- Supported formats: TTF
- Fallback to system fonts if custom fonts not found

#### Colors
The plugin uses the Urban Top 40 brand color (#E8BE3F) for card backgrounds.

## File Structure

```
urban-top-40/
├── assets/
│   ├── images/
│   │   └── logo.png (your logo here)
│   ├── fonts/
│   │   └── README.md
│   └── css/
│       └── global.css
├── modules/
│   ├── admin-sidebar/
│   │   ├── admin-sidebar.php
│   │   ├── admin.js
│   │   └── admin.css
│   ├── social-links/
│   │   └── social-links.php
│   └── spotify-playlists/
│       └── spotify-playlists.php
├── urban-top-40.php
└── README.md
```

## Technical Details

### Image Generation
- Uses PHP GD library for image manipulation
- Supports TrueType fonts with fallback to basic fonts
- Automatic text wrapping for long titles
- Responsive image scaling

### Security
- AJAX requests protected with WordPress nonces
- Input sanitization and validation
- Secure file handling

### Performance
- Images generated on-demand
- Cached in WordPress uploads directory
- Optimized for social media platforms

## Troubleshooting

### Common Issues

1. **Images not generating**
   - Check PHP GD extension is enabled
   - Verify upload directory permissions
   - Check for available fonts

2. **Font rendering issues**
   - Add custom fonts to `assets/fonts/` directory
   - Check font file permissions
   - Verify TTF format compatibility

3. **Logo not appearing**
   - Ensure logo.png exists in `assets/images/`
   - Check file permissions
   - Verify PNG format with transparency

### Debug Mode

Enable WordPress debug mode to see detailed error messages:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Support

For support and feature requests, please contact the Urban Top 40 development team.

## Changelog

### Version 1.0.0
- Initial release
- Social Cards Generator
- Admin sidebar integration
- Spotify Playlists module
- Social Links module

## License

GPL v2 or later



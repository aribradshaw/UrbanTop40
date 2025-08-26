# Fonts Directory

This directory should contain the fonts used for generating social cards.

## Required Fonts

The social card generator uses TrueType fonts for text rendering. You can add custom fonts here:

- **Montserrat-Black.ttf** - Primary font for blog titles (ALL CAPS) - preferred
- **Montserrat-VariableFont_wght.ttf** - Alternative variable font for blog titles
- **ZillaSlab-Regular.ttf** - Secondary font for author and date information (or any ZillaSlab variation: Medium, Bold, Light)
- Any other TTF fonts you want to use

## Font Fallback

If no custom fonts are found, the system will fall back to:
- Windows: `C:/Windows/Fonts/arial.ttf`
- Linux: `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`
- macOS: `/System/Library/Fonts/Arial.ttf`

## Adding Custom Fonts

1. Place your TTF font files in this directory
2. The system will automatically detect and use them
3. Ensure the font file has proper permissions for PHP to read

## Recommended Fonts

For best results with social cards, consider using:
- **Montserrat Black** (Google Fonts) - For bold, impactful titles
- **Zilla Slab** (Google Fonts) - For clean, readable body text
- **Open Sans** (Google Fonts) - Alternative for body text
- **Arial** (System font) - Fallback option

## Download Links

- [Montserrat Black](https://fonts.google.com/specimen/Montserrat) - Download the Black weight (preferred for titles)
- [Montserrat Variable](https://fonts.google.com/specimen/Montserrat) - Download the variable font version
- [Zilla Slab](https://fonts.google.com/specimen/Zilla+Slab) - Download the Regular weight

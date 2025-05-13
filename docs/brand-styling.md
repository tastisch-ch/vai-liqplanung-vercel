# VAIOS Brand Styling Guide

## Brand Colors

The VAI-Liq-Planung application uses the following VAIOS brand colors:

| Color Name | Hex Code | Description | Usage |
|------------|----------|-------------|-------|
| Primary    | #02403D  | Dark teal   | Primary buttons, active navigation, headings |
| Accent     | #D1F812  | Lime green  | Accent elements, highlights, call-to-action |
| Teal       | #ADC7C8  | Light teal  | Secondary backgrounds, borders |
| Gray       | #DEE2E3  | Light gray  | Subtle backgrounds, disabled states |

## Color Palette Extension

We've extended the primary teal color into a full palette for consistent styling:

| Shade | Hex Code | Usage |
|-------|----------|-------|
| 50    | #EAEEEE  | Very light backgrounds, hover states |
| 100   | #DEE6E6  | Light backgrounds, borders |
| 200   | #C5D0D0  | Backgrounds, disabled elements |
| 300   | #ADC7C8  | Main teal shade, borders |
| 400   | #8AADAE  | Darker teal for contrast |
| 500   | #4D7F80  | Medium-dark teal for text/elements |
| 600   | #02403D  | Main brand primary color |
| 700   | #023331  | Darker primary for hover states |
| 800   | #022422  | Very dark primary for text contrast |
| 900   | #011514  | Extremely dark teal, near black |

## Implementation Details

The branding colors are implemented in three layers:

1. **CSS Variables**: Defined in `app/globals.css` for global access
2. **Tailwind Configuration**: Extended in `tailwind.config.js` 
3. **Utility Classes**: Available via both Tailwind (e.g., `bg-vaios-primary`) and custom CSS classes (e.g., `btn-vaios-primary`)

## Blue Color Replacement

To maintain consistency with the VAIOS brand, we've replaced all blue colors with the VAIOS teal palette:

- Standard blue utility classes (e.g., `bg-blue-600`) now display VAIOS teal colors
- Focus rings and outlines use the primary teal color
- Interactive elements (buttons, links) use the VAIOS color scheme

## Usage Guidelines

### Buttons

- Primary actions: Use `btn-vaios-primary` or `bg-vaios-primary text-white`
- Secondary actions: Use `btn-vaios-accent` or `bg-vaios-accent text-vaios-primary`
- Tertiary actions: Use `text-vaios-primary` with appropriate border styling

### Navigation

- Active state: `bg-vaios-primary text-white`
- Inactive state: `text-gray-700 hover:bg-gray-100`

### Backgrounds

- Main backgrounds: White (`#FFFFFF`)
- Secondary backgrounds: Very light teal (`bg-vaios-50` or `bg-vaios-100`)
- Highlight areas: Accent lime (`bg-vaios-accent`)

### Text

- Primary headings: `text-vaios-primary`
- Body text: Default black or dark gray
- Accents and highlights: `text-vaios-accent`

### Focus States

Focus states use the primary teal color for accessibility and brand consistency. 
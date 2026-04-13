# Shopify Development Workflow

## Development Environment

### Development Store vs Live Store

**Always build on a development store first.** Never build directly on a client's live theme.

| Environment | Use Case |
|------------|----------|
| Development store | New builds, major redesigns, experimental work |
| Unpublished theme on live store | Minor updates, section tweaks, bug fixes |
| Live theme (direct) | Emergency hotfixes only, with client approval |

### Setting Up Local Dev

```bash
# Install Shopify CLI (if not already)
npm install -g @shopify/cli @shopify/theme

# Clone the theme
shopify theme pull --store=[store].myshopify.com

# Start local dev server
shopify theme dev --store=[store].myshopify.com
```

> **Always pull the latest theme before starting work.** Stale local copies cause merge conflicts and overwritten work.

### Development Store Setup
1. Create a dev store from the Shopify Partners dashboard
2. Install the same apps the client uses (or note which ones affect layout)
3. Import sample products that match the client's catalogue
4. Use realistic content — not "Test Product $1.00"

## Theme Architecture

### Online Store 2.0 Structure

```
theme/
├── assets/          # CSS, JS, images, fonts
├── config/          # settings_schema.json, settings_data.json
├── layout/          # theme.liquid (main layout)
├── locales/         # Translation files
├── sections/        # All sections (reusable blocks)
├── snippets/        # Reusable Liquid partials
└── templates/       # JSON templates (OS 2.0)
```

### JSON Templates (OS 2.0)
Templates are JSON files that define which sections appear and in what order. Merchants can rearrange sections in the theme editor.

```json
{
  "sections": {
    "hero": {
      "type": "el-hero",
      "settings": {
        "heading": "Your headline here"
      }
    },
    "features": {
      "type": "el-features",
      "settings": {}
    }
  },
  "order": ["hero", "features"]
}
```

> **Custom landing pages** use the `page.[template-name].json` pattern. Create a dedicated template for each landing page rather than cramming everything into the default page template.

## Section Schema Best Practices

### Keep Schemas Merchant-Friendly
- Use clear `label` values — write them for a non-technical person
- Group related settings with `"type": "header"`
- Provide sensible `default` values for every setting
- Add `info` text to explain non-obvious settings
- Limit the number of settings — if a section has 30+ settings, it's too complex

### Example Schema Structure
```json
{
  "name": "Hero Banner",
  "tag": "section",
  "class": "el-hero",
  "settings": [
    {
      "type": "header",
      "content": "Content"
    },
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Your headline here"
    },
    {
      "type": "richtext",
      "id": "subheading",
      "label": "Subheading"
    },
    {
      "type": "header",
      "content": "Button"
    },
    {
      "type": "text",
      "id": "cta_text",
      "label": "Button text",
      "default": "Shop Now"
    },
    {
      "type": "url",
      "id": "cta_link",
      "label": "Button link"
    },
    {
      "type": "header",
      "content": "Layout"
    },
    {
      "type": "range",
      "id": "padding_top",
      "min": 0,
      "max": 100,
      "step": 10,
      "unit": "px",
      "label": "Top padding",
      "default": 60
    },
    {
      "type": "range",
      "id": "padding_bottom",
      "min": 0,
      "max": 100,
      "step": 10,
      "unit": "px",
      "label": "Bottom padding",
      "default": 60
    }
  ],
  "presets": [
    {
      "name": "Hero Banner"
    }
  ]
}
```

### Schema Setting Types to Use

| Setting Type | When to Use |
|-------------|-------------|
| `text` | Short single-line text (headings, button labels) |
| `richtext` | Body copy that needs basic formatting |
| `image_picker` | Any image the merchant should control |
| `url` | Links (buttons, CTAs) |
| `select` | Limited choices (layout style, colour scheme) |
| `range` | Numeric values (padding, columns, opacity) |
| `checkbox` | On/off toggles (show/hide elements) |
| `color` | Custom colour overrides |
| `video` | Shopify-hosted video |
| `video_url` | YouTube/Vimeo embeds |

### Blocks for Repeating Content
Use blocks for anything the merchant should be able to add, remove, or reorder:
- Testimonial cards
- Feature items
- FAQ items
- Logo bar images
- Team members

Set `max_blocks` to prevent layout-breaking additions.

## Metafields Usage

### When to Use Metafields
- Product-specific data that doesn't fit standard fields (ingredient lists, size guides, comparison data)
- Collection-level data (custom banners, featured products)
- Page-level structured data

### Metafield Naming Convention
```
custom.[descriptive_name]
```
Examples:
- `custom.ingredient_list`
- `custom.size_guide_image`
- `custom.usp_highlights`

### Accessing in Liquid
```liquid
{{ product.metafields.custom.ingredient_list.value }}
```

> **Document every metafield** you create. Add it to the project handoff doc so the client knows what content to maintain.

## App Integration Guidelines

### Before Installing an App
1. Check if the functionality can be built natively (it often can)
2. Test the app on a dev store first
3. Check the app's impact on page speed (install, measure, compare)
4. Review the app's injected CSS/JS — some apps add 200KB+ of assets

### Common App Conflicts
- **Review apps** often inject CSS that conflicts with custom styles
- **Pop-up apps** can break scroll behaviour and z-index stacking
- **Analytics apps** can slow down page load if not configured properly
- **Currency converters** can break price formatting in custom sections

### App-Proofing Your Sections
- Use high-specificity selectors for custom sections
- Scope all CSS to the section wrapper class
- Test the page with the client's apps installed, not just on a clean theme

## Preview & Testing

### Sharing Preview Links
```bash
# Create a preview theme
shopify theme push --unpublished --store=[store].myshopify.com
```

Use the preview URL from the Shopify admin. Never share the `localhost` dev server URL.

### Testing Checklist Before Sharing Preview
- [ ] All sections render with the correct content
- [ ] Theme editor works — merchant can edit all settings
- [ ] Page loads in under 3 seconds
- [ ] No console errors
- [ ] No broken images or missing assets
- [ ] Mobile layout is correct

### Theme Editor Testing
Always test that your sections work properly in the Shopify theme editor:
- Settings update live in the preview
- Blocks can be added, removed, and reordered
- Default values render correctly for new instances
- No JavaScript errors when toggling settings

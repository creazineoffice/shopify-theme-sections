# Shopify Theme Sections

Production-tested patterns for Shopify Online Store 2.0 themes, rewritten as standalone,
theme-agnostic sections and snippets. Each one solves a problem that comes up again and again
on real D2C stores: bundles and pack sizes, product content managed by the merchant, a free gift
above a cart value, a sticky add-to-cart bar on mobile, and structured data that is actually complete.

No apps, no build step, no dependencies. Drop the files into any OS 2.0 theme (Dawn and its
derivatives work out of the box).

| File | What it does |
|---|---|
| [`sections/metafield-accordion.liquid`](sections/metafield-accordion.liquid) | Product accordions (ingredients, how to use, FAQs) driven by a metaobject list or by theme-editor blocks with dynamic sources. Optional FAQPage JSON-LD. No JavaScript. |
| [`snippets/pack-selector.liquid`](snippets/pack-selector.liquid) | Links the 1 / 2 / 3-pack versions of a product, with price per unit and saving %. Each pack stays its own product with its own URL and inventory. |
| [`snippets/free-gift-threshold.liquid`](snippets/free-gift-threshold.liquid) + [`assets/free-gift-threshold.js`](assets/free-gift-threshold.js) | Adds a free gift when the cart reaches a value, removes it below, and respects the customer removing it. Works with any theme's AJAX cart. |
| [`sections/sticky-add-to-cart.liquid`](sections/sticky-add-to-cart.liquid) + [`assets/sticky-add-to-cart.js`](assets/sticky-add-to-cart.js) | A sticky bar that appears once the main button scrolls away and submits the theme's own product form. |
| [`snippets/product-json-ld.liquid`](snippets/product-json-ld.liquid) | Product JSON-LD with one Offer per variant (SKU, GTIN, price, stock), review ratings, return policy and breadcrumbs. |

## Installation

1. Copy the files into the matching folders of your theme (`sections/`, `snippets/`, `assets/`),
   either with the [Shopify CLI](https://shopify.dev/docs/storefronts/themes/tools/cli) (`shopify theme push --only ...`)
   or through **Online Store → Themes → Edit code**.
2. Follow the setup for the pieces you use below.
3. Test on an unpublished copy of the live theme before publishing.

## Metafield accordion

Create a metaobject definition **Accordion item** with two fields:

| Field | Type |
|---|---|
| `title` | Single line text |
| `body` | Rich text |

Then a product metafield `custom.accordion_items` of type **List of metaobjects → Accordion item**.
Add the **Metafield accordion** section to the product template.

The merchant now edits accordion content per product from the product admin page, and every
product shares one template. Items with an empty title or body are skipped, and the section
disappears entirely when a product has no content.

For content that already lives in individual metafields (say `custom.ingredients`), add an
**Item** block instead and connect its content to the metafield with the dynamic source button.

"One open at a time" uses the native `<details name="...">` grouping, so there is no script to load.

## Pack selector

For bundles sold as separate products (*Serum*, *Serum, pack of 2*, *Serum, pack of 3*),
create these product metafields:

| Metafield | Type | Value |
|---|---|---|
| `custom.pack_group` | List of products | All packs in display order, the product itself included |
| `custom.pack_size` | Integer | Units in the pack (1, 2, 3...) |
| `custom.pack_label` | Single line text | Optional badge, e.g. `Best value` |

Render it in the product form area, for example from a **Custom liquid** block:

```liquid
{% render 'pack-selector', product: product %}
```

The saving is calculated against the unit price of the smallest pack, so prices stay correct when
the business changes them, and nothing is hard-coded. Setting the metafields for many products is
quickest with a CSV import (Matrixify or Shopify's product CSV with metafield columns).

## Free gift above a cart value

See [`docs/free-gift-setup.md`](docs/free-gift-setup.md). In short:

```liquid
{%- # layout/theme.liquid, before </body> -%}
{% render 'free-gift-threshold', gift_handle: 'free-tote-bag', threshold: 5000 %}
```

- **The price is made 0 by an automatic discount, not by the script.** Checkout stays correct even
  if JavaScript fails, and the customer can't keep a free gift after their cart drops below the threshold.
- **No theme events are needed.** The script watches the storefront's own `/cart/add`, `/cart/change`
  and `/cart/update` calls (fetch and XHR), so it works with any theme's AJAX cart.
- **"Removed it myself" is respected.** If the customer deletes the gift, it is not forced back for
  the rest of the visit. Emptying the cart resets this.
- **Multi-currency is handled.** The threshold is converted with `Shopify.currency.rate` for carts in another currency.
- **The cart UI refreshes through the Section Rendering API.** The default targets are Dawn's cart
  drawer and cart icon, and you can change them per theme with the `refresh_sections` parameter.

## Sticky add to cart

Add the **Sticky add to cart** section to the product template, below the main product section.

The bar doesn't call the Cart API itself. Its button submits the page's product form
(`form.requestSubmit()`), so everything the theme does on add to cart still happens: the selected
variant and quantity, selling plans, line item properties, cart drawer or notification, and
analytics events. This is what makes it safe to drop into an unknown theme.

- **Only shows when it's needed:** it appears once the main button has scrolled out of view, using an
  `IntersectionObserver` and no scroll listeners. It never appears before the customer reaches the button.
- **Always shows the right variant:** whichever variant, price and stock state is selected in the main form.
- **Accessible while hidden:** it is `inert` and `aria-hidden`, so keyboard and screen-reader users never land on it.
- **Doesn't cover the page:** it reserves its own height at the bottom of the page, so the footer isn't hidden behind it.

## Product structured data

```liquid
{% render 'product-json-ld', product: product %}
{% render 'product-json-ld', product: product, return_days: 7, return_country: 'IN' %}
```

Remove the theme's existing Product JSON-LD first (in Dawn: `{{ product | structured_data }}`
in `main-product.liquid`), so search engines see only one Product entity.

- **Each variant is its own Offer,** with its own URL, SKU, price and availability.
- **GTINs come from the barcode field:** `gtin8`, `gtin12`, `gtin13` or `gtin14`, picked by length.
- **Ratings come from `reviews.rating` and `reviews.rating_count`,** the standard metafields that
  Judge.me, Shopify Product Reviews and others write to.
- **Optional extras:** a `MerchantReturnPolicy`, plus a `BreadcrumbList` when the product is opened from a collection.

Check the result with Google's [Rich Results Test](https://search.google.com/test/rich-results).

## Quality checks

All files pass [Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check):

```bash
shopify theme check --path .
```

## About

Built by [Sabyasachi Bhattacharya](https://creazinetech.com), Creazine Technology. I'm a Shopify and
full-stack developer with 8 years in e-commerce, and I've built and migrated 100+ stores across
Shopify, WooCommerce and Magento.

Need something like this on your store? [creazine.office@gmail.com](mailto:creazine.office@gmail.com)

## License

[MIT](LICENSE)
